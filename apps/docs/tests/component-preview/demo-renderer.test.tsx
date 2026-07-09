import { Layout } from '@retikz/react';
import { type FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  DemoRenderer,
  PreviewControlSlotLayer,
  RendererModeButton,
} from '../../src/modules/docs/components/component-preview';
import { buildAnimationControlSlots } from '../../src/modules/docs/components/component-preview/controls/animation-controls';
import { buildConfiguredControlSlots } from '../../src/modules/docs/components/component-preview/controls/configured-controls';
import { buildPreviewToolSlots } from '../../src/modules/docs/components/component-preview/controls/preview-tools';
import { useComponentPreviewStore } from '../../src/modules/docs/store/useComponentPreviewStore';

const Demo: FC = () => <Layout width={40} height={20} />;
const WrappedLayout: FC = () => <Layout width={40} height={20} />;
const WrappedDemo: FC = () => <WrappedLayout />;
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

    expect(markup).toContain('aria-label="标记大小"');
    expect(markup).toContain('value="6"');
    expect(markup).toContain('placeholder="输入大小"');
  });
});

describe('animation control slots', () => {
  it('渲染动画重播 / pause / stop 控制', () => {
    const slots = buildAnimationControlSlots(false);
    const markup = renderToStaticMarkup(
      <PreviewControlSlotLayer slots={slots} pinned runtime={previewControlRuntime} />,
    );

    expect(markup).toContain('aria-label="Replay"');
    expect(markup).toContain('aria-label="Pause"');
    expect(markup).toContain('aria-label="Stop"');
  });

  it('暂停态渲染 Play 控制', () => {
    const slots = buildAnimationControlSlots(true);
    const markup = renderToStaticMarkup(
      <PreviewControlSlotLayer slots={slots} pinned runtime={previewControlRuntime} />,
    );

    expect(markup).toContain('aria-label="Play"');
    expect(markup).not.toContain('aria-label="Pause"');
  });
});
