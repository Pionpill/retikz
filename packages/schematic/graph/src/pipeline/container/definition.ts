import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { ContainerArtifact, IRContainer } from '../../schemas';

import { resolveGraphDefinitionOptions } from '../../providers';
import { ContainerArtifactSchema, ContainerSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { createCompileContainer } from './compile';

/** Container 的布局感知复合元素定义 */
export const createContainerDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): LayoutCompositeDefinition<IRContainer, typeof GRAPH_NAMESPACE, typeof GraphType.Container, ContainerArtifact> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Container,
    schema: ContainerSchema,
    compile: createCompileContainer(options),
    artifactSchema: ContainerArtifactSchema,
  });

/** 创建使用指定 Graph registries 的 Container Definition */
export const createContainerDefinition = (
  options: GraphDefinitionOptions = {},
): LayoutCompositeDefinition<IRContainer, typeof GRAPH_NAMESPACE, typeof GraphType.Container, ContainerArtifact> =>
  createContainerDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 Graph registries 的默认 Container Definition */
export const ContainerDefinition: LayoutCompositeDefinition<
  IRContainer,
  typeof GRAPH_NAMESPACE,
  typeof GraphType.Container,
  ContainerArtifact
> = createContainerDefinition();

/** 由 Container 定义推导的编译产物封装 */
export type ContainerCompileArtifact = CompositeArtifactOf<typeof ContainerDefinition>;
