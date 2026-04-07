"use client";

import { useEffect, useRef } from "react";
import { EditableDayData } from "@/types/schedule";
import { formatDateKey } from "@/lib/calendar";
import { DutySchedule, JournalTopic, IncheonNGR } from "@/types/schedule";

interface CalendarCellEditorProps {
  date: Date;
  isWeekend: boolean;
  // 원본 데이터 (편집 전 초기값으로 사용)
  duty?: DutySchedule;
  journal?: JournalTopic;
  ngr?: IncheonNGR;
  // 편집 중인 값 (editStateMap에서 가져옴)
  editData?: EditableDayData;
  onFieldChange: (field: keyof EditableDayData, value: string) => void;
  onClose: () => void;
}

// 인라인 편집 인풋 컴포넌트
function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[9px] md:text-[10px] text-gray-400 font-medium leading-none">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[10px] md:text-xs border border-blue-300 rounded px-1 py-0.5
                   focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-800
                   placeholder:text-gray-300"
      />
    </div>
  );
}

export default function CalendarCellEditor({
  date,
  isWeekend,
  duty,
  journal,
  ngr,
  editData,
  onFieldChange,
  onClose,
}: CalendarCellEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 초기값: editData가 있으면 그 값, 없으면 원본 데이터 값 사용
  const getValue = (
    editField: keyof EditableDayData,
    originalValue?: string
  ): string => {
    if (editData && editField in editData) {
      return editData[editField];
    }
    return originalValue ?? "";
  };

  // 외부 클릭 감지 (편집 종료)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 bg-blue-50 border-2 border-blue-400 rounded p-1 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="space-y-1">
        {isWeekend ? (
          // 주말: 통합 당직만 편집
          <FieldInput
            label="당직"
            value={getValue("weekend_duty", duty?.weekend_duty)}
            onChange={(v) => onFieldChange("weekend_duty", v)}
            placeholder="담당자"
          />
        ) : (
          // 평일: 각 필드 편집
          <>
            <FieldInput
              label="정규"
              value={getValue("regular_duty", duty?.regular_duty)}
              onChange={(v) => onFieldChange("regular_duty", v)}
              placeholder="담당자"
            />
            <FieldInput
              label="ER↑"
              value={getValue("er_am", duty?.er_am)}
              onChange={(v) => onFieldChange("er_am", v)}
              placeholder="담당자"
            />
            <FieldInput
              label="ER↓"
              value={getValue("er_pm", duty?.er_pm)}
              onChange={(v) => onFieldChange("er_pm", v)}
              placeholder="담당자"
            />
            <FieldInput
              label="당직"
              value={getValue("night_duty", duty?.night_duty)}
              onChange={(v) => onFieldChange("night_duty", v)}
              placeholder="담당자"
            />
          </>
        )}

        {/* 저널&토픽 */}
        <FieldInput
          label="저널"
          value={getValue("journal_presenter", journal?.presenter)}
          onChange={(v) => onFieldChange("journal_presenter", v)}
          placeholder="발표자"
        />

        {/* 인천NGR */}
        <FieldInput
          label="NGR"
          value={getValue(
            "ngr_info",
            ngr && (ngr.schedule_info || ngr.person) ? `${ngr.schedule_info} - ${ngr.person}` : ""
          )}
          onChange={(v) => onFieldChange("ngr_info", v)}
          placeholder="일정 정보"
        />
      </div>
    </div>
  );
}
