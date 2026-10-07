import type { CompositeArtifactOf, LayoutCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { LAYOUT_NAMESPACE } from '../../shared';
import { compileGridLayout } from './pipeline';
import { GridLayoutArtifactSchema, GridLayoutSchema } from './schema';
import type { GridLayoutArtifact, IRGridLayout, GridLayoutInput } from './types';

/** Layout GridLayout 的官方 Core layout-aware composite definition */
export const GridLayoutDefinition: LayoutCompositeDefinition<
  IRGridLayout,
  typeof LAYOUT_NAMESPACE,
  'gridLayout',
  GridLayoutArtifact
> = defineComposite({
  namespace: LAYOUT_NAMESPACE,
  type: 'gridLayout',
  schema: GridLayoutSchema,
  compile: compileGridLayout,
  artifactSchema: GridLayoutArtifactSchema,
});

/** GridLayout definition 推导出的公开 compile artifact envelope */
export type GridLayoutCompileArtifact = CompositeArtifactOf<typeof GridLayoutDefinition>;

/** 创建保留省略字段与简写的 GridLayout 持久化输入
 * @param input 容器与子项配置；静态默认值由 Schema 解析时应用
 * @returns 带 layout 命名空间与容器类型的 Source IR，不修改 input
 */
export const createGridLayout = (input: GridLayoutInput): IRGridLayout => ({
  namespace: LAYOUT_NAMESPACE,
  type: 'gridLayout',
  ...input,
});

const makeGridLayoutDefinition = () => GridLayoutDefinition;

/** GridLayout 的 Core Composite dependency provider */
export const GridLayoutProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: GridLayoutDefinition.namespace,
    type: GridLayoutDefinition.type,
  }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeGridLayoutDefinition,
});
