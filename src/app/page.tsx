"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Upload, RefreshCw, AlertCircle } from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";
import { useEditMode } from "@/hooks/useEditMode";
import { useScheduleData } from "@/hooks/useScheduleData";
import { usePdfExport } from "@/hooks/usePdfExport";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import { CalendarSkeleton } from "@/components/ui/LoadingSkeleton";
import { DayData, EditableDayData } from "@/types/schedule";

export default function HomePage() {
  const { year, month, calendarDays, goToPrevMonth, goToNextMonth, goToToday } =
    useCalendar();

  const { scheduleMap, loading, error, refetch } = useScheduleData(year, month);
  const { exportPdf, exporting } = usePdfExport();

  // 저장 중 상태 및 토스트 메시지
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const {
    isEditMode,
    editingCellDate,
    editStateMap,
    enterEditMode,
    exitEditMode,
    saveEditMode,
    setEditingCell,
    updateField,
    getEditData,
  } = useEditMode(async (edits) => {
    if (Object.keys(edits).length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/schedule/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edits }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "저장 실패");
      showToast("success", `${json.updated}개 항목이 저장되었습니다.`);
      // Realtime이 없을 경우 수동 refetch
      refetch();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "저장 중 오류 발생");
    } finally {
      setSaving(false);
    }
  });

  // Supabase 데이터 + 편집 상태 병합
  const getDayData = useCallback(
    (dateKey: string): DayData => {
      return scheduleMap.get(dateKey) ?? {};
    },
    [scheduleMap]
  );

  const handleCellClick = (dateKey: string) => {
    if (isEditMode) {
      setEditingCell(editingCellDate === dateKey ? null : dateKey);
    }
  };

  // DayData에서 EditableDayData 형태의 초기값을 생성
  const buildBaseEditData = (dayData: DayData): EditableDayData => {
    const { duty, journal, ngr, vacation } = dayData;
    return {
      regular_duty: duty?.regular_duty ?? "",
      er_am: duty?.er_am ?? "",
      er_pm: duty?.er_pm ?? "",
      night_duty: duty?.night_duty ?? "",
      weekend_duty: duty?.weekend_duty ?? "",
      journal_presenter: journal?.presenter ?? "",
      ngr_info: ngr && (ngr.schedule_info || ngr.person) ? `${ngr.schedule_info} - ${ngr.person}` : "",
      event_info: (dayData.department_events ?? []).map(e => e.event_name).join(" / "),
      vacation_person: vacation?.person ?? "",
    };
  };

  const handleFieldChange = (dateKey: string, field: keyof EditableDayData, value: string) => {
    // editStateMap에 해당 날짜 항목이 없을 때, 원본 DB 데이터를 기반으로 초기화
    const baseData = buildBaseEditData(getDayData(dateKey));
    updateField(dateKey, field, value, baseData);
  };

  // 편집 저장 시 Supabase 저장 포함 — saveEditMode가 Promise를 반환하므로 void로 처리
  const handleSave = () => {
    void saveEditMode();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 앱 타이틀 바 */}
      <div data-print-hide className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base md:text-lg font-bold text-gray-900">
            인천성모병원 신경과
          </span>
          <span className="hidden md:inline text-sm text-gray-400">|</span>
          <span className="hidden md:inline text-sm text-gray-500">스케쥴 달력</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 새로고침 버튼 */}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-40"
            aria-label="데이터 새로고침"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 hover:text-blue-600
                       transition-colors px-2 py-1 rounded hover:bg-blue-50"
            aria-label="스케쥴 파일 업로드 페이지로 이동"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">업로드</span>
          </Link>
        </div>
      </div>

      {/* 토스트 알림 — bottom 배치로 모바일 상단 노치/알림바 간섭 방지 */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {toast && (
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>

      {/* 달력 영역 */}
      <main id="calendar-export-area" className="max-w-screen-xl mx-auto px-1 md:px-4 py-2 md:py-4">
        {/* 달력 헤더 */}
        <CalendarHeader
          year={year}
          month={month}
          isEditMode={isEditMode}
          isSaving={saving}
          isExporting={exporting}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onToday={goToToday}
          onEditStart={enterEditMode}
          onEditSave={handleSave}
          onEditCancel={exitEditMode}
          onExportPdf={() => exportPdf(year, month)}
        />

        {/* 편집 모드 안내 배너 */}
        {isEditMode && (
          <div
            role="alert"
            data-print-hide
            className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs md:text-sm text-blue-700"
          >
            편집 모드 — 날짜 셀을 클릭하여 수정하고, 완료 후 [저장]을 눌러주세요.
            {saving && <span className="ml-2 text-blue-500">저장 중...</span>}
          </div>
        )}

        {/* 에러 배너 */}
        {error && !loading && (
          <div data-print-hide className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
            <button onClick={refetch} className="ml-auto underline hover:no-underline">
              재시도
            </button>
          </div>
        )}

        {/* 달력 그리드 */}
        <div className="mt-2 md:mt-3">
          {loading && scheduleMap.size === 0 ? (
            <CalendarSkeleton />
          ) : (
            <CalendarGrid
              calendarDays={calendarDays}
              getDayData={getDayData}
              isEditMode={isEditMode}
              editingCellDate={editingCellDate}
              getEditData={getEditData}
              onCellClick={handleCellClick}
              onFieldChange={handleFieldChange}
              onEditorClose={() => setEditingCell(null)}
            />
          )}
        </div>

        {/* 범례 */}
        <div data-print-hide className="mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-3 px-1">
          <LegendItem color="bg-blue-100 text-blue-700" label="정규 당직" />
          <LegendItem color="bg-orange-100 text-orange-700" label="ER 오전" />
          <LegendItem color="bg-amber-100 text-amber-700" label="ER 오후" />
          <LegendItem color="bg-purple-100 text-purple-700" label="야간 당직" />
          <LegendItem color="bg-green-100 text-green-700" label="저널&amp;토픽" />
          <LegendItem color="bg-teal-100 text-teal-700" label="인천NGR" />
          <LegendItem color="bg-gray-100 text-gray-600" label="주말 통합 당직" />
          <LegendItem color="bg-indigo-100 text-indigo-700" label="의국 일정" />
          <LegendItem color="bg-rose-100 text-rose-700" label="토요일 외래" />
          <LegendItem color="bg-pink-200 text-pink-800" label="휴가" />
        </div>

        {/* 데이터 없을 때 안내 */}
        {!loading && scheduleMap.size === 0 && !error && (
          <div className="mt-4 text-center text-sm text-gray-400 py-6">
            이 달의 스케쥴 데이터가 없습니다.{" "}
            <Link href="/upload" className="text-blue-500 hover:underline">
              파일을 업로드
            </Link>
            하여 추가하세요.
          </div>
        )}

        <div data-print-hide className="mt-3 md:mt-4 px-1 pb-4">
          <p className="text-[10px] md:text-xs text-gray-400">
            R1: 이동현 · R2: 양은진 · R3: 황일중 · R4: 정희섭 · Int: 김인호
          </p>
        </div>
      </main>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>
        {label}
      </span>
    </div>
  );
}
