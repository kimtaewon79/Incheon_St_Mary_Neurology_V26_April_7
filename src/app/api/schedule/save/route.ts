import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type ScheduleType = 'duty' | 'journal' | 'ngr' | 'dept'

const TABLE_MAP: Record<ScheduleType, string> = {
  duty: 'Incheon_St_Mary_Neurology_duty_schedule',
  journal: 'Incheon_St_Mary_Neurology_journal_topic',
  ngr: 'Incheon_St_Mary_Neurology_incheon_ngr',
  dept: 'Incheon_St_Mary_Neurology_department_event',
}

function sanitizeDuty(row: Record<string, unknown>) {
  const date = String(row.date ?? '').trim()
  const yearMonth = String(row.year_month ?? date.slice(0, 7)).trim()
  const rawWeekend = row.is_weekend
  const dayOfWeek = date ? new Date(date + 'T00:00:00').getDay() : -1
  const isWeekend =
    typeof rawWeekend === 'boolean'
      ? rawWeekend
      : rawWeekend === 'true' || rawWeekend === '1' || rawWeekend === true
        ? true
        : dayOfWeek === 0 || dayOfWeek === 6

  return {
    date,
    year_month: yearMonth,
    regular_duty: String(row.regular_duty ?? '').trim(),
    er_am:        String(row.er_am ?? '').trim(),
    er_pm:        String(row.er_pm ?? '').trim(),
    night_duty:   String(row.night_duty ?? '').trim(),
    is_weekend:   isWeekend,
    weekend_duty: String(row.weekend_duty ?? '').trim(),
    updated_at:   new Date().toISOString(),
  }
}

function sanitizeJournal(row: Record<string, unknown>) {
  return {
    date:      String(row.date ?? '').trim(),
    presenter: String(row.presenter ?? '').trim(),
    topic:     String(row.topic ?? '').trim(),
    year:      parseInt(String(row.year ?? new Date().getFullYear())),
    updated_at: new Date().toISOString(),
  }
}

function sanitizeNgr(row: Record<string, unknown>) {
  return {
    date:          String(row.date ?? '').trim(),
    schedule_info: String(row.schedule_info ?? '').trim(),
    person:        String(row.person ?? '').trim(),
    year:          parseInt(String(row.year ?? new Date().getFullYear())),
    updated_at:    new Date().toISOString(),
  }
}

// 긴 의국 일정 이름을 짧은 한글명으로 정규화
const EVENT_NAME_MAP: [RegExp, string][] = [
  [/epilepsy\s*conference/i,             '뇌전증집담회'],
  [/ms\s*&?\s*peripheral\s*conference/i, '말초집담회'],
  [/staff\s*lecture/i,                   '스텝강의'],
  [/stroke\s*conference/i,               '뇌졸중집담회'],
]

function normalizeEventName(name: string): string {
  for (const [pattern, replacement] of EVENT_NAME_MAP) {
    if (pattern.test(name)) return replacement
  }
  return name
}

function sanitizeDept(row: Record<string, unknown>) {
  const date = String(row.date ?? '').trim()
  return {
    date,
    event_name: normalizeEventName(String(row.event_name ?? '').trim()),
    time:       String(row.time ?? '').trim(),
    location:   String(row.location ?? '').trim(),
    year_month: date.slice(0, 7),
    updated_at: new Date().toISOString(),
  }
}

const SANITIZERS: Record<ScheduleType, (r: Record<string, unknown>) => Record<string, unknown>> = {
  duty:    sanitizeDuty,
  journal: sanitizeJournal,
  ngr:     sanitizeNgr,
  dept:    sanitizeDept,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body as { type: ScheduleType; data: Record<string, unknown>[] }

    if (!type || !['duty', 'journal', 'ngr', 'dept'].includes(type)) {
      return NextResponse.json({ error: '유효하지 않은 타입입니다.' }, { status: 400 })
    }
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: '저장할 데이터가 없습니다.' }, { status: 400 })
    }

    const sanitize = SANITIZERS[type]
    const rows = data
      .map(sanitize)
      .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(String(r.date)))

    if (rows.length === 0) {
      return NextResponse.json({ error: '유효한 날짜 형식(YYYY-MM-DD)의 행이 없습니다.' }, { status: 400 })
    }

    const conflictKey = type === 'dept' ? 'date,event_name' : 'date'
    const { error } = await supabase.from(TABLE_MAP[type]).upsert(rows, { onConflict: conflictKey })

    if (error) {
      console.error('Supabase upsert 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, upserted: rows.length })
  } catch (error) {
    console.error('schedule/save route 오류:', error)
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
