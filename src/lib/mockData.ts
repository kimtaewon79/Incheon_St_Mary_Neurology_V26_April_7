import { DutySchedule, JournalTopic, IncheonNGR } from "@/types/schedule";

/**
 * 4월 당직표 Mock 데이터
 */
export const mockDutySchedule: DutySchedule[] = [
  // 4/1 (수)
  {
    date: "2026-04-01",
    regular_duty: "R2, R3, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "송인혁pf./Int",
    is_weekend: false,
  },
  // 4/2 (목)
  {
    date: "2026-04-02",
    regular_duty: "R2, R4",
    er_am: "R2",
    er_pm: "R2",
    night_duty: "R3",
    is_weekend: false,
  },
  // 4/3 (금)
  {
    date: "2026-04-03",
    regular_duty: "R3, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R4, Int",
    is_weekend: false,
  },
  // 4/4 (토) - 주말
  {
    date: "2026-04-04",
    regular_duty: "",
    er_am: "",
    er_pm: "",
    night_duty: "",
    is_weekend: true,
    weekend_duty: "R2",
  },
  // 4/5 (일) - 주말
  {
    date: "2026-04-05",
    regular_duty: "",
    er_am: "",
    er_pm: "",
    night_duty: "",
    is_weekend: true,
    weekend_duty: "R3",
  },
  // 4/6 (월)
  {
    date: "2026-04-06",
    regular_duty: "R2, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R2",
    is_weekend: false,
  },
  // 4/7 (화)
  {
    date: "2026-04-07",
    regular_duty: "R3, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R4",
    is_weekend: false,
  },
  // 4/8 (수)
  {
    date: "2026-04-08",
    regular_duty: "R2, R3, Int",
    er_am: "최운호pf.",
    er_pm: "Int",
    night_duty: "최운호pf./Int",
    is_weekend: false,
  },
  // 4/9 (목)
  {
    date: "2026-04-09",
    regular_duty: "R2, R4",
    er_am: "R4",
    er_pm: "R2",
    night_duty: "R3",
    is_weekend: false,
  },
  // 4/10 (금)
  {
    date: "2026-04-10",
    regular_duty: "R3, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R4",
    is_weekend: false,
  },
  // 4/11 (토) - 주말
  {
    date: "2026-04-11",
    regular_duty: "",
    er_am: "",
    er_pm: "",
    night_duty: "",
    is_weekend: true,
    weekend_duty: "R2, Int",
  },
  // 4/12 (일) - 주말
  {
    date: "2026-04-12",
    regular_duty: "",
    er_am: "",
    er_pm: "",
    night_duty: "",
    is_weekend: true,
    weekend_duty: "R3",
  },
  // 4/13 (월)
  {
    date: "2026-04-13",
    regular_duty: "R2, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R2",
    is_weekend: false,
  },
  // 4/14 (화)
  {
    date: "2026-04-14",
    regular_duty: "R3, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R4",
    is_weekend: false,
  },
  // 4/15 (수)
  {
    date: "2026-04-15",
    regular_duty: "R2, R3, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R3",
    is_weekend: false,
  },
  // 4/16 (목)
  {
    date: "2026-04-16",
    regular_duty: "R2, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "김태원pf./Int",
    is_weekend: false,
  },
  // 4/17 (금)
  {
    date: "2026-04-17",
    regular_duty: "R3, R4",
    er_am: "R3",
    er_pm: "R4",
    night_duty: "R4",
    is_weekend: false,
  },
  // 4/18 (토) - 주말
  {
    date: "2026-04-18",
    regular_duty: "",
    er_am: "",
    er_pm: "",
    night_duty: "",
    is_weekend: true,
    weekend_duty: "R2, Int",
  },
  // 4/19 (일) - 주말
  {
    date: "2026-04-19",
    regular_duty: "",
    er_am: "",
    er_pm: "",
    night_duty: "",
    is_weekend: true,
    weekend_duty: "R3",
  },
  // 4/20 (월)
  {
    date: "2026-04-20",
    regular_duty: "R2, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R2",
    is_weekend: false,
  },
  // 4/21 (화)
  {
    date: "2026-04-21",
    regular_duty: "R3, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R4",
    is_weekend: false,
  },
  // 4/22 (수)
  {
    date: "2026-04-22",
    regular_duty: "R2, R3, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "김영도pf./Int",
    is_weekend: false,
  },
  // 4/23 (목)
  {
    date: "2026-04-23",
    regular_duty: "R2, R4",
    er_am: "R4",
    er_pm: "R2",
    night_duty: "R3",
    is_weekend: false,
  },
  // 4/24 (금)
  {
    date: "2026-04-24",
    regular_duty: "R3, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R4, Int",
    is_weekend: false,
  },
  // 4/25 (토) - 주말
  {
    date: "2026-04-25",
    regular_duty: "",
    er_am: "",
    er_pm: "",
    night_duty: "",
    is_weekend: true,
    weekend_duty: "R2",
  },
  // 4/26 (일) - 주말
  {
    date: "2026-04-26",
    regular_duty: "",
    er_am: "",
    er_pm: "",
    night_duty: "",
    is_weekend: true,
    weekend_duty: "R3",
  },
  // 4/27 (월) - 김인호 휴가
  {
    date: "2026-04-27",
    regular_duty: "R2, R4",
    er_am: "R4",
    er_pm: "R2",
    night_duty: "R2",
    is_weekend: false,
  },
  // 4/28 (화) - 김인호 휴가
  {
    date: "2026-04-28",
    regular_duty: "R3, R4",
    er_am: "R3",
    er_pm: "R3",
    night_duty: "R3",
    is_weekend: false,
  },
  // 4/29 (수)
  {
    date: "2026-04-29",
    regular_duty: "R2, R4, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R4",
    is_weekend: false,
  },
  // 4/30 (목)
  {
    date: "2026-04-30",
    regular_duty: "R2, R3, Int",
    er_am: "Int",
    er_pm: "Int",
    night_duty: "R3",
    is_weekend: false,
  },
];

/**
 * 저널&토픽 Mock 데이터 (매주 화요일 점심)
 */
export const mockJournalTopics: JournalTopic[] = [
  { date: "2026-04-07", presenter: "R2" },
  { date: "2026-04-14", presenter: "R4" },
  { date: "2026-04-21", presenter: "R3" },
  { date: "2026-04-28", presenter: "R1" },
];

/**
 * 인천NGR Mock 데이터
 */
export const mockIncheonNGR: IncheonNGR[] = [
  { date: "2026-04-10", schedule_info: "인천NGR 발표", person: "황일중" },
  { date: "2026-04-24", schedule_info: "인천NGR 케이스", person: "정희섭" },
];

// 외래 Mock 데이터는 Supabase outpatient 테이블로 이전됨 (useScheduleData 참고)

/**
 * 날짜 문자열로 당직 스케쥴을 조회합니다.
 */
export function getDutyByDate(dateKey: string): DutySchedule | undefined {
  return mockDutySchedule.find((d) => d.date === dateKey);
}

/**
 * 날짜 문자열로 저널&토픽을 조회합니다.
 */
export function getJournalByDate(dateKey: string): JournalTopic | undefined {
  return mockJournalTopics.find((j) => j.date === dateKey);
}

/**
 * 날짜 문자열로 인천NGR을 조회합니다.
 */
export function getNGRByDate(dateKey: string): IncheonNGR | undefined {
  return mockIncheonNGR.find((n) => n.date === dateKey);
}
