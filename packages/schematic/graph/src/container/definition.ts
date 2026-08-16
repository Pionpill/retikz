import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { ContainerArtifact, IRContainer } from './types';

import { GRAPH_NAMESPACE, GraphType } from '../shared';
import { compileContainer } from './compile';
import { ContainerArtifactSchema, ContainerSchema } from './schema';

/** Container 的布局感知复合元素定义 */
export const ContainerDefinition: LayoutCompositeDefinition<
  IRContainer,
  typeof GRAPH_NAMESPACE,
  typeof GraphType.Container,
  ContainerArtifact
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Container,
  schema: ContainerSchema,
  compile: compileContainer,
  artifactSchema: ContainerArtifactSchema,
});

/** 由 Container 定义推导的编译产物封装 */
export type ContainerCompileArtifact = CompositeArtifactOf<typeof ContainerDefinition>;
