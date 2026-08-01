import { createInstance } from 'i18next';
import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { Route, Routes, StaticRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { App } from '../src/playground/app/App';
import { CasePage } from '../src/playground/app/case/CasePage';
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
    config: '配置',
    run: '运行',
    reports: '报告',
    scenario: '场景标识',
    localEnvironment: '本地运行环境',
  },
  reportHistory: {
    title: '本地报告',
    emptyTitle: '尚无本地报告',
    emptyDescription: '运行当前用例后，报告会保存在本地忽略目录中',
    selectHint: '选择一份报告查看详情',
  },
};

describe('CasePage', () => {
  it('使用稳定链接展示配置、运行和报告页面', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: resources } } });
    const testCase = getBenchTestCase('kernel', 'single-entity-update');
    if (testCase === undefined) throw new Error('Kernel default case is unavailable');

    const renderView = (view: (typeof BenchCaseView)[keyof typeof BenchCaseView]) =>
      renderToStaticMarkup(
        createElement(
          I18nextProvider,
          { i18n },
          createElement(
            StaticRouter,
            { location: `/kernel/cases/single-entity-update/${view}` },
            createElement(CasePage, {
              module: defaultBenchModule,
              testCase,
              view,
              state: createInitialLabState(),
              previewHostRef: createRef<HTMLDivElement>(),
            }),
          ),
        ),
      );

    const configMarkup = renderView(BenchCaseView.Config);
    expect(configMarkup).toContain('href="/kernel/cases/single-entity-update/config"');
    expect(configMarkup).toContain('href="/kernel/cases/single-entity-update/run"');
    expect(configMarkup).toContain('href="/kernel/cases/single-entity-update/reports"');
    expect(configMarkup).toContain('5,000 个稳定实体中修改一个节点');
    expect(configMarkup).toContain('场景标识');

    const runMarkup = renderView(BenchCaseView.Run);
    expect(runMarkup).toContain('Kernel 更新遥测');
    expect(runMarkup).toContain('渲染预览');

    const reportsMarkup = renderView(BenchCaseView.Reports);
    expect(reportsMarkup).toContain('尚无本地报告');
    expect(reportsMarkup).toContain('本地忽略目录');

    const headerMarkup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(
          StaticRouter,
          { location: '/kernel/cases/single-entity-update/run' },
          createElement(
            SidebarProvider,
            null,
            createElement(Header, {
              module: defaultBenchModule,
              testCase,
              state: createInitialLabState(),
              dispatch: () => undefined,
              onRun: () => undefined,
            }),
          ),
        ),
      ),
    );
    const breadcrumbMarkup = headerMarkup.match(/<nav aria-label="breadcrumb"[\s\S]*?<\/nav>/)?.[0];
    const breadcrumbClassNames = breadcrumbMarkup?.match(/<nav[^>]*class="([^"]*)"/)?.[1]?.split(' ');
    expect(breadcrumbMarkup).toBeDefined();
    expect(breadcrumbClassNames).not.toContain('hidden');
    expect(breadcrumbMarkup).not.toContain('Kernel');
    expect(breadcrumbMarkup).not.toContain('性能测试');
    expect(breadcrumbMarkup).toMatch(/增量测试[\s\S]*data-slot="breadcrumb-separator"[\s\S]*单实体更新/);

    const appMarkup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(
          StaticRouter,
          { location: '/kernel/cases/single-entity-update/config' },
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
    expect(appMarkup).toContain('href="/kernel/cases/single-entity-update/config"');
    expect(appMarkup).toContain('5,000 个稳定实体中修改一个节点');

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
});
