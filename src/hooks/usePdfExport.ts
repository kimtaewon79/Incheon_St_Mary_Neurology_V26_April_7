"use client";

import { useCallback, useState } from "react";

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback((_year: number, _month: number) => {
    setExporting(true);
    try {
      window.print();
    } finally {
      setTimeout(() => setExporting(false), 1000);
    }
  }, []);

  return { exportPdf, exporting };
}
