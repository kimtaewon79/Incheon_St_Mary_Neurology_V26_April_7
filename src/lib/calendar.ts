import { CalendarDay } from "@/types/schedule";

/**
 * 해당 년월의 달력 셀 배열을 반환합니다.
 * 항상 42셀(6주×7일)을 반환하며, 이전달/다음달 날짜는 isCurrentMonth=false로 표시됩니다.
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 해당 달 1일의 요일 (0=일, 1=월, ..., 6=토)
  const firstDay = new Date(year, month - 1, 1).getDay();

  // 해당 달의 마지막 날짜
  const lastDate = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // 이전달 날짜 채우기
  const prevMonthLastDate = new Date(year, month - 1, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 2, prevMonthLastDate - i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isSunday: date.getDay() === 0,
      isSaturday: date.getDay() === 6,
    });
  }

  // 이번달 날짜 채우기
  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month - 1, d);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isSunday: date.getDay() === 0,
      isSaturday: date.getDay() === 6,
    });
  }

  // 다음달 날짜 채우기 (42셀 채울 때까지)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month, d);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, today),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isSunday: date.getDay() === 0,
      isSaturday: date.getDay() === 6,
    });
  }

  return days;
}

/**
 * 두 날짜가 같은 날인지 비교합니다.
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Date를 "YYYY-MM-DD" 형식의 문자열로 변환합니다.
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 한국어 날짜 표기 (예: "2026년 4월")
 */
export function formatYearMonth(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

/**
 * 한국어 날짜 풀 표기 (예: "2026년 4월 6일 (월)")
 */
export function formatFullDate(date: Date): string {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = dayNames[date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${day})`;
}
