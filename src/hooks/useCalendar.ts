"use client";

import { useState, useMemo } from "react";
import { getCalendarDays } from "@/lib/calendar";
import { CalendarDay } from "@/types/schedule";

interface UseCalendarReturn {
  year: number;
  month: number;
  calendarDays: CalendarDay[];
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
}

/**
 * 달력 년월 네비게이션 상태를 관리하는 훅.
 * 스케쥴 데이터는 useScheduleData 훅에서 별도 관리합니다.
 */
export function useCalendar(): UseCalendarReturn {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);

  const goToPrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else { setMonth((m) => m - 1); }
  };

  const goToNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else { setMonth((m) => m + 1); }
  };

  const goToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  return { year, month, calendarDays, goToPrevMonth, goToNextMonth, goToToday };
}
