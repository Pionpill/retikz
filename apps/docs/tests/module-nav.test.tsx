// @vitest-environment jsdom

import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import type * as ReactI18nextModule from 'react-i18next';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Header } from '../src/app/header/Header';
import { ModuleNav } from '../src/app/header/ModuleNav';
import { ModulePicker } from '../src/app/header/ModulePicker';
import { SectionNav } from '../src/app/header/SectionNav';
import { NavigationMenu, NavigationMenuList } from '../src/components/ui/navigation-menu';
import { useDocModuleStore } from '../src/modules/docs/store';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof ReactI18nextModule>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/modules/docs/ai-chat', () => ({
  AiChatTrigger: () => <button type="button">AI</button>,
}));

vi.mock('@/modules/docs/components', () => ({
  DocsSearch: () => <button type="button">Search</button>,
}));

vi.mock('../src/app/header/HeaderActions', () => ({
  HeaderActions: () => <div>Actions</div>,
}));

vi.mock('../src/app/header/MobileNav', () => ({
  MobileNav: () => null,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <output data-location>{pathname}</output>;
};

const renderInRouter = (node: ReactNode, initialEntry: string): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        {node}
        <LocationProbe />
      </MemoryRouter>,
    );
  });

  return container;
};

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
  localStorage.clear();
});

describe('<ModuleNav>', () => {
  it('当前模块使用选中文字色，并展示含图标的 Header 分组', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/kernel/components/design/principles']}>
          <Routes>
            <Route path=":moduleId/*" element={<ModuleNav />} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>,
      );
    });
    const triggers = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[data-slot="header-navigation-trigger"]'),
    );
    const activeTrigger = triggers.find(trigger => trigger.textContent.includes('kernel.navigationLabel'));

    expect(activeTrigger).not.toBeUndefined();
    expect(activeTrigger?.classList.contains('text-foreground')).toBe(true);
    expect(activeTrigger?.classList.contains('text-muted-foreground')).toBe(false);

    act(() => {
      activeTrigger?.click();
    });

    const components = container.querySelector<HTMLAnchorElement>('a[data-module-nav-section="components"]');
    const packages = container.querySelector<HTMLAnchorElement>('a[data-module-nav-section="packages"]');
    const gallery = container.querySelector<HTMLAnchorElement>('a[data-module-nav-section="galleries"]');

    expect(components?.getAttribute('href')).toBe('/kernel/components');
    expect(packages?.getAttribute('href')).toBe('/kernel/packages');
    expect(gallery?.getAttribute('href')).toBe('/kernel/galleries');
    expect(container.querySelector('a[data-module-nav-section="reference"]')).toBeNull();
    expect(components?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(components?.querySelector('[data-module-nav-description]')?.textContent).toBe(
      'kernel.componentsNavigationDescription',
    );

    const libraryTrigger = triggers.find(trigger => trigger.textContent.includes('library.navigationLabel'));
    act(() => {
      libraryTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    });

    expect(container.querySelector('[data-location]')?.textContent).toBe('/library');
  });
});

describe('<ModulePicker>', () => {
  it('仅在首次点击选择器前展示 ping 提示', () => {
    const container = renderInRouter(<ModulePicker value="kernel" />, '/kernel');
    const trigger = container.querySelector<HTMLButtonElement>('button[data-slot="header-navigation-trigger"]');

    expect(container.querySelector('[data-module-picker-hint] .animate-ping')).not.toBeNull();

    act(() => {
      trigger?.click();
    });

    expect(container.querySelector('[data-module-picker-hint]')).toBeNull();
    expect(localStorage.getItem('retikz-doc-module-picker-hint-dismissed')).toBe('true');
  });

  it('每个模块项展示人类可读标签、scope 名称和简短说明', () => {
    const container = renderInRouter(<ModulePicker value="kernel" />, '/kernel');

    const trigger = container.querySelector<HTMLButtonElement>('button[data-slot="header-navigation-trigger"]');
    expect(trigger?.classList.contains('text-muted-foreground')).toBe(true);
    expect(trigger?.classList.contains('h-8')).toBe(true);
    expect(trigger?.classList.contains('focus-visible:ring-0')).toBe(true);

    act(() => {
      trigger?.click();
    });

    const kernel = container.querySelector<HTMLAnchorElement>('a[data-scope="kernel"]');
    const viz = container.querySelector<HTMLAnchorElement>('a[data-scope="viz"]');
    const home = container.querySelector<HTMLAnchorElement>('a[data-scope="home"]');

    expect(kernel?.classList.contains('hover:bg-accent')).toBe(true);
    expect(kernel?.classList.contains('focus:bg-accent')).toBe(true);
    expect(kernel?.classList.contains('flex-row')).toBe(true);
    expect(home?.querySelector('[data-module-picker-icon]')?.classList.contains('size-8')).toBe(true);
    expect(kernel?.querySelector('[data-module-picker-icon] svg[aria-hidden="true"]')).not.toBeNull();
    expect(home?.querySelector('[data-module-picker-title]')?.textContent).toBe('docs.homeNavigationLabel');
    expect(home?.querySelector('[data-module-picker-scope]')?.textContent).toBe('retikz');
    expect(home?.querySelector('[data-module-picker-description]')?.textContent).toBe('docs.homeNavigationDescription');
    expect(kernel?.querySelector('[data-module-picker-title]')?.textContent).toBe('kernel.navigationLabel');
    expect(kernel?.querySelector('[data-module-picker-scope]')?.textContent).toBe('retikz.kernel');
    expect(kernel?.querySelector('[data-module-picker-description]')?.textContent).toBe('kernel.navigationDescription');
    expect(viz?.querySelector('[data-module-picker-title]')?.textContent).toBe('viz.navigationLabel');
    expect(viz?.querySelector('[data-module-picker-scope]')?.textContent).toBe('retikz.viz');
    expect(viz?.querySelector('[data-module-picker-description]')?.textContent).toBe('viz.navigationDescription');
  });

  it('鼠标点击当前模块选择器时返回模块首页', () => {
    useDocModuleStore.setState({ scope: 'home' });
    const container = renderInRouter(<ModulePicker value="kernel" />, '/kernel/packages');
    const trigger = container.querySelector<HTMLButtonElement>('button[data-slot="header-navigation-trigger"]');

    act(() => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    });

    expect(useDocModuleStore.getState().scope).toBe('kernel');
    expect(container.querySelector('[data-location]')?.textContent).toBe('/kernel');
  });

  it('选择首页或模块时更新 scope 并导航到对应根路径', () => {
    useDocModuleStore.setState({ scope: 'kernel' });
    const container = renderInRouter(<ModulePicker value="kernel" />, '/kernel/components/node');
    expect(container.querySelector('button[data-slot="header-navigation-trigger"]')?.textContent).toContain(
      'retikz.kernel',
    );

    act(() => {
      container.querySelector<HTMLButtonElement>('button[data-slot="header-navigation-trigger"]')?.click();
    });

    act(() => {
      container.querySelector<HTMLAnchorElement>('a[data-scope="schematic"]')?.click();
    });

    expect(useDocModuleStore.getState().scope).toBe('schematic');
    expect(container.querySelector('[data-location]')?.textContent).toBe('/schematic');

    act(() => {
      container.querySelector<HTMLButtonElement>('button[data-slot="header-navigation-trigger"]')?.click();
    });

    act(() => {
      container.querySelector<HTMLAnchorElement>('a[data-scope="home"]')?.click();
    });

    expect(useDocModuleStore.getState().scope).toBe('home');
    expect(container.querySelector('[data-location]')?.textContent).toBe('/');
  });
});

describe('<SectionNav>', () => {
  it('模块 Header 保留完整的 section 导航顺序', () => {
    const container = renderInRouter(
      <NavigationMenu>
        <NavigationMenuList>
          <SectionNav areaId="kernel" sectionId="components" withinNavigationMenu />
        </NavigationMenuList>
      </NavigationMenu>,
      '/kernel',
    );

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a'));
    expect(links.map(link => link.textContent)).toEqual([
      'kernel.components',
      'kernel.packages',
      'kernel.reference',
      'kernel.gallery',
    ]);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/kernel/components',
      '/kernel/packages',
      '/kernel/reference',
      '/kernel/galleries',
    ]);
  });

  it('展示当前 area 的分组入口并标记当前 section', () => {
    const container = renderInRouter(
      <NavigationMenu>
        <NavigationMenuList>
          <SectionNav areaId="viz" sectionId="chart" withinNavigationMenu />
        </NavigationMenuList>
      </NavigationMenu>,
      '/viz/chart/points/scatter',
    );

    expect(container.querySelector('a[href="/viz/chart"][data-active]')?.textContent).toBe('viz.chart');
    expect(container.querySelector('a[href="/viz/data"]')?.textContent).toBe('viz.data');
    expect(container.querySelector('a[href="/viz/chart"]')?.classList.contains('h-8')).toBe(true);
    expect(container.querySelector('a[href="/viz/chart"]')?.classList.contains('px-2.5')).toBe(true);
    expect(container.querySelector('a[href="/viz/chart"]')?.classList.contains('font-medium')).toBe(true);
    expect(container.querySelector('li[data-slot="navigation-menu-item"]')?.classList.contains('flex')).toBe(true);
  });
});

describe('<Header>', () => {
  it('首页使用模块选择器、带分组面板的模块入口，并将 About 作为普通链接展示', () => {
    const home = renderInRouter(<Header />, '/');
    const header = home.querySelector('header');
    expect(header?.firstElementChild?.classList.contains('lg:gap-2')).toBe(true);
    expect(header?.firstElementChild?.firstElementChild?.classList.contains('lg:gap-2')).toBe(true);
    expect(home.querySelector('button[aria-label="docs.modulePickerHome"]')?.textContent).toContain('retikz');
    expect(home.querySelector('a[aria-label="retikz home"]')).toBeNull();
    expect(home.querySelectorAll('nav[data-slot="navigation-menu"]')).toHaveLength(1);
    const navigationList = home.querySelector('[data-slot="navigation-menu-list"]');
    expect(home.querySelectorAll('[data-slot="navigation-menu-list"]')).toHaveLength(1);
    expect(navigationList?.classList.contains('gap-x-2')).toBe(true);
    expect(navigationList?.classList.contains('gap-y-2')).toBe(true);
    const aboutLink = home.querySelector<HTMLAnchorElement>('a[href="/about/overview"]');
    expect(aboutLink?.textContent).toBe('about.label');
    expect(aboutLink?.classList.contains('text-muted-foreground')).toBe(true);
    expect(aboutLink?.classList.contains('hover:bg-accent')).toBe(true);
    expect(aboutLink?.classList.contains('h-8')).toBe(true);
    expect(home.querySelector('[data-slot="header-navigation-content"]')).toBeNull();
    expect(
      Array.from(home.querySelectorAll<HTMLButtonElement>('button[data-slot="header-navigation-trigger"]')).map(
        button => button.textContent,
      ),
    ).toEqual([
      'retikz',
      'kernel.navigationLabel',
      'library.navigationLabel',
      'schematic.navigationLabel',
      'viz.navigationLabel',
    ]);

    const page = renderInRouter(<Header />, '/viz/chart');
    expect(page.querySelector('a[aria-label="retikz home"]')).toBeNull();
    expect(page.querySelector('button[aria-label="docs.modulePickerHome"]')?.textContent).toContain('retikz.viz');
    expect(page.querySelector('a[href="/viz/chart"][data-active]')?.textContent).toBe('viz.chart');

    const about = renderInRouter(<Header />, '/about/overview');
    expect(about.querySelector('button[aria-label="docs.modulePickerHome"]')?.textContent).toContain('retikz');
    expect(
      Array.from(about.querySelectorAll<HTMLButtonElement>('button[data-slot="header-navigation-trigger"]')).map(
        button => button.textContent,
      ),
    ).toEqual([
      'retikz',
      'kernel.navigationLabel',
      'library.navigationLabel',
      'schematic.navigationLabel',
      'viz.navigationLabel',
    ]);
    expect(about.querySelector('a[href="/about/overview"]')?.textContent).toBe('about.label');
    expect(about.querySelector('a[href="/about/blog"]')).toBeNull();
  });
});
