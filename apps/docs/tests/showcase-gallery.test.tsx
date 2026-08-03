// @vitest-environment jsdom

import type { Context, FC, ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComponentPreviewProps } from '@/modules/docs/components/component-preview';

import { DemoLocationContext } from '@/modules/docs/components/component-preview';
import * as showcaseComponents from '@/modules/docs/components/showcase';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: 'zh' },
    t: (key: string) =>
      ({
        'common.showcaseExamples': '使用示例',
        'common.showcaseExamplesEmpty': '暂无其他使用示例。',
        'common.showcaseFamily': '家族',
        'common.showcaseApi': 'API',
        'common.showcaseFamilyEmpty': '暂无其他家族成员。',
      })[key] ?? key,
  }),
}));

vi.mock('@/modules/docs/components/component-preview', async () => {
  const { DemoLocationContext: ActualDemoLocationContext } = await vi.importActual<{
    DemoLocationContext: Context<Array<string> | null>;
  }>('@/modules/docs/components/component-preview/context');
  return {
    DemoLocationContext: ActualDemoLocationContext,
    ComponentPreview: (props: ComponentPreviewProps) => (
      <div data-slot="component-preview-featured">{props.caption}</div>
    ),
    ComponentPreviewThumbnail: (props: { className?: string }) => (
      <div data-slot="component-preview-thumbnail" className={props.className} />
    ),
  };
});

type GalleryExample = {
  id: string;
  title: string;
  description: string;
  preview: {
    files: Array<string>;
    controls: { name: string };
    size: 'xl';
    caption: string;
  };
};

type GalleryProps = {
  examples: readonly [GalleryExample, ...Array<GalleryExample>];
  children: ReactNode;
};

const ShowcaseGallery = (showcaseComponents as unknown as { ShowcaseGallery?: FC<GalleryProps> }).ShowcaseGallery;

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: Array<Root> = [];

const examples = [
  {
    id: 'basic',
    title: '基础散点',
    description: '比较两个连续变量。',
    preview: {
      files: ['scatter-basic', 'scatter-basic.data.ts'],
      controls: { name: 'scatter-basic' },
      size: 'xl',
      caption: '基础散点说明',
    },
  },
  {
    id: 'bubble',
    title: '气泡编码',
    description: '增加数值尺寸编码。',
    preview: {
      files: ['scatter-bubble', 'scatter-basic.data.ts'],
      controls: { name: 'scatter-bubble' },
      size: 'xl',
      caption: '气泡编码说明',
    },
  },
] as const satisfies readonly [GalleryExample, ...Array<GalleryExample>];

const renderGallery = (
  galleryExamples: readonly [GalleryExample, ...Array<GalleryExample>] = examples,
): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  expect(ShowcaseGallery).toBeTypeOf('function');
  if (!ShowcaseGallery) return container;

  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/viz/chart/points/scatter']}>
        <Routes>
          <Route
            path="/:moduleId/:sectionId/:pageId/:subPageId"
            element={
              <DemoLocationContext.Provider value={['viz', 'chart', 'points', 'scatter']}>
                <ShowcaseGallery examples={galleryExamples}>API body</ShowcaseGallery>
              </DemoLocationContext.Provider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  });

  return container;
};

afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  document.body.replaceChildren();
});

describe('<ShowcaseGallery>', () => {
  it('只展示非当前候选项，并在点击后与主 Preview 交换', () => {
    const container = renderGallery();
    const grid = container.querySelector('[data-slot="showcase-examples"]');
    const cards = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-slot="showcase-example"]'));

    expect(grid?.classList.contains('grid')).toBe(true);
    expect(grid?.classList.contains('grid-cols-[repeat(auto-fill,minmax(230px,270px))]')).toBe(true);
    expect(cards).toHaveLength(1);
    expect(cards.every(card => card.querySelector('[data-slot="component-preview-thumbnail"]'))).toBe(true);
    expect(cards[0]?.classList.contains('h-[250px]')).toBe(true);
    expect(cards[0]?.hasAttribute('aria-pressed')).toBe(false);
    expect(cards[0]?.textContent).toContain('气泡编码');
    expect(cards[0]?.textContent).toContain('增加数值尺寸编码。');
    expect(cards[0]?.querySelector('[data-slot="component-preview-thumbnail"]')?.classList).toContain('bg-transparent');
    expect(cards[0]?.querySelector('[data-slot="showcase-example-copy"]')?.classList).toContain('bg-muted/40');
    expect(container.textContent).toContain('基础散点说明');
    expect(container.textContent).not.toContain('气泡编码说明');

    act(() => cards[0]?.click());

    const nextCards = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-slot="showcase-example"]'));

    expect(nextCards).toHaveLength(1);
    expect(nextCards[0]?.textContent).toContain('基础散点');
    expect(nextCards[0]?.textContent).not.toContain('气泡编码');
    expect(container.textContent).not.toContain('基础散点说明');
    expect(container.textContent).toContain('气泡编码说明');
  });

  it('把普通 MDX children 作为 API 标签内容', () => {
    const container = renderGallery();
    const apiTab = container.querySelectorAll<HTMLElement>('[role="tab"]')[2];

    expect(apiTab).toBeInstanceOf(HTMLElement);
    act(() => {
      apiTab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    });

    expect(container.textContent).toContain('API body');
  });

  it('只有当前预览时为使用示例提供明确空状态', () => {
    const container = renderGallery([examples[0]]);

    expect(container.textContent).toContain('暂无其他使用示例。');
  });
});
