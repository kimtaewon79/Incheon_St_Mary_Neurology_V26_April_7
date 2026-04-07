"use client";

import { ChevronLeft, ChevronRight, FileDown, Loader2 } from "lucide-react";
import { formatYearMonth } from "@/lib/calendar";
import Button from "@/components/ui/Button";

interface CalendarHeaderProps {
  year: number;
  month: number;
  isEditMode: boolean;
  isSaving?: boolean;
  isExporting?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onExportPdf: () => void;
}

export default function CalendarHeader({
  year, month, isEditMode, isSaving = false, isExporting = false,
  onPrevMonth, onNextMonth, onToday, onEditStart, onEditSave, onEditCancel, onExportPdf,
}: CalendarHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 px-2 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-1">
        <button onClick={onPrevMonth} aria-label="이전달" data-print-hide className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base md:text-lg font-bold text-gray-800 min-w-[100px] md:min-w-[130px] text-center">
          {formatYearMonth(year, month)}
        </h1>
        <button onClick={onNextMonth} aria-label="다음달" data-print-hide className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div data-print-hide className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onToday} aria-label="오늘로 이동">오늘</Button>

        {!isEditMode && (
          <button
            onClick={onExportPdf}
            disabled={isExporting}
            aria-label="PDF로 내보내기"
            title="PDF로 내보내기"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                       text-gray-600 hover:text-red-600 hover:bg-red-50
                       border border-gray-200 hover:border-red-200
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isExporting ? "생성 중..." : "PDF"}</span>
          </button>
        )}

        {isEditMode ? (
          <>
            <Button variant="success" size="sm" onClick={onEditSave} loading={isSaving} aria-label="변경사항 저장">저장</Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onEditCancel}
              disabled={isSaving}
              aria-label={isSaving ? "저장 중 — 취소 불가" : "편집 취소"}
              title={isSaving ? "저장이 완료된 후 취소할 수 있습니다" : undefined}
            >
              {isSaving ? (
                <span className="flex items-center gap-1 text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  대기 중
                </span>
              ) : "취소"}
            </Button>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={onEditStart} aria-label="편집 모드 시작">수정</Button>
        )}
      </div>
    </header>
  );
}
