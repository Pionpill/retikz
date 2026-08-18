import type { ExpandCompositeDefinition, IRChild, IRComposite, IRScope } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRContainer, IRGraph } from '../../schemas';
import type { GraphPresentationLowerContext, IRGraphPresentation } from './types';

import { lowerEntityPresentation, resolveEntityPresentation } from '../../resolve';
import { ContainerSchema, EntitySchema, GraphSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { GRAPH_PRESENTATION_TYPE } from './constants';
import { GraphPresentationSchema } from './schema';

const isComposite = (child: IRChild): child is IRComposite => 'namespace' in child;

const graphLayerOf = (graph: IRGraph) => ({
  ...(graph.graphThemeTokens === undefined ? {} : { tokens: graph.graphThemeTokens }),
  ...(graph.graphThemeTokenRules === undefined ? {} : { tokenRules: graph.graphThemeTokenRules }),
});

const lowerContainer = (source: IRContainer, context: GraphPresentationLowerContext): IRContainer => {
  const entityVariant = source.entityVariant ?? context.inheritedVariant;
  const lowerChild = (child: IRChild): IRChild =>
    lowerGraphPresentationChildren([child], { ...context, inheritedVariant: entityVariant })[0];
  return {
    ...source,
    ...(source.header === undefined ? {} : { header: { ...source.header, child: lowerChild(source.header.child) } }),
    sections: source.sections.map(section => ({ ...section, child: lowerChild(section.child) })),
  };
};

const lowerGraph = (source: IRGraph, context: GraphPresentationLowerContext): IRScope => {
  const entityVariant = source.entityVariant ?? context.inheritedVariant;
  const layer = graphLayerOf(source);
  const tokenLayers =
    layer.tokens === undefined && layer.tokenRules === undefined
      ? context.tokenLayers
      : [...context.tokenLayers, layer];
  return {
    type: 'scope',
    ...(source.id === undefined ? {} : { id: source.id }),
    children: lowerGraphPresentationChildren(source.children, {
      ...context,
      inheritedVariant: entityVariant,
      tokenLayers,
    }),
  };
};

/** 创建只承接 Theme Scope 后代 effective variant 的私有中间节点 */
export const createGraphPresentationNode = (
  children: ReadonlyArray<IRChild>,
  entityVariant: string | undefined,
): IRGraphPresentation => ({
  namespace: GRAPH_NAMESPACE,
  type: GRAPH_PRESENTATION_TYPE,
  ...(entityVariant === undefined ? {} : { entityVariant }),
  children: [...children],
});

/** 在同一 Graph presentation context 中递归下沉已知 Graph-owned children */
export const lowerGraphPresentationChildren = (
  children: ReadonlyArray<IRChild>,
  context: GraphPresentationLowerContext,
): Array<IRChild> =>
  children.map(child => {
    if (isComposite(child)) {
      if (child.namespace !== GRAPH_NAMESPACE) return child;
      if (child.type === GraphType.Graph) return lowerGraph(GraphSchema.parse(child), context);
      if (child.type === GraphType.Container) return lowerContainer(ContainerSchema.parse(child), context);
      if (child.type === GraphType.Entity) {
        return lowerEntityPresentation(
          resolveEntityPresentation(EntitySchema.parse(child), {
            ...context,
            tokenLayers: context.tokenLayers,
          }),
        );
      }
      return child;
    }
    if (child.type !== 'scope') return child;
    if (child.theme !== undefined) {
      return {
        ...child,
        children: [createGraphPresentationNode(child.children, context.inheritedVariant)],
      };
    }
    return {
      ...child,
      children: lowerGraphPresentationChildren(child.children, context),
    };
  });

/** 用已解析 registries 创建 Graph Theme Scope continuation Definition */
export const createGraphPresentationDefinition = (
  options: Omit<GraphPresentationLowerContext, 'theme' | 'inheritedVariant' | 'tokenLayers'>,
): ExpandCompositeDefinition<IRGraphPresentation, typeof GRAPH_NAMESPACE, typeof GRAPH_PRESENTATION_TYPE> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GRAPH_PRESENTATION_TYPE,
    schema: GraphPresentationSchema,
    expand: (node, context) => ({
      children: lowerGraphPresentationChildren(node.children, {
        ...options,
        theme: context.theme,
        ...(node.entityVariant === undefined ? {} : { inheritedVariant: node.entityVariant }),
        tokenLayers: [],
      }),
    }),
  });

/** 判断一个 Graph composite type 是否为 lowering 私有 presentation continuation */
export const isGraphPresentationType = (type: string): boolean => type === GRAPH_PRESENTATION_TYPE;
