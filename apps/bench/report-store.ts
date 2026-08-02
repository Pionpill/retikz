import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { BenchLabReport, BenchReportList, WriteBenchReportInput } from './src/shared/lab-report';

import { createBenchReportSummary, isBenchLabReport, isBenchReportStatus } from './src/shared/lab-report';

/** 查询本地报告的过滤条件 */
export type ListBenchReportsInput = Readonly<{
  moduleId: string;
  caseId?: string;
}>;

/** 读取单份本地报告所需的稳定标识 */
export type ReadBenchReportInput = Readonly<{
  moduleId: string;
  caseId: string;
  runId: string;
}>;

/** 本地报告存储接口 */
export type BenchReportStore = Readonly<{
  writeReport: (input: WriteBenchReportInput) => Promise<BenchLabReport>;
  listReports: (input: ListBenchReportsInput) => Promise<BenchReportList>;
  readReport: (input: ReadBenchReportInput) => Promise<BenchLabReport>;
}>;

/** 本地报告存储构造选项 */
export type CreateReportStoreOptions = Readonly<{
  /** 测试可注入的运行标识生成器 */
  createRunId?: () => string;
}>;

/** 报告输入不满足稳定存储契约 */
export class BenchReportValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'BenchReportValidationError';
  }
}

const safeSegmentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 校验会进入文件路径的稳定标识 */
const assertSafeSegment = (label: string, value: string): void => {
  if (!safeSegmentPattern.test(value)) throw new BenchReportValidationError(`Invalid ${label}: ${value}`);
};

/** 校验报告时间字段 */
const assertIsoDate = (label: string, value: string): void => {
  if (!Number.isFinite(Date.parse(value))) throw new BenchReportValidationError(`Invalid ${label}: ${value}`);
};

/** 创建适合作为目录名的运行标识 */
const createDefaultRunId = (): string => {
  const timestamp = new Date().toISOString().replaceAll(/[-:.]/g, '').replace('Z', 'z').toLowerCase();
  return `${timestamp}-${randomUUID().slice(0, 8)}`;
};

/** 校验完整报告与其存储路径身份一致 */
const parseStoredReport = (value: unknown, identity: ReadBenchReportInput): BenchLabReport => {
  if (!isBenchLabReport(value)) throw new BenchReportValidationError('Report schema is invalid');
  if (value.moduleId !== identity.moduleId || value.caseId !== identity.caseId || value.runId !== identity.runId) {
    throw new BenchReportValidationError('Report identity does not match its storage path');
  }
  return value;
};

/** 返回目录中的子目录名 */
const listDirectories = async (directory: string): Promise<ReadonlyArray<string>> => {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
};

/** 创建以报告文件为真源的本地存储 */
export const createReportStore = (resultsRoot: string, options: CreateReportStoreOptions = {}): BenchReportStore => {
  const runsRoot = join(resultsRoot, 'runs');
  const createRunId = options.createRunId ?? createDefaultRunId;

  const writeReport = async (input: WriteBenchReportInput): Promise<BenchLabReport> => {
    assertSafeSegment('moduleId', input.moduleId);
    assertSafeSegment('caseId', input.caseId);
    if (!isBenchReportStatus(input.status)) throw new BenchReportValidationError(`Invalid status: ${input.status}`);
    assertIsoDate('startedAt', input.startedAt);
    assertIsoDate('completedAt', input.completedAt);
    const runId = createRunId();
    assertSafeSegment('runId', runId);
    const report: BenchLabReport = Object.freeze({ ...input, schemaVersion: 1, runId });
    const reportDirectory = join(runsRoot, input.moduleId, input.caseId, runId);
    await mkdir(reportDirectory, { recursive: true });
    const reportPath = join(reportDirectory, 'report.json');
    const temporaryPath = join(reportDirectory, `.report-${randomUUID()}.tmp`);
    let serialized: string;
    try {
      serialized = `${JSON.stringify(report, null, 2)}\n`;
    } catch (error) {
      throw new BenchReportValidationError(
        `Report payload is not JSON serializable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await writeFile(temporaryPath, serialized, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, reportPath);
    return report;
  };

  const listReports = async (input: ListBenchReportsInput): Promise<BenchReportList> => {
    assertSafeSegment('moduleId', input.moduleId);
    if (input.caseId !== undefined) assertSafeSegment('caseId', input.caseId);
    const moduleDirectory = join(runsRoot, input.moduleId);
    const caseIds = input.caseId === undefined ? await listDirectories(moduleDirectory) : [input.caseId];
    const reports = [];
    const diagnostics: Array<string> = [];
    for (const caseId of caseIds) {
      const caseDirectory = join(moduleDirectory, caseId);
      for (const runId of await listDirectories(caseDirectory)) {
        const reportPath = join(caseDirectory, runId, 'report.json');
        try {
          const parsed: unknown = JSON.parse(await readFile(reportPath, 'utf8'));
          reports.push(
            createBenchReportSummary(parseStoredReport(parsed, { moduleId: input.moduleId, caseId, runId })),
          );
        } catch (error) {
          diagnostics.push(
            `${relative(resultsRoot, reportPath)}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
    reports.sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt));
    return Object.freeze({ reports: Object.freeze(reports), diagnostics: Object.freeze(diagnostics) });
  };

  const readReport = async (input: ReadBenchReportInput): Promise<BenchLabReport> => {
    assertSafeSegment('moduleId', input.moduleId);
    assertSafeSegment('caseId', input.caseId);
    assertSafeSegment('runId', input.runId);
    const reportPath = join(runsRoot, input.moduleId, input.caseId, input.runId, 'report.json');
    const parsed: unknown = JSON.parse(await readFile(reportPath, 'utf8'));
    return parseStoredReport(parsed, input);
  };

  return Object.freeze({ writeReport, listReports, readReport });
};
