import { defineComposite } from '@retikz/core';
import type { CoreDependencyProvider } from '@retikz/core';

import type { ShapeProperties } from '../shared';
import { lowerArc } from './pipeline';
import { ArcSchema } from './schema';
import type { IRArc } from './types';

/** Arc 的 Core composite 注册项 */
export const ArcDefinition = defineComposite({
  namespace: 'standard',
  type: 'arc',
  schema: ArcSchema,
  expand: (source: IRArc) => ({ children: [lowerArc(source)] }),
});

/** 创建保留几何意图的 Arc Source */
export const createArc = (input: ShapeProperties<IRArc>): IRArc => ({
  ...input,
  namespace: 'standard',
  type: 'arc',
});

/** Arc 的按需依赖贡献 */
export const ArcProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'arc' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => ArcDefinition,
});
