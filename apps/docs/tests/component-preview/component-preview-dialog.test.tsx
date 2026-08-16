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
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewControlSlot,
  PreviewControlState,
  PreviewThemeMode,
  PreviewThemeStyleSelection,
  SizeKey,
} from '../../src/modules/docs/components/component-preview/types';

import * as componentPreviewExports from '../../src/modules/docs/components/component-preview';
import { ComponentPreviewCard } from '../../src/modules/docs/components/component-preview/ComponentPreviewCard';
import { ComponentPreviewDialog } from '../../src/modules/docs/components/component-preview/ComponentPreviewDialog';
import { PreviewThemeStyle } from '../../src/modules/docs/components/component-preview/theme';

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
    themeMode: 'inherit',
    controlPanelDefaultOpen: true,
  };
  return {
    useComponentPreviewStore: Object.assign((selector: (snapshot: typeof state) => unknown) => selector(state), {
      getState: () => state,
    }),
  };
});

const Demo: FC = () => null;
const controlState: PreviewControlState = {
  canonicalValues: {},
  values: {},
  setValue: () => undefined,
  applyValues: () => undefined,
  reset: () => undefined,
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('ComponentPreviewDialog', () => {
  it('只接收不可变定义与关闭回调，并移除旧 Dialog 导出', () => {
    expectTypeOf<ComponentPreviewDialogProps>().toEqualTypeOf<{
      name: string;
      Component: FC;
      source?: ComponentRenderSource;
      defaultSourceFile?: string;
      align: AlignKey;
      initialSize: SizeKey;
      controlState: PreviewControlState;
      controlDefinition?: PreviewControlsDefinition;
      controlContract?: PreviewControlContract;
      showContextBar: boolean;
      themeMode: PreviewThemeMode;
      onThemeModeChange: (themeMode: PreviewThemeMode) => void;
      enableThemeSwitch?: boolean;
      themeStyleSelection?: PreviewThemeStyleSelection;
      onThemeStyleChange?: (themeStyle: PreviewThemeStyleSelection) => void;
      controlPanelOpen: boolean;
      onControlPanelOpenChange: (open: boolean) => void;
      controlSlots?: Array<PreviewControlSlot>;
      dialogActions?: Array<PreviewActionSlot>;
      showAskAi?: boolean;
      onClose: () => void;
    }>();
    expect(componentPreviewExports).toHaveProperty('ComponentPreviewCard');
    expect(componentPreviewExports).not.toHaveProperty(['Component', 'Detail', 'Dialog'].join(''));
  });

  it('启用局部主题切换时在预览上下文栏显示当前有效风格图标', () => {
    const markup = renderToStaticMarkup(
      <ComponentPreviewDialog
        name="theme-dialog"
        Component={Demo}
        align="center"
        initialSize="md"
        controlState={controlState}
        showContextBar
        themeMode="inherit"
        onThemeModeChange={() => undefined}
        enableThemeSwitch
        themeStyleSelection={PreviewThemeStyle.Academic}
        onThemeStyleChange={() => undefined}
        controlPanelOpen
        onControlPanelOpenChange={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Theme style"');
    expect(markup).toContain('lucide-graduation-cap');
    expect(markup.indexOf('Preview theme dark')).toBeLessThan(markup.indexOf('aria-label="Theme style"'));
  });

  it('Core style 缺省时仍显示默认风格切换按钮', () => {
    const markup = renderToStaticMarkup(
      <ComponentPreviewDialog
        name="default-theme-dialog"
        Component={Demo}
        align="center"
        initialSize="md"
        controlState={controlState}
        showContextBar
        themeMode="inherit"
        onThemeModeChange={() => undefined}
        enableThemeSwitch
        themeStyleSelection={PreviewThemeStyle.Default}
        onThemeStyleChange={() => undefined}
        controlPanelOpen
        onControlPanelOpenChange={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Theme style"');
    expect(markup).toContain('lucide-circle-dot');
  });

  it('按规定顺序渲染 header，并用弹窗 runtime 求值动作插槽', () => {
    const markup = renderToStaticMarkup(
      <ComponentPreviewDialog
        name="runtime-dialog"
        Component={Demo}
        align="center"
        initialSize="md"
        controlState={controlState}
        showContextBar={false}
        themeMode="inherit"
        onThemeModeChange={() => undefined}
        controlPanelOpen
        onControlPanelOpenChange={() => undefined}
        dialogActions={[
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
        controlState={controlState}
        showContextBar={false}
        themeMode="inherit"
        onThemeModeChange={() => undefined}
        controlPanelOpen
        onControlPanelOpenChange={() => undefined}
        dialogActions={[actionSlot]}
        onClose={() => undefined}
      />,
    );
    renderToStaticMarkup(
      <ComponentPreviewDialog
        name="second-dialog"
        Component={Demo}
        align="center"
        initialSize="xl"
        controlState={controlState}
        showContextBar={false}
        themeMode="inherit"
        onThemeModeChange={() => undefined}
        controlPanelOpen
        onControlPanelOpenChange={() => undefined}
        dialogActions={[actionSlot]}
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

  it('Card 将 dialogActions 透传给 Dialog，并用弹窗 runtime 求值', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ComponentPreviewCard
          name="forward-dialog-actions"
          Component={Demo}
          dialogActions={[
            {
              id: 'forwarded-runtime-probe',
              render: runtime => (
                <span data-dialog-action-renderer={runtime.rendererMode}>Dialog {runtime.rendererMode}</span>
              ),
            },
          ]}
        />,
      );
    });

    expect(container.querySelector('[data-dialog-action-renderer]')).toBeNull();
    const cardRendererButton = container.querySelector<HTMLButtonElement>('button[aria-label="Canvas renderer"]');
    expect(cardRendererButton).not.toBeNull();
    act(() => cardRendererButton!.click());
    expect(container.querySelector('button[aria-label="SVG renderer"]')).not.toBeNull();

    const maximizeButton = container.querySelector<HTMLButtonElement>('button[aria-label="Maximize"]');
    expect(maximizeButton).not.toBeNull();
    act(() => maximizeButton!.click());

    const dialog = container.querySelector<HTMLElement>('[data-dialog-content]');
    expect(dialog).not.toBeNull();
    expect(dialog!.querySelector('[data-dialog-action-renderer="canvas"]')).not.toBeNull();
    expect(dialog!.querySelector('button[aria-label="Canvas renderer"]')).not.toBeNull();

    act(() => root.unmount());
  });

  it('Card 与 Dialog 分别按指定文件初始化 React 源码', () => {
    const source: ComponentRenderSource = {
      react: {
        files: [
          { filename: 'example.demo.tsx', code: 'export default null;', lang: 'tsx', isMain: true },
          {
            filename: 'example-preview.tsx',
            code: 'export const renderPreview = () => null;',
            lang: 'tsx',
          },
        ],
      },
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ComponentPreviewCard
          name="default-source-dialog"
          Component={Demo}
          source={source}
          defaultSourceFile="example-preview.tsx"
        />,
      );
    });

    expect(container.textContent).toContain('renderPreview');
    const maximizeButton = container.querySelector<HTMLButtonElement>('button[aria-label="Maximize"]');
    expect(maximizeButton).not.toBeNull();
    act(() => maximizeButton!.click());

    const dialog = container.querySelector<HTMLElement>('[data-dialog-content]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('example-preview.tsx');
    expect(dialog!.textContent).toContain('renderPreview');

    act(() => root.unmount());
  });

  it('Card 拒绝与 host preview tools 重复的 control slot id', () => {
    const duplicateSlot: PreviewControlSlot = {
      id: 'preview-tools',
      visibility: 'always',
      render: () => null,
    };

    expect(() =>
      renderToStaticMarkup(
        <ComponentPreviewCard name="duplicate-card-tools" Component={Demo} controlSlots={[duplicateSlot]} />,
      ),
    ).toThrow('Duplicate preview control slot id: "preview-tools".');
  });

  it('Dialog 拒绝与 host preview tools 重复的 control slot id', () => {
    const duplicateSlot: PreviewControlSlot = {
      id: 'dialog-preview-tools',
      visibility: 'hover',
      render: () => null,
    };

    expect(() =>
      renderToStaticMarkup(
        <ComponentPreviewDialog
          name="duplicate-dialog-tools"
          Component={Demo}
          align="center"
          initialSize="md"
          controlState={controlState}
          showContextBar={false}
          themeMode="inherit"
          onThemeModeChange={() => undefined}
          controlPanelOpen
          onControlPanelOpenChange={() => undefined}
          controlSlots={[duplicateSlot]}
          onClose={() => undefined}
        />,
      ),
    ).toThrow('Duplicate preview control slot id: "dialog-preview-tools".');
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
      visibility: 'always',
      render: runtime => <span data-runtime-renderer={runtime.rendererMode}>{runtime.rendererMode}</span>,
    };

    act(() => {
      root.render(
        <ComponentPreviewCard name="fixed-renderer" Component={Demo} source={source} controlSlots={[runtimeProbe]} />,
      );
    });

    const card = container.firstElementChild!;
    expect(card.querySelector('[data-runtime-renderer="canvas"]')).not.toBeNull();
    const cardVanillaButton = card.querySelector<HTMLButtonElement>('button[aria-label="Vanilla Input code"]');
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

    const dialogVanillaButton = dialog!.querySelector<HTMLButtonElement>('button[aria-label="Vanilla Input code"]');
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

  it('通过真实 Card/Dialog 共享控件值，并在关闭重开后重置弹窗视图 controller', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const controlSlot: PreviewControlSlot = {
      id: 'integration-owner-probe',
      visibility: 'always',
      render: runtime => {
        const value = runtime.value('integration-owner-probe') ?? 'fresh';
        return (
          <button
            type="button"
            aria-label={`control ${value}`}
            onClick={() => runtime.setValue('integration-owner-probe', value === 'dirty' ? 'dialog' : 'dirty')}
          >
            {value}
          </button>
        );
      },
    };

    act(() => {
      root.render(
        <ComponentPreviewCard name="integration-dialog" Component={Demo} size="sm" controlSlots={[controlSlot]} />,
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
    expect(container.querySelectorAll('button[aria-label="control fresh"]')).toHaveLength(0);
    expect(container.querySelectorAll('button[aria-label="control dirty"]')).toHaveLength(2);
    expect(container.querySelector('[data-resizable-panel-group]')).toBeNull();
    expect(container.querySelector('[data-resizable-handle]')).toBeNull();
    expect(container.querySelector('button[aria-label="Copy"]')).toBeNull();

    const dirtyButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="control dirty"]');
    act(() => dirtyButtons[1].click());
    expect(container.querySelectorAll('button[aria-label="control dialog"]')).toHaveLength(2);
    expect(container.querySelectorAll('button[aria-label="Canvas renderer"]')).toHaveLength(2);
    const rendererButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Canvas renderer"]');
    act(() => rendererButtons[1].click());
    expect(container.querySelectorAll('button[aria-label="Canvas renderer"]')).toHaveLength(1);
    expect(container.querySelectorAll('button[aria-label="SVG renderer"]')).toHaveLength(1);

    act(() => queryButton('Close').click());
    expect(container.querySelector('[data-dialog-content]')).toBeNull();
    expect(container.querySelectorAll('button[aria-label="control dialog"]')).toHaveLength(1);

    act(() => queryButton('Maximize').click());
    expect(container.querySelectorAll('button[aria-label="control fresh"]')).toHaveLength(0);
    expect(container.querySelectorAll('button[aria-label="control dialog"]')).toHaveLength(2);
    expect(container.querySelectorAll('button[aria-label="Canvas renderer"]')).toHaveLength(2);

    act(() => root.unmount());
  });
});
