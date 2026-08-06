// @vitest-environment jsdom

import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShowcaseMetadataBadges } from '@/modules/docs/components/showcase';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => undefined },
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'common.showcaseFamilyTooltip': '家族',
        'common.showcaseUsageTooltip': '用途',
        'viz.chartScatterPoints': '点图',
        'viz.chartPurposeDistribution': '分布',
      })[key] ?? key,
  }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.assign(globalThis, {
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

const roots: Array<Root> = [];

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

describe('<ShowcaseMetadataBadges>', () => {
  it('把 frontmatter 稳定值翻译成 shadcn Badge', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(<ShowcaseMetadataBadges family="scatter-points" usage="distribution" />);
    });

    const badges = Array.from(container.querySelectorAll('[data-slot="badge"]'));

    expect(badges.map(badge => badge.textContent)).toEqual(['点图', '分布']);
    expect(badges.map(badge => badge.getAttribute('data-variant'))).toEqual(['default', 'secondary']);
  });

  it('为家族和用途 Badge 提供本地化 Tooltip', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    act(() => {
      root.render(<ShowcaseMetadataBadges family="scatter-points" usage="distribution" />);
    });

    const triggers = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="tooltip-trigger"]'));

    expect(triggers).toHaveLength(2);

    await act(async () => {
      triggers[0]?.focus();
      await Promise.resolve();
    });

    expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toContain('家族');

    await act(async () => {
      triggers[1]?.focus();
      await Promise.resolve();
    });

    expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toContain('用途');
  });
});
