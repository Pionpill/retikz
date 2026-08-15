import type {
  CompositeExpandContext,
  CompositeExpandResult,
  ExpandCompositeDefinition,
  IRNode,
  ResolvedTheme,
} from '@retikz/core';

import { compositeOpaqueColor, defineComposite, NodeTextColor, ThemeMode } from '@retikz/core';

import type { GraphSemanticNode, IRGraphNode } from './types';

import { GRAPH_NAMESPACE, GraphElementType } from '../shared';
import { GraphNodeRole, GraphNodeVariant } from './constants';
import { GraphNodeSchema } from './schema';

type GraphNodeDefaults = Readonly<{
  minimumSize?: NonNullable<IRNode['minimumSize']>;
  padding: NonNullable<IRNode['padding']>;
  shape: NonNullable<IRNode['shape']>;
}>;

const GRAPH_NODE_DEFAULTS: Readonly<Record<GraphSemanticNode['role'], GraphNodeDefaults>> = {
  [GraphNodeRole.Terminal]: {
    minimumSize: { width: 48, height: 24 },
    padding: { x: 12, y: 6 },
    shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
  },
  [GraphNodeRole.Stage]: {
    padding: 8,
    shape: { type: 'rectangle', params: { cornerRadius: 8 } },
  },
  [GraphNodeRole.Decision]: {
    padding: { x: 3, y: 2 },
    shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
  },
  [GraphNodeRole.Junction]: {
    minimumSize: { width: 8, height: 8 },
    padding: 0,
    shape: 'circle',
  },
};

/** 返回 GraphNode authored 主要色或与当前模式对应的确定黑白默认值 */
const primaryColorOf = (node: GraphSemanticNode, theme: ResolvedTheme): string =>
  node.color ?? (theme.mode === ThemeMode.Light ? '#000000' : '#ffffff');

/** 在下沉边界把 GraphNode variant 的 currentColor 绑定到最终主要色 */
const materializeThemePaint = (paint: string, primaryColor: string): string =>
  paint === 'currentColor' ? primaryColor : paint;

/** 计算使用当前模式底色的 GraphNode 浅色预合成结果 */
const tintedColor = (primaryColor: string, theme: ResolvedTheme, weight: number): string =>
  compositeOpaqueColor(primaryColor, theme.mode === ThemeMode.Light ? '#ffffff' : '#000000', weight);

/** 解析 GraphNode variant 的字段级默认外观 */
const resolveGraphNodeVariant = (
  variant: GraphSemanticNode['variant'],
  primaryColor: string,
  theme: ResolvedTheme,
): Readonly<{ textColor: string; stroke: string; fill: string }> => {
  const effectiveVariant = variant ?? GraphNodeVariant.Default;
  switch (effectiveVariant) {
    case GraphNodeVariant.Default:
      return { textColor: primaryColor, stroke: primaryColor, fill: 'none' };
    case GraphNodeVariant.Primary:
      return { textColor: NodeTextColor.Contrast, stroke: primaryColor, fill: primaryColor };
    case GraphNodeVariant.Secondary:
      return { textColor: primaryColor, stroke: 'none', fill: tintedColor(primaryColor, theme, 0.1) };
    case GraphNodeVariant.Outline:
      return { textColor: primaryColor, stroke: tintedColor(primaryColor, theme, 0.6), fill: 'none' };
    case GraphNodeVariant.Vibrant:
      return { textColor: primaryColor, stroke: primaryColor, fill: tintedColor(primaryColor, theme, 0.15) };
  }
};

/** 把 GraphNode 展开为固定角色默认值或显式 shape 的同标识 Core Node */
const expandGraphNode = (node: IRGraphNode, context: CompositeExpandContext): CompositeExpandResult => {
  const {
    namespace: _namespace,
    type: _type,
    role,
    variant: _variant,
    shape: authoredShape,
    minimumSize: authoredMinimumSize,
    padding: authoredPadding,
    boundary: authoredBoundary,
    strokeWidth: authoredStrokeWidth,
    zIndex: authoredZIndex,
    ...input
  } = node;
  const defaults = GRAPH_NODE_DEFAULTS[role];
  const primaryColor = primaryColorOf(node, context.theme);
  const baseline = resolveGraphNodeVariant(node.variant, primaryColor, context.theme);
  void _namespace;
  void _type;
  void _variant;
  return {
    children: [
      {
        type: 'node',
        ...input,
        ...(authoredMinimumSize === undefined && defaults.minimumSize === undefined
          ? {}
          : { minimumSize: authoredMinimumSize ?? defaults.minimumSize }),
        shape: authoredShape ?? defaults.shape,
        padding: authoredPadding ?? defaults.padding,
        boundary: authoredBoundary ?? 'shape',
        strokeWidth: authoredStrokeWidth ?? 1,
        zIndex: authoredZIndex ?? 0,
        color: primaryColor,
        textColor: input.textColor ?? materializeThemePaint(baseline.textColor, primaryColor),
        stroke: input.stroke ?? materializeThemePaint(baseline.stroke, primaryColor),
        fill: input.fill ?? materializeThemePaint(baseline.fill, primaryColor),
      },
    ],
  };
};

/** GraphNode 的 Core Composite Definition */
export const GraphNodeDefinition: ExpandCompositeDefinition<
  IRGraphNode,
  typeof GRAPH_NAMESPACE,
  typeof GraphElementType.GraphNode
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: GraphElementType.GraphNode,
  schema: GraphNodeSchema,
  expand: expandGraphNode,
});
