import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// outpatient 테이블은 제외 — 토요일 외래 데이터가 미리 수동 입력되어 있어 삭제하면 안 됨
const TABLES = [
  "Incheon_St_Mary_Neurology_duty_schedule",
  "Incheon_St_Mary_Neurology_journal_topic",
  "Incheon_St_Mary_Neurology_incheon_ngr",
  "Incheon_St_Mary_Neurology_department_event",
];

// 유지 기준일: 현재 달 기준 3개월 전의 1일
// 예) 2026-04 실행 → 2026-01-01 이후 데이터 유지, 그 이전 삭제
// 미래 데이터는 삭제하지 않음
function getRetentionStart(): string {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  return from.toISOString().split("T")[0];
}

async function runCleanup() {
  const from = getRetentionStart();
  const results: Record<string, number> = {};

  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .lt("date", from);

    if (error) throw new Error(`${table}: ${error.message}`);
    results[table] = count ?? 0;
  }

  return { retention_from: from, deleted: results };
}

export async function GET() {
  try {
    const result = await runCleanup();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
