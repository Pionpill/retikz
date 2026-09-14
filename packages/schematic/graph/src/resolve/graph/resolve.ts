import type { IRChild, IRScope, ResolvedTheme } from '@retikz/core';
import { categoricalColorAt, DEFAULT_RESOLVED_THEME } from '@retikz/core';

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
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { projectEntityGraphLayers, resolveEntity } from '../entity';
import { projectRelationGraphLayers, resolveRelation } from '../relation';
import type { GraphAuthorLayer } from '../theme';
import { resolveGraphAuthorSurfaceDefaults } from '../theme';
import type { GraphResolveContext } from './types';

type GraphProjectionContext = Readonly<{
  layers: ReadonlyArray<GraphAuthorLayer>;
}>;

type GroupColorContext = {
  palette: ResolvedTheme['colors']['categorical'];
  colorByGroup: Map<string, ResolvedTheme['colors']['categorical'][number]>;
  nextGroupIndex: number;
};

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

/** 创建当前 Graph 根范围内 Entity 与 Relation 分组颜色的稳定分配上下文 */
const createGroupColorContext = (theme: ResolvedTheme): GroupColorContext => ({
  palette: theme.colors.categorical,
  colorByGroup: new Map(),
  nextGroupIndex: 0,
});

/** 按首次出现顺序从分类色板头部为一个视觉 group 分配颜色 */
const resolveGroupColor = (
  group: string,
  context: GroupColorContext,
): ResolvedTheme['colors']['categorical'][number] => {
  const existingColor = context.colorByGroup.get(group);
  if (existingColor !== undefined) return existingColor;
  const paletteIndex = context.nextGroupIndex % context.palette.length;
  const color = categoricalColorAt(context.palette, paletteIndex);
  context.colorByGroup.set(group, color);
  context.nextGroupIndex += 1;
  return color;
};

/** 为未被作者颜色覆盖的 Entity 投影所属 group 的 fallback color */
const projectEntityGroupColor = (source: IRGraphEntity, context: GroupColorContext): IRGraphEntity => {
  if (source.group === undefined) return source;
  const color = resolveGroupColor(source.group, context);
  if (source.style?.color !== undefined) return source;
  return {
    ...source,
    style: { ...source.style, color },
  };
};

/** 为未被作者颜色覆盖的 Relation 投影所属 group 的 fallback color */
const projectRelationGroupColor = (source: IRGraphRelation, context: GroupColorContext): IRGraphRelation => {
  if (source.group === undefined) return source;
  const color = resolveGroupColor(source.group, context);
  if (source.style?.color !== undefined || source.style?.stroke !== undefined) return source;
  return {
    ...source,
    style: { ...source.style, color },
    ...(source.sourceMarker?.color === undefined ? { sourceMarker: { ...source.sourceMarker, color } } : {}),
    ...(source.targetMarker?.color === undefined ? { targetMarker: { ...source.targetMarker, color } } : {}),
  };
};

/** 在 Graph 当前公开可见内容树中投影 Entity 与 Relation group 的自动颜色 */
const projectGroupColors = (children: ReadonlyArray<IRChild>, context: GroupColorContext): Array<IRChild> =>
  children.map(child => {
    if (isEntity(child)) return projectEntityGroupColor(child, context);
    if (isRelation(child)) return projectRelationGroupColor(child, context);
    if (isBlock(child)) {
      return {
        ...child,
        ...(child.children === undefined ? {} : { children: projectGroupColors(child.children, context) }),
      };
    }
    if (isBlockHeader(child)) {
      const projectSlot = (slot: IRChild | undefined): IRChild | undefined =>
        slot === undefined ? undefined : projectGroupColors([slot], context)[0];
      return {
        ...child,
        ...(child.icon === undefined ? {} : { icon: projectSlot(child.icon)! }),
        ...(child.trail === undefined ? {} : { trail: projectSlot(child.trail)! }),
      };
    }
    if (isBlockSection(child) || isGraph(child) || isGroup(child) || isScope(child)) {
      return {
        ...child,
        ...(child.children === undefined ? {} : { children: projectGroupColors(child.children, context) }),
      };
    }
    if (isBlockRow(child)) {
      return {
        ...child,
        ...(!('children' in child) || child.children === undefined
          ? {}
          : { children: projectGroupColors(child.children, context) }),
      };
    }
    return child;
  });

/** 把 Graph-local author layers 投影到 schema 可见的语义后代，并保留完整有序 Core child tree */
export const resolveGraph = (
  source: IRGraph,
  options: GraphResolveContext,
  theme: ResolvedTheme = DEFAULT_RESOLVED_THEME,
): Array<IRChild> =>
  projectGroupColors(
    projectChildren(source.children ?? [], graphContext(source, { layers: [] }), options),
    createGroupColorContext(theme),
  );

/** 把 Graph-local author layers 投影到一个 Group 的 schema 可见后代 */
export const resolveGroupChildren = (source: IRGroup, options: GraphResolveContext): Array<IRChild> =>
  projectChildren(source.children ?? [], graphContext(source, { layers: [] }), options);

/** 把 Graph-local author layers 投影到一个 Block 的开放内容树 */
export const resolveBlockSource = (source: IRBlock, options: GraphResolveContext): IRBlock =>
  projectBlock(source, { layers: [] }, options);
