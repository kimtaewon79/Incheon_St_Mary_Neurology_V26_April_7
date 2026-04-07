"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import Button from "@/components/ui/Button";

type FileType = "journal" | "ngr" | "dept";

// 월별 업로드 타입 (년월 지정 필요)
const MONTHLY_TYPES: FileType[] = ["dept"];

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const FILE_TYPE_OPTIONS: { value: FileType; label: string; description: string }[] = [
  { value: "journal", label: "저널&토픽",     description: "점심 저널 클럽 발표 일정 파일 (연간)" },
  { value: "ngr",     label: "인천NGR",      description: "인천 신경과 정기 일정 파일 (연간)" },
  { value: "dept",    label: "의국 일정표",   description: "신경과 전체 의국 월별 일정표 (Epilepsy/치매/MS/Staff Lecture/NGR 등)" },
];

type AnalysisRow = Record<string, string | boolean | number>;
type Status = "idle" | "analyzing" | "analyzed" | "saving" | "saved" | "error";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<FileType | null>(null);
  const [yearMonth, setYearMonth] = useState<string>(currentYearMonth());
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [analysisData, setAnalysisData] = useState<AnalysisRow[]>([]);

  const handleFile = useCallback((f: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setErrorMsg("JPG, PNG, WEBP, PDF 파일만 지원합니다.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
    setAnalysisData([]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleAnalyze = async () => {
    if (!file || !selectedType) return;
    setStatus("analyzing");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", selectedType);
      if (MONTHLY_TYPES.includes(selectedType)) {
        form.append("yearMonth", yearMonth);
      }

      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "AI 분석 실패");
      }

      let rows = json.data as AnalysisRow[];
      // 월별 타입의 경우, AI가 잘못된 년월을 추출했을 수 있으므로 날짜 보정
      if (selectedType && MONTHLY_TYPES.includes(selectedType)) {
        rows = rows.map((row) => {
          const dateStr = String(row.date ?? "");
          // "YYYY-MM-DD" 형식에서 일(day) 부분만 추출해 yearMonth와 합성
          const dayMatch = dateStr.match(/(\d{2})$/);
          const day = dayMatch ? dayMatch[1] : dateStr.slice(-2);
          if (day && /^\d{2}$/.test(day)) {
            return { ...row, date: `${yearMonth}-${day}`, year_month: yearMonth };
          }
          return row;
        });
      }
      setAnalysisData(rows);
      setStatus("analyzed");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
      setStatus("error");
    }
  };

  const handleSave = async () => {
    if (!selectedType || analysisData.length === 0) return;
    setStatus("saving");

    try {
      const res = await fetch("/api/schedule/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, data: analysisData }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "저장 실패");
      }

      setStatus("saved");
      setTimeout(() => router.push("/"), 1500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
      setStatus("error");
    }
  };

  const handleCellEdit = (rowIdx: number, key: string, value: string) => {
    setAnalysisData((prev) =>
      prev.map((row, i) => (i === rowIdx ? { ...row, [key]: value } : row))
    );
  };

  const columnOrder: Record<FileType, string[]> = {
    journal: ["date", "presenter", "topic", "year"],
    ngr:     ["date", "schedule_info", "person", "year"],
    dept:    ["date", "event_name", "time", "location"],
  };

  const columnLabels: Record<string, string> = {
    date: "날짜", regular_duty: "정규", er_am: "ER 오전", er_pm: "ER 오후",
    night_duty: "당직", is_weekend: "주말", weekend_duty: "주말통합",
    presenter: "발표자", topic: "주제", year: "연도",
    schedule_info: "일정", person: "담당자",
    event_name: "일정명", time: "시간", location: "장소",
  };

  const columns = selectedType ? columnOrder[selectedType] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
          <ChevronLeft className="w-4 h-4" />
          메인으로
        </Link>
        <span className="text-base font-bold text-gray-900">스케쥴 파일 업로드</span>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* 1. 파일 종류 선택 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">1. 파일 종류 선택</h2>
          <div className="space-y-2">
            {FILE_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedType === opt.value
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="file-type"
                  value={opt.value}
                  checked={selectedType === opt.value}
                  onChange={() => { setSelectedType(opt.value); setAnalysisData([]); setStatus("idle"); }}
                  className="mt-0.5 accent-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* 1-1. 년월 선택 (월별 업로드 타입에만 표시) */}
        {selectedType && MONTHLY_TYPES.includes(selectedType) && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              1-1. 해당 년월 선택
              <span className="ml-1.5 text-xs font-normal text-red-500">* 정확한 날짜 추출을 위해 필수</span>
            </h2>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:border-blue-400 bg-white"
            />
          </section>
        )}

        {/* 2. 파일 업로드 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">2. 파일 업로드</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
              transition-colors py-10 px-6 text-center cursor-pointer ${
                isDragOver
                  ? "border-blue-400 bg-blue-50"
                  : file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 bg-white hover:border-gray-400"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <>
                <FileText className="w-8 h-8 text-green-500" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-700">{file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setAnalysisData([]); setStatus("idle"); }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-700">파일을 드래그하거나 클릭하여 선택</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP, PDF 지원</p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 3. 분석 버튼 */}
        <Button
          variant="primary"
          size="lg"
          disabled={!file || !selectedType || status === "analyzing" || status === "saving"}
          onClick={handleAnalyze}
          className="w-full"
        >
          {status === "analyzing" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> AI 분석 중...</>
          ) : (
            <><Upload className="w-4 h-4" /> 분석 시작</>
          )}
        </Button>

        {/* 에러 메시지 */}
        {status === "error" && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* 4. 분석 결과 테이블 */}
        {analysisData.length > 0 && selectedType && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              3. 분석 결과 확인 및 수정 <span className="text-xs text-gray-400 font-normal">(셀을 클릭하여 수정 가능)</span>
            </h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-2 py-2 text-left font-medium text-gray-600 whitespace-nowrap border-b border-gray-200">
                        {columnLabels[col] ?? col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysisData.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {columns.map((col) => (
                        <td key={col} className="px-2 py-1 border-b border-gray-100">
                          <input
                            type="text"
                            value={String(row[col] ?? "")}
                            onChange={(e) => handleCellEdit(rowIdx, col, e.target.value)}
                            className="w-full min-w-[60px] bg-transparent border border-transparent rounded
                              hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 py-0.5"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1">{analysisData.length}개 행 인식됨</p>
          </section>
        )}

        {/* 저장 버튼 */}
        {status === "analyzed" && analysisData.length > 0 && (
          <Button
            variant="success"
            size="lg"
            onClick={handleSave}
            disabled={status !== "analyzed"}
            className="w-full"
          >
            저장하기 ({analysisData.length}개 항목을 달력에 반영)
          </Button>
        )}

        {status === "saving" && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            저장 중...
          </div>
        )}

        {status === "saved" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-sm text-green-700 font-medium">저장 완료! 메인 달력으로 이동합니다...</p>
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← 메인 달력으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
