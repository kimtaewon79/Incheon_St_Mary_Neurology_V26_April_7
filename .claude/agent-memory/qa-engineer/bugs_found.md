---
name: ISM Calendar Bug Patterns
description: 발견된 버그 패턴 및 수정 이력
type: project
---

## 수정된 버그 목록 (2026-04-06)

### BUG-01 (Critical): useEditMode - 필드 편집 시 다른 필드 원본값 소실
**위치:** src/hooks/useEditMode.ts `updateField`
**증상:** 정규 당직 필드를 수정하면 ER↑, 당직 등 나머지 필드의 원본 DB값이 빈 문자열로 초기화됨
**원인:** `prev[dateKey] ?? EMPTY_EDITABLE` — editStateMap에 해당 날짜가 없으면 EMPTY_EDITABLE로 초기화, 원본 DB 값을 baseData로 받지 않음
**수정:** updateField 시그니처에 `baseData?: EditableDayData` 추가, page.tsx의 handleFieldChange에서 getDayData()로 원본 데이터를 buildBaseEditData()로 변환하여 전달

### BUG-02 (High): useEditMode - enterEditMode 스냅샷 저장 오류
**위치:** src/hooks/useEditMode.ts `enterEditMode`
**증상:** 저장 후 재편집 → 취소 시 올바른 시점으로 롤백 안 됨
**원인:** `setSnapshot((prev) => ({ ...prev }))` — 이전 snapshot을 그대로 복사, 현재 editStateMap을 스냅샷으로 저장하지 않음
**수정:** `setSnapshot(editStateMap)` 으로 변경 및 useCallback 의존성에 editStateMap 추가

### BUG-03 (High): useEditMode - saveEditMode에서 state updater 안에서 side effect 호출
**위치:** src/hooks/useEditMode.ts `saveEditMode`
**증상:** `setSnapshot` updater 함수 내부에서 `onSave?.(editStateMap)` 호출 — React 순수 updater 위반, 중복 호출 가능
**수정:** onSave를 setSnapshot 밖으로 분리

### BUG-04 (High): isSaving prop 미전달
**위치:** src/app/page.tsx CalendarHeader 사용부
**증상:** 저장 중 CalendarHeader의 저장 버튼에 스피너가 표시되지 않음
**수정:** `isSaving={saving}` prop 추가

### BUG-05 (Medium): NGR 빈 레코드 표시 오류
**위치:** CalendarCell.tsx, CalendarCellEditor.tsx, page.tsx buildBaseEditData
**증상:** schedule_info=""이고 person=""인 NGR 레코드가 있을 때 달력에 "NGR -" 표시
**수정:** `ngr && (ngr.schedule_info || ngr.person)` 조건으로 둘 다 빈 경우 빈 문자열 반환

### BUG-06 (Medium): edit API - is_weekend 판단 오류
**위치:** src/app/api/schedule/edit/route.ts
**증상:** `is_weekend: !!(data.weekend_duty)` — weekend_duty를 비워서 저장하면 주말 날짜가 is_weekend=false로 저장됨
**수정:** 날짜 문자열에서 요일을 계산하여 is_weekend 결정

## 미발견/정상 동작 항목
- OutpatientPopover: Radix UI Portal 렌더링 정상
- API 응답 형식: 모두 정상
- 모바일 반응형: 390x844에서 정상 렌더링
- 업로드 페이지 라디오/버튼 비활성화: 정상
- 콘솔 에러: 0건 (의도적 400 호출 제외)
