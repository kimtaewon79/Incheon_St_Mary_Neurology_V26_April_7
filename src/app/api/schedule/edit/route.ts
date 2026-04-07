import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { EditableDayData } from '@/types/schedule'

export async function POST(request: NextRequest) {
  try {
    const { edits } = await request.json() as {
      edits: Record<string, EditableDayData>
    }

    if (!edits || typeof edits !== 'object') {
      return NextResponse.json({ error: '편집 데이터가 없습니다.' }, { status: 400 })
    }

    const dutyRows: Record<string, unknown>[] = []
    const journalRows: Record<string, unknown>[] = []
    const ngrRows: Record<string, unknown>[] = []

    for (const [date, data] of Object.entries(edits)) {
      const yearMonth = date.slice(0, 7)

      if (
        data.regular_duty !== undefined ||
        data.er_am !== undefined ||
        data.er_pm !== undefined ||
        data.night_duty !== undefined ||
        data.weekend_duty !== undefined
      ) {
        const dayOfWeek = new Date(date + 'T00:00:00').getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        dutyRows.push({
          date,
          year_month: yearMonth,
          regular_duty: data.regular_duty ?? '',
          er_am: data.er_am ?? '',
          er_pm: data.er_pm ?? '',
          night_duty: data.night_duty ?? '',
          weekend_duty: data.weekend_duty ?? '',
          is_weekend: isWeekend,
          updated_at: new Date().toISOString(),
        })
      }

      if (data.journal_presenter !== undefined) {
        journalRows.push({
          date,
          presenter: data.journal_presenter,
          year: parseInt(date.slice(0, 4)),
          updated_at: new Date().toISOString(),
        })
      }

      if (data.ngr_info !== undefined) {
        const sepIdx = data.ngr_info.indexOf(' - ')
        const scheduleInfo = sepIdx >= 0 ? data.ngr_info.slice(0, sepIdx) : data.ngr_info
        const person = sepIdx >= 0 ? data.ngr_info.slice(sepIdx + 3) : ''
        ngrRows.push({
          date,
          schedule_info: scheduleInfo,
          person,
          year: parseInt(date.slice(0, 4)),
          updated_at: new Date().toISOString(),
        })
      }
    }

    const promises = []
    if (dutyRows.length > 0) {
      promises.push(supabase.from('Incheon_St_Mary_Neurology_duty_schedule').upsert(dutyRows, { onConflict: 'date' }))
    }
    if (journalRows.length > 0) {
      promises.push(supabase.from('Incheon_St_Mary_Neurology_journal_topic').upsert(journalRows, { onConflict: 'date' }))
    }
    if (ngrRows.length > 0) {
      promises.push(supabase.from('Incheon_St_Mary_Neurology_incheon_ngr').upsert(ngrRows, { onConflict: 'date' }))
    }

    const results = await Promise.all(promises)
    const errors = results.map((r) => r.error?.message).filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: Object.keys(edits).length })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
