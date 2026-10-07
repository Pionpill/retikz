import { defineComposite } from '@retikz/core';
import type { CoreDependencyProvider } from '@retikz/core';

import type { ShapeProperties } from '../shared';
import { lowerRectangle } from './pipeline';
import { RectangleSchema } from './schema';
import type { IRRectangle } from './types';

/** Rectangle 的 Core composite 注册项 */
export const RectangleDefinition = defineComposite({
  namespace: 'standard',
  type: 'rectangle',
  schema: RectangleSchema,
  expand: (source: IRRectangle) => ({ children: [lowerRectangle(source)] }),
});

/** 创建保留几何意图的 Rectangle Source */
export const createRectangle = (input: ShapeProperties<IRRectangle>): IRRectangle => ({
  ...input,
  namespace: 'standard',
  type: 'rectangle',
});

/** Rectangle 的按需依赖贡献 */
export const RectangleProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'rectangle' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => RectangleDefinition,
});
