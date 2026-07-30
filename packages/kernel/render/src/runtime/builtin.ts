import type { RetainedRenderer, RetainedRendererFactory, RetainedRendererFactoryInput } from './renderer';

import { createBuiltinCanvasRetainedRenderer } from './canvas-renderer';
import { createBuiltinSvgRetainedRenderer } from './svg-renderer';

const createBuiltinRetainedRenderer = (input: RetainedRendererFactoryInput): RetainedRenderer => {
  if (input.backend === 'svg') {
    return createBuiltinSvgRetainedRenderer(input.host, input.immutableOptions);
  }
  return createBuiltinCanvasRetainedRenderer(input.host, input.immutableOptions);
};

/** 内置 SVG / Canvas retained renderer factory */
export const builtinRetainedRendererFactory = createBuiltinRetainedRenderer as RetainedRendererFactory;
