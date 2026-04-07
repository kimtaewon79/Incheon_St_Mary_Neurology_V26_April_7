---
name: ISM Calendar Project Context
description: 인천성모병원 신경과 달력 앱 아키텍처, 데이터 흐름, 주요 버그 패턴
type: project
---

앱은 포트 3002에서 실행됨 (포트 3000은 study-04 "냉장고 레시피" 앱이 점유).

**Why:** 여러 Next.js 프로젝트가 동시에 실행 중이며 ism-calendar는 항상 3002 포트를 사용.
**How to apply:** 테스트 시 http://localhost:3002 로 접속할 것. 3000은 다른 앱임.

## 스택
- Next.js 16 (params는 Promise — 반드시 await 필요)
- Supabase (4개 테이블: duty_schedule, journal_topic, incheon_ngr, outpatient)
- Tailwind CSS, Radix UI (Popover)
- TypeScript

## 테이블 구조
- `Incheon_St_Mary_Neurology_duty_schedule`: date, regular_duty, er_am, er_pm, night_duty, is_weekend, weekend_duty
- `Incheon_St_Mary_Neurology_journal_topic`: date, presenter, topic, year
- `Incheon_St_Mary_Neurology_incheon_ngr`: date, schedule_info, person, year
- `Incheon_St_Mary_Neurology_outpatient`: date, am_professors[], pm_professors[], fetched_at

## 핵심 데이터 흐름
GET /api/schedule/[month] → useScheduleData → scheduleMap → CalendarGrid → CalendarCell
편집: useEditMode(onSave) → CalendarCellEditor → /api/schedule/edit (POST)
