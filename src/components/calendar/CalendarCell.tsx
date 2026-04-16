"use client";

import { clsx } from "clsx";
import { CalendarDay, DayData, EditableDayData } from "@/types/schedule";
import { formatDateKey } from "@/lib/calendar";
import Tag from "@/components/ui/Tag";
import OutpatientPopover from "./OutpatientPopover";
import CalendarCellEditor from "./CalendarCellEditor";

interface CalendarCellProps {
  calendarDay: CalendarDay;
  dayData: DayData;
  isEditMode: boolean;
  isEditingThisCell: boolean;
  editData?: EditableDayData;
  onCellClick: (dateKey: string) => void;
  onFieldChange: (field: keyof EditableDayData, value: string) => void;
  onEditorClose: () => void;
}

// 편집 데이터와 원본 데이터 중 우선순위가 높은 값 반환
function resolveValue(editValue: string | undefined, originalValue: string | undefined): string {
  if (editValue !== undefined) return editValue;
  return originalValue ?? "";
}

export default function CalendarCell({
  calendarDay,
  dayData,
  isEditMode,
  isEditingThisCell,
  editData,
  onCellClick,
  onFieldChange,
  onEditorClose,
}: CalendarCellProps) {
  const { date, isCurrentMonth, isToday, isSunday, isSaturday, isWeekend } = calendarDay;
  const { duty, journal, ngr } = dayData;
  const dateKey = formatDateKey(date);

  // 셀 클릭 핸들러 (편집 모드 + 현재 달 셀에서만 작동)
  const handleCellClick = () => {
    if (isEditMode && isCurrentMonth) {
      onCellClick(dateKey);
    }
  };

  // 표시할 값: 편집 데이터가 있으면 우선 사용
  const regularDuty = resolveValue(editData?.regular_duty, duty?.regular_duty);
  const erAm = resolveValue(editData?.er_am, duty?.er_am);
  const erPm = resolveValue(editData?.er_pm, duty?.er_pm);
  const nightDuty = resolveValue(editData?.night_duty, duty?.night_duty);
  const weekendDuty = resolveValue(editData?.weekend_duty, duty?.weekend_duty);
  const journalPresenter = resolveValue(editData?.journal_presenter, journal?.presenter);
  const ngrInfo = resolveValue(
    editData?.ngr_info,
    ngr && (ngr.schedule_info || ngr.person) ? `${ngr.schedule_info} - ${ngr.person}` : ""
  );

  const cellContent = (
    <div
      role="button"
      tabIndex={isCurrentMonth ? 0 : -1}
      aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${isEditMode ? "편집" : "외래 정보 보기"}`}
      onClick={handleCellClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCellClick();
        }
      }}
      className={clsx(
        "relative min-h-[90px] md:min-h-[130px] p-1 md:p-2 rounded border text-left",
        "transition-colors duration-100",
        // 현재 달 여부
        isCurrentMonth
          ? "bg-white border-gray-200 cursor-pointer"
          : clsx(
              "bg-gray-50 border-gray-100 opacity-40",
              // 편집 모드에서 이전/다음달 셀은 클릭 불가임을 명확히 표시
              isEditMode ? "cursor-not-allowed" : "cursor-default"
            ),
        // 오늘 날짜 강조
        isToday && isCurrentMonth && "ring-2 ring-red-500 border-red-200 bg-red-50",
        // 편집 모드 hover — 현재 달 셀에만 적용 (이전/다음달 셀은 hover 제거)
        isEditMode && isCurrentMonth && "hover:bg-blue-50 hover:border-blue-300",
        isEditMode && !isCurrentMonth && "pointer-events-none",
        // 현재 편집 중인 셀
        isEditingThisCell && "border-blue-400 ring-2 ring-blue-300"
      )}
    >
      {/* 날짜 번호 */}
      <div className="flex justify-end mb-0.5">
        <span
          className={clsx(
            "text-xs md:text-sm font-semibold leading-none",
            isSunday && "text-red-500",
            isSaturday && "text-blue-500",
            !isSunday && !isSaturday && "text-gray-700",
            isToday && "text-red-600"
          )}
        >
          {date.getDate()}
        </span>
      </div>

      {/* 편집 모드 + 현재 편집 중인 셀 */}
      {isEditingThisCell && (
        <CalendarCellEditor
          date={date}
          isWeekend={isWeekend}
          duty={duty}
          journal={journal}
          ngr={ngr}
          editData={editData}
          onFieldChange={onFieldChange}
          onClose={onEditorClose}
        />
      )}

      {/* 스케쥴 정보 표시 (편집 중이 아닐 때) */}
      {!isEditingThisCell && isCurrentMonth && (
        <div className="grid grid-cols-[auto_1fr] gap-x-1.5 gap-y-[3px] items-center mt-0.5">
          {isWeekend ? (
            // 주말: 통합 당직 + 토요일 외래 인라인 표시
            <>
              {weekendDuty && (
                <>
                  <Tag variant="weekend" label="당직" />
                  <span className="text-[9px] md:text-[13px] text-gray-700 font-medium leading-tight truncate">{weekendDuty}</span>
                </>
              )}
              {isSaturday && (dayData.outpatient?.am_professors ?? []).map((name) => (
                <>
                  <Tag key={`am-tag-${name}`} variant="outpatient" label="오전" />
                  <span key={`am-name-${name}`} className="text-[9px] md:text-[13px] text-rose-700 font-medium leading-tight truncate">{name}</span>
                </>
              ))}
              {isSaturday && (dayData.outpatient?.pm_professors ?? []).map((name) => (
                <>
                  <Tag key={`pm-tag-${name}`} variant="outpatient" label="오후" />
                  <span key={`pm-name-${name}`} className="text-[9px] md:text-[13px] text-rose-700 font-medium leading-tight truncate">{name}</span>
                </>
              ))}
            </>
          ) : (
            // 평일: 각 필드 표시
            <>
              {regularDuty && (
                <>
                  <Tag variant="regular" label="정규" />
                  <span className="text-[9px] md:text-[13px] text-gray-800 font-medium leading-tight truncate">{regularDuty}</span>
                </>
              )}
              {erAm && (
                <>
                  <Tag variant="er-am" label="ER↑" />
                  <span className="text-[9px] md:text-[13px] text-gray-800 font-medium leading-tight truncate">{erAm}</span>
                </>
              )}
              {erPm && (
                <>
                  <Tag variant="er-pm" label="ER↓" />
                  <span className="text-[9px] md:text-[13px] text-gray-800 font-medium leading-tight truncate">{erPm}</span>
                </>
              )}
              {nightDuty && (
                <>
                  <Tag variant="night" label="당직" />
                  <span className="text-[9px] md:text-[13px] text-gray-800 font-medium leading-tight truncate">{nightDuty}</span>
                </>
              )}
            </>
          )}

          {/* 저널&토픽 (요일 무관) */}
          {journalPresenter && (
            <>
              <Tag variant="journal" label="저널" />
              <span className="text-[9px] md:text-[13px] text-gray-800 font-medium leading-tight truncate">{journalPresenter}</span>
            </>
          )}

          {/* 인천NGR */}
          {ngrInfo && (
            <>
              <Tag variant="ngr" label="NGR" />
              <span className="text-[9px] md:text-[13px] text-gray-800 font-medium leading-tight truncate">{ngrInfo}</span>
            </>
          )}

          {/* 의국 일정 */}
          {(dayData.department_events ?? []).map((ev) => (
            <>
              <Tag key={`tag-${ev.event_name + ev.date}`} variant="event" label="일정" />
              <span key={`name-${ev.event_name + ev.date}`} className="text-[9px] md:text-[13px] text-indigo-800 font-medium leading-tight truncate">
                {ev.event_name}
                {ev.time && <span className="text-gray-400 font-normal ml-1 text-[11px]">{ev.time}</span>}
              </span>
            </>
          ))}
        </div>
      )}

      {/* 편집 모드 표시 오버레이 힌트 */}
      {isEditMode && isCurrentMonth && !isEditingThisCell && (
        <div className="absolute inset-0 rounded opacity-0 hover:opacity-100 transition-opacity
                        flex items-end justify-center pb-1 pointer-events-none">
          <span className="text-[10px] font-medium text-blue-600 bg-blue-100 border border-blue-200
                           px-1.5 py-0.5 rounded shadow-sm">
            ✎ 편집
          </span>
        </div>
      )}
    </div>
  );

  // 토요일은 외래를 셀 안에 직접 표시 — 팝오버 불필요
  // 그 외 평일/일요일은 호버 팝오버 래핑
  if (!isEditMode && isCurrentMonth && !isSaturday) {
    return (
      <OutpatientPopover
        date={date}
        outpatient={dayData.outpatient}
      >
        {cellContent}
      </OutpatientPopover>
    );
  }

  return cellContent;
}
