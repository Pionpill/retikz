import { createInstance } from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { StaticRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { zh } from '../src/playground/i18n/locales';
import { UnavailableModuleWorkspace } from '../src/playground/workspace/components/UnavailableModuleWorkspace';
import { benchModules } from '../src/playground/workspace/constant';

describe('Unavailable module workspace', () => {
  it('展示当前模块说明并引导返回 Kernel', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: zh } } });
    const plotModule = benchModules.find(module => module.id === 'plot');
    if (plotModule === undefined) throw new Error('Plot module config is unavailable');

    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(
          StaticRouter,
          { location: '/plot' },
          createElement(UnavailableModuleWorkspace, { module: plotModule }),
        ),
      ),
    );

    expect(markup).toContain('Plot 性能实验尚未开放');
    expect(markup).toContain('可视化图表');
    expect(markup).toContain('href="/kernel"');
    expect(markup).toContain('返回 Kernel');
  });
});
