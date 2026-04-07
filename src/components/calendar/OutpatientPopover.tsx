"use client";

import { useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { formatFullDate } from "@/lib/calendar";
import { OutpatientSchedule } from "@/types/schedule";

interface OutpatientPopoverProps {
  date: Date;
  children: React.ReactNode;
  outpatient?: OutpatientSchedule;
}

export default function OutpatientPopover({
  date,
  children,
  outpatient,
}: OutpatientPopoverProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 80);
  };

  const amProfessors = outpatient?.am_professors ?? [];
  const pmProfessors = outpatient?.pm_professors ?? [];
  const hasData = amProfessors.length > 0 || pmProfessors.length > 0;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {/* hover 핸들러를 Trigger 래퍼 div에 적용 */}
        <div
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          style={{ display: "contents" }}
        >
          {children}
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          className="z-50 w-60 rounded-lg border border-gray-200 bg-white shadow-lg p-3 text-sm
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
                     data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          sideOffset={4}
          align="start"
          collisionPadding={8}
        >
          {/* 날짜 헤더 */}
          <p className="font-semibold text-gray-800 mb-2 text-xs">
            {formatFullDate(date)} 외래
          </p>

          <hr className="border-gray-100 mb-2" />

          {!hasData ? (
            <p className="text-gray-400 text-center py-1 text-xs">외래 정보 없음</p>
          ) : (
            <div className="space-y-2">
              {amProfessors.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <span>🌅</span> 오전
                  </p>
                  <ul className="pl-4 space-y-0.5">
                    {amProfessors.map((name) => (
                      <li key={name} className="text-gray-700 text-xs">
                        · {name} 교수님
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {amProfessors.length > 0 && pmProfessors.length > 0 && (
                <hr className="border-gray-100" />
              )}

              {pmProfessors.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <span>🌆</span> 오후
                  </p>
                  <ul className="pl-4 space-y-0.5">
                    {pmProfessors.map((name) => (
                      <li key={name} className="text-gray-700 text-xs">
                        · {name} 교수님
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Popover.Arrow className="fill-white stroke-gray-200" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
