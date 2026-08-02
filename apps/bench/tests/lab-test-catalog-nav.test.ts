import { createInstance } from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { StaticRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { defaultBenchModule } from '../src/playground/app/module-registry';
import { TestCatalogNav } from '../src/playground/app/sidebar/TestCatalogNav';
import { SidebarProvider } from '../src/playground/components/ui/sidebar';
import { zh } from '../src/playground/i18n/locales';

describe('TestCatalogNav', () => {
  it('按分组折叠方向并为当前用例生成稳定链接', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: zh } } });

    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(
          StaticRouter,
          { location: '/kernel/cases/single-entity-update/preview' },
          createElement(
            SidebarProvider,
            null,
            createElement(TestCatalogNav, {
              module: defaultBenchModule,
              activeCaseId: 'single-entity-update',
              caseStatuses: { 'single-entity-update': 'passed' },
            }),
          ),
        ),
      ),
    );

    expect(markup).toContain('性能测试');
    expect(markup).toContain('LLM 测试');
    expect(markup).toContain('全量测试');
    expect(markup).toContain('增量测试');
    expect(markup).toContain('交互测试');
    expect(markup).toContain('生成准确性测试');
    expect(markup).toContain('增量生成测试');
    expect(markup).not.toContain('增量性能测试');
    expect(markup).not.toContain('LLM 生成准确性测试');
    expect(markup).toContain('data-state="open"');
    expect(markup).toContain('data-state="closed"');
    expect(markup).toContain('href="/kernel/cases/single-entity-update/preview"');
    expect(markup).toContain('单实体更新');
    expect(markup).toContain('aria-label="通过"');
    expect(markup.indexOf('单实体更新')).toBeLessThan(markup.indexOf('aria-label="通过"'));
  });

  it('运行时仅显示用例状态点而不显示方向级数字徽标', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: zh } } });

    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(
          StaticRouter,
          { location: '/kernel/cases/single-entity-update/benchmark' },
          createElement(
            SidebarProvider,
            null,
            createElement(TestCatalogNav, {
              module: defaultBenchModule,
              activeCaseId: 'single-entity-update',
              caseStatuses: { 'single-entity-update': 'running' },
            }),
          ),
        ),
      ),
    );

    expect(markup).toContain('aria-label="运行中"');
    expect(markup).not.toContain('data-sidebar="menu-badge"');
  });
});
