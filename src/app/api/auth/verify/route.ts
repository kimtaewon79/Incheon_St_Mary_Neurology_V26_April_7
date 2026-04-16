import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json() as { password: string }

    if (!password) {
      return NextResponse.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 })
    }

    const correctPassword = process.env.EDIT_PASSWORD
    if (!correctPassword) {
      return NextResponse.json({ error: '서버에 비밀번호가 설정되지 않았습니다.' }, { status: 500 })
    }

    if (password !== correctPassword) {
      return NextResponse.json({ success: false, error: '비밀번호가 틀렸습니다.' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '인증 오류' }, { status: 500 })
  }
}
