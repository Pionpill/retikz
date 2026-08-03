import { useCallback, useEffect, useState } from 'react';

import type { BenchLabReport, BenchReportSummary } from '../../shared';

import { getBenchReport, listBenchReports } from './report-client';

/** 当前选择的报告身份 */
type SelectedReportIdentity = Readonly<{
  moduleId: string;
  caseId: string;
  runId: string;
}>;

/** 本地报告历史 Hook 返回值 */
export type UseReportHistoryValue = Readonly<{
  reports: ReadonlyArray<BenchReportSummary>;
  diagnostics: ReadonlyArray<string>;
  loading: boolean;
  error?: string;
  selectedRunId?: string;
  selectedReport?: BenchLabReport;
  detailLoading: boolean;
  detailError?: string;
  selectReport: (runId: string) => void;
  refresh: () => void;
}>;

/** 读取当前用例的 ignored 本地报告历史 */
export const useReportHistory = (moduleId: string, caseId?: string): UseReportHistoryValue => {
  const [reports, setReports] = useState<ReadonlyArray<BenchReportSummary>>([]);
  const [diagnostics, setDiagnostics] = useState<ReadonlyArray<string>>([]);
  const [loading, setLoading] = useState(caseId !== undefined);
  const [error, setError] = useState<string>();
  const [selection, setSelection] = useState<SelectedReportIdentity>();
  const [selectedReport, setSelectedReport] = useState<BenchLabReport>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(current => current + 1), []);
  const selectReport = useCallback(
    (runId: string) => {
      if (caseId === undefined) return;
      setSelection(Object.freeze({ moduleId, caseId, runId }));
    },
    [caseId, moduleId],
  );

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

  useEffect(() => {
    let active = true;
    if (selection === undefined) {
      setSelectedReport(undefined);
      setDetailLoading(false);
      setDetailError(undefined);
      return () => {
        active = false;
      };
    }
    setSelectedReport(undefined);
    setDetailLoading(true);
    setDetailError(undefined);
    void getBenchReport(selection.moduleId, selection.caseId, selection.runId)
      .then(report => {
        if (active) setSelectedReport(report);
      })
      .catch(reason => {
        if (active) setDetailError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selection]);

  const selectionMatchesCurrentCase = selection?.moduleId === moduleId && selection.caseId === caseId;
  const visibleSelectedReport =
    selectionMatchesCurrentCase && selectedReport?.runId === selection.runId ? selectedReport : undefined;

  return Object.freeze({
    reports,
    diagnostics,
    loading,
    ...(error === undefined ? {} : { error }),
    ...(selectionMatchesCurrentCase ? { selectedRunId: selection.runId } : {}),
    ...(visibleSelectedReport === undefined ? {} : { selectedReport: visibleSelectedReport }),
    detailLoading: selectionMatchesCurrentCase && detailLoading,
    ...(selectionMatchesCurrentCase && detailError !== undefined ? { detailError } : {}),
    selectReport,
    refresh,
  });
};
