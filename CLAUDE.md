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
Supabase (5 tables)
  ↓  GET /api/schedule/[month]   (parallel query of all 5 tables)
useScheduleData(year, month)
  → scheduleMap: Map<"YYYY-MM-DD", DayData>  ← O(1) per cell
  → Supabase Realtime subscription on all 5 tables (30s poll fallback)
  ↓
page.tsx → CalendarGrid → CalendarCell
  → tags rendered from DayData.duty / .journal / .ngr / .department_events[]
  → hover → OutpatientPopover (DayData.outpatient: am_professors[], pm_professors[])
```

### Edit Flow (edit → save → sync)

```
"수정" button → useEditMode (local EditStateMap)
  → cell click → CalendarCellEditor (inline inputs)
  → "저장" → onSave callback
      ↓  POST /api/schedule/edit
      distributes EditableDayData fields to correct tables:
        regular_duty / er_am / er_pm / night_duty / weekend_duty → duty_schedule
        journal_presenter                                         → journal_topic
        ngr_info ("info - person")                               → incheon_ngr
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
| `outpatient` | date, am_professors TEXT[], pm_professors TEXT[], fetched_at | `date` | Daily cron |
| `department_event` | date, event_name, time, location, year_month | `(date, event_name)` | Monthly upload |

`department_event` uses a composite unique key — same date can have multiple events. Upsert uses `onConflict: 'date,event_name'`.

### Outpatient Auto-Fetch

`GET /api/outpatient/fetch` — fetches `https://www.cmcism.or.kr/treatment/treatment_timetable?deptSeq=33`, parses professor schedules, upserts into `outpatient` table. Triggered by Vercel Cron weekly Sunday UTC 21:00 (KST 06:00) via `vercel.json`.

### PDF Export

Uses `window.print()` with `@media print` CSS in `globals.css`. Elements marked `data-print-hide` are hidden during print (title bar, nav buttons, action buttons, edit/error banners, legend, footer). Prints A4 landscape with `print-color-adjust: exact` to preserve tag colors. **Do not use html2canvas** — it fails with Tailwind v4 CSS variables.

## Key Hooks

| Hook | Responsibility |
|---|---|
| `useCalendar` | year/month navigation state, `calendarDays: CalendarDay[]` |
| `useScheduleData(year, month)` | Supabase fetch + Realtime (5 tables) + 30s poll fallback; returns `scheduleMap` |
| `useEditMode(onSave)` | Local edit state, snapshot rollback on cancel, calls `onSave` with diff |
| `usePdfExport` | Calls `window.print()`, manages `exporting` state |

## Tag Variants & Colors

| Variant | Color | Usage |
|---|---|---|
| `regular` | blue | 정규 당직 |
| `er-am` | orange | ER 오전 |
| `er-pm` | amber | ER 오후 |
| `night` | purple | 야간 당직 |
| `journal` | green | 저널&토픽 |
| `ngr` | teal | 인천NGR |
| `weekend` | gray | 주말 통합 당직 |
| `event` | indigo | 의국 일정 (Epilepsy/치매/MS/Staff Lecture 등) |

## Next.js 16 Specifics

- **`params` is a Promise** in both route handlers and page components — always `await params`
- **Route handlers** use `NextResponse.json()` (already imported from `next/server`)
- **Client components** (`"use client"`) required for all hooks, Radix UI, and event handlers
- **Server components** (`src/app/api/*`) have direct access to `process.env` without `NEXT_PUBLIC_` prefix
- `NEXT_PUBLIC_*` vars are inlined at build time — only these are accessible client-side

## Domain Notes

- `is_weekend: true` → only `weekend_duty` is shown (정규/ER fields are empty); department_events still render on weekends
- Personnel codes: `R1`=이동현, `R2`=양은진, `R3`=황일중, `R4`=정희섭, `Int`=김인호
- Professor names in duty entries may include `pf.` suffix (e.g. `김태원pf.`)
- `ngr_info` in EditableDayData encodes `"schedule_info - person"` — the edit API splits on ` - `
- OpenRouter fallback model order: `gemini-2.0-flash-exp:free` → `gemini-2.5-pro-exp-03-25:free` → `qwen2.5-vl-72b-instruct:free` → `llama-4-maverick:free` → `gemma-3-27b-it:free`
