import type { ValueOf } from '@retikz/foundation';

/** Bench 本地报告状态 */
export const BenchReportStatus = {
  Passed: 'passed',
  Warning: 'warning',
  Failed: 'failed',
} as const;

/** Bench 本地报告状态取值 */
export type BenchReportStatusValue = ValueOf<typeof BenchReportStatus>;

/** Bench 本地报告 */
export type BenchLabReport = Readonly<{
  schemaVersion: 1;
  runId: string;
  moduleId: string;
  caseId: string;
  status: BenchReportStatusValue;
  startedAt: string;
  completedAt: string;
  payload: unknown;
}>;

/** 报告列表使用的轻量摘要 */
export type BenchReportSummary = Omit<BenchLabReport, 'payload'>;

/** 报告列表与读取诊断 */
export type BenchReportList = Readonly<{
  reports: ReadonlyArray<BenchReportSummary>;
  diagnostics: ReadonlyArray<string>;
}>;

/** 写入本地报告所需的数据 */
export type WriteBenchReportInput = Readonly<{
  moduleId: string;
  caseId: string;
  status: BenchReportStatusValue;
  startedAt: string;
  completedAt: string;
  payload: unknown;
}>;

/** 判断未知值是否为非空记录 */
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 判断未知值是否为有效 ISO 时间 */
const isIsoDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** 判断未知值是否为 Bench 报告状态 */
export const isBenchReportStatus = (value: unknown): value is BenchReportStatusValue =>
  Object.values(BenchReportStatus).some(status => status === value);

/** 校验从文件或 HTTP 返回的本地报告 */
export const isBenchLabReport = (value: unknown): value is BenchLabReport =>
  isRecord(value) &&
  value.schemaVersion === 1 &&
  typeof value.runId === 'string' &&
  typeof value.moduleId === 'string' &&
  typeof value.caseId === 'string' &&
  isBenchReportStatus(value.status) &&
  isIsoDate(value.startedAt) &&
  isIsoDate(value.completedAt) &&
  'payload' in value;

/** 校验报告列表中的轻量摘要 */
export const isBenchReportSummary = (value: unknown): value is BenchReportSummary =>
  isRecord(value) &&
  value.schemaVersion === 1 &&
  typeof value.runId === 'string' &&
  typeof value.moduleId === 'string' &&
  typeof value.caseId === 'string' &&
  isBenchReportStatus(value.status) &&
  isIsoDate(value.startedAt) &&
  isIsoDate(value.completedAt);

/** 校验报告列表 API 响应 */
export const isBenchReportList = (value: unknown): value is BenchReportList =>
  isRecord(value) &&
  Array.isArray(value.reports) &&
  value.reports.every(isBenchReportSummary) &&
  Array.isArray(value.diagnostics) &&
  value.diagnostics.every(diagnostic => typeof diagnostic === 'string');

/** 从完整报告生成列表摘要 */
export const createBenchReportSummary = (report: BenchLabReport): BenchReportSummary =>
  Object.freeze({
    schemaVersion: report.schemaVersion,
    runId: report.runId,
    moduleId: report.moduleId,
    caseId: report.caseId,
    status: report.status,
    startedAt: report.startedAt,
    completedAt: report.completedAt,
  });
