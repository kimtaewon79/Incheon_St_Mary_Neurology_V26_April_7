// 당직 스케쁜 타입
export interface DutySchedule {
  date: string;
  regular_duty: string;
  er_am: string;
  er_pm: string;
  night_duty: string;
  is_weekend: boolean;
  weekend_duty?: string;
}

// 저널&토픽 타입
export interface JournalTopic {
  date: string;
  presenter: string;
  topic?: string;
}

// 인천NGR 타입
export interface IncheonNGR {
  date: string;
  schedule_info: string;
  person: string;
}

// 외래 스케쁜 타입
export interface OutpatientSchedule {
  date: string;
  am_professors: string[];
  pm_professors: string[];
}

// 의국 일정표 이벤트 타입
export interface DepartmentEvent {
  date: string;
  event_name: string;
  time?: string;
  location?: string;
}

// 날짜 단위로 합쳐진 데이터 타입
export interface DayData {
  duty?: DutySchedule;
  journal?: JournalTopic;
  ngr?: IncheonNGR;
  outpatient?: OutpatientSchedule;
  department_events?: DepartmentEvent[];
}

// 달력 날짜 셀 타입
export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSunday: boolean;
  isSaturday: boolean;
}

// 편집 가능한 셀 필드 타입
export interface EditableDayData {
  regular_duty: string;
  er_am: string;
  er_pm: string;
  night_duty: string;
  weekend_duty: string;
  journal_presenter: string;
  ngr_info: string;
}

// 편집 상태 맵 타입
export type EditStateMap = Record<string, EditableDayData>;
