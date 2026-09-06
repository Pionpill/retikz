// @vitest-environment jsdom

import type { FC, ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Outlet, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocsHome } from '../src/app/home/DocsHome';
import { DocsModuleHome } from '../src/app/module/DocsModuleHome';
import { AppRoutes } from '../src/app/routes';
import { DOC_MODULE_IDS, isDocScopeId, modules } from '../src/modules/docs/data';
import { useDocModuleStore } from '../src/modules/docs/store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../src/app/AppLayout', () => ({
  AppLayout: () => <Outlet />,
}));

vi.mock('@/modules/docs/layout', () => ({
  DocLayout: () => <Outlet />,
  DocPage: () => {
    const { pathname } = useLocation();
    return <div data-doc-page>{pathname}</div>;
  },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const render = (node: ReactNode): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(node));
  return container;
};

const LocationProbe: FC = () => {
  const { pathname } = useLocation();
  return <output data-location>{pathname}</output>;
};

const renderRoutes = (initialEntry: string): HTMLElement =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  useDocModuleStore.setState({ scope: 'home' });
});

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
  localStorage.clear();
});

describe('Docs module navigation domain', () => {
  it('只暴露四个可切换模块，并将 About 排除在模块域之外', () => {
    expect(DOC_MODULE_IDS).toEqual(['kernel', 'library', 'schematic', 'viz']);
    expect(modules.map(module => module.id)).toEqual(DOC_MODULE_IDS);
    expect(modules).toHaveLength(DOC_MODULE_IDS.length);
  });

  it('允许切换 home 与真实模块 scope', () => {
    useDocModuleStore.getState().selectScope('viz');
    expect(useDocModuleStore.getState().scope).toBe('viz');

    useDocModuleStore.getState().selectScope('home');
    expect(useDocModuleStore.getState().scope).toBe('home');
  });

  it('首页提供固定的 About overview 入口', () => {
    const container = render(
      <MemoryRouter>
        <DocsHome />
      </MemoryRouter>,
    );

    expect(container.textContent).toContain('docs.homeTitle');
    expect(container.querySelector('a[href="/about/overview"]')).not.toBeNull();
  });

  it('模块主页只显示占位文案，不挂载 Sidebar 或 ComponentPreview', () => {
    const container = render(<DocsModuleHome moduleId="viz" />);

    expect(container.textContent).toContain('docs.moduleHomePlaceholder');
    expect(container.querySelector('aside')).toBeNull();
    expect(container.querySelector('[data-component-preview]')).toBeNull();
  });

  it('非法 scope 不是可恢复的文档 scope', async () => {
    localStorage.setItem('retikz-doc-scope', JSON.stringify({ state: { scope: 'about' }, version: 0 }));

    await useDocModuleStore.persist.rehydrate();

    expect(isDocScopeId('about')).toBe(false);
    expect(useDocModuleStore.getState().scope).toBe('home');
  });

  it('根路由按持久化 scope 选择首页或模块主页', () => {
    const home = renderRoutes('/');
    expect(home.textContent).toContain('docs.homeTitle');

    home.remove();
    useDocModuleStore.setState({ scope: 'viz' });

    const moduleHome = renderRoutes('/');
    expect(moduleHome.textContent).toContain('docs.moduleHomePlaceholder');
    expect(moduleHome.querySelector('[data-location]')?.textContent).toBe('/viz');
  });

  it('保留模块深链接与 About 现有入口，不被持久化 scope 改写', () => {
    useDocModuleStore.setState({ scope: 'kernel' });

    const deepLink = renderRoutes('/viz/chart/points/scatter');
    expect(deepLink.querySelector('[data-doc-page]')?.textContent).toBe('/viz/chart/points/scatter');

    deepLink.remove();
    const about = renderRoutes('/about/overview');
    expect(about.querySelector('[data-doc-page]')?.textContent).toBe('/about/overview');
    expect(useDocModuleStore.getState().scope).toBe('viz');

    about.remove();
    const aboutRoot = renderRoutes('/about');
    expect(aboutRoot.querySelector('[data-location]')?.textContent).toBe('/about/overview');

    aboutRoot.remove();
    const aboutBlog = renderRoutes('/about/blog');
    expect(aboutBlog.querySelector('[data-location]')?.textContent).toBe('/about/blog/core-philosophy');
  });
});
