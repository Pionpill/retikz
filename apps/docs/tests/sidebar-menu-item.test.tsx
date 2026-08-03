// @vitest-environment jsdom

import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppSidebarMenu, AppSidebarMenuItem } from '@/modules/docs/layout/sidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const DeepLinkNavigator = () => {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate('/kernel/concepts/design/principles/')}>
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
      <MemoryRouter initialEntries={['/kernel/concepts/design']}>
        <DeepLinkNavigator />
        <AppSidebarMenuItem
          item={{ value: 'design', label: 'Design', children: [{ value: 'principles', label: 'Principles' }] }}
          path="/kernel/concepts/design"
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
});
