"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";
import { CalendarDay, DayData, EditableDayData } from "@/types/schedule";
import { formatDateKey } from "@/lib/calendar";
import OutpatientPopover from "./OutpatientPopover";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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

function EditInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[9px] md:text-xs bg-white border border-blue-200 rounded px-0.5 py-px
                 focus:outline-none focus:border-blue-500 text-gray-800 placeholder:text-gray-300"
    />
  );
}

function Row({
  label,
  labelColor,
  weekDays,
  isEditMode,
  renderCell,
}: {
  label: string;
  labelColor?: string;
  weekDays: WeekDayInfo[];
  isEditMode: boolean;
  renderCell: (d: WeekDayInfo) => ReactNode;
}) {
  return (
    <div className="grid grid-cols-[32px_repeat(7,1fr)] md:grid-cols-[48px_repeat(7,1fr)] border-t border-gray-100">
      <div className={clsx(
        "flex items-center justify-center px-0.5 border-r border-gray-100",
        isEditMode ? "bg-blue-50" : "bg-gray-50"
      )}>
        <span className={clsx(
          "text-[8px] md:text-[10px] font-semibold leading-tight text-center",
          labelColor ?? "text-gray-500"
        )}>
          {label}
        </span>
      </div>
      {weekDays.map((d) => (
        <div
          key={d.dateKey}
          className={clsx(
            "px-0.5 py-px min-h-[18px] md:min-h-[22px]",
            !d.calendarDay.isCurrentMonth && "invisible pointer-events-none",
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
            "text-center text-xs md:text-sm font-semibold py-1",
            idx === 0 && "text-red-500",
            idx === 6 && "text-blue-500",
            idx > 0 && idx < 6 && "text-gray-500"
          )}>
            {day}
          </div>
        ))}
      </div>

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

        const hasJournal = weekDays.some(d =>
          d.calendarDay.isCurrentMonth &&
          resolveVal(d.editData?.journal_presenter, d.dayData.journal?.presenter) !== ""
        );
        const hasNgr = weekDays.some(d => {
          if (!d.calendarDay.isCurrentMonth) return false;
          const ngr = d.dayData.ngr;
          const base = ngr && (ngr.schedule_info || ngr.person)
            ? `${ngr.schedule_info} - ${ngr.person}` : "";
          return resolveVal(d.editData?.ngr_info, base) !== "";
        });
        const hasEvents = weekDays.some(d =>
          d.calendarDay.isCurrentMonth && (d.dayData.department_events ?? []).length > 0
        );

        return (
          <div key={weekIdx} className="border border-gray-200 rounded overflow-hidden">

            {/* 날짜 번호 행 */}
            <div className="grid grid-cols-[32px_repeat(7,1fr)] md:grid-cols-[48px_repeat(7,1fr)] bg-gray-50">
              <div className="border-r border-gray-200" />
              {weekDays.map(({ calendarDay, dateKey, dayData }) => {
                const { date, isCurrentMonth, isToday, isSunday, isSaturday } = calendarDay;
                const inner = (
                  <div className={clsx(
                    "py-1 md:py-1.5 text-center",
                    !isCurrentMonth && "opacity-20",
                    isToday && isCurrentMonth && "bg-red-50",
                  )}>
                    <span className={clsx(
                      "text-xs md:text-sm font-bold",
                      isSunday && "text-red-500",
                      isSaturday && "text-blue-500",
                      !isSunday && !isSaturday && "text-gray-700",
                      isToday && isCurrentMonth && "text-red-600"
                    )}>
                      {date.getDate()}
                    </span>
                  </div>
                );

                if (!isEditMode && isCurrentMonth && !isSaturday) {
                  return (
                    <OutpatientPopover key={dateKey} date={date} outpatient={dayData.outpatient}>
                      {inner}
                    </OutpatientPopover>
                  );
                }
                return <div key={dateKey}>{inner}</div>;
              })}
            </div>

            {/* 정규 (토요일에는 외래 교수 표시) */}
            <Row label="정규" weekDays={weekDays} isEditMode={isEditMode}
              renderCell={(d) => {
                if (d.calendarDay.isSunday) return null;
                if (d.calendarDay.isSaturday) {
                  const profs = d.dayData.outpatient?.am_professors ?? [];
                  return profs.length > 0
                    ? <>{profs.map(n => <span key={n} className="text-[9px] md:text-[11px] text-rose-700 font-medium block">{n}</span>)}</>
                    : null;
                }
                const val = resolveVal(d.editData?.regular_duty, d.dayData.duty?.regular_duty);
                return isEditMode
                  ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "regular_duty", v)} placeholder="담당자" />
                  : val ? <span className="text-[9px] md:text-[11px] text-gray-800 font-medium block">{val}</span> : null;
              }}
            />

            {/* ER↑ */}
            <Row label="ER↑" labelColor="text-orange-500" weekDays={weekDays} isEditMode={isEditMode}
              renderCell={(d) => {
                if (d.calendarDay.isWeekend) return null;
                const val = resolveVal(d.editData?.er_am, d.dayData.duty?.er_am);
                return isEditMode
                  ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "er_am", v)} placeholder="담당자" />
                  : val ? <span className="text-[9px] md:text-[11px] text-orange-700 font-medium block">{val}</span> : null;
              }}
            />

            {/* ER↓ */}
            <Row label="ER↓" labelColor="text-amber-500" weekDays={weekDays} isEditMode={isEditMode}
              renderCell={(d) => {
                if (d.calendarDay.isWeekend) return null;
                const val = resolveVal(d.editData?.er_pm, d.dayData.duty?.er_pm);
                return isEditMode
                  ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "er_pm", v)} placeholder="담당자" />
                  : val ? <span className="text-[9px] md:text-[11px] text-amber-700 font-medium block">{val}</span> : null;
              }}
            />

            {/* 당직 */}
            <Row label="당직" labelColor="text-purple-600" weekDays={weekDays} isEditMode={isEditMode}
              renderCell={(d) => {
                const val = d.calendarDay.isWeekend
                  ? resolveVal(d.editData?.weekend_duty, d.dayData.duty?.weekend_duty)
                  : resolveVal(d.editData?.night_duty, d.dayData.duty?.night_duty);
                const field: keyof EditableDayData = d.calendarDay.isWeekend ? "weekend_duty" : "night_duty";
                return isEditMode
                  ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, field, v)} placeholder="담당자" />
                  : val ? <span className="text-[9px] md:text-[11px] text-purple-700 font-medium block">{val}</span> : null;
              }}
            />

            {/* 저널 */}
            {(hasJournal || isEditMode) && (
              <Row label="저널" labelColor="text-green-600" weekDays={weekDays} isEditMode={isEditMode}
                renderCell={(d) => {
                  if (d.calendarDay.isWeekend) return null;
                  const val = resolveVal(d.editData?.journal_presenter, d.dayData.journal?.presenter);
                  return isEditMode
                    ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "journal_presenter", v)} placeholder="발표자" />
                    : val ? <span className="text-[9px] md:text-[11px] text-green-700 font-medium block">{val}</span> : null;
                }}
              />
            )}

            {/* NGR */}
            {(hasNgr || isEditMode) && (
              <Row label="NGR" labelColor="text-teal-600" weekDays={weekDays} isEditMode={isEditMode}
                renderCell={(d) => {
                  const ngr = d.dayData.ngr;
                  const base = ngr && (ngr.schedule_info || ngr.person)
                    ? `${ngr.schedule_info} - ${ngr.person}` : "";
                  const val = resolveVal(d.editData?.ngr_info, base);
                  return isEditMode
                    ? <EditInput value={val} onChange={(v) => onFieldChange(d.dateKey, "ngr_info", v)} placeholder="일정" />
                    : val ? <span className="text-[9px] md:text-[11px] text-teal-700 font-medium block truncate">{val}</span> : null;
                }}
              />
            )}

            {/* 의국 일정 — 모든 이벤트를 하나의 행에 표시 */}
            {hasEvents && (
              <Row label="일정" labelColor="text-indigo-600"
                weekDays={weekDays} isEditMode={false}
                renderCell={(d) => {
                  const evs = d.dayData.department_events ?? [];
                  if (evs.length === 0) return null;
                  return (
                    <>
                      {evs.map((ev) => (
                        <span key={ev.event_name} className="text-[9px] md:text-[11px] text-indigo-700 font-medium break-words leading-tight block">
                          {ev.event_name}
                          {ev.time && <span className="text-gray-400 ml-0.5 text-[8px]">{ev.time}</span>}
                        </span>
                      ))}
                    </>
                  );
                }}
              />
            )}

          </div>
        );
      })}
    </div>
  );
}
