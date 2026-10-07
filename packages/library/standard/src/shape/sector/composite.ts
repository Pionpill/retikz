import { defineComposite } from '@retikz/core';
import type { CoreDependencyProvider } from '@retikz/core';

import type { ShapeProperties } from '../shared';
import { lowerSector } from './pipeline';
import { SectorSchema } from './schema';
import type { IRSector } from './types';

/** Sector 的 Core composite 注册项 */
export const SectorDefinition = defineComposite({
  namespace: 'standard',
  type: 'sector',
  schema: SectorSchema,
  expand: (source: IRSector) => ({ children: [lowerSector(source)] }),
});

/** 创建保留几何意图的 Sector Source */
export const createSector = (input: ShapeProperties<IRSector>): IRSector => ({
  ...input,
  namespace: 'standard',
  type: 'sector',
});

/** Sector 的按需依赖贡献 */
export const SectorProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'sector' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => SectorDefinition,
});
