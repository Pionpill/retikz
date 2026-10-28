import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { pathClipProvider } from '@retikz/extension';

import { compileMap } from './pipeline';
import { MapSchema } from './schema';
import type { IRMap } from './schema';

/** Standard Map 的布局感知 Definition */
export const mapDefinition: CompositeDefinition<IRMap, 'standard', 'map'> = defineComposite({
  namespace: 'standard',
  type: 'map',
  schema: MapSchema,
  compile: compileMap,
});

/** 保留稀疏 Source 的类型化工厂 */
export const createMap = (input: IRMap): IRMap => ({ ...input });

/** Map 与单元格 lower target 的按需依赖声明 */
export const mapProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'map' },
  dependencies: [pathClipProvider.key],
  makeDefinition: () => mapDefinition,
};
