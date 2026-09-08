// @vitest-environment jsdom

import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import type * as ReactI18nextModule from 'react-i18next';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HeaderActions } from '@/app/header/HeaderActions';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DocDifficultyDot, DocDifficultyIndicator } from '@/modules/docs/components/doc-difficulty';
import { DocDifficulty } from '@/modules/docs/data';
import { DocPageActions } from '@/modules/docs/layout/DocPageActions';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof ReactI18nextModule>()),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.difficulty) return `${key}:${String(options.difficulty)}`;
      if (key === 'page.docStats') return `desktop:${String(options?.minutes)}`;
      if (key === 'page.docStatsCompact') return `mobile:${String(options?.minutes)}`;
      return key;
    },
    i18n: { resolvedLanguage: 'zh' },
  }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const render = (node: ReactNode): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(<TooltipProvider>{node}</TooltipProvider>);
  });

  return container;
};

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

describe('<DocDifficultyIndicator>', () => {
  it.each([
    [DocDifficulty.Beginner, 'lucide-smile', 'text-green'],
    [DocDifficulty.Advanced, 'lucide-meh', 'text-yellow'],
    [DocDifficulty.Internals, 'lucide-frown', 'text-red'],
  ] as const)('renders the %s icon and semantic color', (difficulty, iconClass, colorClass) => {
    const container = render(<DocDifficultyIndicator difficulty={difficulty} />);
    const indicator = container.querySelector('[data-doc-difficulty]');
    const icon = indicator?.querySelector('svg');

    expect(indicator?.getAttribute('aria-label')).toContain('difficulty.pageTooltip');
    expect(icon?.classList.contains(iconClass)).toBe(true);
    expect(icon?.getAttribute('class')).toContain(colorClass);
  });

  it('does not reserve a slot for an unmarked document', () => {
    const container = render(<DocDifficultyIndicator difficulty={undefined} />);

    expect(container.querySelector('[data-doc-difficulty]')).toBeNull();
  });
});

describe('<DocDifficultyDot>', () => {
  it('reveals an aligned colored marker on row hover and exposes its localized difficulty', () => {
    const marked = render(<DocDifficultyDot difficulty={DocDifficulty.Advanced} />);
    const unmarked = render(<DocDifficultyDot difficulty={undefined} />);
    const slot = marked.querySelector('[data-doc-difficulty-slot]');
    const dot = marked.querySelector('[data-doc-difficulty-dot]');

    expect(slot?.getAttribute('aria-label')).toBe('difficulty.pageTooltip:difficulty.advanced');
    expect(slot?.getAttribute('class')).toContain('ml-1');
    expect(slot?.getAttribute('class')).toContain('size-6');
    expect(slot?.getAttribute('class')).toContain('opacity-0');
    expect(slot?.getAttribute('class')).toContain('group-hover:opacity-100');
    expect(dot?.getAttribute('class')).toContain('bg-yellow');
    expect(unmarked.querySelector('[data-doc-difficulty-dot]')).toBeNull();
  });
});

describe('<HeaderActions>', () => {
  it('does not render a document-difficulty filter control', () => {
    const container = render(
      <MemoryRouter>
        <HeaderActions />
      </MemoryRouter>,
    );
    const language = container.querySelector('button:has(svg.lucide-languages)');
    const difficulty = container.querySelector('button[aria-label="difficulty.label"]');
    const more = container.querySelector('button:has(svg.lucide-ellipsis)');

    expect(language).not.toBeNull();
    expect(more).not.toBeNull();
    expect(difficulty).toBeNull();
  });
});

describe('<DocPageActions>', () => {
  const renderActions = (difficulty?: (typeof DocDifficulty)[keyof typeof DocDifficulty]): HTMLElement =>
    render(
      <MemoryRouter initialEntries={['/kernel/galleries/learning-path']}>
        <Routes>
          <Route
            path="/:moduleId/:sectionId/:pageId"
            element={<DocPageActions source={'字'.repeat(2000)} difficulty={difficulty} />}
          />
        </Routes>
      </MemoryRouter>,
    );

  it.each([
    [undefined, 4],
    [DocDifficulty.Beginner, 4],
    [DocDifficulty.Advanced, 5],
    [DocDifficulty.Internals, 6],
  ] as const)('applies the %s coefficient before rounding reading time', (difficulty, minutes) => {
    const container = renderActions(difficulty);

    expect(container.textContent).toContain(`desktop:${minutes}`);
  });

  it('keeps reading stats and page arrows out of the mobile header', () => {
    const container = renderActions(DocDifficulty.Advanced);
    const desktopStats = Array.from(container.querySelectorAll('span')).find(element =>
      element.textContent.startsWith('desktop:'),
    );
    const arrows = container.querySelectorAll('button:has(svg.lucide-arrow-left), button:has(svg.lucide-arrow-right)');

    expect(container.textContent).not.toContain('mobile:');
    expect(desktopStats?.getAttribute('class')).toContain('hidden');
    expect(desktopStats?.getAttribute('class')).toContain('md:inline');
    expect(arrows.length).toBeGreaterThan(0);
    arrows.forEach(arrow => {
      expect(arrow.parentElement?.getAttribute('class')).toContain('hidden');
      expect(arrow.parentElement?.getAttribute('class')).toContain('md:inline-flex');
    });
  });
});
