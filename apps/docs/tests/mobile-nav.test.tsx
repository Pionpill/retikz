// @vitest-environment jsdom

import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MobileNav } from '../src/app/header/MobileNav';
import { useDocModuleStore } from '../src/modules/docs/store';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => '',
}));

vi.mock('@/components/ui/sheet', async () => {
  const { createContext, useContext } = await import('react');
  const SheetOpenContext = createContext<(open: boolean) => void>(() => undefined);

  return {
    Sheet: (props: { children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => {
      const { children, open, onOpenChange } = props;
      return (
        <SheetOpenContext.Provider value={onOpenChange}>
          <div data-slot="mock-mobile-sheet" data-open={String(open)}>
            {children}
          </div>
        </SheetOpenContext.Provider>
      );
    },
    SheetTrigger: (props: { children: ReactNode; className?: string; 'aria-label'?: string }) => {
      const setOpen = useContext(SheetOpenContext);
      return (
        <button
          type="button"
          className={props.className}
          aria-label={props['aria-label']}
          onClick={() => setOpen(true)}
        >
          {props.children}
        </button>
      );
    },
    SheetContent: (props: { children: ReactNode; className?: string }) => (
      <div className={props.className}>{props.children}</div>
    ),
    SheetHeader: (props: { children: ReactNode; className?: string }) => (
      <div className={props.className}>{props.children}</div>
    ),
    SheetTitle: (props: { children: ReactNode; className?: string; asChild?: boolean }) => (
      <div className={props.className}>{props.children}</div>
    ),
  };
});

vi.mock('../src/app/header/HeaderNavigation', () => ({
  HeaderNavigation: (props: { navigation: { areaId: string | null; moduleId: string | null }; mobile?: boolean }) =>
    props.navigation.areaId === null ? (
      <div data-header-navigation>
        <button data-module-picker="home">Module picker</button>
        <button data-module-nav={String(props.mobile)}>Modules</button>
        <button data-about-nav={String(props.mobile)}>About</button>
      </div>
    ) : (
      <div data-header-navigation>
        <button data-module-picker={props.navigation.moduleId ?? 'home'}>Module picker</button>
        <button data-section-nav={props.navigation.areaId}>Section navigation</button>
      </div>
    ),
}));

vi.mock('@/modules/docs/layout', () => ({
  resolveDocNavigationContext: (pathname: string) =>
    pathname.startsWith('/viz')
      ? {
          areaId: 'viz',
          moduleId: 'viz',
          sectionId: 'chart',
          location: { moduleId: 'viz', sectionId: 'chart', pageId: 'points', subPageId: 'scatter' },
        }
      : { areaId: null, moduleId: null, sectionId: null, location: null },
  AppSidebar: (props: { location?: { moduleId: string }; onNavigate?: () => void }) => (
    <button type="button" aria-label="Mock scoped article" onClick={props.onNavigate}>
      {props.location?.moduleId} article
    </button>
  ),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <output data-location>{pathname}</output>;
};

const renderMobileNav = (initialEntry: string): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <MobileNav />
        <LocationProbe />
      </MemoryRouter>,
    );
  });

  return container;
};

const click = (element: Element | null): void => {
  expect(element).not.toBeNull();
  act(() => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

beforeEach(() => {
  useDocModuleStore.setState({ scope: 'viz' });
});

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
  localStorage.clear();
});

describe('MobileNav', () => {
  it('首页抽屉显示模块选择器、扁平模块入口和 About 下拉', () => {
    const container = renderMobileNav('/');

    click(container.querySelector('button[aria-label="Open navigation"]'));

    expect(container.querySelector('[data-module-picker="home"]')).not.toBeNull();
    expect(container.querySelector('[data-brand-link]')).toBeNull();
    expect(container.querySelector('[data-module-nav="true"]')).not.toBeNull();
    expect(container.querySelector('[data-about-nav="true"]')).not.toBeNull();
    expect(container.querySelector('[data-section-nav="about"]')).toBeNull();
  });

  it('文档页抽屉显示当前 area 的选择器、section 导航和 scoped Sidebar', () => {
    const container = renderMobileNav('/viz/chart/points/scatter');

    click(container.querySelector('button[aria-label="Open navigation"]'));

    expect(container.querySelector('a[aria-label="retikz home"]')).toBeNull();
    expect(container.querySelector('[data-module-picker="viz"]')).not.toBeNull();
    expect(container.querySelector('[data-section-nav="viz"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Mock scoped article"]')?.textContent).toContain('viz article');
  });

  it('点击当前文档入口后关闭抽屉', () => {
    const container = renderMobileNav('/viz/chart/points/scatter');

    click(container.querySelector('button[aria-label="Open navigation"]'));
    click(container.querySelector('button[aria-label="Mock scoped article"]'));

    expect(container.querySelector('[data-slot="mock-mobile-sheet"]')?.getAttribute('data-open')).toBe('false');
  });
});
