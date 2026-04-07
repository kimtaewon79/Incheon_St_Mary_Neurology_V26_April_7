"use client";

import { useCallback, useState } from "react";

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback((_year: number, _month: number) => {
    setExporting(true);
    try {
      window.print();
    } finally {
      // 짧은 딜레이 후 상태 초기화 (인쇄 대화상자가 닫힐 시간 확보)
      setTimeout(() => setExporting(false), 1000);
    }
  }, []);

  return { exportPdf, exporting };
}
