// @vitest-environment jsdom

import type { ComponentProps } from 'react';
import type { Root } from 'react-dom/client';
import type * as ReactI18nextModule from 'react-i18next';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocDifficulty } from '@/modules/docs/data';
import { AppSidebar, AppSidebarMenu, AppSidebarMenuItem } from '@/modules/docs/layout/sidebar';
import { useDocDifficultyStore } from '@/modules/docs/store';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof ReactI18nextModule>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const DeepLinkNavigator = () => {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate('/kernel/components/design/principles/')}>
      Navigate to principles
    </button>
  );
};

const renderMenuItem = (): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/kernel/components/design']}>
        <DeepLinkNavigator />
        <AppSidebarMenuItem
          item={{ value: 'design', label: 'Design', children: [{ value: 'principles', label: 'Principles' }] }}
          path="/kernel/components/design"
        />
      </MemoryRouter>,
    );
  });

  return container;
};

const findButton = (container: HTMLElement, label: string): HTMLButtonElement | undefined =>
  Array.from(container.querySelectorAll('button')).find(button => button.textContent.trim() === label);

const ShowcaseIcon = (props: { className?: string }) => <svg aria-label="Showcase icon" {...props} />;

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

describe('<AppSidebarMenuItem>', () => {
  it('opens the active branch and selects its leaf after URL navigation', () => {
    const container = renderMenuItem();
    const navigationButton = findButton(container, 'Navigate to principles');

    expect(navigationButton).toBeDefined();
    if (!navigationButton) throw new Error('Navigation button not found');

    act(() => {
      navigationButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const activeLeaf = findButton(container, 'Principles');
    expect(activeLeaf).toBeDefined();
    expect(activeLeaf?.className).toContain('bg-accent');
  });
});

describe('<AppSidebarMenu>', () => {
  it('在一级页面 label 左侧渲染 Showcase 图标', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/viz/chart/points/scatter']}>
          <AppSidebarMenu
            moduleId="viz"
            categories={[
              {
                value: 'chart',
                label: 'Chart',
                modules: [
                  {
                    value: 'points',
                    label: 'Scatter & Points',
                    Icon: ShowcaseIcon,
                    children: [{ value: 'scatter', label: 'Scatter' }],
                  },
                ],
              },
            ]}
          />
        </MemoryRouter>,
      );
    });

    const chartLabel = container.querySelector('h4');
    const pointsButton = findButton(container, 'Scatter & Points');
    const scatterButton = findButton(container, 'Scatter');

    expect(chartLabel?.querySelector('svg')).toBeNull();
    expect(pointsButton?.querySelector('svg[aria-label="Showcase icon"]')).not.toBeNull();
    expect(scatterButton?.querySelector('svg')).toBeNull();
  });

  it('只给一级和递归叶子渲染难度圆点', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/kernel/intro']}>
          <AppSidebarMenu
            moduleId="kernel"
            categories={[
              {
                value: 'root',
                ungrouped: true,
                modules: [
                  { value: 'intro', label: 'Intro', difficulty: DocDifficulty.Beginner },
                  { value: 'api', label: 'API' },
                  {
                    value: 'group',
                    label: 'Group',
                    children: [
                      { value: 'advanced', label: 'Advanced', difficulty: DocDifficulty.Advanced },
                      { value: 'internals', label: 'Internals', difficulty: DocDifficulty.Internals },
                    ],
                  },
                ],
              },
            ]}
          />
        </MemoryRouter>,
      );
    });

    const intro = findButton(container, 'Intro');
    const api = findButton(container, 'API');
    const group = findButton(container, 'Group');
    const introDifficultySlot = intro?.querySelector('[data-doc-difficulty-slot]');
    const groupExpandButton = group?.parentElement?.querySelector<HTMLButtonElement>(
      'button[aria-label="common.expandSection"]',
    );

    expect(intro?.querySelector('[data-doc-difficulty-dot="beginner"]')).not.toBeNull();
    expect(introDifficultySlot?.classList.contains('size-6')).toBe(true);
    expect(groupExpandButton?.classList.contains('size-6')).toBe(true);
    expect(introDifficultySlot?.classList.contains('ml-1')).toBe(true);
    expect(groupExpandButton?.classList.contains('ml-1')).toBe(true);
    expect(api?.querySelector('[data-doc-difficulty-dot]')).toBeNull();
    expect(group?.querySelector('[data-doc-difficulty-dot]')).toBeNull();

    act(() => {
      groupExpandButton?.click();
    });

    expect(findButton(container, 'Advanced')?.querySelector('[data-doc-difficulty-dot="advanced"]')).not.toBeNull();
    expect(findButton(container, 'Internals')?.querySelector('[data-doc-difficulty-dot="internals"]')).not.toBeNull();
  });
});

describe('<AppSidebar>', () => {
  it('只渲染当前 section 的页面树，并隐藏已上移的 section 标题', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/viz/chart/points/scatter']}>
          <AppSidebar
            location={{
              moduleId: 'viz',
              sectionId: 'chart',
              pageId: 'points',
              subPageId: 'scatter',
            }}
          />
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('aside')).not.toBeNull();
    expect(container.textContent).toContain('viz.chartScatterPoints');
    expect(container.textContent).toContain('viz.chartScatter');
    expect(findButton(container, 'viz.chart')).toBeUndefined();
    expect(findButton(container, 'viz.table')).toBeUndefined();
    expect(findButton(container, 'viz.drawingGrammar')).toBeUndefined();
    expect(findButton(container, 'viz.data')).toBeUndefined();
  });

  it('组件组和 About 页面分别使用自己的 tree，模块主页不显示 Sidebar', () => {
    const renderSidebar = (location: ComponentProps<typeof AppSidebar>['location']): HTMLElement => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      roots.push(root);
      act(() => {
        root.render(
          <MemoryRouter initialEntries={['/docs-test']}>
            <AppSidebar location={location} />
          </MemoryRouter>,
        );
      });
      return container;
    };

    const components = renderSidebar({ moduleId: 'kernel', sectionId: 'components', pageId: 'introduction' });
    expect(components.textContent).toContain('kernel.introduction');
    expect(components.textContent).toContain('kernel.getStart');
    expect(components.textContent).toContain('kernel.concepts');
    expect(components.textContent).toContain('kernel.components');
    expect(components.querySelectorAll('[data-slot="separator"]')).toHaveLength(2);

    const about = renderSidebar({ moduleId: 'about', sectionId: null, pageId: 'overview' });
    expect(about.textContent).toContain('about.overview');
    expect(about.textContent).toContain('about.blog');
    expect(about.textContent).toContain('about.blogCorePhilosophy');
    expect(about.textContent).toContain('about.releases');
    expect(about.textContent).toContain('about.versioning');
    expect(about.textContent).toContain('about.developer');
    expect(about.textContent).toContain('about.sourceCodeGuide');
    expect(about.textContent).not.toContain('kernel.introduction');

    const moduleHome = renderSidebar(null);
    expect(moduleHome.querySelector('aside')).toBeNull();
  });

  it('按阅读难度过滤当前 section 的后代页面', () => {
    useDocDifficultyStore.setState({ maximumDifficulty: DocDifficulty.Beginner });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/kernel/components/basic/coordinate-system']}>
          <AppSidebar
            location={{
              moduleId: 'kernel',
              sectionId: 'components',
              pageId: 'basic',
              subPageId: 'coordinate-system',
            }}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('kernel.coordinateSystem');
    expect(findButton(container, 'kernel.primitiveModel')).toBeUndefined();
    expect(findButton(container, 'kernel.principles')).toBeUndefined();
  });
});
