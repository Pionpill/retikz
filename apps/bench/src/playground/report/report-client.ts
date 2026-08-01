import type { BenchLabReport, BenchReportList, WriteBenchReportInput } from '../../shared';
import type { LabRunSession } from '../modules/core';

import { BenchReportStatus, isBenchLabReport, isBenchReportList } from '../../shared';
import { LabOutcome } from '../modules/core';

/** 报告客户端使用的 Fetch 边界 */
export type BenchReportFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const reportApiPath = '/__bench/reports';

/** 根据明确的 diagnostics 与 fallback 证据生成本地报告状态 */
export const createLabSessionReportStatus = (
  session: LabRunSession,
): (typeof BenchReportStatus)[keyof typeof BenchReportStatus] =>
  session.results.some(result => result.outcome === LabOutcome.Fallback || result.diagnostics.length > 0)
    ? BenchReportStatus.Warning
    : BenchReportStatus.Passed;

/** 从失败响应中读取稳定错误信息 */
const readResponseError = async (response: Response): Promise<string> => {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // 非 JSON 错误响应回退到 HTTP 状态
  }
  return `Report API request failed with ${response.status.toString()}`;
};

/** 请求当前模块或用例的本地报告摘要 */
export const listBenchReports = async (
  moduleId: string,
  caseId?: string,
  fetcher: BenchReportFetch = fetch,
): Promise<BenchReportList> => {
  const query = new URLSearchParams({ moduleId });
  if (caseId !== undefined) query.set('caseId', caseId);
  const response = await fetcher(`${reportApiPath}?${query.toString()}`);
  if (!response.ok) throw new Error(await readResponseError(response));
  const value: unknown = await response.json();
  if (!isBenchReportList(value)) throw new Error('Report list response is invalid');
  return value;
};

/** 把一次用例运行保存到本地报告目录 */
export const saveBenchReport = async (
  input: WriteBenchReportInput,
  fetcher: BenchReportFetch = fetch,
): Promise<BenchLabReport> => {
  const response = await fetcher(reportApiPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await readResponseError(response));
  const value: unknown = await response.json();
  if (typeof value !== 'object' || value === null || !('report' in value) || !isBenchLabReport(value.report)) {
    throw new Error('Report write response is invalid');
  }
  return value.report;
};
