import { Layout } from '@retikz/react';
import { type FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  buildPreviewToolSlots,
  DemoRenderer,
  PreviewControlSlotLayer,
  RendererModeButton,
} from '../../src/modules/docs/components/component-preview';
import { useComponentPreviewStore } from '../../src/modules/docs/store/useComponentPreviewStore';

const Demo: FC = () => <Layout width={40} height={20} />;
const WrappedLayout: FC = () => <Layout width={40} height={20} />;
const WrappedDemo: FC = () => <WrappedLayout />;
const noop = () => {};

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
      <PreviewControlSlotLayer
        slots={slots}
        pinned
        ctx={{
          replay: noop,
          rendererMode: 'canvas',
          renderPane: null,
          hovered: false,
          pinned: true,
          expanded: false,
          active: () => false,
          setActive: noop,
          value: () => undefined,
          setValue: noop,
        }}
      />,
    );

    expect(markup).toContain('aria-label="Download PNG"');
    expect(markup).not.toContain('aria-label="Download SVG"');
  });
});
