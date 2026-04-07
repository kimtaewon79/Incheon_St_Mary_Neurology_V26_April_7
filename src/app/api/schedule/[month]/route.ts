import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { month } = await params

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: '유효하지 않은 월 형식입니다. (YYYY-MM)' }, { status: 400 })
    }

    const [year, mon] = month.split('-').map(Number)
    const startDate = `${month}-01`
    const lastDay = new Date(year, mon, 0).getDate()
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

    const [dutyResult, journalResult, ngrResult, outpatientResult, deptResult] = await Promise.all([
      supabase.from('Incheon_St_Mary_Neurology_duty_schedule').select('*').gte('date', startDate).lte('date', endDate).order('date'),
      supabase.from('Incheon_St_Mary_Neurology_journal_topic').select('*').gte('date', startDate).lte('date', endDate).order('date'),
      supabase.from('Incheon_St_Mary_Neurology_incheon_ngr').select('*').gte('date', startDate).lte('date', endDate).order('date'),
      supabase.from('Incheon_St_Mary_Neurology_outpatient').select('*').gte('date', startDate).lte('date', endDate).order('date'),
      supabase.from('Incheon_St_Mary_Neurology_department_event').select('*').gte('date', startDate).lte('date', endDate).order('date'),
    ])

    const errors = [dutyResult, journalResult, ngrResult, outpatientResult, deptResult]
      .map((r) => r.error?.message)
      .filter(Boolean)
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 500 })
    }

    return NextResponse.json({
      duty: dutyResult.data ?? [],
      journal: journalResult.data ?? [],
      ngr: ngrResult.data ?? [],
      outpatient: outpatientResult.data ?? [],
      department_events: deptResult.data ?? [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
