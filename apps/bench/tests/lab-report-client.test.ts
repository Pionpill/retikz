import { describe, expect, it } from 'vitest';

import {
  createLabSessionReportStatus,
  getBenchReport,
  listBenchReports,
  saveBenchReport,
} from '../src/playground/report/report-client';

const report = {
  schemaVersion: 1 as const,
  runId: 'run-1',
  moduleId: 'kernel',
  caseId: 'single-entity-update',
  status: 'passed' as const,
  startedAt: '2026-08-01T00:00:00.000Z',
  completedAt: '2026-08-01T00:00:01.000Z',
  payload: { sessionId: 'session-1' },
};

describe('Bench report client', () => {
  it('使用稳定 API 保存并列出用例报告', async () => {
    const requests: Array<Readonly<{ url: string; method: string; body?: string }>> = [];
    const fetcher = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      requests.push(
        Object.freeze({
          url,
          method: init?.method ?? 'GET',
          ...(typeof init?.body === 'string' ? { body: init.body } : {}),
        }),
      );
      return Promise.resolve(
        url.includes('?')
          ? new Response(JSON.stringify({ reports: [{ ...report, payload: undefined }], diagnostics: [] }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            })
          : new Response(JSON.stringify({ report }), {
              status: 201,
              headers: { 'content-type': 'application/json' },
            }),
      );
    };

    await expect(
      saveBenchReport(
        {
          moduleId: report.moduleId,
          caseId: report.caseId,
          status: report.status,
          startedAt: report.startedAt,
          completedAt: report.completedAt,
          payload: report.payload,
        },
        fetcher,
      ),
    ).resolves.toEqual(report);
    await expect(listBenchReports('kernel', 'single-entity-update', fetcher)).resolves.toMatchObject({
      reports: [{ runId: 'run-1', status: 'passed' }],
      diagnostics: [],
    });
    expect(requests).toEqual([
      expect.objectContaining({ url: '/__bench/reports', method: 'POST' }),
      {
        url: '/__bench/reports?moduleId=kernel&caseId=single-entity-update',
        method: 'GET',
      },
    ]);
  });

  it('拒绝服务端错误和损坏的列表响应', async () => {
    const errorFetcher = (): Promise<Response> =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'disk full' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      );
    await expect(listBenchReports('kernel', undefined, errorFetcher)).rejects.toThrow('disk full');

    const invalidFetcher = (): Promise<Response> =>
      Promise.resolve(
        new Response(JSON.stringify({ reports: [{}], diagnostics: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    await expect(listBenchReports('kernel', undefined, invalidFetcher)).rejects.toThrow('response is invalid');
  });

  it('按稳定标识读取一份完整报告', async () => {
    const requests: Array<string> = [];
    const fetcher = (input: RequestInfo | URL): Promise<Response> => {
      requests.push(String(input));
      return Promise.resolve(
        new Response(JSON.stringify({ report }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    };

    await expect(getBenchReport('kernel', 'single-entity-update', 'run-1', fetcher)).resolves.toEqual(report);
    expect(requests).toEqual(['/__bench/reports?moduleId=kernel&caseId=single-entity-update&runId=run-1']);
  });

  it('只根据明确运行证据区分通过与警告', () => {
    const baseResult = {
      policyId: 'retained-auto' as const,
      outcome: 'incremental' as const,
      source: 'runtime-trace' as const,
      work: { visited: 1, reused: 1, changed: 0, reuseRatio: 1 },
      timing: { samples: 1, medianMs: 1, p95Ms: 1, maxMs: 1 },
      trace: [],
      diagnostics: [],
      lifecycle: { availability: 'unavailable' as const },
    };
    const session = {
      id: 'session-1',
      mode: 'preview' as const,
      scenarioId: 'single-entity-update',
      backend: 'svg' as const,
      startedAt: 1,
      results: [baseResult],
    };

    expect(createLabSessionReportStatus(session)).toBe('passed');
    expect(
      createLabSessionReportStatus({
        ...session,
        results: [{ ...baseResult, outcome: 'fallback', diagnostics: ['fallback'] }],
      }),
    ).toBe('warning');
  });
});
