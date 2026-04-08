import { NextRequest, NextResponse } from 'next/server'

type ScheduleType = 'duty' | 'journal' | 'ngr' | 'dept'

type PromptFn = (yearMonth?: string) => string

const PROMPTS: Record<ScheduleType, PromptFn> = {
  duty: (yearMonth) => {
    const ym = yearMonth ?? 'YYYY-MM'
    const ctx = yearMonth
      ? `이 이미지는 ${yearMonth} 신경과 당직표입니다. 모든 날짜는 반드시 ${yearMonth.slice(0,4)}년 ${String(Number(yearMonth.slice(5,7)))}월로 표기하세요.`
      : '이 이미지는 신경과 당직표입니다.'
    return `${ctx}

표를 행(row)별로 꼼꼼히 읽어 날짜별 담당자를 추출하세요.
- R1·R2·R3·R4: 레지던트 1~4년차 / int: 인턴 / pf. 포함 이름: 교수
- 평일: regular_duty(정규), er_am(ER오전), er_pm(ER오후), night_duty(야간당직)
- 토/일: weekend_duty 하나로 통합, is_weekend: true
- 담당자가 없는 칸은 빈 문자열("")로 두세요.
- 날짜를 절대 누락하거나 혼동하지 마세요.

JSON 배열로만 응답하세요 (마크다운·설명 없이):
[{"date":"${ym}-DD","regular_duty":"","er_am":"","er_pm":"","night_duty":"","is_weekend":false,"weekend_duty":"","year_month":"${ym}"}]`
  },

  journal: () => `이 이미지는 점심 저널&토픽 일정표입니다.

표를 행별로 꼼꼼히 읽어 날짜·발표자·주제를 추출하세요.
- 날짜 형식: YYYY-MM-DD
- 발표자가 없는 날은 포함하지 마세요.

JSON 배열로만 응답하세요 (마크다운·설명 없이):
[{"date":"YYYY-MM-DD","presenter":"","topic":"","year":YYYY}]`,

  ngr: () => `이 이미지는 인천NGR 일정표입니다.

표를 행별로 꼼꼼히 읽어 날짜·일정명·담당자를 추출하세요.
- 날짜 형식: YYYY-MM-DD
- 일정이 없는 날은 포함하지 마세요.

JSON 배열로만 응답하세요 (마크다운·설명 없이):
[{"date":"YYYY-MM-DD","schedule_info":"","person":"","year":YYYY}]`,

  dept: (yearMonth) => {
    const ym = yearMonth ?? 'YYYY-MM'
    const ctx = yearMonth
      ? `이 이미지는 ${yearMonth} 신경과 의국 월별 일정표입니다. 모든 날짜는 반드시 ${yearMonth.slice(0,4)}년 ${String(Number(yearMonth.slice(5,7)))}월로 표기하세요.`
      : '이 이미지는 신경과 의국 월별 일정표입니다.'
    return `${ctx}

달력 칸과 하단 상세 목록을 모두 읽어 모든 일정을 빠짐없이 추출하세요.
- 일정 예시: Epilepsy Conference, 치매집담회, MS & Peripheral Conference, Staff Lecture, NGR 등
- 하단 목록에 시간·장소가 있으면 우선 사용하세요.
- 같은 날 일정이 여러 개면 각각 별도 객체로 추가하세요.

JSON 배열로만 응답하세요 (마크다운·설명 없이):
[{"date":"${ym}-DD","event_name":"","time":"HH:MM","location":""}]`
  },
}

function extractJsonFromText(text: string): unknown[] {
  // ```json ... ``` 블록 처리
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
      // fall through
    }
  }

  // 배열 직접 파싱
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

    // PDF인 경우 이미지로 처리 (base64 그대로 전송, vision 모델이 처리)
    // 이미지 MIME 타입 정규화
    let imageMimeType = mimeType
    if (mimeType === 'application/pdf') {
      imageMimeType = 'application/pdf'
    }

    const prompt = PROMPTS[type](yearMonth)
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 })
    }

    // 순서대로 시도할 무료 비전 모델 목록 (rate limit 초과 시 다음 모델로 fallback)
    // 표/스케쥴 이미지 인식에 강한 모델 우선
    const MODELS = [
      'google/gemini-2.0-flash-exp:free',        // 1순위: 속도+품질 균형, 한국어 우수
      'google/gemini-2.5-pro-exp-03-25:free',    // 2순위: 최고 품질 (느릴 수 있음)
      'qwen/qwen2.5-vl-72b-instruct:free',       // 3순위: 문서/표 이해 특화
      'meta-llama/llama-4-maverick:free',        // 4순위: 멀티모달 강함
      'google/gemma-3-27b-it:free',              // 5순위: 최후 fallback
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
      // 429 rate limit 시 2초 대기 후 재시도 (최대 2회)
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
          // rate limit — 다음 모델로 넘어가기 전에 잠깐 대기
          await new Promise((r) => setTimeout(r, 1500))
          break  // 이 모델 재시도 중단, 다음 모델 시도
        }

        // 그 외 에러 (400, 500 등)는 즉시 다음 모델로
        break
      }

      if (aiText) break  // 성공한 모델이 있으면 중단
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
