import type { IRChild, IRScope } from '@retikz/core';

import type {
  IRBlock,
  IRBlockHeader,
  IRBlockRow,
  IRBlockSection,
  IRGraph,
  IRGraphEntity,
  IRGraphRelation,
  IRGroup,
} from '../../schemas';
import type { GraphAuthorLayer } from '../theme';
import type { GraphResolveContext } from './types';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { projectEntityGraphLayers, resolveEntity } from '../entity';
import { projectRelationGraphLayers, resolveRelation } from '../relation';
import { resolveGraphAuthorSurfaceDefaults } from '../theme';

type GraphProjectionContext = Readonly<{
  layers: ReadonlyArray<GraphAuthorLayer>;
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

type GraphContextSource = Pick<IRBlock | IRGraph | IRGroup, 'graphDefaults' | 'graphRules'>;

const graphContext = (source: GraphContextSource, inherited: GraphProjectionContext): GraphProjectionContext => {
  if (source.graphDefaults === undefined && source.graphRules === undefined) return inherited;
  const layer: GraphAuthorLayer = {
    ...(source.graphDefaults === undefined ? {} : { defaults: source.graphDefaults }),
    ...(source.graphRules === undefined ? {} : { rules: source.graphRules }),
  };
  return { layers: [...inherited.layers, layer] };
};

type GraphSurfaceSource = Pick<IRBlock | IRGroup, 'background' | 'border' | 'cornerRadius'>;

const incomingSurfaceDefaults = (
  source: GraphSurfaceSource,
  context: GraphProjectionContext,
  target: 'group' | 'block',
): Partial<GraphSurfaceSource> => {
  const defaults = resolveGraphAuthorSurfaceDefaults(context.layers, target);
  return {
    ...(source.background === undefined && defaults?.background !== undefined
      ? { background: defaults.background }
      : {}),
    ...(source.border === undefined && defaults?.border !== undefined ? { border: defaults.border } : {}),
    ...(source.cornerRadius === undefined && defaults?.cornerRadius !== undefined
      ? { cornerRadius: defaults.cornerRadius }
      : {}),
  };
};

const projectEntity = (
  source: IRGraphEntity,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRGraphEntity => projectEntityGraphLayers(resolveEntity(source, options), { ...options, layers: context.layers });

const projectRelation = (
  source: IRGraphRelation,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRGraphRelation =>
  projectRelationGraphLayers(resolveRelation(source, options), { ...options, layers: context.layers });

const projectBlock = (source: IRBlock, context: GraphProjectionContext, options: GraphResolveContext): IRBlock => {
  const nestedContext = graphContext(source, context);
  return {
    ...source,
    ...incomingSurfaceDefaults(source, context, 'block'),
    ...(source.children === undefined ? {} : { children: projectChildren(source.children, nestedContext, options) }),
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
    ...(source.trail === undefined ? {} : { trail: projectSlot(source.trail)! }),
  };
};

const projectBlockSection = (
  source: IRBlockSection,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRBlockSection => ({
  ...source,
  ...(source.children === undefined ? {} : { children: projectChildren(source.children, context, options) }),
});

const projectBlockRow = (
  source: IRBlockRow,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): IRBlockRow => ({
  ...source,
  ...(!('children' in source) || source.children === undefined
    ? {}
    : { children: projectChildren(source.children, context, options) }),
});

const projectGraph = (source: IRGraph, context: GraphProjectionContext, options: GraphResolveContext): IRGraph => {
  const nestedContext = graphContext(source, context);
  return {
    ...source,
    ...(source.children === undefined ? {} : { children: projectChildren(source.children, nestedContext, options) }),
  };
};

const projectGroup = (source: IRGroup, context: GraphProjectionContext, options: GraphResolveContext): IRGroup => {
  const nestedContext = graphContext(source, context);
  return {
    ...source,
    ...incomingSurfaceDefaults(source, context, 'group'),
    ...(source.children === undefined ? {} : { children: projectChildren(source.children, nestedContext, options) }),
  };
};

const projectChildren = (
  children: ReadonlyArray<IRChild>,
  context: GraphProjectionContext,
  options: GraphResolveContext,
): Array<IRChild> =>
  children.map(child => {
    if (isEntity(child)) return projectEntity(child, context, options);
    if (isRelation(child)) return projectRelation(child, context, options);
    if (isBlock(child)) return projectBlock(child, context, options);
    if (isBlockHeader(child)) return projectBlockHeader(child, context, options);
    if (isBlockSection(child)) return projectBlockSection(child, context, options);
    if (isBlockRow(child)) return projectBlockRow(child, context, options);
    if (isGraph(child)) return projectGraph(child, context, options);
    if (isGroup(child)) return projectGroup(child, context, options);
    if (isScope(child)) return { ...child, children: projectChildren(child.children, context, options) };
    return child;
  });

/** 把 Graph-local author layers 投影到 schema 可见的语义后代，并保留完整有序 Core child tree */
export const resolveGraph = (source: IRGraph, options: GraphResolveContext): Array<IRChild> =>
  projectChildren(source.children ?? [], graphContext(source, { layers: [] }), options);

/** 把 Graph-local author layers 投影到一个 Group 的 schema 可见后代 */
export const resolveGroupChildren = (source: IRGroup, options: GraphResolveContext): Array<IRChild> =>
  projectChildren(source.children ?? [], graphContext(source, { layers: [] }), options);

/** 把 Graph-local author layers 投影到一个 Block 的开放内容树 */
export const resolveBlockSource = (source: IRBlock, options: GraphResolveContext): IRBlock =>
  projectBlock(source, { layers: [] }, options);
