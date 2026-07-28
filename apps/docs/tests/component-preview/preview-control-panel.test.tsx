// @vitest-environment jsdom
import type { FC, ReactNode } from 'react';
import type { Root } from 'react-dom/client';

import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ResizableModule from '../../src/components/ui/resizable';
import type { PreviewControlLayoutMetrics } from '../../src/modules/docs/components/component-preview/control-panel';
import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewControlSection,
  PreviewControlState,
  PreviewPanelControlsDefinition,
  PreviewThemeMode,
} from '../../src/modules/docs/components/component-preview/types';

import i18n from '../../src/i18n';
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

const flushAnimationFrames = async (timestamp = 0): Promise<void> => {
  await act(() => {
    const pendingFrames = Array.from(animationFrames.values());
    animationFrames.clear();
    pendingFrames.forEach(callback => callback(timestamp));
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
Object.assign(HTMLElement.prototype, {
  scrollIntoView: () => undefined,
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
        { kind: 'range', id: 'opacity', label: 'Opacity', defaultValue: 1, min: 0, max: 1, step: 0.1 },
      ],
    },
  ],
});

const overlayDefinition = definePreviewControls({
  presentation: 'overlay',
  controls: [{ kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' }],
});

const widePreviewDefinition = definePreviewControls({
  presentation: 'panel',
  defaultSize: 20,
  sections: [{ controls: [{ kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' }] }],
});

const shortRangeDurationDefinition = definePreviewControls({
  presentation: 'panel',
  title: 'Short range duration',
  sections: [
    {
      controls: [
        {
          kind: 'range',
          id: 'opacity',
          label: 'Opacity',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.1,
          playDuration: 400,
        },
      ],
    },
  ],
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

const initiallyCollapsedDefinition = definePreviewControls({
  presentation: 'panel',
  title: 'Collapsed Properties',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'rows', label: 'Rows', rows: [{ x: 1, y: 2 }] }],
    },
  ],
});

const conditionalDefinition = definePreviewControls({
  presentation: 'panel',
  title: 'Conditional Properties',
  sections: [
    {
      label: 'Kind',
      controls: [
        {
          kind: 'select',
          id: 'kind',
          label: 'Kind',
          defaultValue: 'a',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        },
      ],
    },
    {
      label: 'A parameters',
      visibleWhen: { controlId: 'kind', oneOf: ['a'] },
      controls: [{ kind: 'number', id: 'aValue', label: 'A value', defaultValue: 1 }],
    },
    {
      label: 'Shared parameters',
      controls: [
        {
          kind: 'number',
          id: 'bValue',
          label: 'B value',
          defaultValue: 2,
          visibleWhen: { controlId: 'kind', oneOf: ['b'] },
        },
      ],
    },
  ],
});

const presetDefinition = definePreviewControls({
  presentation: 'panel',
  title: 'Formula',
  sections: [
    {
      controls: [
        { kind: 'text', id: 'source', label: 'TeX source', defaultValue: 'sum', multiline: true },
        {
          kind: 'select',
          id: 'profile',
          label: 'Profile',
          defaultValue: 'math',
          options: [
            { value: 'base', label: 'Base' },
            { value: 'math', label: 'Math' },
          ],
        },
      ],
    },
  ],
});

const presetContract = {
  controls: presetDefinition,
  canonicalValues: { source: 'sum', profile: 'math' },
  presetSelector: { label: 'Formula example', customLabel: 'Custom' },
  presets: [
    { id: 'display-sum', label: 'Display sum', values: { source: 'sum', profile: 'math' } },
    { id: 'colored-cancellation', label: 'Colored cancellation', values: { source: 'cancel', profile: 'base' } },
  ],
  relatedApis: [],
} as PreviewControlContract;

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
  showContextBar?: boolean;
  workspaceClassName?: string;
  rangePlaybackDuration?: number;
};

const emptyControlState: PreviewControlState = {
  canonicalValues: {},
  values: {},
  setValue: () => undefined,
  applyValues: () => undefined,
  reset: () => undefined,
};

const WorkspaceHarness: FC<WorkspaceHarnessProps> = props => {
  const {
    definition: controlsDefinition,
    initialOpen = true,
    showContextBar = true,
    workspaceClassName,
    rangePlaybackDuration,
  } = props;
  const [open, setOpen] = useState(initialOpen);
  const [themeMode, setThemeMode] = useState<PreviewThemeMode>('inherit');
  const controlContract = useMemo<PreviewControlContract | undefined>(
    () => (controlsDefinition ? { controls: controlsDefinition, canonicalValues: {}, relatedApis: [] } : undefined),
    [controlsDefinition],
  );
  const controlState = usePreviewControlState(
    controlsDefinition,
    controlContract?.canonicalValues,
    rangePlaybackDuration,
  );
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
        showContextBar={showContextBar}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
        controlPanelOpen={open}
        onControlPanelOpenChange={setOpen}
        workspaceClassName={workspaceClassName}
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
      <PreviewControlPanel definition={currentDefinition} controlState={emptyControlState} onClose={() => undefined} />
    </>
  );
};

const ConditionalPanelHarness: FC = () => {
  const controlState = usePreviewControlState(conditionalDefinition);

  return (
    <>
      <button type="button" aria-label="Show B controls" onClick={() => controlState.setValue('kind', 'b')} />
      <button type="button" aria-label="Set hidden B value" onClick={() => controlState.setValue('bValue', 9)} />
      <PreviewControlPanel definition={conditionalDefinition} controlState={controlState} onClose={() => undefined} />
    </>
  );
};

const PresetPanelHarness: FC = () => {
  const controlState = usePreviewControlState(presetDefinition, presetContract.canonicalValues);

  return (
    <>
      <button type="button" aria-label="Customize source" onClick={() => controlState.setValue('source', 'custom')} />
      <PreviewControlPanel
        definition={presetDefinition}
        controlContract={presetContract}
        controlState={controlState}
        onClose={() => undefined}
      />
      <output data-slot="preset-values">{JSON.stringify(controlState.values)}</output>
    </>
  );
};

describe('PreviewControlPanel', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('选择完整 preset，编辑后显示 Custom，Reset 恢复 canonical preset', async () => {
    const container = await mount(<PresetPanelHarness />);
    const selector = container.querySelector('[data-slot="preview-preset-selector"]');
    const trigger = selector?.querySelector<HTMLElement>('[data-slot="select-trigger"]');

    expect(selector?.textContent).toContain('Formula example');
    expect(trigger?.textContent).toContain('Display sum');

    await act(() => trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })));
    const options = Array.from(document.body.querySelectorAll<HTMLElement>('[data-slot="select-item"]'));
    const cancellation = options.find(option => option.textContent.includes('Colored cancellation'));
    await act(() => cancellation?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));

    expect(container.querySelector('[data-slot="preset-values"]')?.textContent).toBe(
      JSON.stringify({ source: 'cancel', profile: 'base' }),
    );
    expect(trigger?.textContent).toContain('Colored cancellation');

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Customize source"]')?.click());
    expect(trigger?.textContent).toContain('Custom');

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Reset controls"]')?.click());
    expect(trigger?.textContent).toContain('Display sum');
  });

  it('根据当前值显示匹配字段与分组，并保留隐藏字段的状态', async () => {
    const container = await mount(<ConditionalPanelHarness />);

    expect(
      Array.from(container.querySelectorAll<HTMLElement>('[data-control-id]'), element => element.dataset.controlId),
    ).toEqual(['kind', 'aValue']);

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Set hidden B value"]')?.click());
    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Show B controls"]')?.click());

    expect(
      Array.from(container.querySelectorAll<HTMLElement>('[data-control-id]'), element => element.dataset.controlId),
    ).toEqual(['kind', 'bValue']);
    expect(container.querySelector<HTMLInputElement>('[data-control-id="bValue"] input')?.value).toBe('9');
  });

  it('渲染标题、section 与六种 shadcn 字段', () => {
    const controlState: PreviewControlState = emptyControlState;
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

  it('在 panel 内渲染只读二维表格并限制大数据行数', async () => {
    const rows = Array.from({ length: 102 }, (_, index) => ({
      city: index === 0 ? 'Tokyo' : `City ${index}`,
      gdp: 1810 - index,
      meta: index === 0 ? { region: 'Asia' } : null,
    }));
    const tableDefinition = definePreviewControls({
      presentation: 'panel',
      title: 'Channel bindings',
      sections: [
        {
          label: 'Data',
          controls: [
            {
              kind: 'table',
              id: 'cities',
              label: 'Cities',
              rows,
              columns: [{ key: 'city' }, { key: 'gdp', label: 'GDP' }, { key: 'life' }, { key: 'meta' }],
            },
          ],
        },
      ],
    });
    const container = await mount(
      <PreviewControlPanel definition={tableDefinition} controlState={emptyControlState} onClose={() => undefined} />,
    );
    const table = container.querySelector('[data-slot="preview-table-control"]');
    const scrollArea = container.querySelector('[data-slot="preview-table-scroll-area"]');
    const headers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="preview-table-header-cell"]'),
      cell => cell.textContent,
    );

    expect(table).not.toBeNull();
    expect(table?.textContent).toContain('Cities');
    expect(table?.textContent).toContain('102x4');
    expect(table?.querySelector('[data-slot="preview-table-dimensions"]')?.getAttribute('aria-label')).toBe(
      '102 rows · 4 columns',
    );
    expect(table?.textContent).toContain('Showing first 100 of 102 rows');
    expect(headers).toEqual(['city', 'GDP', 'life', 'meta']);
    expect(container.querySelectorAll('[data-slot="preview-table-row"]')).toHaveLength(100);
    expect(scrollArea?.getAttribute('data-visible-body-rows')).toBe('5');
    expect((scrollArea as HTMLElement | null)?.style.maxHeight).toBe('170px');
    expect(scrollArea?.classList.contains('overflow-auto')).toBe(true);
    expect(container.querySelector('[data-slot="preview-table-header-cell"]')?.classList.contains('h-7')).toBe(true);
    expect(container.querySelector('[data-slot="preview-table-row"] td')?.classList.contains('h-7')).toBe(true);
    expect(container.querySelector('[data-slot="preview-table-header-cell"]')?.classList.contains('sticky')).toBe(true);
    expect(container.querySelector('[data-preview-table-numeric="true"]')?.textContent).toBe('1810');
    expect(table?.textContent).toContain('{"region":"Asia"}');
    expect(table?.textContent).toContain('—');
    expect(container.querySelector('[data-control-id="cities"] input')).toBeNull();
  });

  it('切换 table view 并按实时 control values 重新解析结果行', async () => {
    const tableDefinition = definePreviewControls({
      presentation: 'panel',
      title: 'Transform rows',
      sections: [
        {
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: 'Rows',
              views: [
                { id: 'source', label: 'Source', rows: [{ x: 2 }] },
                { id: 'result', label: 'Result', rows: values => [{ x: Number(values.factor) * 2 }] },
              ],
            },
          ],
        },
      ],
    });

    const Harness: FC = () => {
      const [factor, setFactor] = useState(3);
      return (
        <>
          <button type="button" aria-label="Set factor to four" onClick={() => setFactor(4)} />
          <PreviewControlPanel
            definition={tableDefinition}
            controlState={{ ...emptyControlState, values: { factor } }}
            onClose={() => undefined}
          />
        </>
      );
    };
    const container = await mount(<Harness />);
    const table = container.querySelector('[data-slot="preview-table-control"]');
    const resultTrigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="preview-table-view-trigger"][data-view-id="result"]',
    );

    expect(container.querySelectorAll('[data-slot="preview-table-view-trigger"]')).toHaveLength(2);
    expect(table?.querySelector('[data-slot="preview-table-row"]')?.textContent).toBe('2');
    expect(resultTrigger?.getAttribute('aria-pressed')).toBe('false');

    await act(() => resultTrigger?.click());
    expect(table?.querySelector('[data-slot="preview-table-row"]')?.textContent).toBe('6');
    expect(resultTrigger?.getAttribute('aria-pressed')).toBe('true');

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Set factor to four"]')?.click());
    expect(table?.querySelector('[data-slot="preview-table-row"]')?.textContent).toBe('8');
  });

  it('用紧凑乘积显示尺寸并保留完整悬浮说明', async () => {
    const tableDefinition = definePreviewControls({
      presentation: 'panel',
      sections: [
        {
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: 'Rows',
              rows: Array.from({ length: 6 }, (_, index) => ({ x: index + 1, y: index + 2 })),
            },
          ],
        },
      ],
    });
    const container = await mount(
      <PreviewControlPanel definition={tableDefinition} controlState={emptyControlState} onClose={() => undefined} />,
    );
    const dimensions = container.querySelector('[data-slot="preview-table-dimensions"]');

    expect(dimensions?.textContent).toBe('6x2');
    expect(dimensions?.getAttribute('aria-label')).toBe('6 rows · 2 columns');
  });

  it('table view 解析失败时保留视图切换并显示局部错误', async () => {
    const tableDefinition = definePreviewControls({
      presentation: 'panel',
      sections: [
        {
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: 'Rows',
              views: [
                { id: 'source', label: 'Source', rows: [{ x: 2 }] },
                {
                  id: 'result',
                  label: 'Result',
                  rows: () => {
                    throw new Error('invalid transform');
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    const container = await mount(
      <PreviewControlPanel definition={tableDefinition} controlState={emptyControlState} onClose={() => undefined} />,
    );
    const resultTrigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="preview-table-view-trigger"][data-view-id="result"]',
    );

    await act(() => resultTrigger?.click());

    expect(container.querySelector('[data-slot="preview-table-view-error"]')?.textContent).toBe(
      'Unable to display this data view',
    );
    expect(container.querySelectorAll('[data-slot="preview-table-view-trigger"]')).toHaveLength(2);
  });

  it('推导首次出现的列、显示空数据并为 compact 模式收紧间距', () => {
    const inferredDefinition = definePreviewControls({
      presentation: 'panel',
      sections: [
        {
          controls: [
            {
              kind: 'table',
              id: 'inferred',
              label: 'Inferred',
              rows: [
                { city: 'Tokyo', gdp: 1810 },
                { life: 84.6, city: 'Paris' },
              ],
            },
            { kind: 'table', id: 'empty', label: 'Empty', rows: [] },
          ],
        },
      ],
    });
    const markup = renderToStaticMarkup(
      <PreviewControlPanel
        definition={inferredDefinition}
        controlState={emptyControlState}
        density="compact"
        onClose={() => undefined}
      />,
    );

    expect(markup.match(/data-slot="preview-table-header-cell"/g)).toHaveLength(3);
    expect(markup).toMatch(/>city<.*>gdp<.*>life</);
    expect(markup).toContain('No data');
    expect(markup).toContain('data-density="compact"');
    expect(markup).toContain('data-table-density="compact"');
    expect(markup).toContain('data-visible-body-rows="5"');
    expect(markup).toContain('max-height:146px');
    expect(markup).toContain('h-6');
    expect(markup).toContain('px-1.5');
  });

  it('多个面板为 section 生成唯一关联 id，且控制组标题不进入文档标题大纲', async () => {
    const container = await mount(
      <>
        <PreviewControlPanel definition={definition} controlState={emptyControlState} onClose={() => undefined} />
        <PreviewControlPanel definition={definition} controlState={emptyControlState} onClose={() => undefined} />
      </>,
    );
    const toggles = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="preview-control-section-toggle"]'),
    );
    const controlledIds = toggles.map(toggle => toggle.getAttribute('aria-controls'));
    const panels = Array.from(container.querySelectorAll<HTMLElement>('aside'));
    const panelLabelIds = panels.map(panel => panel.getAttribute('aria-labelledby'));

    expect(toggles.map(toggle => toggle.getAttribute('aria-label'))).toEqual(['Appearance', 'Appearance']);
    expect(new Set(controlledIds).size).toBe(controlledIds.length);
    expect(controlledIds.every(id => id !== null && container.ownerDocument.getElementById(id) !== null)).toBe(true);
    expect(container.querySelectorAll('h3 [data-slot="preview-control-section-toggle"]')).toHaveLength(0);
    expect(new Set(panelLabelIds).size).toBe(panelLabelIds.length);
    expect(panelLabelIds.every(id => id !== null && container.ownerDocument.getElementById(id) !== null)).toBe(true);
  });

  it('面板操作按钮使用当前文档语言', async () => {
    await i18n.changeLanguage('zh');
    const container = await mount(
      <PreviewControlPanel definition={definition} controlState={emptyControlState} onClose={() => undefined} />,
    );

    expect(container.querySelector('button[aria-label="重置控件"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="关闭属性面板"]')).not.toBeNull();
  });

  it('未配置时用 2 秒播放 range，并在到达终点后恢复播放动作', async () => {
    await i18n.changeLanguage('en');
    const container = await mount(<WorkspaceHarness definition={definition} />);
    const playButton = container.querySelector<HTMLButtonElement>('button[aria-label="Play range"]');
    const rangeValue = () => container.querySelector('[data-control-id="opacity"] .tabular-nums')?.textContent;

    expect(playButton).not.toBeNull();
    await act(() => playButton?.click());
    expect(rangeValue()).toBe('0');
    expect(container.querySelector('button[aria-label="Pause range"]')).not.toBeNull();

    await flushAnimationFrames(0);
    await flushAnimationFrames(1999);

    expect(container.querySelector('button[aria-label="Pause range"]')).not.toBeNull();

    await flushAnimationFrames(2000);

    expect(rangeValue()).toBe('1');
    expect(container.querySelector('button[aria-label="Play range"]')).not.toBeNull();
  });

  it('range 可通过 playDuration 覆盖默认播放时长', async () => {
    await i18n.changeLanguage('en');
    const container = await mount(<WorkspaceHarness definition={shortRangeDurationDefinition} />);
    const playButton = container.querySelector<HTMLButtonElement>('button[aria-label="Play range"]');

    await act(() => playButton?.click());
    await flushAnimationFrames(0);
    await flushAnimationFrames(400);

    expect(container.querySelector('[data-control-id="opacity"] .tabular-nums')?.textContent).toBe('1');
    expect(container.querySelector('button[aria-label="Play range"]')).not.toBeNull();
  });

  it('uses the global range playback duration unless the field overrides it', async () => {
    await i18n.changeLanguage('en');
    const container = await mount(<WorkspaceHarness definition={definition} rangePlaybackDuration={400} />);
    const playButton = container.querySelector<HTMLButtonElement>('button[aria-label="Play range"]');

    await act(() => playButton?.click());
    await flushAnimationFrames(0);
    await flushAnimationFrames(400);

    expect(container.querySelector('[data-control-id="opacity"] .tabular-nums')?.textContent).toBe('1');
    expect(container.querySelector('button[aria-label="Play range"]')).not.toBeNull();
  });

  it('手动修改播放中的 range 会取消后续播放帧', async () => {
    await i18n.changeLanguage('en');
    const container = await mount(<WorkspaceHarness definition={definition} />);
    const playButton = container.querySelector<HTMLButtonElement>('button[aria-label="Play range"]');
    const thumb = container.querySelector<HTMLElement>('[data-control-id="opacity"] [data-slot="slider-thumb"]');
    const rangeValue = () => container.querySelector('[data-control-id="opacity"] .tabular-nums')?.textContent;

    await act(() => playButton?.click());
    await act(() => thumb?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    await flushAnimationFrames(1200);

    expect(rangeValue()).toBe('0.1');
    expect(container.querySelector('button[aria-label="Play range"]')).not.toBeNull();
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
      <PreviewControlPanel definition={definition} controlState={emptyControlState} onClose={() => undefined} />,
    );
    const columns = container.querySelector('[data-slot="preview-control-columns"]');

    expect(columns?.classList.contains('gap-2')).toBe(true);
    expect(columns?.classList.contains('p-2')).toBe(true);
  });

  it('section 之间使用 mb-3 间距', async () => {
    const container = await mount(
      <PreviewControlPanel definition={definition} controlState={emptyControlState} onClose={() => undefined} />,
    );
    const section = container.querySelector('[data-slot="preview-control-column"] > section');

    expect(section?.classList.contains('mb-3')).toBe(true);
    expect(section?.classList.contains('last:mb-0')).toBe(true);
  });

  it('299px 始终一列，达到 300px 且高度不足时最多渲染两列与一个 Separator', async () => {
    const container = await mount(
      <PreviewControlPanel definition={definition} controlState={emptyControlState} onClose={() => undefined} />,
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
      <PreviewControlPanel definition={definition} controlState={emptyControlState} onClose={() => undefined} />,
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
      <PreviewControlPanel definition={definition} controlState={emptyControlState} onClose={() => undefined} />,
    );

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitSize(300, 100)));
    await flushAnimationFrames();
    const collapseButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Appearance"]');
    expect(collapseButtons).toHaveLength(1);
    expect(collapseButtons[0].getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelectorAll('.lucide-minus')).toHaveLength(1);

    await act(() => collapseButtons[0].click());
    await flushAnimationFrames();
    const expandButtons = container.querySelectorAll<HTMLButtonElement>('button[aria-label="Appearance"]');
    expect(expandButtons).toHaveLength(1);
    expect(expandButtons[0].getAttribute('aria-expanded')).toBe('false');
    expect(expandButtons[0].hasAttribute('aria-controls')).toBe(false);
    expect(container.querySelectorAll('.lucide-plus')).toHaveLength(1);
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(0);

    await act(() => expandButtons[0].click());
    await flushAnimationFrames();
    expect(container.querySelectorAll('button[aria-label="Appearance"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(6);
  });

  it('defaultCollapsed section 默认收起并允许用户展开', async () => {
    const container = await mount(
      <PreviewControlPanel
        definition={initiallyCollapsedDefinition}
        controlState={emptyControlState}
        onClose={() => undefined}
      />,
    );
    const expandButton = container.querySelector<HTMLButtonElement>('button[aria-label="Data"]');

    expect(expandButton?.getAttribute('aria-expanded')).toBe('false');
    expect(expandButton?.hasAttribute('aria-controls')).toBe(false);
    expect(container.querySelectorAll('.lucide-plus')).toHaveLength(1);
    expect(container.querySelector('[data-control-id="rows"]')).toBeNull();

    await act(() => expandButton?.click());

    expect(container.querySelector<HTMLButtonElement>('button[aria-label="Data"]')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(container.querySelectorAll('.lucide-minus')).toHaveLength(1);
    expect(container.querySelector('[data-control-id="rows"]')).not.toBeNull();
  });

  it('Reset 不改变 section 折叠状态', async () => {
    const reset = vi.fn();
    const container = await mount(
      <PreviewControlPanel
        definition={definition}
        controlState={{ ...emptyControlState, reset }}
        onClose={() => undefined}
      />,
    );

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Appearance"]')?.click());
    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Reset controls"]')?.click());

    expect(reset).toHaveBeenCalledOnce();
    expect(container.querySelector('button[aria-label="Appearance"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(0);
  });

  it('definition 变化时恢复所有 section 展开', async () => {
    const container = await mount(<DefinitionChangeHarness />);

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Appearance"]')?.click());
    expect(container.querySelectorAll('[data-control-id]')).toHaveLength(0);
    await act(() =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Change controls definition"]')?.click(),
    );

    expect(container.querySelector('button[aria-label="Layout"]')).not.toBeNull();
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
        controlState={emptyControlState}
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
        controlState={emptyControlState}
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
      <PreviewControlPanel
        definition={definition}
        controlState={{ ...emptyControlState, setValue, reset }}
        onClose={onClose}
      />,
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
  it('用同一个局部主题边界包裹 ContextBar、ControlPanel 与预览内容', async () => {
    const container = await mount(<WorkspaceHarness definition={definition} />);
    const previewPane = container.querySelector('[data-slot="preview-context-pane"]');
    const contextBar = previewPane?.querySelector('[data-slot="preview-context-bar"]');
    const previewPanel = contextBar?.nextElementSibling;
    const themeBoundary = container.querySelector('[data-slot="preview-theme-boundary"]');
    const controlPanel = container.querySelector('aside');

    expect(previewPane).not.toBeNull();
    expect(contextBar).not.toBeNull();
    expect(controlPanel).not.toBeNull();
    expect(themeBoundary?.contains(previewPane)).toBe(true);
    expect(themeBoundary?.contains(contextBar ?? null)).toBe(true);
    expect(themeBoundary?.contains(controlPanel)).toBe(true);
    expect(previewPane?.classList.contains('relative')).toBe(true);
    expect(previewPane?.classList.contains('group/preview-context')).toBe(true);
    expect(previewPane?.classList.contains('pt-10')).toBe(false);
    expect(previewPanel?.classList.contains('pt-10')).toBe(true);
    expect(contextBar?.classList.contains('absolute')).toBe(true);
    expect(contextBar?.classList.contains('top-2')).toBe(true);
    expect(contextBar?.classList.contains('opacity-0')).toBe(true);
    expect(contextBar?.classList.contains('group-hover/preview-context:opacity-100')).toBe(true);
    expect(themeBoundary?.getAttribute('data-theme-mode')).toBe('inherit');

    await act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Preview theme dark"]')?.click());
    expect(themeBoundary?.getAttribute('data-theme-mode')).toBe('dark');
    expect(themeBoundary?.classList.contains('dark')).toBe(true);
  });

  it('允许纯说明图隐藏 ContextBar 但保留主题边界', async () => {
    const container = await mount(<WorkspaceHarness definition={definition} showContextBar={false} />);

    expect(container.querySelector('[data-slot="preview-context-bar"]')).toBeNull();
    const themeBoundary = container.querySelector('[data-slot="preview-theme-boundary"]');
    const previewPane = container.querySelector('[data-slot="preview-context-pane"]');
    const previewPanel = previewPane?.firstElementChild;
    expect(themeBoundary).not.toBeNull();
    expect(previewPane?.classList.contains('pt-10')).toBe(false);
    expect(previewPanel?.classList.contains('pt-10')).toBe(false);
  });

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

  it('允许 demo 为控制区配置更窄的初始宽度', async () => {
    const container = await mount(<WorkspaceHarness definition={widePreviewDefinition} />);
    const panels = container.querySelectorAll('[data-slot="resizable-panel"]');

    expect(panels[0].getAttribute('data-default-size')).toBe('20');
    expect(panels[1].getAttribute('data-default-size')).toBe('80');
  });

  it('窄 Workspace 在完整预览上方提供 100–300px 的纵向拖拽面板', async () => {
    const container = await mount(<WorkspaceHarness definition={definition} workspaceClassName="h-56" />);
    const group = () => container.querySelector('[data-slot="resizable-panel-group"]');

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitWidth(479)));
    expect(group()).toBeNull();
    const mobileStack = container.querySelector('[data-slot="preview-mobile-stack"]');
    const mobileControlPanel = container.querySelector<HTMLElement>('[data-slot="preview-mobile-control-panel"]');
    const mobileResizeHandle = container.querySelector<HTMLElement>('[data-slot="preview-mobile-resize-handle"]');
    const mobilePreview = container.querySelector('[data-slot="preview-mobile-pane"]');
    const panel = container.querySelector('aside');
    const contextBar = container.querySelector('[data-slot="preview-context-bar"]');
    expect(mobileStack).not.toBeNull();
    expect(mobileControlPanel?.style.height).toBe('200px');
    expect(mobileResizeHandle?.getAttribute('role')).toBe('separator');
    expect(mobileResizeHandle?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(mobileResizeHandle?.getAttribute('aria-valuemin')).toBe('100');
    expect(mobileResizeHandle?.getAttribute('aria-valuemax')).toBe('300');
    expect(mobileResizeHandle?.getAttribute('aria-valuenow')).toBe('200');
    expect(mobileResizeHandle?.classList.contains('cursor-row-resize')).toBe(true);
    expect(mobilePreview?.classList.contains('h-56')).toBe(true);
    expect(container.querySelector('[data-slot="preview-workspace"]')?.classList.contains('h-56')).toBe(false);
    expect(panel).not.toBeNull();
    expect(contextBar).not.toBeNull();
    expect(panel!.compareDocumentPosition(contextBar!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await act(() => mobileResizeHandle?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' })));
    expect(mobileControlPanel?.style.height).toBe('100px');
    expect(mobileResizeHandle?.getAttribute('aria-valuenow')).toBe('100');

    await act(() => mobileResizeHandle?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' })));
    expect(mobileControlPanel?.style.height).toBe('300px');
    expect(mobileResizeHandle?.getAttribute('aria-valuenow')).toBe('300');

    await act(() => {
      mobileResizeHandle?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 300 }));
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 50 }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    expect(mobileControlPanel?.style.height).toBe('100px');
    expect(mobileResizeHandle?.getAttribute('aria-valuenow')).toBe('100');

    await act(() => ResizeObserverMock.instances.forEach(observer => observer.emitWidth(480)));
    expect(group()).not.toBeNull();
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
