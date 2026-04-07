import { NextRequest, NextResponse } from 'next/server'

type ScheduleType = 'duty' | 'journal' | 'ngr' | 'dept'

type PromptFn = (yearMonth?: string) => string

const PROMPTS: Record<ScheduleType, PromptFn> = {
  duty: (yearMonth) => {
    const ctx = yearMonth
      ? `이 이미지는 ${yearMonth} 신경과 당직표입니다. 모든 날짜는 반드시 ${yearMonth.slice(0,4)}년 ${String(Number(yearMonth.slice(5,7)))}월로 표기하세요.`
      : '이 이미지는 신경과 당직표입니다.'
    return `${ctx} 날짜별로 정규, ER am, ER pm, 당직 담당자를 추출해주세요.\nR1은 레지던트1년차, R2/R3/R4는 각 연차, int는 인턴, pf.가 붙으면 교수님입니다.\n주말(토/일)은 weekend_duty 필드 하나로 통합됩니다.\n다음 JSON 배열로만 응답하세요 (설명 없이):\n[{"date": "${yearMonth ?? 'YYYY-MM'}-DD", "regular_duty": "", "er_am": "", "er_pm": "", "night_duty": "", "is_weekend": false, "weekend_duty": "", "year_month": "${yearMonth ?? 'YYYY-MM'}"}]`
  },

  journal: () => `이 이미지는 점심 저널&토픽 일정표입니다. 날짜별 발표자를 JSON 배열로만 추출하세요 (설명 없이):\n[{"date": "YYYY-MM-DD", "presenter": "", "topic": "", "year": YYYY}]`,

  ngr: () => `이 이미지는 인천NGR 일정표입니다. 날짜별 일정과 담당자를 JSON 배열로만 추출하세요 (설명 없이):\n[{"date": "YYYY-MM-DD", "schedule_info": "", "person": "", "year": YYYY}]`,

  dept: (yearMonth) => {
    const ctx = yearMonth
      ? `이 이미지는 ${yearMonth} 신경과 의국 월별 일정표입니다. 모든 날짜는 반드시 ${yearMonth.slice(0,4)}년 ${String(Number(yearMonth.slice(5,7)))}월로 표기하세요.`
      : '이 이미지는 신경과 의국 월별 일정표입니다.'
    return `${ctx} 달력과 하단 목록에서 모든 일정을 추출하세요.\n일정 종류 예시: Epilepsy Conference, 치매집담회, MS & Peripheral Conference, Staff Lecture, NGR 등.\n하단 상세 목록에 날짜와 시간 정보가 있으면 우선 사용하세요.\n다음 JSON 배열로만 응답하세요 (설명 없이):\n[{"date": "${yearMonth ?? 'YYYY-MM'}-DD", "event_name": "", "time": "HH:MM", "location": ""}]`
  },
}

function extractJsonFromText(text: string): unknown[] {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
      // fall through
    }
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch {
      // fall through
    }
  }

  throw new Error('AI 응답에서 JSON을 파싱할 수 없습니다.')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as ScheduleType | null
    const yearMonth = (formData.get('yearMonth') as string | null) ?? undefined

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }
    if (!type || !['duty', 'journal', 'ngr', 'dept'].includes(type)) {
      return NextResponse.json({ error: '유효하지 않은 파일 종류입니다.' }, { status: 400 })
    }

    const mimeType = file.type
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString('base64')

    let imageMimeType = mimeType
    if (mimeType === 'application/pdf') {
      imageMimeType = 'application/pdf'
    }

    const prompt = PROMPTS[type](yearMonth)
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 })
    }

    const MODELS = [
      'google/gemma-3-12b-it:free',
      'google/gemma-3-27b-it:free',
      'qwen/qwen3.6-plus:free',
      'nvidia/nemotron-nano-12b-v2-vl:free',
      'google/gemma-3-4b-it:free',
    ]

    const callOpenRouter = async (model: string) => {
      return fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
          'X-Title': 'ISM Neurology Calendar',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: `data:${imageMimeType};base64,${base64Data}` },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      })
    }

    let aiText = ''
    let lastError = ''

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000))

        const res = await callOpenRouter(model)

        if (res.ok) {
          const json = await res.json()
          aiText = json.choices?.[0]?.message?.content ?? ''
          break
        }

        const errorBody = await res.text()
        lastError = `${model} (HTTP ${res.status}): ${errorBody.slice(0, 200)}`

        if (res.status === 429) {
          await new Promise((r) => setTimeout(r, 1500))
          break
        }

        break
      }

      if (aiText) break
    }

    if (!aiText) {
      console.error('모든 모델 실패:', lastError)
      const isRateLimit = lastError.includes('429')
      return NextResponse.json(
        {
          error: isRateLimit
            ? '무료 AI 모델의 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요. (약 1분 후)'
            : `AI 분석 실패: ${lastError}`,
        },
        { status: 502 }
      )
    }

    const parsedData = extractJsonFromText(aiText)

    return NextResponse.json({ success: true, data: parsedData, raw: aiText })
  } catch (error) {
    console.error('analyze route 오류:', error)
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
