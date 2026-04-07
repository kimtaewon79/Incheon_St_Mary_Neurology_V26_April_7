import { clsx } from "clsx";

export type TagVariant =
  | "regular"    // 정규 당직 - 파란색
  | "er-am"      // ER 오전 - 오렌지
  | "er-pm"      // ER 오후 - 앰버
  | "night"      // 야간 당직 - 보라
  | "journal"    // 저널&토픽 - 초록
  | "ngr"        // 인천NGR - 틸
  | "weekend"    // 주말 통합 당직 - 회색
  | "event"      // 의국 일정 - 인디고
  | "outpatient" // 외래 - 로즈
  | "default";   // 기본

interface TagProps {
  variant?: TagVariant;
  label: string;
  className?: string;
}

const variantStyles: Record<TagVariant, string> = {
  regular: "bg-blue-100 text-blue-700",
  "er-am": "bg-orange-100 text-orange-700",
  "er-pm": "bg-amber-100 text-amber-700",
  night: "bg-purple-100 text-purple-700",
  journal: "bg-green-100 text-green-700",
  ngr: "bg-teal-100 text-teal-700",
  weekend: "bg-gray-100 text-gray-600",
  event: "bg-indigo-100 text-indigo-700",
  outpatient: "bg-rose-100 text-rose-700",
  default: "bg-gray-100 text-gray-600",
};

export const tagLabelMap: Record<TagVariant, string> = {
  regular: "정규",
  "er-am": "ER↑",
  "er-pm": "ER↓",
  night: "당직",
  journal: "저널",
  ngr: "NGR",
  weekend: "당직",
  event: "일정",
  outpatient: "외래",
  default: "",
};

export default function Tag({ variant = "default", label, className }: TagProps) {
  return (
    <span
      className={clsx(
        "inline-block text-[9px] md:text-[11px] px-1 md:px-1.5 py-0.5 rounded font-semibold leading-tight whitespace-nowrap",
        variantStyles[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
