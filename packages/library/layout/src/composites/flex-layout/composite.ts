import type { CompositeArtifactOf, CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { LAYOUT_NAMESPACE } from '../../shared';
import { compileFlexLayout } from './pipeline';
import { FlexLayoutArtifactSchema, FlexLayoutSchema } from './schema';
import type { FlexLayoutArtifact, IRFlexLayout, InputFlexLayoutConfig } from './types';

/** Layout FlexLayout 的官方 Core layout-aware composite definition */
export const flexLayoutDefinition: CompositeDefinition<
  IRFlexLayout,
  typeof LAYOUT_NAMESPACE,
  'flexLayout',
  FlexLayoutArtifact
> = defineComposite({
  namespace: LAYOUT_NAMESPACE,
  type: 'flexLayout',
  schema: FlexLayoutSchema,
  compile: compileFlexLayout,
  artifactSchema: FlexLayoutArtifactSchema,
});

/** FlexLayout definition 推导出的公开 compile artifact envelope */
export type FlexLayoutCompileArtifact = CompositeArtifactOf<typeof flexLayoutDefinition>;

/** 创建保留省略字段与简写的 FlexLayout 持久化输入
 * @param input 容器与子项配置；静态默认值由 Schema 解析时应用
 * @returns 带 layout 命名空间与容器类型的 Source IR，不修改 input
 */
export const createFlexLayout = (input: InputFlexLayoutConfig): IRFlexLayout => ({
  namespace: LAYOUT_NAMESPACE,
  type: 'flexLayout',
  ...input,
});

const makeFlexLayoutDefinition = () => flexLayoutDefinition;

/** FlexLayout 的 Core Composite dependency provider */
export const flexLayoutProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: flexLayoutDefinition.namespace,
    type: flexLayoutDefinition.type,
  }),
  makeDefinition: makeFlexLayoutDefinition,
});
