// @vitest-environment jsdom

import type { Context } from 'react';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComponentPreviewProps } from '@/modules/docs/components/component-preview';

import { ShowcaseTabs } from '@/modules/docs/components/showcase';

vi.mock('@/modules/docs/components/component-preview', async () => {
  const { DemoLocationContext } = await vi.importActual<{ DemoLocationContext: Context<Array<string> | null> }>(
    '@/modules/docs/components/component-preview/context',
  );
  return {
    DemoLocationContext,
    ComponentPreview: (props: ComponentPreviewProps) => (
      <div data-slot="showcase-family-preview" data-size={props.size} />
    ),
  };
});

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => undefined },
  useTranslation: () => ({
    i18n: { resolvedLanguage: 'en' },
    t: (key: string) =>
      ({
        'common.showcaseExamples': 'Examples',
        'common.showcaseFamily': 'Family',
        'common.showcaseApi': 'API',
        'common.showcaseFamilyEmpty': 'No other family members yet.',
        'viz.chartScatter': 'Scatter',
        'viz.chartBubble': 'Bubble',
      })[key] ?? key,
  }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const LocationProbe = () => {
  const location = useLocation();
  return <output data-location>{`${location.pathname}${location.search}`}</output>;
};

const renderTabs = (initialEntry: string): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <ShowcaseTabs examples={<div>Examples body</div>}>
          <div>API body</div>
        </ShowcaseTabs>
        <LocationProbe />
      </MemoryRouter>,
    );
  });

  return container;
};

const clickTab = (container: HTMLElement, name: string): void => {
  const tab = Array.from(container.querySelectorAll('[role="tab"]')).find(item => item.textContent === name);
  if (!(tab instanceof HTMLElement)) throw new Error(`Tab "${name}" not found`);
  act(() => {
    tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
  });
};

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

describe('<ShowcaseTabs>', () => {
  it('使用 shadcn 默认的圆角分段标签样式', () => {
    const container = renderTabs('/viz/chart/points/scatter');
    const tabsList = container.querySelector('[data-slot="tabs-list"]');

    expect(tabsList?.className).toContain('rounded-lg');
    expect(tabsList?.className).toContain('bg-muted');
    expect(tabsList?.getAttribute('data-variant')).toBe('default');
    expect(tabsList?.classList.contains('rounded-none')).toBe(false);
    expect(tabsList?.classList.contains('bg-transparent')).toBe(false);
    expect(tabsList?.parentElement?.className).not.toContain('border-b');
  });

  it('缺少 tab 参数时默认展示 Examples，并用 replace 写入切换结果', () => {
    const container = renderTabs('/viz/chart/points/scatter');

    expect(container.textContent).toContain('Examples body');
    clickTab(container, 'API');

    expect(container.textContent).toContain('API body');
    expect(container.querySelector('[data-location]')?.textContent).toBe('/viz/chart/points/scatter?tab=api');
  });

  it('刷新带 api 参数的 URL 时恢复 API，非法值回退到 Examples', () => {
    const apiContainer = renderTabs('/viz/chart/points/scatter?tab=api');
    expect(apiContainer.textContent).toContain('API body');

    act(() => roots.shift()?.unmount());
    apiContainer.remove();

    const invalidContainer = renderTabs('/viz/chart/points/scatter?tab=unknown');
    expect(invalidContainer.textContent).toContain('Examples body');
  });

  it('Scatter 与 Bubble 的 Family 只展示对方，不展示当前页面', () => {
    const scatterContainer = renderTabs('/viz/chart/points/scatter?tab=family');

    expect(scatterContainer.textContent).toContain('Bubble');
    expect(scatterContainer.textContent).not.toContain('No other family members yet.');
    expect(scatterContainer.querySelector('a')?.getAttribute('href')).toBe('/viz/chart/points/bubble');
    expect(scatterContainer.querySelector('[data-slot="showcase-family-preview"]')?.getAttribute('data-size')).toBe(
      'xl',
    );

    act(() => roots.shift()?.unmount());
    scatterContainer.remove();

    const bubbleContainer = renderTabs('/viz/chart/points/bubble?tab=family');

    expect(bubbleContainer.textContent).toContain('Scatter');
    expect(bubbleContainer.textContent).not.toContain('Bubble');
    expect(bubbleContainer.querySelector('a')?.getAttribute('href')).toBe('/viz/chart/points/scatter');
  });
});
