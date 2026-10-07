import { defineComposite } from '@retikz/core';
import type { CoreDependencyProvider } from '@retikz/core';

import type { ShapeProperties } from '../shared';
import { lowerStar } from './pipeline';
import { StarSchema } from './schema';
import type { IRStar } from './types';

/** Star 的 Core composite 注册项 */
export const StarDefinition = defineComposite({
  namespace: 'standard',
  type: 'star',
  schema: StarSchema,
  expand: (source: IRStar) => ({ children: [lowerStar(source)] }),
});

/** 创建保留几何意图的 Star Source */
export const createStar = (input: ShapeProperties<IRStar>): IRStar => ({
  ...input,
  namespace: 'standard',
  type: 'star',
});

/** Star 的按需依赖贡献 */
export const StarProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'star' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => StarDefinition,
});
