import { defineComposite } from '@retikz/core';
import type { CoreDependencyProvider } from '@retikz/core';

import type { ShapeProperties } from '../shared';
import { lowerPolygon } from './pipeline';
import { PolygonSchema } from './schema';
import type { IRPolygon } from './types';

/** Polygon 的 Core composite 注册项 */
export const PolygonDefinition = defineComposite({
  namespace: 'standard',
  type: 'polygon',
  schema: PolygonSchema,
  expand: (source: IRPolygon) => ({ children: [lowerPolygon(source)] }),
});

/** 创建保留几何意图的 Polygon Source */
export const createPolygon = (input: ShapeProperties<IRPolygon>): IRPolygon => ({
  ...input,
  namespace: 'standard',
  type: 'polygon',
});

/** Polygon 的按需依赖贡献 */
export const PolygonProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'polygon' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => PolygonDefinition,
});
