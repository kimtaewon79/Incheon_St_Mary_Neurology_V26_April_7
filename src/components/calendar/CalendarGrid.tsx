"use client";

import { clsx } from "clsx";
import { CalendarDay, DayData, EditableDayData } from "@/types/schedule";
import { formatDateKey } from "@/lib/calendar";
import CalendarCell from "./CalendarCell";

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

export default function CalendarGrid({
  calendarDays,
  getDayData,
  isEditMode,
  editingCellDate,
  getEditData,
  onCellClick,
  onFieldChange,
  onEditorClose,
}: CalendarGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-0.5 md:mb-1">
        {DAY_LABELS.map((day, idx) => (
          <div
            key={day}
            className={clsx(
              "py-1.5 text-center text-xs md:text-sm font-semibold rounded",
              idx === 0 && "text-red-500",
              idx === 6 && "text-blue-500",
              idx > 0 && idx < 6 && "text-gray-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 md:gap-1">
        {calendarDays.map((calendarDay) => {
          const dateKey = formatDateKey(calendarDay.date);
          const dayData = getDayData(dateKey);
          const editData = getEditData(dateKey);
          const isEditingThisCell = editingCellDate === dateKey;

          return (
            <CalendarCell
              key={dateKey}
              calendarDay={calendarDay}
              dayData={dayData}
              isEditMode={isEditMode}
              isEditingThisCell={isEditingThisCell}
              editData={editData}
              onCellClick={onCellClick}
              onFieldChange={(field, value) => onFieldChange(dateKey, field, value)}
              onEditorClose={onEditorClose}
            />
          );
        })}
      </div>
    </div>
  );
}
