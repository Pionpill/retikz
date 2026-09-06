// @vitest-environment jsdom

import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { Header } from '@/app/header/Header';
import { DocsHome } from '@/app/home/DocsHome';
import { DocsModuleHome } from '@/app/module/DocsModuleHome';
import i18n from '@/i18n';
import { demoModuleLoaders } from '@/modules/docs/components/component-preview/registry';
import { AppSidebar } from '@/modules/docs/layout/sidebar';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

beforeAll(async () => {
  await i18n.changeLanguage('zh');
});

afterAll(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

const renderAt = (path: string, node: ReactNode): void => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => {
    root.render(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);
  });
};

describe('module navigation does not preload preview demos', () => {
  it('首页、模块主页和 scoped Sidebar 不调用任何 demo module loader', () => {
    const original = new Map(Object.entries(demoModuleLoaders));
    const watched = Object.entries(demoModuleLoaders).flatMap(([key, loader]) => {
      if (!loader) return [];
      const spy = vi.fn(loader);
      demoModuleLoaders[key] = spy;
      return [spy];
    });

    try {
      renderAt(
        '/',
        <>
          <Header />
          <DocsHome />
        </>,
      );
      renderAt(
        '/viz',
        <>
          <Header />
          <DocsModuleHome moduleId="viz" />
        </>,
      );
      renderAt(
        '/viz/chart/points/scatter',
        <>
          <Header />
          <AppSidebar
            location={{
              moduleId: 'viz',
              sectionId: 'chart',
              pageId: 'points',
              subPageId: 'scatter',
            }}
          />
        </>,
      );

      expect(watched.every(spy => spy.mock.calls.length === 0)).toBe(true);
    } finally {
      for (const [key, loader] of original) demoModuleLoaders[key] = loader;
    }
  });
});
