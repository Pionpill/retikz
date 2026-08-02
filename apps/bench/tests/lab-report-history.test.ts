// @vitest-environment jsdom

import { createInstance } from 'i18next';
import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportHistory, useReportHistory } from '../src/playground/report';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const reports = [
  {
    schemaVersion: 1 as const,
    runId: 'run-1',
    moduleId: 'kernel',
    caseId: 'single-entity-update',
    status: 'passed' as const,
    startedAt: '2026-08-01T00:00:00.000Z',
    completedAt: '2026-08-01T00:00:01.000Z',
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('Performance Lab report history', () => {
  it('点击本地报告后将其标记为当前选择', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({
      lng: 'zh',
      resources: {
        zh: {
          translation: {
            reportHistory: { title: '本地报告' },
            status: { passed: '通过' },
          },
        },
      },
    });
    const container = document.createElement('div');
    document.body.append(container);
    const Harness = () => {
      const [selectedRunId, setSelectedRunId] = useState<string>();
      return createElement(ReportHistory, {
        reports,
        selectedRunId,
        onSelectReport: setSelectedRunId,
      });
    };
    const root = createRoot(container);

    await act(() => root.render(createElement(I18nextProvider, { i18n }, createElement(Harness))));
    const reportButton = container.querySelector<HTMLButtonElement>('button[data-run-id="run-1"]');
    expect(reportButton?.getAttribute('aria-pressed')).toBe('false');
    expect(reportButton?.textContent).not.toContain('run-1');
    expect(reportButton?.textContent).toContain('2026');
    expect(reportButton?.textContent).toContain('通过');
    expect(reportButton?.querySelector('time')?.getAttribute('datetime')).toBe('2026-08-01T00:00:01.000Z');

    await act(() => reportButton?.click());
    expect(reportButton?.getAttribute('aria-pressed')).toBe('true');

    await act(() => root.unmount());
  });

  it('选择报告后读取并暴露完整详情', async () => {
    const detail = {
      ...reports[0],
      payload: {
        id: 'session-1',
        mode: 'benchmark',
        scenarioId: 'single-entity-update',
        backend: 'svg',
        startedAt: 1,
        results: [],
      },
    };
    vi.stubGlobal(
      'fetch',
      (input: RequestInfo | URL): Promise<Response> =>
        Promise.resolve(
          new Response(
            JSON.stringify(String(input).includes('runId=run-1') ? { report: detail } : { reports, diagnostics: [] }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
    );
    const container = document.createElement('div');
    document.body.append(container);
    const Probe = () => {
      const history = useReportHistory('kernel', 'single-entity-update');
      return createElement(
        'div',
        null,
        createElement('button', { type: 'button', onClick: () => history.selectReport('run-1') }, 'select'),
        createElement('output', null, history.selectedReport?.runId ?? ''),
      );
    };
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(Probe));
      await Promise.resolve();
      await Promise.resolve();
    });
    const selectButton = container.querySelector<HTMLButtonElement>('button');
    await act(async () => {
      selectButton?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('output')?.textContent).toBe('run-1');
    await act(() => root.unmount());
  });

  it('从报告 A 切换到 B 时不把 A 暂时显示为 B 的详情', async () => {
    const detailA = { ...reports[0], payload: {} };
    let resolveDetailB: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('runId=run-1')) {
        return Promise.resolve(
          new Response(JSON.stringify({ report: detailA }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      if (url.includes('runId=run-2')) {
        return new Promise(resolve => {
          resolveDetailB = resolve;
        });
      }
      return Promise.resolve(new Response(JSON.stringify({ reports, diagnostics: [] }), { status: 200 }));
    });
    const snapshots: Array<string> = [];
    const container = document.createElement('div');
    document.body.append(container);
    const Probe = () => {
      const history = useReportHistory('kernel', 'single-entity-update');
      snapshots.push(`${history.selectedRunId ?? '-'}:${history.selectedReport?.runId ?? '-'}`);
      return createElement(
        'div',
        null,
        createElement('button', { type: 'button', onClick: () => history.selectReport('run-1') }, 'A'),
        createElement('button', { type: 'button', onClick: () => history.selectReport('run-2') }, 'B'),
      );
    };
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(Probe));
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      container.querySelectorAll<HTMLButtonElement>('button')[0].click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(snapshots).toContain('run-1:run-1');
    snapshots.length = 0;

    await act(() => container.querySelectorAll<HTMLButtonElement>('button')[1].click());

    expect(snapshots).not.toContain('run-2:run-1');
    resolveDetailB?.(
      new Response(JSON.stringify({ report: { ...detailA, runId: 'run-2' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await act(() => root.unmount());
  });

  it('选择失败报告后展示保存的原始错误', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({
      lng: 'zh',
      resources: { zh: { translation: { reportHistory: { title: '本地报告', runFailed: '运行失败' } } } },
    });
    const failedReport = {
      ...reports[0],
      status: 'failed' as const,
      payload: { error: 'renderer crashed' },
    };
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(() =>
      root.render(
        createElement(
          I18nextProvider,
          { i18n },
          createElement(ReportHistory, {
            reports: [failedReport],
            selectedRunId: failedReport.runId,
            selectedReport: failedReport,
          }),
        ),
      ),
    );

    expect(container.textContent).toContain('运行失败');
    expect(container.textContent).toContain('renderer crashed');
    await act(() => root.unmount());
  });

  it('没有有效报告时仍展示扫描诊断', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({
      lng: 'zh',
      resources: {
        zh: {
          translation: {
            reportHistory: { emptyTitle: '尚无本地报告', emptyDescription: '运行后会保存报告' },
          },
        },
      },
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(() =>
      root.render(
        createElement(
          I18nextProvider,
          { i18n },
          createElement(ReportHistory, { diagnostics: ['broken-run: Report schema is invalid'] }),
        ),
      ),
    );

    expect(container.textContent).toContain('broken-run: Report schema is invalid');
    await act(() => root.unmount());
  });
});
