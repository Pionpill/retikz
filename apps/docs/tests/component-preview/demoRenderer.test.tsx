import { type FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Layout } from '@retikz/react';

import { DemoRenderer } from '../../src/components/shared/component-preview/DemoRenderer';
import { RendererModeButton } from '../../src/components/shared/component-preview/_parts';

const Demo: FC = () => <Layout width={40} height={20} />;

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
    const svgMarkup = renderToStaticMarkup(<RendererModeButton rendererMode="svg" onToggle={() => {}} />);
    expect(svgMarkup).toContain('aria-label="SVG renderer"');

    const canvasMarkup = renderToStaticMarkup(<RendererModeButton rendererMode="canvas" onToggle={() => {}} />);
    expect(canvasMarkup).toContain('aria-label="Canvas renderer"');
  });
});
