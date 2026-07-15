// @vitest-environment jsdom
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import type {
  PreviewControlRuntime,
  PreviewControlSlot,
} from '../../src/modules/docs/components/component-preview/types';

import { buildAnimationControlSlots } from '../../src/modules/docs/components/component-preview/controls/animation-controls';
import {
  buildConfiguredControlSlots,
  buildPreviewToolSlots,
  DemoRenderer,
  PreviewControlSlotLayer,
  RendererModeButton,
} from '../../src/modules/docs/components/component-preview/preview-panel';
import { useComponentPreviewStore } from '../../src/modules/docs/store/useComponentPreviewStore';

const Demo: FC = () => <Layout width={40} height={20} />;
const WrappedLayout: FC = () => <Layout width={40} height={20} />;
const WrappedDemo: FC = () => <WrappedLayout />;
const ExplicitSvgDemo: FC = () => <Layout width={40} height={20} renderer="svg" />;
const SingleHookDemo: FC = () => {
  const [first] = useState('single');
  return <span>{first}</span>;
};
const DoubleHookDemo: FC = () => {
  const [first] = useState('double');
  const [second] = useState('hooks');
  return <span>{`${first} ${second}`}</span>;
};
const noop = () => {};
const previewControlRuntime = {
  remount: noop,
  rendererMode: 'svg' as const,
  renderPane: null,
  hovered: false,
  pinned: true,
  expanded: false,
  active: () => false,
  setActive: noop,
  value: () => undefined,
  setValue: noop,
};

const renderSlots = (slots: Array<PreviewControlSlot>, runtime: PreviewControlRuntime): string =>
  renderToStaticMarkup(<PreviewControlSlotLayer slots={slots} pinned runtime={runtime} />);

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  document.body.replaceChildren();
});

describe('DemoRenderer', () => {
  it('svg 模式保持 svg 输出', () => {
    const markup = renderToStaticMarkup(<DemoRenderer Component={Demo} rendererMode="svg" />);
    expect(markup).toContain('<svg');
    expect(markup).not.toContain('<canvas');
  });

  it('canvas 模式切到 canvas 输出', () => {
    const markup = renderToStaticMarkup(<DemoRenderer Component={Demo} rendererMode="canvas" />);
    expect(markup).toContain('<canvas');
    expect(markup).not.toContain('<svg');
  });
  it('passes canvas mode through component wrappers', () => {
    const markup = renderToStaticMarkup(<DemoRenderer Component={WrappedDemo} rendererMode="canvas" />);
    expect(markup).toContain('<canvas');
    expect(markup).not.toContain('<svg');
  });

  it('为不同 Hook 结构的 demo 保留独立组件边界', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    let renderError: unknown;

    act(() => root.render(<DemoRenderer Component={SingleHookDemo} rendererMode="svg" />));
    try {
      act(() => root.render(<DemoRenderer Component={DoubleHookDemo} rendererMode="svg" />));
    } catch (error) {
      renderError = error;
    }

    expect(renderError).toBeUndefined();
    act(() => root.unmount());
  });

  it('demo 显式 renderer 优先于 provider', () => {
    const markup = renderToStaticMarkup(<DemoRenderer Component={ExplicitSvgDemo} rendererMode="canvas" />);
    expect(markup).toContain('<svg');
    expect(markup).not.toContain('<canvas');
  });
});

describe('RendererModeButton', () => {
  it('按当前模式切换图标与无障碍标签', () => {
    const svgMarkup = renderToStaticMarkup(<RendererModeButton rendererMode="svg" onToggle={noop} />);
    expect(svgMarkup).toContain('aria-label="SVG renderer"');

    const canvasMarkup = renderToStaticMarkup(<RendererModeButton rendererMode="canvas" onToggle={noop} />);
    expect(canvasMarkup).toContain('aria-label="Canvas renderer"');
  });
});

describe('useComponentPreviewStore', () => {
  it('defaults to svg and toggles canvas globally', () => {
    const originalMode = useComponentPreviewStore.getState().rendererMode;
    useComponentPreviewStore.getState().setRendererMode('svg');

    expect(useComponentPreviewStore.getState().rendererMode).toBe('svg');

    useComponentPreviewStore.getState().toggleRendererMode();
    expect(useComponentPreviewStore.getState().rendererMode).toBe('canvas');

    useComponentPreviewStore.getState().toggleRendererMode();
    expect(useComponentPreviewStore.getState().rendererMode).toBe('svg');

    useComponentPreviewStore.getState().setRendererMode(originalMode);
  });
});

describe('PreviewControlSlotLayer', () => {
  it('同一位置的插槽分别遵循各自可见性', () => {
    const slots: Array<PreviewControlSlot> = [
      {
        id: 'always-control',
        placement: 'top-start',
        visibility: 'always',
        render: () => <span>Always control</span>,
      },
      {
        id: 'hover-control',
        placement: 'top-start',
        visibility: 'hover',
        render: () => <span>Hover control</span>,
      },
    ];
    const markup = renderToStaticMarkup(<PreviewControlSlotLayer slots={slots} runtime={previewControlRuntime} />);

    expect(markup).toMatch(/pointer-events-auto opacity-100[^>]*><span>Always control/);
    expect(markup).toMatch(/pointer-events-none opacity-0[^>]*><span>Hover control/);

    const pinnedMarkup = renderToStaticMarkup(
      <PreviewControlSlotLayer slots={slots} pinned runtime={previewControlRuntime} />,
    );
    expect(pinnedMarkup.match(/pointer-events-auto opacity-100/g)).toHaveLength(2);
  });

  it('canvas 模式下下载按钮切换为 PNG', () => {
    const slots = buildPreviewToolSlots({
      transform: { x: 0, y: 0, scale: 1 },
      isTransformed: false,
      panBy: noop,
      zoomBy: noop,
      resetTransform: noop,
      dragEnabled: false,
      toggleDrag: noop,
      onMaximize: noop,
      size: 'md',
      onSizeChange: noop,
      name: 'demo',
      rendererMode: 'canvas',
      toggleRendererMode: noop,
    });
    const markup = renderToStaticMarkup(
      <PreviewControlSlotLayer slots={slots} pinned runtime={{ ...previewControlRuntime, rendererMode: 'canvas' }} />,
    );

    expect(slots[0]?.visibility).toBe('hover');
    expect(markup).toContain('aria-label="Download PNG"');
    expect(markup).not.toContain('aria-label="Download SVG"');
  });

  it('渲染配置式 select 控件', () => {
    const slots = buildConfiguredControlSlots([
      {
        kind: 'select',
        id: 'mark-style',
        label: '标记样式',
        defaultValue: 'circle',
        options: [
          { value: 'circle', label: '圆点' },
          { value: 'square', label: '方块' },
        ],
      },
    ]);

    const markup = renderToStaticMarkup(
      <PreviewControlSlotLayer slots={slots} pinned runtime={previewControlRuntime} />,
    );

    expect(slots[0]?.visibility).toBe('always');
    expect(markup).toContain('aria-label="标记样式"');
    expect(markup).toContain('圆点');
  });

  it('渲染配置式 input 控件', () => {
    const slots = buildConfiguredControlSlots([
      {
        kind: 'input',
        id: 'mark-size',
        label: '标记大小',
        defaultValue: '6',
        placeholder: '输入大小',
      },
    ]);

    const markup = renderToStaticMarkup(
      <PreviewControlSlotLayer slots={slots} pinned runtime={previewControlRuntime} />,
    );

    expect(slots[0]?.visibility).toBe('always');
    expect(markup).toContain('aria-label="标记大小"');
    expect(markup).toContain('value="6"');
    expect(markup).toContain('placeholder="输入大小"');
  });
});

describe('animation control slots', () => {
  it('同一组定义按面板 runtime 渲染播放状态', () => {
    const slots = buildAnimationControlSlots();
    const pausedMarkup = renderSlots(slots, {
      ...previewControlRuntime,
      active: id => id === 'animation-paused',
    });
    const playingMarkup = renderSlots(slots, previewControlRuntime);

    expect(slots[0]?.visibility).toBe('hover');
    expect(pausedMarkup).toContain('aria-label="Replay"');
    expect(pausedMarkup).toContain('aria-label="Play"');
    expect(pausedMarkup).not.toContain('aria-label="Pause"');
    expect(pausedMarkup).toContain('aria-label="Stop"');
    expect(playingMarkup).toContain('aria-label="Pause"');
    expect(playingMarkup).not.toContain('aria-label="Play"');
  });
});
