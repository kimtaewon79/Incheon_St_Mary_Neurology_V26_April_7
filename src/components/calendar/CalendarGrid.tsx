"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { CalendarDay, DayData, EditableDayData } from "@/types/schedule";
import { formatDateKey } from "@/lib/calendar";
import OutpatientPopover from "./OutpatientPopover";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 휴가자 이름 → 배경색 매핑 (같은 이름 = 같은 색)
const VACATION_COLORS = [
  { bg: "bg-pink-200", text: "text-pink-800" },
  { bg: "bg-sky-200", text: "text-sky-800" },
  { bg: "bg-lime-200", text: "text-lime-800" },
  { bg: "bg-violet-200", text: "text-violet-800" },
  { bg: "bg-amber-200", text: "text-amber-800" },
  { bg: "bg-cyan-200", text: "text-cyan-800" },
  { bg: "bg-rose-200", text: "text-rose-800" },
  { bg: "bg-emerald-200", text: "text-emerald-800" },
  { bg: "bg-fuchsia-200", text: "text-fuchsia-800" },
  { bg: "bg-orange-200", text: "text-orange-800" },
];

function getVacationColor(person: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < person.length; i++) {
    hash = ((hash << 5) - hash + person.charCodeAt(i)) | 0;
  }
  return VACATION_COLORS[Math.abs(hash) % VACATION_COLORS.length];
}

interface CalendarGridProps {
  calendarDays: CalendarDay[];
  getDayData: (dateKey: string) => DayData;
  isEditMode: boolean;
  editingCellDate: string | null;
  getEditData: (dateKey: string) => EditableDayData | undefined;
  onCellClick: (dateKey: string) => void;
  onFieldChange: (dateKey: string, field: keyof EditableDayData, value: string) => void;
  onEditorClose: () => void;
}

type WeekDayInfo = {
  calendarDay: CalendarDay;
  dateKey: string;
  dayData: DayData;
  editData: EditableDayData | undefined;
};

function resolveVal(edit: string | undefined, orig: string | undefined): string {
  return edit !== undefined ? edit : (orig ?? "");
}

function EditInput({ value, onChange, placeholder, dateKey, field }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dateKey: string;
  field: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isDown = e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey);
    const isUp   = e.key === "ArrowUp"   || (e.key === "Tab" && e.shiftKey);

    if (isDown || isUp) {
      e.preventDefault();
      const siblings = Array.from(
        document.querySelectorAll<HTMLInputElement>(`input[data-date="${dateKey}"]`)
      );
      const idx = siblings.findIndex(el => el.dataset.field === field);
      const next = isDown ? idx + 1 : idx - 1;
      if (next >= 0 && next < siblings.length) siblings[next].focus();
      return;
    }

    // 좌/우 화살표: 텍스트 끝/시작에서만 날짜 간 이동
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const el = e.currentTarget;
      const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
      const atEnd   = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
      if ((e.key === "ArrowLeft" && atStart) || (e.key === "ArrowRight" && atEnd)) {
        e.preventDefault();
        const row = Array.from(
          document.querySelectorAll<HTMLInputElement>(`input[data-field="${field}"]`)
        );
        const idx = row.findIndex(el2 => el2.dataset.date === dateKey);
        const next = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
        if (next >= 0 && next < row.length) row[next].focus();
      }
    }
  };

  return (
    <input
      type="text"
      data-date={dateKey}
      data-field={field}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="w-full text-[11px] md:text-sm bg-white border border-blue-200 rounded px-0.5 py-px
                 focus:outline-none focus:border-blue-500 text-gray-800 placeholder:text-gray-300"
    />
  );
}

// 라벨 + 7개 요일 셀 한 줄
function Row({
  label,
  labelColor,
  weekDays,
  isEditMode,
  renderCell,
  bordered,
  isFirstBordered,
}: {
  label: string;
  labelColor?: string;
  weekDays: WeekDayInfo[];
  isEditMode: boolean;
  renderCell: (d: WeekDayInfo) => ReactNode;
  bordered?: boolean;
  isFirstBordered?: boolean;
}) {
  return (
    <div className={clsx(
      "grid grid-cols-[32px_repeat(7,1fr)] md:grid-cols-[48px_repeat(7,1fr)]",
      bordered ? (!isFirstBordered && "border-t border-gray-200") : "border-t border-gray-100"
    )}>
      {/* 라벨 열 */}
      <div className={clsx(
        "flex items-center justify-center px-0.5",
        bordered ? "border-r border-gray-300" : "border-r border-gray-100",
        isEditMode ? "bg-blue-50" : "bg-gray-50"
      )}>
        <span className={clsx(
          "text-[10px] md:text-xs font-semibold leading-tight text-center",
          labelColor ?? "text-gray-500"
        )}>
          {label}
        </span>
      </div>
      {/* 7 요일 셀 */}
      {weekDays.map((d, idx) => (
        <div
          key={d.dateKey}
          className={clsx(
            "px-0.5 py-px min-h-[22px] md:min-h-[26px]",
            !d.calendarDay.isCurrentMonth && "invisible pointer-events-none",
            bordered && idx < 6 && "border-r border-gray-200",
          )}
        >
          {d.calendarDay.isCurrentMonth && renderCell(d)}
        </div>
      ))}
    </div>
  );
}

export default function CalendarGrid(props: CalendarGridProps) {
  const { calendarDays, getDayData, isEditMode, getEditData, onFieldChange } = props;

  // 7일씩 주(week) 단위로 그룹화
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="w-full space-y-1 md:space-y-2">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-[32px_repeat(7,1fr)] md:grid-cols-[48px_repeat(7,1fr)]">
        <div />
        {DAY_LABELS.map((day, idx) => (
          <div key={day} className={clsx(
            "text-center text-sm md:text-base font-semibold py-1",
            idx === 0 && "text-red-500",
            idx === 6 && "text-blue-500",
            idx > 0 && idx < 6 && "text-gray-500"
          )}>
            {day}
          </div>
        ))}
      </div>

      {/* 주(week) 블록 */}
      {weeks.map((week, weekIdx) => {
        const weekDays: WeekDayInfo[] = week.map(cd => {
          const dateKey = formatDateKey(cd.date);
          return {
            calendarDay: cd,
            dateKey,
            dayData: getDayData(dateKey),
            editData: getEditData(dateKey),
          };
        });

        // 이번 주에 저널/일정(NGR+의국) 데이터가 있는지 확인
        const hasJournal = weekDays.some(d =>
          d.calendarDay.isCurrentMonth &&
          resolveVal(d.editData?.journal_presenter, d.dayData.journal?.presenter) !== ""
        );
        const hasVacation = weekDays.some(d =>
          d.calendarDay.isCurrentMonth &&
          resolveVal(d.editData?.vacation_person, d.dayData.vacation?.person) !== ""
        );
        const has일정 = weekDays.some(d => {
          if (!d.calendarDay.isCurrentMonth) return false;
          const ngr = d.dayData.ngr;
          const ngrBase = ngr && (ngr.schedule_info || ngr.person)
            ? `${ngr.schedule_info} - ${ngr.person}` : "";
          const existingEvents = (d.dayData.department_events ?? []).map(e => e.event_name).join(" / ");
          return resolveVal(d.editData?.ngr_info, ngrBase) !== "" ||
                 resolveVal(d.editData?.event_info, existingEvents) !== "";
        });


        return (
          <div key={weekIdx} className="border border-gray-200 rounded overflow-hidden">

            {/* 날짜 번호 행 — 외곽 테두리 + 연한 배경 */}
            <div className="border border-gray-400 rounded-sm">
            <div className="grid grid-cols-[32px_repeat(7,1fr)] md:grid-cols-[48px_repeat(7,1fr)] bg-gray-100">
              <div className="border-r border-gray-300" />
              {weekDays.map(({ calendarDay, dateKey, dayData }, idx) => {
                const { date, isCurrentMonth, isToday, isSunday, isSaturday } = calendarDay;
                const inner = (
                  <div className={clsx(
                    "py-1 md:py-1.5 text-center",
                    !isCurrentMonth && "opacity-20",
                    isToday && isCurrentMonth && "bg-red-100 ring-2 ring-red-400 ring-inset",
                  )}>
                    <span className={clsx(
                      "text-sm md:text-base font-bold",
                      isSunday && "text-red-500",
                      isSaturday && "text-blue-500",
                      !isSunday && !isSaturday && "text-gray-700",
                      isToday && isCurrentMonth && "text-red-700"
                    )}>
                      {date.getDate()}
                    </span>
                  </div>
                );

                const cellWrapper = (child: ReactNode) => (
                  <div key={dateKey} className={clsx(idx < 6 && "border-r border-gray-200")}>
                    {child}
                  </div>
                );

                // 평일·일요일 → hover 팝오버 래핑 (비편집 모드)
                if (!isEditMode && isCurrentMonth && !isSaturday) {
                  return cellWrapper(
                    <OutpatientPopover key={dateKey} date={date} outpatient={dayData.outpatient}>
                      {inner}
                    </OutpatientPopover>
                  );
                }
                return cellWrapper(inner);
              })}
            </div>
            </div>

            {/* 정규/ER/당직 섹션 — 외곽 테두리 강조 */}
            <div className="border border-gray-400 rounded-sm">
            {/* 정규 (토요일엔 외래 교수 표시) */}
            <Row label="정규" bordered isFirstBordered weekDays={weekDays} isEditMode={isEditMode}
              renderCell={(d) => {
                if (d.calendarDay.isSunday) return null;
                if (d.calendarDay.isSaturday) {
                  if (isEditMode) {
                    const val = resolveVal(d.editData?.regular_duty, d.dayData.duty?.regular_duty);
                    return <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "regular_duty", v)} placeholder="담당자" dateKey={d.dateKey} field="regular_duty" />;
                  }
                  // 뷰 모드: 수동 입력값 + 자동 수집 외래 교수 모두 표시
                  const regularVal = d.dayData.duty?.regular_duty;
                  const profs = d.dayData.outpatient?.am_professors ?? [];
                  if (!regularVal && profs.length === 0) return null;
                  return (
                    <>
                      {regularVal && <span className="text-[11px] md:text-[13px] text-gray-800 font-medium block">{regularVal}</span>}
                      {profs.map(n => <span key={n} className="text-[11px] md:text-[13px] text-rose-700 font-medium block">{n}</span>)}
                    </>
                  );
                }
                const val = resolveVal(d.editData?.regular_duty, d.dayData.duty?.regular_duty);
                return isEditMode
                  ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "regular_duty", v)} placeholder="담당자" dateKey={d.dateKey} field="regular_duty" />
                  : val ? <span className="text-[11px] md:text-[13px] text-gray-800 font-medium block">{val}</span> : null;
              }}
            />

            {/* ER↑ */}
            <Row label="ER↑" labelColor="text-orange-500" bordered weekDays={weekDays} isEditMode={isEditMode}
              renderCell={(d) => {
                if (d.calendarDay.isWeekend) return null;
                const val = resolveVal(d.editData?.er_am, d.dayData.duty?.er_am);
                return isEditMode
                  ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "er_am", v)} placeholder="담당자" dateKey={d.dateKey} field="er_am" />
                  : val ? <span className="text-[11px] md:text-[13px] text-orange-700 font-medium block">{val}</span> : null;
              }}
            />

            {/* ER↓ */}
            <Row label="ER↓" labelColor="text-amber-500" bordered weekDays={weekDays} isEditMode={isEditMode}
              renderCell={(d) => {
                if (d.calendarDay.isWeekend) return null;
                const val = resolveVal(d.editData?.er_pm, d.dayData.duty?.er_pm);
                return isEditMode
                  ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "er_pm", v)} placeholder="담당자" dateKey={d.dateKey} field="er_pm" />
                  : val ? <span className="text-[11px] md:text-[13px] text-amber-700 font-medium block">{val}</span> : null;
              }}
            />

            {/* 당직 */}
            <Row label="당직" labelColor="text-purple-600" bordered weekDays={weekDays} isEditMode={isEditMode}
              renderCell={(d) => {
                const val = d.calendarDay.isWeekend
                  ? resolveVal(d.editData?.weekend_duty, d.dayData.duty?.weekend_duty)
                  : resolveVal(d.editData?.night_duty, d.dayData.duty?.night_duty);
                const field: keyof EditableDayData = d.calendarDay.isWeekend ? "weekend_duty" : "night_duty";
                return isEditMode
                  ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, field, v)} placeholder="담당자" dateKey={d.dateKey} field={field} />
                  : val ? <span className="text-[11px] md:text-[13px] text-purple-700 font-medium block">{val}</span> : null;
              }}
            />
            </div>

            {/* 저널 */}
            {(hasJournal || isEditMode) && (
              <Row label="저널" labelColor="text-green-600" weekDays={weekDays} isEditMode={isEditMode}
                renderCell={(d) => {
                  if (d.calendarDay.isWeekend) return null;
                  const val = resolveVal(d.editData?.journal_presenter, d.dayData.journal?.presenter);
                  return isEditMode
                    ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "journal_presenter", v)} placeholder="발표자" dateKey={d.dateKey} field="journal_presenter" />
                    : val ? <span className="text-[11px] md:text-[13px] text-green-700 font-medium block">{val}</span> : null;
                }}
              />
            )}

            {/* 일정 (NGR + 의국 일정 통합) */}
            {(has일정 || isEditMode) && (
              <Row label="일정" labelColor="text-indigo-600" weekDays={weekDays} isEditMode={isEditMode}
                renderCell={(d) => {
                  const ngr = d.dayData.ngr;
                  const ngrBase = ngr && (ngr.schedule_info || ngr.person)
                    ? `${ngr.schedule_info} - ${ngr.person}` : "";
                  const ngrVal = resolveVal(d.editData?.ngr_info, ngrBase);
                  const existingEvents = (d.dayData.department_events ?? []).map(e => e.event_name).join(" / ");
                  const eventVal = resolveVal(d.editData?.event_info, existingEvents);

                  if (isEditMode) {
                    return (
                      <div className="space-y-px">
                        <EditInput value={ngrVal} onChange={(v) => onFieldChange(d.dateKey, "ngr_info", v)} placeholder="NGR" dateKey={d.dateKey} field="ngr_info" />
                        <EditInput value={eventVal} onChange={(v) => onFieldChange(d.dateKey, "event_info", v)} placeholder="일정" dateKey={d.dateKey} field="event_info" />
                      </div>
                    );
                  }
                  const combined = [ngrVal, eventVal].filter(Boolean).join(" / ");
                  return combined
                    ? <span className="text-[11px] md:text-[13px] text-indigo-700 font-medium block truncate">{combined}</span>
                    : null;
                }}
              />
            )}

            {/* 휴가 */}
            {(hasVacation || isEditMode) && (
              <div className="grid grid-cols-[32px_repeat(7,1fr)] md:grid-cols-[48px_repeat(7,1fr)] border-t border-gray-100">
                {/* 라벨 */}
                <div className={clsx(
                  "flex items-center justify-center px-0.5 border-r border-gray-100",
                  isEditMode ? "bg-blue-50" : "bg-gray-50"
                )}>
                  <span className="text-[10px] md:text-xs font-semibold leading-tight text-center text-pink-600">
                    휴가
                  </span>
                </div>
                {/* 7 요일 셀 — 휴가자 있으면 셀 전체 배경색 */}
                {weekDays.map((d) => {
                  if (!d.calendarDay.isCurrentMonth) {
                    return <div key={d.dateKey} className="invisible pointer-events-none min-h-[22px] md:min-h-[26px]" />;
                  }
                  const val = resolveVal(d.editData?.vacation_person, d.dayData.vacation?.person);
                  const color = val ? getVacationColor(val) : null;

                  if (isEditMode) {
                    return (
                      <div
                        key={d.dateKey}
                        className={clsx(
                          "px-0.5 py-px min-h-[22px] md:min-h-[26px]",
                          val && color && color.bg
                        )}
                      >
                        <EditInput
                          value={val}
                          onChange={(v) => onFieldChange(d.dateKey, "vacation_person", v)}
                          placeholder="이름"
                          dateKey={d.dateKey}
                          field="vacation_person"
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={d.dateKey}
                      className={clsx(
                        "px-0.5 py-px min-h-[22px] md:min-h-[26px] flex items-center justify-center",
                        val && color && color.bg
                      )}
                    >
                      {val && color && (
                        <span className={clsx("text-[11px] md:text-[13px] font-bold block text-center", color.text)}>
                          {val}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
