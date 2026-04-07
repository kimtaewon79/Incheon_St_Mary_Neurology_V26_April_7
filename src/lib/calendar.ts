import { CalendarDay } from "@/types/schedule";

export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];

  const prevMonthLastDate = new Date(year, month - 1, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 2, prevMonthLastDate - i);
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today), isWeekend: date.getDay() === 0 || date.getDay() === 6, isSunday: date.getDay() === 0, isSaturday: date.getDay() === 6 });
  }

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(year, month - 1, d);
    days.push({ date, isCurrentMonth: true, isToday: isSameDay(date, today), isWeekend: date.getDay() === 0 || date.getDay() === 6, isSunday: date.getDay() === 0, isSaturday: date.getDay() === 6 });
  }

  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month, d);
    days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today), isWeekend: date.getDay() === 0 || date.getDay() === 6, isSunday: date.getDay() === 0, isSaturday: date.getDay() === 6 });
  }

  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

export function formatFullDate(date: Date): string {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = dayNames[date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${day})`;
}
