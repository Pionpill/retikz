import type { IRChild, IRScope } from '@retikz/core';

import type { IRGraph, IRGraphEntity, IRGraphRelation, IRGraphThemeLayer, IRGroup } from '../../schemas';
import type { GraphResolveContext } from './types';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { resolveEntity, resolveEntityGraphThemeOverrides } from '../entity';
import { resolveRelation, resolveRelationGraphThemeOverrides } from '../relation';

type GraphProjectionContext = Readonly<{
  layers: ReadonlyArray<IRGraphThemeLayer>;
}>;

const isGraphComposite = (child: IRChild, type: string): boolean =>
  'namespace' in child && child.namespace === GRAPH_NAMESPACE && child.type === type;

const isEntity = (child: IRChild): child is IRGraphEntity => isGraphComposite(child, GraphType.Entity);

const isRelation = (child: IRChild): child is IRGraphRelation => isGraphComposite(child, GraphType.Relation);

const isGraph = (child: IRChild): child is IRGraph => isGraphComposite(child, GraphType.Graph);

const isGroup = (child: IRChild): child is IRGroup => isGraphComposite(child, GraphType.Group);

const isScope = (child: IRChild): child is IRScope => !('namespace' in child) && child.type === 'scope';

type GraphContextSource = Pick<IRGraph | IRGroup, 'theme' | 'graphTheme'>;

const graphContext = (source: GraphContextSource, inherited: GraphProjectionContext): GraphProjectionContext => {
  const parentLayers = source.theme === undefined ? inherited.layers : [];
  return {
    layers: source.graphTheme === undefined ? parentLayers : [...parentLayers, source.graphTheme],
  };
};

const projectEntity = (
  source: IRGraphEntity,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRGraphEntity => {
  const entity = resolveEntity(source, options);
  const appearance = resolveEntityGraphThemeOverrides(entity, {
    ...options,
    layers: context.layers,
  });
  return { ...appearance, ...source };
};

const projectRelation = (
  source: IRGraphRelation,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRGraphRelation => {
  const relation = resolveRelation(source, options);
  const appearance = resolveRelationGraphThemeOverrides(relation, { ...options, layers: context.layers });
  return { ...appearance, ...source };
};

const projectChildren = (
  children: ReadonlyArray<IRChild>,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): Array<IRChild> =>
  children.map(child => {
    if (isEntity(child)) return projectEntity(child, context, options);
    if (isRelation(child)) return projectRelation(child, context, options);
    if (isGraph(child) || isGroup(child)) {
      const nestedContext = graphContext(child, context);
      return {
        ...child,
        ...(child.children === undefined ? {} : { children: projectChildren(child.children, nestedContext, options) }),
      };
    }
    if (isScope(child)) {
      const nestedContext: GraphProjectionContext = {
        layers: child.theme === undefined ? context.layers : [],
      };
      return { ...child, children: projectChildren(child.children, nestedContext, options) };
    }
    return child;
  });

/** 把 Graph-local context 投影到 schema 可见的语义后代，并保留完整有序 Core child tree */
export const resolveGraph = (source: IRGraph, options: GraphResolveContext): Array<IRChild> =>
  projectChildren(source.children ?? [], graphContext(source, { layers: [] }), options);

/** 把 Graph-local context 投影到一个 Group 的 schema 可见后代 */
export const resolveGroupChildren = (source: IRGroup, options: GraphResolveContext): Array<IRChild> =>
  projectChildren(source.children ?? [], graphContext(source, { layers: [] }), options);
