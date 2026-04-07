import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const TABLES = [
  "Incheon_St_Mary_Neurology_duty_schedule",
  "Incheon_St_Mary_Neurology_journal_topic",
  "Incheon_St_Mary_Neurology_incheon_ngr",
  "Incheon_St_Mary_Neurology_department_event",
  "Incheon_St_Mary_Neurology_outpatient",
];

// 현재 달 기준 전달 1일 ~ 다음달 말일 범위 계산
function getRetentionWindow(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0); // 다음달 말일
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(from), to: fmt(to) };
}

async function runCleanup() {
  const { from, to } = getRetentionWindow();
  const results: Record<string, number> = {};

  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .or(`date.lt.${from},date.gt.${to}`);

    if (error) throw new Error(`${table}: ${error.message}`);
    results[table] = count ?? 0;
  }

  return { window: { from, to }, deleted: results };
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
