import { defineComposite } from '@retikz/core';
import type { CoreDependencyProvider } from '@retikz/core';

import type { ShapeProperties } from '../shared';
import { lowerCircle } from './pipeline';
import { CircleSchema } from './schema';
import type { IRCircle } from './types';

/** Circle 的 Core composite 注册项 */
export const CircleDefinition = defineComposite({
  namespace: 'standard',
  type: 'circle',
  schema: CircleSchema,
  expand: (source: IRCircle) => ({ children: [lowerCircle(source)] }),
});

/** 创建保留几何意图的 Circle Source */
export const createCircle = (input: ShapeProperties<IRCircle>): IRCircle => ({
  ...input,
  namespace: 'standard',
  type: 'circle',
});

/** Circle 的按需依赖贡献 */
export const CircleProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'circle' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => CircleDefinition,
});
