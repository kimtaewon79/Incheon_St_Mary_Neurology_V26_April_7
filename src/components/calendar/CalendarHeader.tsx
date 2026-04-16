"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Loader2, Lock } from "lucide-react";
import { formatYearMonth } from "@/lib/calendar";
import Button from "@/components/ui/Button";

interface CalendarHeaderProps {
  year: number;
  month: number;
  isEditMode: boolean;
  isSaving?: boolean;
  isExporting?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onExportPdf: () => void;
}

export default function CalendarHeader({
  year,
  month,
  isEditMode,
  isSaving = false,
  isExporting = false,
  onPrevMonth,
  onNextMonth,
  onToday,
  onEditStart,
  onEditSave,
  onEditCancel,
  onExportPdf,
}: CalendarHeaderProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleEditClick = () => {
    setShowPasswordModal(true);
    setPassword("");
    setPasswordError("");
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setPasswordError("비밀번호를 입력해주세요.");
      return;
    }
    setVerifying(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowPasswordModal(false);
        setPassword("");
        onEditStart();
      } else {
        setPasswordError(json.error ?? "비밀번호가 틀렸습니다.");
      }
    } catch {
      setPasswordError("인증 중 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePasswordSubmit();
    } else if (e.key === "Escape") {
      setShowPasswordModal(false);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between gap-2 px-2 py-3 bg-white border-b border-gray-200">
        {/* 네비게이션: 이전달 / 년월 / 다음달 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevMonth}
            aria-label="이전달"
            data-print-hide
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base md:text-lg font-bold text-gray-800 min-w-[100px] md:min-w-[130px] text-center">
            {formatYearMonth(year, month)}
          </h1>

          <button
            onClick={onNextMonth}
            aria-label="다음달"
            data-print-hide
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 우측 액션 버튼 */}
        <div data-print-hide className="flex items-center gap-2">
          {/* 오늘 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            aria-label="오늘로 이동"
          >
            오늘
          </Button>

          {/* PDF 내보내기 버튼 — 편집 모드가 아닐 때만 표시 */}
          {!isEditMode && (
            <button
              onClick={onExportPdf}
              disabled={isExporting}
              aria-label="PDF로 내보내기"
              title="PDF로 내보내기"
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                         text-gray-600 hover:text-red-600 hover:bg-red-50
                         border border-gray-200 hover:border-red-200
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isExporting ? "생성 중..." : "PDF"}
              </span>
            </button>
          )}

          {/* 편집 모드 버튼 */}
          {isEditMode ? (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={onEditSave}
                loading={isSaving}
                aria-label="변경사항 저장"
              >
                저장
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onEditCancel}
                disabled={isSaving}
                aria-label={isSaving ? "저장 중 — 취소 불가" : "편집 취소"}
                title={isSaving ? "저장이 완료된 후 취소할 수 있습니다" : undefined}
              >
                {isSaving ? (
                  <span className="flex items-center gap-1 text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    대기 중
                  </span>
                ) : (
                  "취소"
                )}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleEditClick}
              aria-label="편집 모드 시작"
            >
              수정
            </Button>
          )}
        </div>
      </header>

      {/* 비밀번호 입력 모달 */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-[320px] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-gray-800">
              <Lock className="w-5 h-5 text-blue-500" />
              <h2 className="text-sm font-bold">편집 모드 잠금</h2>
            </div>
            <p className="text-xs text-gray-500">
              수정하려면 비밀번호를 입력해주세요.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handlePasswordKeyDown}
              placeholder="비밀번호 입력"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPasswordModal(false)}
              >
                취소
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePasswordSubmit}
                loading={verifying}
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
