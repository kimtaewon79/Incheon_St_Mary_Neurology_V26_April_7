"use client";

import { useState, useCallback } from "react";
import { EditableDayData } from "@/types/schedule";

type EditStateMap = Record<string, EditableDayData>;

const EMPTY_EDITABLE: EditableDayData = {
  regular_duty: "", er_am: "", er_pm: "", night_duty: "",
  weekend_duty: "", journal_presenter: "", ngr_info: "",
};

interface UseEditModeReturn {
  isEditMode: boolean;
  editingCellDate: string | null;
  editStateMap: EditStateMap;
  enterEditMode: () => void;
  exitEditMode: () => void;
  saveEditMode: () => Promise<void>;
  setEditingCell: (dateKey: string | null) => void;
  updateField: (dateKey: string, field: keyof EditableDayData, value: string, baseData?: EditableDayData) => void;
  getEditData: (dateKey: string) => EditableDayData | undefined;
}

export function useEditMode(
  onSave?: (editStateMap: EditStateMap) => void | Promise<void>
): UseEditModeReturn {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCellDate, setEditingCellDate] = useState<string | null>(null);
  const [editStateMap, setEditStateMap] = useState<EditStateMap>({});
  const [snapshot, setSnapshot] = useState<EditStateMap>({});

  const enterEditMode = useCallback(() => {
    setSnapshot(editStateMap);
    setIsEditMode(true);
  }, [editStateMap]);

  const exitEditMode = useCallback(() => {
    setEditStateMap(snapshot);
    setIsEditMode(false);
    setEditingCellDate(null);
  }, [snapshot]);

  const saveEditMode = useCallback(async () => {
    await onSave?.(editStateMap);
    setSnapshot({ ...editStateMap });
    setIsEditMode(false);
    setEditingCellDate(null);
  }, [editStateMap, onSave]);

  const setEditingCell = useCallback((dateKey: string | null) => {
    setEditingCellDate(dateKey);
  }, []);

  const updateField = useCallback(
    (dateKey: string, field: keyof EditableDayData, value: string, baseData?: EditableDayData) => {
      setEditStateMap((prev) => {
        const existing = prev[dateKey] ?? baseData ?? EMPTY_EDITABLE;
        return { ...prev, [dateKey]: { ...existing, [field]: value } };
      });
    },
    []
  );

  const getEditData = useCallback(
    (dateKey: string): EditableDayData | undefined => editStateMap[dateKey],
    [editStateMap]
  );

  return { isEditMode, editingCellDate, editStateMap, enterEditMode, exitEditMode, saveEditMode, setEditingCell, updateField, getEditData };
}
