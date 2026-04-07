import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 매주 업데이트되는 외래 시간표 URL
const TIMETABLE_URL = 'https://www.cmcism.or.kr/treatment/treatment_timetable?deptSeq=33'

const KNOWN_PROFESSORS = ['조현지', '정성우', '송인욱', '김영도', '김태원', '최윤호', '나승희', '김병석']
const DAY_NAMES = ['월', '화', '수', '목', '금', '토']

interface ProfessorSchedule {
  name: string
  // key: "YYYY-MM-DD", value: { am: boolean, pm: boolean }
  days: Record<string, { am: boolean; pm: boolean }>
}

/**
 * HTML 파싱: table.table_type01 구조
 *
 * 첫 번째 table: 날짜 헤더 행 (ex. <th>06일(월)</th>)
 * 이후 각 교수 table:
 *   thead > tr > td[colspan=7]: 교수 이름 (<span>조현지</span>)
 *   tbody > tr[0]: 오전 — <th>오전</th> + 6개 <td> (<i class="icon_won"> 있으면 진료)
 *   tbody > tr[1]: 오후 — <th>오후</th> + 6개 <td>
 */
function parseTimetableHtml(html: string): ProfessorSchedule[] {
  // 모든 table.table_type01 추출
  const tableRe = /<table[^>]+class="table_type01[^"]*"[^>]*>([\s\S]*?)<\/table>/g
  const tables: string[] = []
  let m: RegExpExecArray | null
  while ((m = tableRe.exec(html)) !== null) tables.push(m[1])

  // 첫 번째 테이블에서 날짜(YYYY-MM-DD) 목록 추출
  const dateStrings: string[] = []
  if (tables.length > 0) {
    const thRe = />(\d{2})일\(([월화수목금토])\)</g
    let dm: RegExpExecArray | null
    while ((dm = thRe.exec(tables[0])) !== null) {
      const day = parseInt(dm[1])
      // 해당 요일의 실제 날짜를 현재 주 기준으로 계산
      const dayIdx = DAY_NAMES.indexOf(dm[2]) // 0=월~5=토
      const today = new Date()
      const todayDow = today.getDay() // 0=일,1=월,...
      const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow
      const monday = new Date(today)
      monday.setDate(today.getDate() + mondayOffset)
      const target = new Date(monday)
      target.setDate(monday.getDate() + dayIdx)
      // day 숫자가 헤더와 맞는지 확인 (월 넘어가는 경우 대비)
      if (target.getDate() === day) {
        dateStrings.push(target.toISOString().split('T')[0])
      } else {
        // 날짜가 다음달로 넘어갔을 가능성 — 페이지의 day 숫자를 신뢰
        const year = target.getFullYear()
        const month = String(target.getMonth() + 1).padStart(2, '0')
        dateStrings.push(`${year}-${month}-${String(day).padStart(2, '0')}`)
      }
    }
  }

  const professors: ProfessorSchedule[] = []

  for (const table of tables.slice(1)) {
    // 교수 이름 추출
    const nameMatch = KNOWN_PROFESSORS
      .map(n => ({ n, idx: table.indexOf(n) }))
      .filter(x => x.idx >= 0)
      .sort((a, b) => a.idx - b.idx)[0]
    if (!nameMatch) continue

    const name = nameMatch.n
    const days: Record<string, { am: boolean; pm: boolean }> = {}

    // tbody 파싱
    const tbodyMatch = /<tbody>([\s\S]*?)<\/tbody>/i.exec(table)
    if (!tbodyMatch) continue

    const trRe = /<tr>([\s\S]*?)<\/tr>/g
    let trM: RegExpExecArray | null
    let rowIdx = 0

    while ((trM = trRe.exec(tbodyMatch[1])) !== null) {
      const row = trM[1]
      const thMatch = /<th[^>]*>(오전|오후)<\/th>/i.exec(row)
      if (!thMatch) continue
      const isAm = thMatch[1] === '오전'

      // <td> 셀에서 icon_won 유무로 진료 여부 판단
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g
      let tdM: RegExpExecArray | null
      let colIdx = 0
      while ((tdM = tdRe.exec(row)) !== null) {
        const hasClinic = tdM[1].includes('icon_won')
        const dateStr = dateStrings[colIdx]
        if (dateStr) {
          if (!days[dateStr]) days[dateStr] = { am: false, pm: false }
          if (isAm) days[dateStr].am = hasClinic
          else days[dateStr].pm = hasClinic
        }
        colIdx++
      }
      rowIdx++
    }

    professors.push({ name, days })
  }

  return professors
}

async function fetchAndSave() {
  const res = await fetch(TIMETABLE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ISMCalendarBot/1.0)' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`시간표 페이지 fetch 실패: ${res.status}`)

  const html = await res.text()
  const professors = parseTimetableHtml(html)

  if (professors.length === 0) throw new Error('교수 시간표 파싱 실패 — HTML 구조가 변경되었을 수 있습니다.')

  // 날짜별로 오전/오후 교수 목록 집계
  const dateMap = new Map<string, { am: string[]; pm: string[] }>()

  for (const prof of professors) {
    for (const [date, slot] of Object.entries(prof.days)) {
      if (!dateMap.has(date)) dateMap.set(date, { am: [], pm: [] })
      const entry = dateMap.get(date)!
      if (slot.am) entry.am.push(prof.name)
      if (slot.pm) entry.pm.push(prof.name)
    }
  }

  const rows = Array.from(dateMap.entries()).map(([date, { am, pm }]) => ({
    date,
    am_professors: am,
    pm_professors: pm,
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  if (rows.length === 0) throw new Error('저장할 날짜 데이터가 없습니다.')

  const { error } = await supabase
    .from('Incheon_St_Mary_Neurology_outpatient')
    .upsert(rows, { onConflict: 'date' })

  if (error) throw new Error(`Supabase 저장 실패: ${error.message}`)

  return {
    saved: rows.length,
    week: rows.map(r => r.date),
    professors: professors.map(p => p.name),
    sample: rows[0],
  }
}

// GET — 수동 갱신 또는 Vercel Cron 트리거
export async function GET() {
  try {
    const result = await fetchAndSave()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
