import { createInstance } from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { Route, Routes, StaticRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { App } from '../src/playground/app/App';
import { Header } from '../src/playground/app/header/Header';
import { createInitialLabState } from '../src/playground/app/lab-state';
import { defaultBenchModule } from '../src/playground/app/module-registry';
import { BenchCaseView, getBenchTestCase } from '../src/playground/app/test-catalog';
import { SidebarProvider } from '../src/playground/components/ui/sidebar';
import { zh } from '../src/playground/i18n/locales';
import { ReportHistory } from '../src/playground/report';

const resources = {
  ...zh,
  catalog: {
    group: { performance: '性能测试', llm: 'LLM 测试' },
    direction: {
      fullPerformance: '全量测试',
      incrementalPerformance: '增量测试',
      interactionPerformance: '交互测试',
      generationAccuracy: '生成准确性测试',
      incrementalGeneration: '增量生成测试',
    },
    case: {
      singleEntityUpdate: {
        title: '单实体更新',
        description: '5,000 个稳定实体中修改一个节点',
      },
    },
  },
  caseView: {
    preview: '预览',
    benchmark: '基准',
    reports: '报告',
    scenario: '场景标识',
    localEnvironment: '本地运行环境',
    backend: '渲染后端',
  },
  header: {
    ...zh.header,
    caseViews: '用例页面',
    updatePolicy: '更新策略',
    runPreview: '运行预览',
    startBenchmark: '开始基准',
    settings: '设置',
    allPolicies: '全部策略',
  },
  policy: {
    'static-full': '静态 · 全量',
    'retained-full': '保留模式 · 全量',
    'retained-auto': '保留模式 · 自动',
  },
  benchmark: {
    emptyTitle: '尚未运行基准测试',
    emptyDescription: '开始基准后将比较全部更新策略',
  },
  reportHistory: {
    title: '本地报告',
    emptyTitle: '尚无本地报告',
    emptyDescription: '运行当前用例后，报告会保存在本地忽略目录中',
    selectHint: '选择一份报告查看详情',
  },
};

describe('App case workspace', () => {
  it('使用稳定链接展示预览、基准和报告页面', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: resources } } });

    const renderView = (view: (typeof BenchCaseView)[keyof typeof BenchCaseView]) =>
      renderToStaticMarkup(
        createElement(
          I18nextProvider,
          { i18n },
          createElement(
            StaticRouter,
            { location: `/kernel/cases/single-entity-update/${view}` },
            createElement(
              Routes,
              null,
              createElement(Route, {
                path: '/kernel/cases/:caseId/:view',
                element: createElement(App, { module: defaultBenchModule }),
              }),
            ),
          ),
        ),
      );

    const previewMarkup = renderView(BenchCaseView.Preview);
    expect(previewMarkup).toContain('href="/kernel/cases/single-entity-update/preview"');
    expect(previewMarkup).toContain('href="/kernel/cases/single-entity-update/benchmark"');
    expect(previewMarkup).toContain('href="/kernel/cases/single-entity-update/reports"');
    expect(previewMarkup).toContain('Kernel 更新遥测');
    expect(previewMarkup).toContain('渲染预览');

    const benchmarkMarkup = renderView(BenchCaseView.Benchmark);
    expect(benchmarkMarkup).toContain('尚未运行基准测试');
    expect(benchmarkMarkup).toContain('开始基准后将比较全部更新策略');

    const reportsMarkup = renderView(BenchCaseView.Reports);
    expect(reportsMarkup).toContain('本地报告');
    expect(reportsMarkup).toContain('选择一份报告查看详情');

    const historyMarkup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(ReportHistory, {
          reports: [
            {
              schemaVersion: 1,
              runId: 'persisted-run',
              moduleId: 'kernel',
              caseId: 'single-entity-update',
              status: 'passed',
              startedAt: '2026-08-01T00:00:00.000Z',
              completedAt: '2026-08-01T00:00:01.000Z',
            },
          ],
        }),
      ),
    );
    expect(historyMarkup).toContain('persisted-run');
    expect(historyMarkup).toContain('选择一份报告查看详情');
  });

  it('按页面上下文展示 Backend、Policy 与运行入口', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: resources } } });
    const testCase = getBenchTestCase('kernel', 'single-entity-update');
    if (testCase === undefined) throw new Error('Kernel default case is unavailable');

    const renderHeader = (view: (typeof BenchCaseView)[keyof typeof BenchCaseView]) =>
      renderToStaticMarkup(
        createElement(
          I18nextProvider,
          { i18n },
          createElement(
            StaticRouter,
            { location: `/kernel/cases/single-entity-update/${view}` },
            createElement(
              SidebarProvider,
              null,
              createElement(Header, {
                module: defaultBenchModule,
                testCase,
                view,
                state: createInitialLabState(),
                dispatch: () => undefined,
                onRun: () => undefined,
              }),
            ),
          ),
        ),
      );

    const previewMarkup = renderHeader(BenchCaseView.Preview);
    expect(previewMarkup).toMatch(/role="tablist"[^>]*aria-label="用例页面"/);
    expect(previewMarkup).toMatch(/role="tablist"[^>]*aria-label="渲染后端"/);
    expect(previewMarkup.match(/role="tab"/g)).toHaveLength(5);
    expect(previewMarkup).toContain('role="tab" aria-selected="true"');
    expect(previewMarkup).toContain('href="/kernel/cases/single-entity-update/preview"');
    expect(previewMarkup).toContain('href="/kernel/cases/single-entity-update/benchmark"');
    expect(previewMarkup).toContain('href="/kernel/cases/single-entity-update/reports"');
    expect(previewMarkup).toMatch(/>SVG<\/span>/);
    expect(previewMarkup).toMatch(/>Canvas<\/span>/);
    expect(previewMarkup).toMatch(/role="tab"[^>]*aria-label="SVG"/);
    expect(previewMarkup).toMatch(/role="tab"[^>]*aria-label="Canvas"/);
    expect(previewMarkup).toContain('aria-label="更新策略"');
    expect(previewMarkup).toContain('保留模式 · 自动');
    expect(previewMarkup).not.toContain('Retained · Auto');
    expect(previewMarkup).toContain('aria-label="运行预览"');
    expect(previewMarkup).toContain('aria-label="设置"');

    const benchmarkMarkup = renderHeader(BenchCaseView.Benchmark);
    expect(benchmarkMarkup).toContain('全部策略');
    expect(benchmarkMarkup).not.toContain('aria-label="更新策略"');
    expect(benchmarkMarkup).toContain('aria-label="开始基准"');

    const reportsMarkup = renderHeader(BenchCaseView.Reports);
    expect(reportsMarkup).not.toMatch(/>SVG<\/span>/);
    expect(reportsMarkup).not.toMatch(/>Canvas<\/span>/);
    expect(reportsMarkup).not.toContain('aria-label="更新策略"');
    expect(reportsMarkup).not.toContain('aria-label="运行预览"');
    expect(reportsMarkup).not.toContain('aria-label="开始基准"');
    expect(reportsMarkup).toContain('aria-label="设置"');
    expect(reportsMarkup.match(/role="tab"/g)).toHaveLength(3);

    const breadcrumbMarkup = previewMarkup.match(/<nav aria-label="breadcrumb"[\s\S]*?<\/nav>/)?.[0];
    expect(breadcrumbMarkup).toMatch(/增量测试[\s\S]*data-slot="breadcrumb-separator"[\s\S]*单实体更新/);
  });
});
