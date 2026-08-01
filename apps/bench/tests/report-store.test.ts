import { mkdir, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createReportStore } from '../report-store';
import { BenchReportStatus } from '../src/shared/lab-report';

const temporaryRoots: Array<string> = [];

/** 创建并登记测试专用报告目录 */
const createTemporaryRoot = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'retikz-bench-reports-'));
  temporaryRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('Bench report store', () => {
  it('按稳定目录原子写入报告并以最新时间排序', async () => {
    const root = await createTemporaryRoot();
    const runIds = ['run-1', 'run-2'];
    const store = createReportStore(root, { createRunId: () => runIds.shift() ?? 'unexpected-run' });

    const first = await store.writeReport({
      moduleId: 'kernel',
      caseId: 'single-entity-update',
      status: BenchReportStatus.Passed,
      startedAt: '2026-08-01T00:00:00.000Z',
      completedAt: '2026-08-01T00:00:01.000Z',
      payload: { sessionId: 'session-1' },
    });
    const second = await store.writeReport({
      moduleId: 'kernel',
      caseId: 'single-entity-update',
      status: BenchReportStatus.Warning,
      startedAt: '2026-08-01T00:01:00.000Z',
      completedAt: '2026-08-01T00:01:01.000Z',
      payload: { sessionId: 'session-2' },
    });

    expect(first.runId).toBe('run-1');
    expect(second.runId).toBe('run-2');
    await expect(
      import('node:fs/promises').then(({ readFile }) =>
        readFile(join(root, 'runs', 'kernel', 'single-entity-update', 'run-2', 'report.json'), 'utf8'),
      ),
    ).resolves.toContain('"sessionId": "session-2"');

    const listed = await store.listReports({ moduleId: 'kernel', caseId: 'single-entity-update' });
    expect(listed.diagnostics).toEqual([]);
    expect(listed.reports.map(report => ({ runId: report.runId, status: report.status }))).toEqual([
      { runId: 'run-2', status: 'warning' },
      { runId: 'run-1', status: 'passed' },
    ]);
  });

  it('拒绝可能逃逸报告根目录的标识', async () => {
    const root = await createTemporaryRoot();
    const store = createReportStore(root, { createRunId: () => 'run-1' });

    await expect(
      store.writeReport({
        moduleId: '../kernel',
        caseId: 'single-entity-update',
        status: BenchReportStatus.Passed,
        startedAt: '2026-08-01T00:00:00.000Z',
        completedAt: '2026-08-01T00:00:01.000Z',
        payload: {},
      }),
    ).rejects.toThrow('Invalid moduleId');
  });

  it('跳过损坏报告并返回可诊断信息', async () => {
    const root = await createTemporaryRoot();
    const reportDirectory = join(root, 'runs', 'kernel', 'single-entity-update', 'broken-run');
    await mkdir(reportDirectory, { recursive: true });
    await writeFile(join(reportDirectory, 'report.json'), '{broken', 'utf8');
    const store = createReportStore(root);

    const listed = await store.listReports({ moduleId: 'kernel' });

    expect(listed.reports).toEqual([]);
    expect(listed.diagnostics).toHaveLength(1);
    expect(listed.diagnostics[0]).toContain('broken-run');
  });
});
