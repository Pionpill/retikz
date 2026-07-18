// @vitest-environment jsdom
import type { FC, ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ResizableModule from '../../src/components/ui/resizable';
import type { PreviewControlLayoutMetrics } from '../../src/modules/docs/components/component-preview/control-panel';
import type {
  PreviewControlsDefinition,
  PreviewControlSection,
  PreviewControlState,
  PreviewPanelControlsDefinition,
} from '../../src/modules/docs/components/component-preview/types';

import { definePreviewControls } from '../../src/modules/docs/components/component-preview';
import {
  layoutPreviewControlSections,
  PreviewControlPanel,
  PreviewWorkspace,
  splitPreviewControlSections,
} from '../../src/modules/docs/components/component-preview/control-panel';
import { usePreviewControlState } from '../../src/modules/docs/components/component-preview/hooks';
import { usePreviewPanelState } from '../../src/modules/docs/components/component-preview/preview-panel';

vi.mock('../../src/components/ui/resizable', () => ({
  ResizablePanelGroup: ({
    children,
    direction,
    dir,
  }: {
    children: ReactNode;
    direction: 'horizontal' | 'vertical';
    dir?: 'ltr' | 'rtl';
  }) => (
    <div data-slot="resizable-panel-group" data-direction={direction} dir={dir}>
      {children}
    </div>
  ),
  ResizablePanel: (props: {
    children: ReactNode;
    defaultSize?: number;
    order?: number;
    onCollapse?: () => void;
    onResize?: (size: number, previousSize: number | undefined) => void;
  }) => {
    const { children, defaultSize, order, onCollapse, onResize } = props;
    return (
      <section data-slot="resizable-panel" data-default-size={defaultSize} data-order={order}>
        {onResize ? (
          <button type="button" aria-label="Simulate panel resize" onClick={() => onResize(34, defaultSize)} />
        ) : null}
        {onCollapse ? <button type="button" aria-label="Simulate panel collapse" onClick={onCollapse} /> : null}
        {children}
      </section>
    );
  },
  ResizableHandle: (props: { withHandle?: boolean; className?: string; 'data-slot'?: string }) => (
    <span
      data-slot="resizable-handle"
      data-preview-slot={props['data-slot']}
      data-with-handle={String(Boolean(props.withHandle))}
      className={props.className}
    />
  ),
}));

class ResizeObserverMock implements ResizeObserver {
  static instances: Array<ResizeObserverMock> = [];

  readonly callback: ResizeObserverCallback;
  readonly targets = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  disconnect = (): void => this.targets.clear();
  observe = (target: Element): void => {
    this.targets.add(target);
  };
  unobserve = (target: Element): void => {
    this.targets.delete(target);
  };

  emitWidth = (width: number): void => {
    this.emitSize(width, 0);
  };

  emitSize = (width: number, height: number): void => {
    this.callback(
      Array.from(this.targets, target => ({ target, contentRect: { width, height } }) as ResizeObserverEntry),
      this,
    );
  };
}

let nextAnimationFrameId = 1;
const animationFrames = new Map<number, FrameRequestCallback>();

const flushAnimationFrames = async (): Promise<void> => {
  await act(() => {
    const pendingFrames = Array.from(animationFrames.values());
    animationFrames.clear();
    pendingFrames.forEach(callback => callback(0));
  });
};

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: ResizeObserverMock,
  requestAnimationFrame: (callback: FrameRequestCallback): number => {
    const frameId = nextAnimationFrameId;
    nextAnimationFrameId += 1;
    animationFrames.set(frameId, callback);
    return frameId;
  },
  cancelAnimationFrame: (frameId: number): void => {
    animationFrames.delete(frameId);
  },
});

const definition = definePreviewControls({
  presentation: 'panel',
  title: 'Node Properties',
  sections: [
    {
      label: 'Appearance',
      controls: [
        { kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' },
        { kind: 'number', id: 'strokeWidth', label: 'Stroke width', defaultValue: 2 },
        {
          kind: 'select',
          id: 'shape',
          label: 'Shape',
          defaultValue: 'rectangle',
          options: [{ value: 'rectangle', label: 'Rectangle' }],
        },
        { kind: 'switch', id: 'dashed', label: 'Dashed', defaultValue: false },
        { kind: 'color', id: 'fill', label: 'Fill', defaultValue: '#ffffff' },
        { kind: 'range', id: 'opacity', label: 'Opacity', defaultValue: 1, min: 0, max: 1 },
      ],
    },
  ],
});

const overlayDefinition = definePreviewControls({
  presentation: 'overlay',
  controls: [{ kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' }],
});

const alternateDefinition = definePreviewControls({
  presentation: 'panel',
  title: 'Alternate Properties',
  sections: [
    {
      label: 'Layout',
      controls: [{ kind: 'number', id: 'width', label: 'Width', defaultValue: 100 }],
    },
  ],
});

const adaptiveSections = [
  {
    label: 'Content',
    controls: [
      { kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' },
      {
        kind: 'select',
        id: 'shape',
        label: 'Shape',
        defaultValue: 'rectangle',
        options: [{ value: 'rectangle', label: 'Rectangle' }],
      },
    ],
  },
  {
    label: 'Appearance',
    controls: [
      { kind: 'color', id: 'fill', label: 'Fill', defaultValue: '#ffffff' },
      { kind: 'color', id: 'stroke', label: 'Stroke', defaultValue: '#000000' },
      { kind: 'range', id: 'opacity', label: 'Opacity', defaultValue: 1, min: 0, max: 1 },
    ],
  },
] satisfies ReadonlyArray<PreviewControlSection>;

const createLayoutMetrics = (availableHeight: number): PreviewControlLayoutMetrics => ({
  availableHeight,
  titleHeights: new Map([
    [0, 20],
    [1, 20],
  ]),
  fieldHeights: new Map(['text', 'shape', 'fill', 'stroke', 'opacity'].map(id => [id, 20])),
  fallbackTitleHeight: 20,
  fallbackFieldHeight: 20,
  itemGap: 4,
  sectionGap: 8,
});

const Demo: FC = () => <span data-demo>Demo</span>;

const renderedRoots: Array<Root> = [];

const mount = async (node: ReactNode): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  renderedRoots.push(root);
  await act(() => root.render(node));
  return container;
};

afterEach(async () => {
  for (const root of renderedRoots.splice(0)) {
    await act(() => root.unmount());
  }
  document.body.replaceChildren();
  ResizeObserverMock.instances = [];
  animationFrames.clear();
});

type WorkspaceHarnessProps = {
  definition?: PreviewControlsDefinition;
  initialOpen?: boolean;
};

const WorkspaceHarness: FC<WorkspaceHarnessProps> = props => {
  const { definition: controlsDefinition, initialOpen = true } = props;
  const [open, setOpen] = useState(initialOpen);
  const controlState = usePreviewControlState(controlsDefinition);
  const previewState = usePreviewPanelState({
    controlState,
    rendererMode: 'svg',
    size: 'md',
    dragEnabled: false,
    expanded: false,
  });

  return (
    <div data-panel-open={open}>
      <PreviewWorkspace
        definition={controlsDefinition}
        controlState={controlState}
        controlPanelOpen={open}
        onControlPanelOpenChange={setOpen}
        previewState={previewState}
        Component={Demo}
      />
    </div>
  );
};

const DefinitionChangeHarness: FC = () => {
  const [currentDefinition, setCurrentDefinition] = useState<PreviewPanelControlsDefinition>(definition);

  return (
    <>
      <button
        type="button"
        aria-label="Change controls definition"
        onClick={() => setCurrentDefinition(alternateDefinition)}
      />
      <PreviewControlPanel
        definition={currentDefinition}
        controlState={{ values: {}, setValue: () => undefined, reset: () => undefined }}
        onClose={() => undefined}
      />
    </>
  );
};

describe('PreviewControlPanel', () => {
  it('渲染标题、section 与六种 shadcn 字段', () => {
    const controlState: PreviewControlState = {
      values: {},
      setValue: () => undefined,
      reset: () => undefined,
    };
    const markup = renderToStaticMarkup(
      <PreviewControlPanel definition={definition} controlState={controlState} onClose={() => undefined} />,
    );

    expect(markup).toContain('Node Properties');
    expect(markup).toContain('Appearance');
    expect(markup).toContain('data-slot="select-trigger"');
    expect(markup).toContain('data-slot="switch"');
    expect(markup).toContain('data-slot="slider"');
    expect(markup.match(/data-slot="input"/g)).toHaveLength(4);
    expect(markup).toContain('data-density="default"');
    expect(markup).toContain('data-slot="preview-control-columns"');
    expect(markup).toContain('data-column-count="1"');
    expect(markup).toContain('data-slot="preview-control-field"');
    expect(markup).toContain('class="flex min-h-7 w-full items-center gap-2"');
    expect(
      markup.match(/data-slot="preview-control-field"[^>]*class="[^"]*min-h-7[^"]*items-center[^"]*"/g),
    ).toHaveLength(6);
    expect(markup).toContain('class="flex min-w-0 flex-1 justify-end"');
    expect(markup).not.toMatch(/data-slot="preview-control-field"[^>]*class="[^"]*justify-between/);
    expect(markup).toContain('>Text</label>');
    expect(markup).not.toContain('Text：');
  });

  it('按控件数量均衡拆成两列并重复跨列 section 标题', () => {
    const [left, right] = splitPreviewControlSections(definition.sections);

    expect(left).toEqual([
      {
        sourceIndex: 0,
        showTitle: true,
        label: 'Appearance',
        controls: definition.sections[0].controls.slice(0, 3),
      },
    ]);
    expect(right).toEqual([
      {
        sourceIndex: 0,
        showTitle: false,
        label: 'Appearance',
        controls: definition.sections[0].controls.slice(3),
      },
    ]);
  });

  it('内容高度能容纳时保持单列', () => {
    const columns = layoutPreviewControlSections(adaptiveSections, new Set(), createLayoutMetrics(200), 2);

    expect(columns).toHaveLength(1);
    expect(columns[0].map(section => section.sourceIndex)).toEqual([0, 1]);
  });

  it('内容超高时按可用高度拆成两列且跨列标题只出现一次', () => {
    const columns = layoutPreviewControlSections(adaptiveSections, new Set(), createLayoutMetrics(130), 2);

    expect(columns).toHaveLength(2);
    expect(columns.map(column => column.flatMap(section => section.controls.map(field => field.id)))).toEqual([
      ['text', 'shape', 'fill'],
      ['stroke', 'opacity'],
    ]);
    expect(columns.flat().filter(section => section.label === 'Appearance' && section.showTitle)).toHaveLength(1);
  });

  it('折叠后内容能容纳时从两列回流成一列', () => {
    const columns = layoutPreviewControlSections(adaptiveSections, new Set([1]), createLayoutMetrics(130), 2);

    expect(columns).toHaveLength(1);
  });

  it('可用高度很小时仍最多只生成两列', () => {
    const columns = layoutPreviewControlSections(adaptiveSections, new Set(), createLayoutMetrics(40), 2);

    expect(columns).toHaveLength(2);
  });

  it('内容网格使用 gap-2 与 p-2', async () => {
    const container = await mount(
      <PreviewControlPanel
        definition={definition}
        controlState={{ values: {}, setValue: () => undefined, reset: () => undefined }}
        onClose={() => undefined}
      />,
    );
    const columns = container.querySelector('[data-slot="preview-control-columns"]');

    expect(columns?.classList.contains('gap-2')).toBe(true);
    expect(columns?.classList.contains('p-2')).toBe(true);
  });

  it('section 之间使用 mb-3 间距', async () => {
    const container = await mount(
      <PreviewControlPanel
        definition={definition}
        controlState={{ values: {}, setValue: () => undefined, reset: () => undefined }}
        onClose={() => undefined}
      />,
    );
    const section = container.querySelector('[data-slot="preview-control-column"] > section');

    expect(section?.classList.contains('mb-3')).toBe(true);
    expect(section?.classList.contains('last:mb-0')).toBe(true);
  });

  it('299px 始终一列，达到 300px 且高度不足时最多渲染两列与一个 Separator', async () => {
    const container = await mount(
      <PreviewControlPanel
        definition={definition}
        controlState={{ values: {}, setValue: () => undefined, reset: () => undefined }}
        onClose={() => undefined}
      />,
    );
    const columns = () => container.querySelector('[data-slot="preview-control-columns"]');

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitSize(299, 80)));
    await flushAnimationFrames();
    expect(columns()?.getAttribute('data-column-count')).toBe('1');
    expect(container.querySelectorAll('[data-slot="preview-control-column"]')).toHaveLength(1);
    expect(container.querySelector('[data-slot="preview-control-column-separator"]')).toBeNull();

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitSize(300, 80)));
    await flushAnimationFrames();
    expect(columns()?.getAttribute('data-column-count')).toBe('2');
    expect(container.querySelectorAll('[data-slot="preview-control-column"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-slot="preview-control-column-separator"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-slot="preview-control-section-title"]')).toHaveLength(1);
  });

  it('面板高度变化时在一列与两列之间自动回流', async () => {
    const container = await mount(
      <PreviewControlPanel
        definition={definition}
        controlState={{ values: {}, setValue: () => undefined, reset: () => undefined }}
        onClose={() => undefined}
      />,
    );
    const columnCount = () =>
      container.querySelector('[data-slot="preview-control-columns"]')?.getAttribute('data-column-count');

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitSize(300, 100)));
    await flushAnimationFrames();
    expect(columnCount()).toBe('2');

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitSize(300, 400)));
    await flushAnimationFrames();
    expect(columnCount()).toBe('1');

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitSize(300, 100)));
    await flushAnimationFrames();
    expect(columnCount()).toBe('2');
  });

  it('section 默认展开并通过 Plus/Minus 在跨列副本间同步折叠', async () => {
    const container = await mount(
      <PreviewControlPanel
        definition={definition}
        controlState={{ values: {}, setValue: () => undefined, reset: () => undefined }}
        onClose={() => undefined}
      />,
    );

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitSize(300, 100)));
    await flushAnimationFrames();
    const collapseButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Collapse Appearance"]');
    expect(collapseButtons).toHaveLength(1);
    expect(collapseButtons[0].getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelectorAll('.lucide-minus')).toHaveLength(1);

    await act(() => collapseButtons[0].click());
    await flushAnimationFrames();
    const expandButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Expand Appearance"]');
    expect(expandButtons).toHaveLength(1);
    expect(expandButtons[0].getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelectorAll('.lucide-plus')).toHaveLength(1);
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(0);

    await act(() => expandButtons[0].click());
    await flushAnimationFrames();
    expect(container.querySelectorAll('button[aria-label="Collapse Appearance"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(6);
  });

  it('Reset 不改变 section 折叠状态', async () => {
    const reset = vi.fn();
    const container = await mount(
      <PreviewControlPanel
        definition={definition}
        controlState={{ values: {}, setValue: () => undefined, reset }}
        onClose={() => undefined}
      />,
    );

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Collapse Appearance"]')?.click());
    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Reset controls"]')?.click());

    expect(reset).toHaveBeenCalledOnce();
    expect(container.querySelector('button[aria-label="Expand Appearance"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(0);
  });

  it('definition 变化时恢复所有 section 展开', async () => {
    const container = await mount(<DefinitionChangeHarness />);

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Collapse Appearance"]')?.click());
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(0);
    await act(() =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Change controls definition"]')?.click(),
    );

    expect(container.querySelector('button[aria-label="Collapse Layout"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(1);
  });

  it('无标题 section 始终展示且不渲染折叠按钮', async () => {
    const unlabeledDefinition = definePreviewControls({
      presentation: 'panel',
      sections: [{ controls: [{ kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' }] }],
    });
    const container = await mount(
      <PreviewControlPanel
        definition={unlabeledDefinition}
        controlState={{ values: {}, setValue: () => undefined, reset: () => undefined }}
        onClose={() => undefined}
      />,
    );

    expect(container.querySelector('[data-slot="preview-control-section-toggle"]')).toBeNull();
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(1);
  });

  it('compact 面板使用 small shadcn 字段', () => {
    const markup = renderToStaticMarkup(
      <PreviewControlPanel
        definition={definition}
        controlState={{ values: {}, setValue: () => undefined, reset: () => undefined }}
        density="compact"
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain('data-density="compact"');
    expect(markup).toContain('data-size="sm"');
    expect(markup).toContain('h-7');
  });

  it('更新字段并触发 Reset 与 Close', async () => {
    const setValue = vi.fn();
    const reset = vi.fn();
    const onClose = vi.fn();
    const container = await mount(
      <PreviewControlPanel definition={definition} controlState={{ values: {}, setValue, reset }} onClose={onClose} />,
    );

    const dashed = container.querySelector<HTMLButtonElement>('button[aria-label="Dashed"]');
    await act(() => dashed?.click());
    expect(setValue).toHaveBeenLastCalledWith('dashed', true);

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Reset controls"]')?.click());
    expect(reset).toHaveBeenCalledOnce();

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Close controls panel"]')?.click());
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('PreviewWorkspace', () => {
  it('开放 panel 时使用两个 ResizablePanel 与 handle', async () => {
    const container = await mount(<WorkspaceHarness definition={definition} />);
    const handle = container.querySelector('[data-slot="resizable-handle"]');

    expect(container.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(2);
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('data-preview-slot')).toBe('preview-resize-handle');
    expect(handle?.getAttribute('data-with-handle')).toBe('false');
    expect(handle?.classList.contains('before:h-8')).toBe(true);
    expect(handle?.classList.contains('before:w-1')).toBe(true);
    expect(handle?.classList.contains('data-[panel-group-direction=vertical]:before:h-1')).toBe(true);
    expect(handle?.classList.contains('data-[panel-group-direction=vertical]:before:w-8')).toBe(true);
    expect(container.querySelector('aside')).not.toBeNull();
    expect(container.querySelector('[data-slot="resizable-panel-group"]')?.getAttribute('dir')).toBe('ltr');
    expect(
      Array.from(container.querySelectorAll('[data-slot="resizable-panel"]'), panel =>
        panel.getAttribute('data-order'),
      ),
    ).toEqual(['1', '2']);
  });

  it('按 Workspace 宽度在移动端改为上下排列', async () => {
    const container = await mount(<WorkspaceHarness definition={definition} />);
    const group = () => container.querySelector('[data-slot="resizable-panel-group"]');

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitWidth(639)));
    expect(group()?.getAttribute('data-direction')).toBe('vertical');

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitWidth(640)));
    expect(group()?.getAttribute('data-direction')).toBe('horizontal');
  });

  it('关闭后显示左上角开关并可重新打开', async () => {
    const container = await mount(<WorkspaceHarness definition={definition} />);
    const close = container.querySelector<HTMLButtonElement>('button[aria-label="Close controls panel"]');
    await act(() => close?.click());

    expect(container.firstElementChild?.getAttribute('data-panel-open')).toBe('false');
    expect(container.querySelector('[data-slot="resizable-handle"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(1);
    const open = container.querySelector<HTMLButtonElement>('button[aria-label="Open controls panel"]');
    expect(open).not.toBeNull();

    await act(() => open?.click());
    expect(container.firstElementChild?.getAttribute('data-panel-open')).toBe('true');
    expect(container.querySelector('[data-slot="resizable-handle"]')).not.toBeNull();
  });

  it('拖动折叠使用同一关闭回调', async () => {
    const container = await mount(<WorkspaceHarness definition={definition} />);
    const collapse = container.querySelector<HTMLButtonElement>('button[aria-label="Simulate panel collapse"]');
    await act(() => collapse?.click());

    expect(container.firstElementChild?.getAttribute('data-panel-open')).toBe('false');
    expect(container.querySelector('button[aria-label="Open controls panel"]')).not.toBeNull();
  });

  it('在当前 Workspace 生命周期内恢复最后非零宽度', async () => {
    const container = await mount(<WorkspaceHarness definition={definition} />);
    expect(container.querySelector('[data-slot="resizable-panel"]')?.getAttribute('data-default-size')).toBe('25');

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Simulate panel resize"]')?.click());
    expect(container.querySelector('[data-slot="resizable-panel"]')?.getAttribute('data-default-size')).toBe('25');
    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Close controls panel"]')?.click());
    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Open controls panel"]')?.click());

    expect(container.querySelector('[data-slot="resizable-panel"]')?.getAttribute('data-default-size')).toBe('34');
  });

  it.each([undefined, overlayDefinition] satisfies Array<PreviewControlsDefinition | undefined>)(
    '对非 panel definition 直接渲染 PreviewPanel',
    async controlsDefinition => {
      const container = await mount(<WorkspaceHarness definition={controlsDefinition} />);

      expect(container.querySelector('[data-slot="resizable-panel-group"]')).toBeNull();
      expect(container.querySelector('[data-demo]')).not.toBeNull();
    },
  );

  it('真实 shadcn wrapper 保留 Resizable data-slot 契约', async () => {
    const actual = await vi.importActual<typeof ResizableModule>('../../src/components/ui/resizable');
    const markup = renderToStaticMarkup(
      <actual.ResizablePanelGroup direction="horizontal">
        <actual.ResizablePanel>Panel</actual.ResizablePanel>
      </actual.ResizablePanelGroup>,
    );

    expect(markup).toContain('data-slot="resizable-panel-group"');
    expect(markup).toContain('data-slot="resizable-panel"');
  });
});
