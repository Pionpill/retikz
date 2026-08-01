import { useCallback, useEffect, useState } from 'react';

import type { BenchReportSummary } from '../../shared';

import { listBenchReports } from './report-client';

/** 本地报告历史 Hook 返回值 */
export type UseReportHistoryValue = Readonly<{
  reports: ReadonlyArray<BenchReportSummary>;
  diagnostics: ReadonlyArray<string>;
  loading: boolean;
  error?: string;
  refresh: () => void;
}>;

/** 读取当前用例的 ignored 本地报告历史 */
export const useReportHistory = (moduleId: string, caseId?: string): UseReportHistoryValue => {
  const [reports, setReports] = useState<ReadonlyArray<BenchReportSummary>>([]);
  const [diagnostics, setDiagnostics] = useState<ReadonlyArray<string>>([]);
  const [loading, setLoading] = useState(caseId !== undefined);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(current => current + 1), []);

  useEffect(() => {
    let active = true;
    if (caseId === undefined) {
      setReports([]);
      setDiagnostics([]);
      setLoading(false);
      setError(undefined);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError(undefined);
    void listBenchReports(moduleId, caseId)
      .then(result => {
        if (!active) return;
        setReports(result.reports);
        setDiagnostics(result.diagnostics);
      })
      .catch(reason => {
        if (!active) return;
        setReports([]);
        setDiagnostics([]);
        setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId, moduleId, revision]);

  return Object.freeze({ reports, diagnostics, loading, ...(error === undefined ? {} : { error }), refresh });
};
