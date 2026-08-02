import { createInstance } from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { StaticRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { defaultBenchModule } from '../src/playground/app/module-registry';
import { ModuleSwitcher } from '../src/playground/app/sidebar/ModuleSwitcher';
import { SidebarProvider } from '../src/playground/components/ui/sidebar';
import { zh } from '../src/playground/i18n/locales';

describe('ModuleSwitcher', () => {
  it('显示模块图标和加粗标题说明', async () => {
    const i18n = createInstance().use(initReactI18next);
    await i18n.init({ lng: 'zh', resources: { zh: { translation: zh } } });

    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(
          StaticRouter,
          { location: '/kernel' },
          createElement(SidebarProvider, null, createElement(ModuleSwitcher, { module: defaultBenchModule })),
        ),
      ),
    );

    expect(markup).toContain('<svg');
    expect(markup).toContain('font-semibold');
    expect(markup).toContain('Kernel');
    expect(markup).toContain('Kernel 运行时与渲染器');
  });
});
