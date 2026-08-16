import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphFrameArtifact, IRGraphFrame } from './types';

import { GRAPH_NAMESPACE } from '../../shared';
import { compileGraphFrame } from './compile';
import { GraphFrameArtifactSchema, GraphFrameSchema } from './schema';

/** GraphFrame 的布局感知复合元素定义 */
export const GraphFrameDefinition: LayoutCompositeDefinition<
  IRGraphFrame,
  typeof GRAPH_NAMESPACE,
  'graphFrame',
  GraphFrameArtifact
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: 'graphFrame',
  schema: GraphFrameSchema,
  compile: compileGraphFrame,
  artifactSchema: GraphFrameArtifactSchema,
});

/** 由 GraphFrame 定义推导的编译产物封装 */
export type GraphFrameCompileArtifact = CompositeArtifactOf<typeof GraphFrameDefinition>;
