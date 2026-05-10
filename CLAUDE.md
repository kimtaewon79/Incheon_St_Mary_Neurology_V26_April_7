# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Important:** This project runs Next.js 16. `params` in route handlers and page components are **Promises** — always `await params`. GET route handlers are **dynamic by default** (no static caching).

## Commands

```bash
npm run dev        # Start dev server (runs on :3002 if :3000/:3001 are taken)
npm run build      # Production build + TypeScript check
npm run lint       # ESLint
npx tsc --noEmit   # Type check only
```

## Environment Variables

File: `.env.local` (gitignored)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## Architecture

### Data Flow (read → display)

```
Supabase (6 tables)
  ↓  GET /api/schedule/[month]   (parallel query of all 6 tables)
useScheduleData(year, month)
  → scheduleMap: Map<"YYYY-MM-DD", DayData>  ← O(1) per cell
  → Supabase Realtime subscription on all 6 tables (30s poll fallback)
  ↓
page.tsx → CalendarGrid (horizontal weekly layout: rows = categories, cols = days)
  → Row components for 정규 / ER↑ / ER↓ / 당직 / 저널 / 일정 / 휴가
  → Saturday "정규" row also lists fetched outpatient AM professors
  → hover (non-Saturday) → OutpatientPopover (am_professors[], pm_professors[])
  → today highlight: per-week absolute overlay grid draws a column-wide red border
```

`CalendarCell.tsx` exists in the tree but is **not** imported by `page.tsx` — actual rendering is `CalendarGrid.tsx` only.

### Edit Flow (edit → save → sync)

```
"수정" button → useEditMode (local EditStateMap)
  → 셀 클릭 → CalendarGrid의 EditInput inline (주중) /
              CalendarCellEditor 팝업 (주말 — 토요일은 외래 AM/PM 입력 포함)
  → "저장" → onSave callback
      ↓  POST /api/schedule/edit
      distributes EditableDayData fields to tables:
        regular_duty / er_am / er_pm / night_duty / weekend_duty → duty_schedule
        journal_presenter                                         → journal_topic
        ngr_info ("info - person")                                → incheon_ngr
        event_info ("/" 구분)                                     → department_event (date,event_name 복합 키)
        vacation_person                                           → vacation
        outpatient_am / outpatient_pm (쉼표 구분)                 → outpatient (토요일 수동 편집 경로)
      ↓ Supabase Realtime notifies all connected clients → refetch()
```

### Upload Flow (file → AI → Supabase)

```
/upload page
  → file + type ('duty'|'journal'|'ngr'|'dept')
  → POST /api/analyze   (OpenRouter gemini-2.0-flash-exp:free + 4 fallback free vision models)
  → editable result table
  → POST /api/schedule/save  (upsert on conflict)
  → redirect to /
```

Upload types:
- `duty` — 당직표 (monthly): regular_duty, er_am, er_pm, night_duty, weekend_duty
- `journal` — 저널&토픽 (annual): presenter, topic
- `ngr` — 인천NGR (annual): schedule_info, person
- `dept` — 의국 일정표 (monthly): event_name, time, location

### Supabase Tables

All table names are prefixed `Incheon_St_Mary_Neurology_` (project: `urfitrbofurjmudwmlat`):

| Suffix | Key columns | Conflict key | Update frequency |
|---|---|---|---|
| `duty_schedule` | date, regular_duty, er_am, er_pm, night_duty, is_weekend, weekend_duty | `date` | Monthly upload |
| `journal_topic` | date, presenter, topic, year | `date` | Annual upload |
| `incheon_ngr` | date, schedule_info, person, year | `date` | Annual upload |
| `outpatient` | date, am_professors TEXT[], pm_professors TEXT[], fetched_at | `date` | Daily cron + Saturday manual edit |
| `department_event` | date, event_name, time, location, year_month | `(date, event_name)` | Monthly upload |
| `vacation` | date, person | `date` | Manual edit |

`department_event` uses a composite unique key — same date can have multiple events. Upsert uses `onConflict: 'date,event_name'`. Editing event_info to empty string deletes all events for that date.

### Cleanup Retention Policy (`/api/cleanup`)

Vercel Cron runs `0 0 1 * *` (월 1일 UTC 00:00). Deletes rows older than the 1st of the month **3 months back** for: `duty_schedule`, `journal_topic`, `incheon_ngr`, `department_event`, `vacation`. **Excludes `outpatient`** because future Saturday outpatient rows may be manually entered. Future-dated rows are never deleted.

### Outpatient Auto-Fetch

`GET /api/outpatient/fetch` — fetches `https://www.cmcism.or.kr/treatment/treatment_timetable?deptSeq=33`, parses professor schedules, upserts into `outpatient` table. Triggered by Vercel Cron daily at UTC 21:00 (KST 06:00) via `vercel.json`. **Date authority:** the page's `진료기간 : YYYY-MM-DD ~ YYYY-MM-DD` header is parsed to derive Mon-Sat dates — server clock/timezone is *not* used to infer the week (previous bug: UTC Sunday at cron time computed last week's Monday, shifting all rows back 7 days).

### PDF Export

Uses `window.print()` with `@media print` CSS in `globals.css`. Elements marked `data-print-hide` are hidden during print (title bar, nav buttons, action buttons, edit/error banners, legend, footer). Prints A4 landscape with `print-color-adjust: exact` to preserve tag colors. **Do not use html2canvas** — it fails with Tailwind v4 CSS variables.

## Key Hooks

| Hook | Responsibility |
|---|---|
| `useCalendar` | year/month navigation state, `calendarDays: CalendarDay[]` |
| `useScheduleData(year, month)` | Supabase fetch + Realtime (5 tables) + 30s poll fallback; returns `scheduleMap` |
| `useEditMode(onSave)` | Local edit state, snapshot rollback on cancel, calls `onSave` with diff |
| `usePdfExport` | Calls `window.print()`, manages `exporting` state |

## Color Scheme

Two layers carry color: **Tag chips** (`Tag.tsx`, used in legend on `page.tsx`) and **CalendarGrid rows** (left labels + right cell content). Keep both in sync when editing colors.

### Tag chip variants (`src/components/ui/Tag.tsx`)

| Variant | bg / text | Used for |
|---|---|---|
| `regular` | blue-100 / gray-900 | 정규 당직 |
| `er-am` | orange-100 / gray-900 | ER 오전 |
| `er-pm` | amber-100 / gray-900 | ER 오후 |
| `night` | purple-100 / gray-900 | 야간 당직 |
| `journal` | indigo-100 / indigo-700 | 저널&토픽 (의국일정과 동일) |
| `ngr` | teal-100 / teal-700 | 인천NGR |
| `weekend` | gray-100 / gray-600 | 주말 통합 당직 |
| `event` | indigo-100 / indigo-700 | 의국 일정 (Epilepsy/치매/MS/Staff Lecture 등) |
| `outpatient` | rose-100 / rose-700 | 토요일 외래 |

### CalendarGrid row colors (`src/components/calendar/CalendarGrid.tsx`)

| Row | Label color | Content text color |
|---|---|---|
| 정규 | gray-800 | gray-900 (외래 교수는 rose-700) |
| ER↑ / ER↓ / 당직 | gray-800 | gray-900 |
| 저널 | indigo-600 | indigo-700 |
| 일정 (NGR + 의국 일정 통합) | indigo-600 | indigo-700 |
| 휴가 | pink-600 | per-person hash → `VACATION_COLORS` (셀 전체 bg + text) |

### Today highlight

Each weekly block computes `todayIdx = weekDays.findIndex(d => d.calendarDay.isToday && d.calendarDay.isCurrentMonth)`. If found, an `absolute inset-0 grid` overlay (matching the row grid's `[32px_repeat(7,1fr)] / [48px_repeat(7,1fr)]` columns) renders a `border-2 border-red-500 rounded-sm` div in the today column — drawing a single red rectangle around the entire column from date row to the bottom (휴가) row. The date number cell itself only adds a subtle `bg-red-50` (no ring) to avoid clashing with the overlay border.

## Next.js 16 Specifics

- **`params` is a Promise** in both route handlers and page components — always `await params`
- **Route handlers** use `NextResponse.json()` (already imported from `next/server`)
- **Client components** (`"use client"`) required for all hooks, Radix UI, and event handlers
- **Server components** (`src/app/api/*`) have direct access to `process.env` without `NEXT_PUBLIC_` prefix
- `NEXT_PUBLIC_*` vars are inlined at build time — only these are accessible client-side

## Domain Notes

- `is_weekend: true` → only `weekend_duty` is shown (정규/ER fields are empty); department_events still render on weekends
- Saturday only: `정규` row also displays auto-fetched outpatient AM professors below the manual `regular_duty` value
- Personnel codes: `R1`=이동현, `R2`=양은진, `R3`=황일중, `R4`=정희섭, `Int`=김인호
- Professor names in duty entries may include `pf.` suffix (e.g. `김태원pf.`)
- `ngr_info` in EditableDayData encodes `"schedule_info - person"` — the edit API splits on ` - `
- `event_info` encodes multiple events with `/` separator; empty string → delete all events for that date
- `outpatient_am` / `outpatient_pm` in EditableDayData encode comma-separated professor names (Saturday cell)
- OpenRouter fallback model order: `gemini-2.0-flash-exp:free` → `gemini-2.5-pro-exp-03-25:free` → `qwen2.5-vl-72b-instruct:free` → `llama-4-maverick:free` → `gemma-3-27b-it:free`
