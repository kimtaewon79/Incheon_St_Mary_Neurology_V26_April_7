"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { DayData, DutySchedule, JournalTopic, IncheonNGR, OutpatientSchedule, DepartmentEvent } from "@/types/schedule";

type ScheduleMap = Map<string, DayData>;

interface UseScheduleDataReturn {
  scheduleMap: ScheduleMap;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function buildScheduleMap(
  duty: DutySchedule[], journal: JournalTopic[], ngr: IncheonNGR[],
  outpatient: OutpatientSchedule[], departmentEvents: DepartmentEvent[]
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
  departmentEvents.forEach((e) => {
    const day = getOrCreate(e.date);
    if (!day.department_events) day.department_events = [];
    day.department_events.push(e);
  });

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
      setScheduleMap(buildScheduleMap(json.duty, json.journal, json.ngr, json.outpatient, json.department_events ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const startDate = `${monthKey}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
    void endDate;

    const channel = supabase
      .channel(`calendar-${monthKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "Incheon_St_Mary_Neurology_duty_schedule", filter: `date=gte.${startDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "Incheon_St_Mary_Neurology_journal_topic", filter: `date=gte.${startDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "Incheon_St_Mary_Neurology_incheon_ngr", filter: `date=gte.${startDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "Incheon_St_Mary_Neurology_outpatient", filter: `date=gte.${startDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "Incheon_St_Mary_Neurology_department_event", filter: `date=gte.${startDate}` }, () => fetchData())
      .subscribe((status) => { realtimeConnected.current = status === "SUBSCRIBED"; });

    const pollInterval = setInterval(() => {
      if (!realtimeConnected.current && document.visibilityState === "visible") fetchData();
    }, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [monthKey, year, month, fetchData]);

  return { scheduleMap, loading, error, refetch: fetchData };
}
