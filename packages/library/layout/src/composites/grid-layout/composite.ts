import type { CompositeArtifactOf, CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { LAYOUT_NAMESPACE } from '../../shared';
import { compileGridLayout } from './pipeline';
import { GridLayoutArtifactSchema, GridLayoutSchema } from './schema';
import type { GridLayoutArtifact, IRGridLayout, InputGridLayoutConfig } from './types';

/** Layout GridLayout 的官方 Core layout-aware composite definition */
export const gridLayoutDefinition: CompositeDefinition<
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
export type GridLayoutCompileArtifact = CompositeArtifactOf<typeof gridLayoutDefinition>;

/** 创建保留省略字段与简写的 GridLayout 持久化输入
 * @param input 容器与子项配置；静态默认值由 Schema 解析时应用
 * @returns 带 layout 命名空间与容器类型的 Source IR，不修改 input
 */
export const createGridLayout = (input: InputGridLayoutConfig): IRGridLayout => ({
  namespace: LAYOUT_NAMESPACE,
  type: 'gridLayout',
  ...input,
});

const makeGridLayoutDefinition = () => gridLayoutDefinition;

/** GridLayout 的 Core Composite dependency provider */
export const gridLayoutProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: gridLayoutDefinition.namespace,
    type: gridLayoutDefinition.type,
  }),
  makeDefinition: makeGridLayoutDefinition,
});
