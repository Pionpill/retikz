import { rm } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createBenchReportRequestHandler } from '../report-plugin';
import { createReportStore } from '../report-store';

const temporaryRoots: Array<string> = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('Bench report HTTP API', () => {
  it('通过 JSON API 写入并列出当前用例报告', async () => {
    const root = await mkdtemp(join(tmpdir(), 'retikz-bench-api-'));
    temporaryRoots.push(root);
    const runIds = ['run-1', 'run-2'];
    const store = createReportStore(root, { createRunId: () => runIds.shift() ?? 'unexpected-run' });
    const handler = createBenchReportRequestHandler(store);
    const server = createServer((request, response) =>
      handler(request, response, () => {
        response.statusCode = 404;
        response.end();
      }),
    );
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Test report server address is unavailable');
    const origin = `http://127.0.0.1:${address.port.toString()}`;

    try {
      const writeResponse = await fetch(`${origin}/__bench/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          moduleId: 'kernel',
          caseId: 'single-entity-update',
          status: 'passed',
          startedAt: '2026-08-01T00:00:00.000Z',
          completedAt: '2026-08-01T00:00:01.000Z',
          payload: { sessionId: 'session-1' },
        }),
      });
      expect(writeResponse.status).toBe(201);
      await expect(writeResponse.json()).resolves.toMatchObject({ report: { runId: 'run-1' } });

      const listResponse = await fetch(`${origin}/__bench/reports?moduleId=kernel&caseId=single-entity-update`);
      expect(listResponse.status).toBe(200);
      await expect(listResponse.json()).resolves.toMatchObject({
        reports: [{ runId: 'run-1', status: 'passed' }],
        diagnostics: [],
      });

      const detailResponse = await fetch(
        `${origin}/__bench/reports?moduleId=kernel&caseId=single-entity-update&runId=run-1`,
      );
      expect(detailResponse.status).toBe(200);
      await expect(detailResponse.json()).resolves.toMatchObject({
        report: { runId: 'run-1', payload: { sessionId: 'session-1' } },
      });

      const invalidResponse = await fetch(`${origin}/__bench/reports?moduleId=..%2Fkernel`);
      expect(invalidResponse.status).toBe(400);

      const forgedIdentityResponse = await fetch(`${origin}/__bench/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: 99,
          runId: 'forged-run',
          moduleId: 'kernel',
          caseId: 'single-entity-update',
          status: 'passed',
          startedAt: '2026-08-01T00:00:00.000Z',
          completedAt: '2026-08-01T00:00:01.000Z',
          payload: {},
        }),
      });
      expect(forgedIdentityResponse.status).toBe(400);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close(error => (error === undefined ? resolve() : reject(error))),
      );
    }
  });
});
