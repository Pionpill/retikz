import type { CompositeArtifactOf, CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { LAYOUT_NAMESPACE } from '../../shared';
import { compileOverlayLayout } from './pipeline';
import { OverlayLayoutArtifactSchema, OverlayLayoutSchema } from './schema';
import type { IROverlayLayout, OverlayLayoutArtifact, InputOverlayLayoutConfig } from './types';

/** Layout OverlayLayout 的官方 Core layout-aware composite definition */
export const overlayLayoutDefinition: CompositeDefinition<
  IROverlayLayout,
  typeof LAYOUT_NAMESPACE,
  'overlayLayout',
  OverlayLayoutArtifact
> = defineComposite({
  namespace: LAYOUT_NAMESPACE,
  type: 'overlayLayout',
  schema: OverlayLayoutSchema,
  compile: compileOverlayLayout,
  artifactSchema: OverlayLayoutArtifactSchema,
});

/** OverlayLayout definition 推导出的公开 compile artifact envelope */
export type OverlayLayoutCompileArtifact = CompositeArtifactOf<typeof overlayLayoutDefinition>;

/** 创建保留省略字段与简写的 OverlayLayout 持久化输入
 * @param input 容器与子项配置；静态默认值由 Schema 解析时应用
 * @returns 带 layout 命名空间与容器类型的 Source IR，不修改 input
 */
export const createOverlayLayout = (input: InputOverlayLayoutConfig): IROverlayLayout => ({
  namespace: LAYOUT_NAMESPACE,
  type: 'overlayLayout',
  ...input,
});

const makeOverlayLayoutDefinition = () => overlayLayoutDefinition;

/** OverlayLayout 的 Core Composite dependency provider */
export const overlayLayoutProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: overlayLayoutDefinition.namespace,
    type: overlayLayoutDefinition.type,
  }),
  makeDefinition: makeOverlayLayoutDefinition,
});
