// @vitest-environment jsdom

import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import type * as ReactI18nextModule from 'react-i18next';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocDifficultyFilter } from '@/app/header/DocDifficultyFilter';
import { HeaderActions } from '@/app/header/HeaderActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  DocDifficultyDot,
  DocDifficultyIndicator,
  DocDifficultyMenuItems,
} from '@/modules/docs/components/doc-difficulty';
import { DocDifficulty } from '@/modules/docs/data';
import { DocPageActions } from '@/modules/docs/layout/DocPageActions';
import { useDocDifficultyStore } from '@/modules/docs/store';

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
  useDocDifficultyStore.getState().setMaximumDifficulty(DocDifficulty.Internals);
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

describe('<DocDifficultyMenuItems>', () => {
  it('renders all three localized cumulative reading levels', () => {
    render(
      <DropdownMenu open modal={false}>
        <DropdownMenuTrigger>Difficulty</DropdownMenuTrigger>
        <DropdownMenuContent forceMount>
          <DocDifficultyMenuItems />
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(document.body.textContent).toContain('difficulty.beginner');
    expect(document.body.textContent).toContain('difficulty.advanced');
    expect(document.body.textContent).toContain('difficulty.internals');
  });
});

describe('<DocDifficultyFilter>', () => {
  it('shows the selected level and opens the three-level menu', () => {
    useDocDifficultyStore.getState().setMaximumDifficulty(DocDifficulty.Beginner);
    const container = render(<DocDifficultyFilter />);
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="difficulty.label"]');

    expect(trigger?.querySelector('svg')?.classList.contains('lucide-smile')).toBe(true);
    expect(trigger?.querySelector('svg')?.getAttribute('class')).toContain('text-green');

    expect(trigger).not.toBeNull();
    if (!trigger) throw new Error('Difficulty trigger not found');
    act(() => {
      trigger.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    });

    expect(trigger.getAttribute('data-state')).toBe('open');
    expect(document.body.textContent).toContain('difficulty.beginner');
    expect(document.body.textContent).toContain('difficulty.advanced');
    expect(document.body.textContent).toContain('difficulty.internals');
  });
});

describe('<HeaderActions>', () => {
  it('places the desktop difficulty control immediately after the language switch', () => {
    const container = render(
      <MemoryRouter>
        <HeaderActions />
      </MemoryRouter>,
    );
    const language = container.querySelector('button:has(svg.lucide-languages)');
    const difficulty = container.querySelector('button[aria-label="difficulty.label"]');
    const more = container.querySelector('button:has(svg.lucide-ellipsis)');

    expect(language).not.toBeNull();
    expect(difficulty).not.toBeNull();
    expect(more).not.toBeNull();
    expect(language?.nextElementSibling?.contains(difficulty)).toBe(true);
    expect(difficulty?.parentElement?.nextElementSibling?.contains(more)).toBe(true);
  });
});

describe('<DocPageActions>', () => {
  const renderActions = (difficulty?: (typeof DocDifficulty)[keyof typeof DocDifficulty]): HTMLElement =>
    render(
      <MemoryRouter initialEntries={['/kernel/examples/learning-path']}>
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
