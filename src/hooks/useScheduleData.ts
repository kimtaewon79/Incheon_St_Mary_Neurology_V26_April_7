"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  DayData,
  DutySchedule,
  JournalTopic,
  IncheonNGR,
  OutpatientSchedule,
  DepartmentEvent,
  VacationSchedule,
} from "@/types/schedule";

type ScheduleMap = Map<string, DayData>;

interface UseScheduleDataReturn {
  scheduleMap: ScheduleMap;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildScheduleMap(
  duty: DutySchedule[],
  journal: JournalTopic[],
  ngr: IncheonNGR[],
  outpatient: OutpatientSchedule[],
  departmentEvents: DepartmentEvent[],
  vacation: VacationSchedule[]
): ScheduleMap {
  const map = new Map<string, DayData>();

  const getOrCreate = (date: string): DayData => {
    if (!map.has(date)) map.set(date, {});
    return map.get(date)!;
  };

  duty.forEach((d) => { getOrCreate(d.date).duty = d; });
  journal.forEach((j) => { getOrCreate(j.date).journal = j; });
  ngr.forEach((n) => { getOrCreate(n.date).ngr = n; });
  outpatient.forEach((o) => { getOrCreate(o.date).outpatient = o; });
  // 의국 일정: 같은 날짜에 여러 개 가능
  departmentEvents.forEach((e) => {
    const day = getOrCreate(e.date);
    if (!day.department_events) day.department_events = [];
    day.department_events.push(e);
  });
  vacation.forEach((v) => { getOrCreate(v.date).vacation = v; });

  return map;
}

export function useScheduleData(year: number, month: number): UseScheduleDataReturn {
  const [scheduleMap, setScheduleMap] = useState<ScheduleMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const realtimeConnected = useRef(false);

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/${monthKey}`);
      if (!res.ok) throw new Error(`데이터 조회 실패: ${res.status}`);
      const json = await res.json();
      setScheduleMap(
        buildScheduleMap(json.duty, json.journal, json.ngr, json.outpatient, json.department_events ?? [], json.vacation ?? [])
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  // 월 변경 시 데이터 재조회
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Supabase Realtime 구독 (4개 테이블)
  useEffect(() => {
    const startDate = `${monthKey}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

    const channel = supabase
      .channel(`calendar-${monthKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Incheon_St_Mary_Neurology_duty_schedule",
          filter: `date=gte.${startDate}`,
        },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Incheon_St_Mary_Neurology_journal_topic",
          filter: `date=gte.${startDate}`,
        },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Incheon_St_Mary_Neurology_incheon_ngr",
          filter: `date=gte.${startDate}`,
        },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Incheon_St_Mary_Neurology_outpatient",
          filter: `date=gte.${startDate}`,
        },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Incheon_St_Mary_Neurology_department_event",
          filter: `date=gte.${startDate}`,
        },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Incheon_St_Mary_Neurology_vacation",
          filter: `date=gte.${startDate}`,
        },
        () => fetchData()
      )
      .subscribe((status) => {
        realtimeConnected.current = status === "SUBSCRIBED";
      });

    // 폴링 fallback: Realtime 미연결 + 탭이 visible 상태일 때만 30초마다 재조회
    const pollInterval = setInterval(() => {
      if (!realtimeConnected.current && document.visibilityState === "visible") fetchData();
    }, 30_000);

    // 필터 경고 방지용 (endDate 참조)
    void endDate;

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [monthKey, year, month, fetchData]);

  return { scheduleMap, loading, error, refetch: fetchData };
}
