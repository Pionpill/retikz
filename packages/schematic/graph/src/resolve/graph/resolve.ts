import type { IRChild, IRScope } from '@retikz/core';

import type {
  IRBlock,
  IRBlockHeader,
  IRBlockRow,
  IRBlockSection,
  IRGraph,
  IRGraphEntity,
  IRGraphRelation,
  IRGraphThemeLayer,
  IRGroup,
} from '../../schemas';
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

const isBlock = (child: IRChild): child is IRBlock => isGraphComposite(child, GraphType.Block);

const isBlockHeader = (child: IRChild): child is IRBlockHeader => isGraphComposite(child, GraphType.BlockHeader);

const isBlockSection = (child: IRChild): child is IRBlockSection => isGraphComposite(child, GraphType.BlockSection);

const isBlockRow = (child: IRChild): child is IRBlockRow => isGraphComposite(child, GraphType.BlockRow);

const isScope = (child: IRChild): child is IRScope => !('namespace' in child) && child.type === 'scope';

type GraphContextSource = Pick<IRBlock | IRGraph | IRGroup, 'theme' | 'graphTheme'>;

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

const projectBlock = (source: IRBlock, context: GraphProjectionContext, options: GraphResolveContext): IRBlock => {
  return {
    ...source,
    ...(source.children === undefined ? {} : { children: projectChildren(source.children, context, options) }),
  };
};

const projectBlockHeader = (
  source: IRBlockHeader,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRBlockHeader => {
  const projectSlot = (child: IRChild | undefined): IRChild | undefined =>
    child === undefined ? undefined : projectChildren([child], context, options)[0];
  return {
    ...source,
    ...(source.icon === undefined ? {} : { icon: projectSlot(source.icon)! }),
    ...(source.trailing === undefined ? {} : { trailing: projectSlot(source.trailing)! }),
  };
};

const scopeProjectionContext = (
  source: Pick<IRBlockRow | IRBlockSection, 'theme'>,
  inherited: GraphProjectionContext,
): GraphProjectionContext => ({ layers: source.theme === undefined ? inherited.layers : [] });

const projectBlockSection = (
  source: IRBlockSection,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRBlockSection => ({
  ...source,
  ...(source.children === undefined
    ? {}
    : { children: projectChildren(source.children, scopeProjectionContext(source, context), options) }),
});

const projectBlockRow = (
  source: IRBlockRow,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRBlockRow => ({
  ...source,
  ...(source.children === undefined
    ? {}
    : {
        children: source.children.map(cell => ({
          ...cell,
          child: projectChildren([cell.child], scopeProjectionContext(source, context), options)[0],
        })),
      }),
});

const projectChildren = (
  children: ReadonlyArray<IRChild>,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): Array<IRChild> =>
  children.map(child => {
    if (isEntity(child)) return projectEntity(child, context, options);
    if (isRelation(child)) return projectRelation(child, context, options);
    if (isBlock(child)) {
      return projectBlock(child, graphContext(child, context), options);
    }
    if (isBlockHeader(child)) return projectBlockHeader(child, context, options);
    if (isBlockSection(child)) return projectBlockSection(child, context, options);
    if (isBlockRow(child)) return projectBlockRow(child, context, options);
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

/** 把 Graph-local context 投影到一个 Block 的开放内容树 */
export const resolveBlockSource = (source: IRBlock, options: GraphResolveContext): IRBlock =>
  projectBlock(source, graphContext(source, { layers: [] }), options);
