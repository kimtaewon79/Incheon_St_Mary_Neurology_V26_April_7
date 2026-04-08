"use client";

import { useState, useCallback } from "react";
import { EditableDayData } from "@/types/schedule";

// 편집 상태 맵 타입 (dateString -> EditableDayData)
type EditStateMap = Record<string, EditableDayData>;

// EditableDayData의 기본값
const EMPTY_EDITABLE: EditableDayData = {
  regular_duty: "",
  er_am: "",
  er_pm: "",
  night_duty: "",
  weekend_duty: "",
  journal_presenter: "",
  ngr_info: "",
  event_info: "",
};

interface UseEditModeReturn {
  isEditMode: boolean;
  editingCellDate: string | null; // 현재 편집 중인 셀의 dateKey
  editStateMap: EditStateMap; // 변경된 필드 상태 맵
  enterEditMode: () => void;
  exitEditMode: () => void;
  saveEditMode: () => Promise<void>;
  setEditingCell: (dateKey: string | null) => void;
  updateField: (dateKey: string, field: keyof EditableDayData, value: string, baseData?: EditableDayData) => void;
  getEditData: (dateKey: string) => EditableDayData | undefined;
}

/**
 * 달력 편집 모드 상태를 관리하는 훅
 */
export function useEditMode(
  onSave?: (editStateMap: EditStateMap) => void | Promise<void>
): UseEditModeReturn {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCellDate, setEditingCellDate] = useState<string | null>(null);
  // 편집 중인 데이터를 보관하는 맵
  const [editStateMap, setEditStateMap] = useState<EditStateMap>({});
  // 편집 시작 시점의 스냅샷 (취소 시 롤백용)
  const [snapshot, setSnapshot] = useState<EditStateMap>({});

  const enterEditMode = useCallback(() => {
    // 진입 시 현재 editStateMap을 스냅샷으로 저장해야 취소 시 올바르게 롤백된다.
    // setSnapshot((prev) => ({ ...prev })) 는 이전 snapshot을 그대로 복사할 뿐이므로 틀린 패턴이다.
    setSnapshot(editStateMap);
    setIsEditMode(true);
  }, [editStateMap]);

  const exitEditMode = useCallback(() => {
    // 취소: 스냅샷으로 롤백
    setEditStateMap(snapshot);
    setIsEditMode(false);
    setEditingCellDate(null);
  }, [snapshot]);

  const saveEditMode = useCallback(async () => {
    // 저장: onSave 콜백을 await — 성공 시에만 편집 모드 종료
    // 실패 시 예외가 전파되므로 편집 상태를 유지한다
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
        // 이미 editStateMap에 해당 날짜 엔트리가 있으면 그것을 기반으로,
        // 없으면 baseData(원본 DB 값에서 변환된 값)를 기반으로 초기화한다.
        // 이렇게 해야 한 필드만 수정할 때 다른 필드의 원본 값이 지워지지 않는다.
        const existing = prev[dateKey] ?? baseData ?? EMPTY_EDITABLE;
        return {
          ...prev,
          [dateKey]: {
            ...existing,
            [field]: value,
          },
        };
      });
    },
    []
  );

  const getEditData = useCallback(
    (dateKey: string): EditableDayData | undefined => {
      return editStateMap[dateKey];
    },
    [editStateMap]
  );

  return {
    isEditMode,
    editingCellDate,
    editStateMap,
    enterEditMode,
    exitEditMode,
    saveEditMode,
    setEditingCell,
    updateField,
    getEditData,
  };
}
