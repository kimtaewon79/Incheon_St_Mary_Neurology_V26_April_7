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
 * 페이지에 명시된 "진료기간 : YYYY-MM-DD ~ YYYY-MM-DD" 를 권위 있는 날짜 출처로 사용한다.
 * 서버 시각으로 현재 주를 추측하면 cron이 UTC 일요일 21:00(KST 월요일 06:00)에 실행될 때
 * UTC 기준 요일(일요일)로 계산되어 1주 전 날짜에 데이터를 저장하는 버그가 있었음.
 *
 * 첫 번째 table: 날짜 헤더 행 (ex. <th>06일(월)</th>) — 일(day) 숫자 sanity check 용도
 * 이후 각 교수 table:
 *   thead > tr > td[colspan=7]: 교수 이름 (<span>조현지</span>)
 *   tbody > tr[0]: 오전 — <th>오전</th> + 6개 <td> (<i class="icon_won"> 있으면 진료)
 *   tbody > tr[1]: 오후 — <th>오후</th> + 6개 <td>
 */
function parseTimetableHtml(html: string): ProfessorSchedule[] {
  // "진료기간 : YYYY-MM-DD ~ YYYY-MM-DD" 추출 (권위 있는 출처)
  const rangeMatch = /진료기간\s*:\s*(\d{4})-(\d{2})-(\d{2})\s*~\s*(\d{4})-(\d{2})-(\d{2})/.exec(html)
  if (!rangeMatch) {
    throw new Error('진료기간 헤더를 찾을 수 없습니다 — 페이지 구조가 변경되었을 가능성.')
  }
  const startYear = parseInt(rangeMatch[1])
  const startMonth = parseInt(rangeMatch[2]) // 1-12
  const startDay = parseInt(rangeMatch[3])

  // 진료기간 시작일로부터 첫 월요일을 찾는다 (UTC 산술로 타임존 영향 차단)
  let cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay))
  while (cursor.getUTCDay() !== 1) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }
  // 월~토 6일치 날짜 문자열 생성
  const weekDates: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(cursor.getTime() + i * 24 * 60 * 60 * 1000)
    weekDates.push(d.toISOString().split('T')[0])
  }

  // 모든 table.table_type01 추출
  const tableRe = /<table[^>]+class="table_type01[^"]*"[^>]*>([\s\S]*?)<\/table>/g
  const tables: string[] = []
  let m: RegExpExecArray | null
  while ((m = tableRe.exec(html)) !== null) tables.push(m[1])

  // 첫 번째 테이블의 day 숫자 헤더로 sanity check (구조 깨짐 조기 감지)
  const dateStrings: string[] = []
  if (tables.length > 0) {
    const thRe = />(\d{2})일\(([월화수목금토])\)</g
    let dm: RegExpExecArray | null
    let idx = 0
    while ((dm = thRe.exec(tables[0])) !== null) {
      const headerDay = parseInt(dm[1])
      const headerDow = DAY_NAMES.indexOf(dm[2]) // 0=월~5=토
      if (headerDow !== idx) {
        throw new Error(`날짜 헤더 요일 순서 이상: idx=${idx}, dow=${dm[2]}`)
      }
      if (idx >= weekDates.length) break
      const expectedDay = parseInt(weekDates[idx].split('-')[2])
      if (expectedDay !== headerDay) {
        throw new Error(`진료기간(${weekDates[idx]})과 헤더 day(${headerDay}) 불일치 — 페이지 구조 확인 필요.`)
      }
      dateStrings.push(weekDates[idx])
      idx++
    }
  }
  if (dateStrings.length === 0) {
    // 헤더 파싱에 실패하면 진료기간만으로 fallback
    dateStrings.push(...weekDates)
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
