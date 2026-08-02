import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

import type { BenchReportStore } from './report-store';
import type { WriteBenchReportInput } from './src/shared/lab-report';

import { BenchReportValidationError, createReportStore } from './report-store';
import { isBenchReportStatus } from './src/shared/lab-report';

/** Vite Connect 中间件的继续回调 */
export type BenchReportNext = (error?: unknown) => void;

/** Bench 报告 HTTP 处理器 */
export type BenchReportRequestHandler = (
  request: IncomingMessage,
  response: ServerResponse,
  next: BenchReportNext,
) => void;

const reportApiPath = '/__bench/reports';
const maximumBodyBytes = 1024 * 1024;
const writeReportInputKeys = Object.freeze([
  'moduleId',
  'caseId',
  'status',
  'startedAt',
  'completedAt',
  'payload',
] as const);

/** 判断未知值是否为记录 */
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 校验写报告请求体 */
const isWriteReportInput = (value: unknown): value is WriteBenchReportInput =>
  isRecord(value) &&
  Object.keys(value).length === writeReportInputKeys.length &&
  Object.keys(value).every(key => writeReportInputKeys.some(allowedKey => allowedKey === key)) &&
  typeof value.moduleId === 'string' &&
  typeof value.caseId === 'string' &&
  isBenchReportStatus(value.status) &&
  typeof value.startedAt === 'string' &&
  typeof value.completedAt === 'string' &&
  'payload' in value;

/** 读取受大小限制的 JSON 请求体 */
const readJsonBody = async (request: IncomingMessage): Promise<unknown> =>
  new Promise<unknown>((resolve, reject) => {
    const chunks: Array<Buffer> = [];
    let receivedBytes = 0;
    request.on('data', (chunk: Buffer | string) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      receivedBytes += buffer.byteLength;
      if (receivedBytes > maximumBodyBytes) {
        reject(new BenchReportValidationError('Report request body exceeds 1 MiB'));
        request.destroy();
        return;
      }
      chunks.push(buffer);
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown);
      } catch (error) {
        reject(
          new BenchReportValidationError(
            `Invalid report JSON: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    });
    request.on('error', reject);
  });

/** 写入 JSON 响应 */
const sendJson = (response: ServerResponse, status: number, value: unknown): void => {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(`${JSON.stringify(value)}\n`);
};

/** 创建可独立测试的报告 JSON API 处理器 */
export const createBenchReportRequestHandler =
  (store: BenchReportStore): BenchReportRequestHandler =>
  (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== reportApiPath) {
      next();
      return;
    }

    const handle = async (): Promise<void> => {
      if (request.method === 'GET') {
        const moduleId = url.searchParams.get('moduleId');
        const caseId = url.searchParams.get('caseId') ?? undefined;
        const runId = url.searchParams.get('runId') ?? undefined;
        if (moduleId === null) throw new BenchReportValidationError('moduleId query is required');
        if (runId !== undefined) {
          if (caseId === undefined) throw new BenchReportValidationError('caseId query is required when runId is set');
          sendJson(response, 200, { report: await store.readReport({ moduleId, caseId, runId }) });
          return;
        }
        sendJson(response, 200, await store.listReports({ moduleId, ...(caseId === undefined ? {} : { caseId }) }));
        return;
      }
      if (request.method === 'POST') {
        const input = await readJsonBody(request);
        if (!isWriteReportInput(input)) throw new BenchReportValidationError('Report request body is invalid');
        sendJson(response, 201, { report: await store.writeReport(input) });
        return;
      }
      response.setHeader('allow', 'GET, POST');
      sendJson(response, 405, { error: 'Method not allowed' });
    };

    void handle().catch(error => {
      const status = error instanceof BenchReportValidationError ? 400 : 500;
      sendJson(response, status, { error: error instanceof Error ? error.message : String(error) });
    });
  };

/** 创建只服务本地 Bench 报告的 Vite 插件 */
export const createBenchReportPlugin = (resultsRoot: string): Plugin => ({
  name: 'retikz-bench-reports',
  configureServer(server) {
    server.middlewares.use(createBenchReportRequestHandler(createReportStore(resultsRoot)));
  },
});
