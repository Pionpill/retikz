import { createBuiltinCanvasRenderer } from './canvas-renderer';
import type { Renderer, RendererFactory, InputRendererFactory } from './renderer';
import { createBuiltinSvgRenderer } from './svg-renderer';

const createBuiltinRenderer = (input: InputRendererFactory): Renderer => {
  if (input.backend === 'svg') {
    return createBuiltinSvgRenderer(input.host, input.immutableOptions);
  }

  return createBuiltinCanvasRenderer(input.host, input.immutableOptions);
};

/** 内置 SVG / Canvas renderer factory */
export const builtinRendererFactory = createBuiltinRenderer as RendererFactory;
