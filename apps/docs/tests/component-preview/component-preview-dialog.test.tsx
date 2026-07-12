// @vitest-environment jsdom

import type { FC, ReactNode } from 'react';

import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import type { ComponentPreviewDialogProps } from '../../src/modules/docs/components/component-preview/ComponentPreviewDialog';
import type {
  AlignKey,
  ComponentRenderSource,
  PreviewActionSlot,
  PreviewControlSlot,
  SizeKey,
} from '../../src/modules/docs/components/component-preview/types';

import * as componentPreviewExports from '../../src/modules/docs/components/component-preview';
import { ComponentPreviewCard } from '../../src/modules/docs/components/component-preview/ComponentPreviewCard';
import { ComponentPreviewDialog } from '../../src/modules/docs/components/component-preview/ComponentPreviewDialog';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock('../../src/components/ui/dialog', async () => {
  const { createContext, useContext } = await import('react');
  const CloseContext = createContext<() => void>(() => undefined);

  return {
    Dialog: ({ children, onOpenChange }: { children: ReactNode; onOpenChange?: (open: boolean) => void }) => (
      <CloseContext.Provider value={() => onOpenChange?.(false)}>{children}</CloseContext.Provider>
    ),
    DialogClose: ({ children }: { children: ReactNode }) => {
      const close = useContext(CloseContext);
      return <span onClick={close}>{children}</span>;
    },
    DialogContent: ({ children }: { children: ReactNode }) => <section data-dialog-content>{children}</section>,
    DialogTitle: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };
});

vi.mock('../../src/components/ui/resizable', () => ({
  ResizableHandle: () => <span data-resizable-handle="true" />,
  ResizablePanel: ({ children }: { children: ReactNode }) => <>{children}</>,
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => (
    <div data-resizable-panel-group="true">{children}</div>
  ),
}));

vi.mock('../../src/modules/docs/store', () => {
  const state = {
    hideCode: false,
    isExpand: false,
    rendererMode: 'canvas',
    dragEnabled: false,
  };
  return {
    useComponentPreviewStore: Object.assign((selector: (snapshot: typeof state) => unknown) => selector(state), {
      getState: () => state,
    }),
  };
});

const Demo: FC = () => null;

afterEach(() => {
  document.body.replaceChildren();
});

describe('ComponentPreviewDialog', () => {
  it('只接收不可变定义与关闭回调，并移除旧 Dialog 导出', () => {
    expectTypeOf<ComponentPreviewDialogProps>().toEqualTypeOf<{
      name: string;
      Component: FC;
      source?: ComponentRenderSource;
      align: AlignKey;
      initialSize: SizeKey;
      controlSlots?: Array<PreviewControlSlot>;
      controlsAlwaysVisible?: boolean;
      dialogActionSlots?: Array<PreviewActionSlot>;
      showAskAi?: boolean;
      onClose: () => void;
    }>();
    expect(componentPreviewExports).toHaveProperty('ComponentPreviewCard');
    expect(componentPreviewExports).not.toHaveProperty(['Component', 'Detail', 'Dialog'].join(''));
  });

  it('按规定顺序渲染 header，并用弹窗 runtime 求值动作插槽', () => {
    const markup = renderToStaticMarkup(
      <ComponentPreviewDialog
        name="runtime-dialog"
        Component={Demo}
        align="center"
        initialSize="md"
        dialogActionSlots={[
          {
            id: 'runtime-probe',
            render: runtime => <span data-runtime={runtime.rendererMode}>Runtime {runtime.rendererMode}</span>,
          },
        ]}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('data-runtime="canvas"');
    const headerItems = ['runtime-dialog', 'Runtime canvas', 'Canvas renderer', 'Reset', 'Download PNG', 'Close'];
    const positions = headerItems.map(item => markup.indexOf(item));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('同一动作定义在两个弹窗实例中分别接收各自 runtime', () => {
    const runtimes: Array<Parameters<PreviewActionSlot['render']>[0]> = [];
    const actionSlot: PreviewActionSlot = {
      id: 'double-instance-probe',
      render: runtime => {
        runtimes.push(runtime);
        return <span>{runtime.rendererMode}</span>;
      },
    };

    renderToStaticMarkup(
      <ComponentPreviewDialog
        name="first-dialog"
        Component={Demo}
        align="center"
        initialSize="sm"
        dialogActionSlots={[actionSlot]}
        onClose={() => undefined}
      />,
    );
    renderToStaticMarkup(
      <ComponentPreviewDialog
        name="second-dialog"
        Component={Demo}
        align="center"
        initialSize="xl"
        dialogActionSlots={[actionSlot]}
        onClose={() => undefined}
      />,
    );

    expect(runtimes).toHaveLength(2);
    expect(runtimes[0]).not.toBe(runtimes[1]);
  });

  it('卡片关闭状态不挂载弹窗子树', () => {
    const markup = renderToStaticMarkup(
      <ComponentPreviewCard name="conditionally-mounted" Component={Demo} size="xl" />,
    );

    expect(markup).not.toContain('conditionally-mounted');
    expect(markup).not.toContain('aria-label="Close"');
  });

  it('Card 禁用 Ask AI 时全屏源码 header 也不显示该动作', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const source: ComponentRenderSource = {
      react: { files: [{ filename: 'ask-ai.tsx', code: 'export default null;', lang: 'tsx' }] },
    };

    act(() => {
      root.render(<ComponentPreviewCard name="ask-ai-visibility" Component={Demo} source={source} showAskAi={false} />);
    });

    expect(container.querySelector('button[aria-label="Ask AI"]')).toBeNull();
    const maximizeButton = container.querySelector<HTMLButtonElement>('button[aria-label="Maximize"]');
    expect(maximizeButton).not.toBeNull();
    act(() => maximizeButton!.click());
    expect(container.querySelector('[data-dialog-content]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Ask AI"]')).toBeNull();

    act(() => root.unmount());
  });

  it('固定 SVG 源码视图让 Card 与 Dialog 使用真实 renderer，并在返回 React 后恢复 Canvas', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const source: ComponentRenderSource = {
      react: { files: [{ filename: 'fixed-renderer.tsx', code: 'export default null;', lang: 'tsx' }] },
      vanilla: {
        files: [{ filename: 'fixed-renderer.vanilla.ts', code: 'render();', lang: 'ts' }],
        rendererMode: 'svg',
        render: () => <svg data-fixed-renderer="svg" />,
      },
    };
    const runtimeProbe: PreviewControlSlot = {
      id: 'renderer-runtime-probe',
      render: runtime => <span data-runtime-renderer={runtime.rendererMode}>{runtime.rendererMode}</span>,
    };

    act(() => {
      root.render(
        <ComponentPreviewCard
          name="fixed-renderer"
          Component={Demo}
          source={source}
          controlSlots={[runtimeProbe]}
          controlsAlwaysVisible
        />,
      );
    });

    const card = container.firstElementChild!;
    expect(card.querySelector('[data-runtime-renderer="canvas"]')).not.toBeNull();
    const cardVanillaButton = card.querySelector<HTMLButtonElement>('button[aria-label="Vanilla plain spec code"]');
    expect(cardVanillaButton).not.toBeNull();
    act(() => cardVanillaButton!.click());
    expect(card.querySelector('[data-runtime-renderer="svg"]')).not.toBeNull();
    expect(card.querySelector('svg[data-fixed-renderer="svg"]')).not.toBeNull();
    expect(card.querySelector<HTMLButtonElement>('button[aria-label="SVG renderer"]')?.disabled).toBe(true);
    expect(card.querySelector('button[aria-label="Download SVG"]')).not.toBeNull();

    const cardReactButton = card.querySelector<HTMLButtonElement>('button[aria-label="React source"]');
    expect(cardReactButton).not.toBeNull();
    act(() => cardReactButton!.click());
    expect(card.querySelector('[data-runtime-renderer="canvas"]')).not.toBeNull();
    expect(card.querySelector<HTMLButtonElement>('button[aria-label="Canvas renderer"]')?.disabled).toBe(false);

    const maximizeButton = card.querySelector<HTMLButtonElement>('button[aria-label="Maximize"]');
    expect(maximizeButton).not.toBeNull();
    act(() => maximizeButton!.click());
    const dialog = card.querySelector<HTMLElement>('[data-dialog-content]');
    expect(dialog).not.toBeNull();
    expect(dialog!.querySelector('[data-runtime-renderer="canvas"]')).not.toBeNull();

    const dialogVanillaButton = dialog!.querySelector<HTMLButtonElement>(
      'button[aria-label="Vanilla plain spec code"]',
    );
    expect(dialogVanillaButton).not.toBeNull();
    act(() => dialogVanillaButton!.click());
    expect(dialog!.querySelector('[data-runtime-renderer="svg"]')).not.toBeNull();
    expect(dialog!.querySelector('svg[data-fixed-renderer="svg"]')).not.toBeNull();
    expect(dialog!.querySelector<HTMLButtonElement>('button[aria-label="SVG renderer"]')?.disabled).toBe(true);
    expect(dialog!.querySelector('button[aria-label="Download SVG"]')).not.toBeNull();

    const dialogReactButton = dialog!.querySelector<HTMLButtonElement>('button[aria-label="React source"]');
    expect(dialogReactButton).not.toBeNull();
    act(() => dialogReactButton!.click());
    expect(dialog!.querySelector('[data-runtime-renderer="canvas"]')).not.toBeNull();
    expect(dialog!.querySelector<HTMLButtonElement>('button[aria-label="Canvas renderer"]')?.disabled).toBe(false);

    act(() => root.unmount());
  });

  it('通过真实 Card/Dialog 装配隔离状态，并在关闭重开后重置弹窗 controller', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const controlSlot: PreviewControlSlot = {
      id: 'integration-owner-probe',
      render: runtime => {
        const value = runtime.value('integration-owner-probe') ?? 'fresh';
        return (
          <button
            type="button"
            aria-label={`control ${value}`}
            onClick={() => runtime.setValue('integration-owner-probe', 'dirty')}
          >
            {value}
          </button>
        );
      },
    };

    act(() => {
      root.render(
        <ComponentPreviewCard
          name="integration-dialog"
          Component={Demo}
          size="sm"
          controlSlots={[controlSlot]}
          controlsAlwaysVisible
        />,
      );
    });

    const queryButton = (label: string): HTMLButtonElement => {
      const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
      expect(button).not.toBeNull();
      return button!;
    };
    act(() => queryButton('control fresh').click());
    expect(queryButton('control dirty')).toBeTruthy();

    act(() => queryButton('Maximize').click());
    expect(container.querySelectorAll('button[aria-label="control fresh"]')).toHaveLength(1);
    expect(container.querySelectorAll('button[aria-label="control dirty"]')).toHaveLength(1);
    expect(container.querySelector('[data-resizable-panel-group]')).toBeNull();
    expect(container.querySelector('[data-resizable-handle]')).toBeNull();
    expect(container.querySelector('button[aria-label="Copy"]')).toBeNull();

    act(() => queryButton('control fresh').click());
    expect(container.querySelectorAll('button[aria-label="control dirty"]')).toHaveLength(2);
    expect(container.querySelectorAll('button[aria-label="Canvas renderer"]')).toHaveLength(2);
    const rendererButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Canvas renderer"]');
    act(() => rendererButtons[1].click());
    expect(container.querySelectorAll('button[aria-label="Canvas renderer"]')).toHaveLength(1);
    expect(container.querySelectorAll('button[aria-label="SVG renderer"]')).toHaveLength(1);

    act(() => queryButton('Close').click());
    expect(container.querySelector('[data-dialog-content]')).toBeNull();
    expect(container.querySelectorAll('button[aria-label="control dirty"]')).toHaveLength(1);

    act(() => queryButton('Maximize').click());
    expect(container.querySelectorAll('button[aria-label="control fresh"]')).toHaveLength(1);
    expect(container.querySelectorAll('button[aria-label="control dirty"]')).toHaveLength(1);
    expect(container.querySelectorAll('button[aria-label="Canvas renderer"]')).toHaveLength(2);

    act(() => root.unmount());
  });
});
