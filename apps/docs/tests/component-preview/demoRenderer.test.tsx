import { type FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Layout } from '@retikz/react';

import { DemoRenderer } from '../../src/components/shared/component-preview/DemoRenderer';
import { RendererModeButton } from '../../src/components/shared/component-preview/_parts';
import { PanZoomToolbar } from '../../src/components/shared/component-preview/PanZoomToolbar';

const Demo: FC = () => <Layout width={40} height={20} />;
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
});

describe('RendererModeButton', () => {
  it('按当前模式切换图标与无障碍标签', () => {
    const svgMarkup = renderToStaticMarkup(<RendererModeButton rendererMode="svg" onToggle={noop} />);
    expect(svgMarkup).toContain('aria-label="SVG renderer"');

    const canvasMarkup = renderToStaticMarkup(<RendererModeButton rendererMode="canvas" onToggle={noop} />);
    expect(canvasMarkup).toContain('aria-label="Canvas renderer"');
  });
});

describe('PanZoomToolbar', () => {
  it('canvas 模式下下载按钮切换为 PNG', () => {
    const markup = renderToStaticMarkup(
      <PanZoomToolbar
        transform={{ x: 0, y: 0, scale: 1 }}
        isTransformed={false}
        panBy={noop}
        zoomBy={noop}
        resetTransform={noop}
        dragEnabled={false}
        toggleDrag={noop}
        onMaximize={noop}
        size="md"
        onSizeChange={noop}
        onDownload={noop}
        rendererMode="canvas"
        toggleRendererMode={noop}
        pinned
      />,
    );

    expect(markup).toContain('aria-label="Download PNG"');
    expect(markup).not.toContain('aria-label="Download SVG"');
  });
});
