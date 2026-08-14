import type {
  CompositeExpandContext,
  CompositeExpandResult,
  ExpandCompositeDefinition,
  IRNode,
  ResolvedTheme,
} from '@retikz/core';

import { compositeOpaqueColor, defineComposite, NodeTextColor, ThemeMode } from '@retikz/core';

import type { IRDecision, IRJunction, IRStage, IRTerminal, LogicSemanticNode } from './types';

import { NOTATION_NAMESPACE, NotationElementType } from '../../shared';
import { LogicNodeVariant } from './constants';
import { DecisionSchema, JunctionSchema, StageSchema, TerminalSchema } from './schema';

/** 返回逻辑节点 authored 主要色或与当前模式对应的确定黑白默认值 */
const primaryColorOf = (node: LogicSemanticNode, theme: ResolvedTheme): string =>
  node.color ?? (theme.mode === ThemeMode.Light ? '#000000' : '#ffffff');

/** 在下沉边界把 Notation Theme 的 currentColor 绑定到逻辑节点最终主要色 */
const materializeThemePaint = (paint: string, primaryColor: string): string =>
  paint === 'currentColor' ? primaryColor : paint;

/** 计算使用当前模式底色的逻辑节点浅色预合成结果 */
const tintedColor = (primaryColor: string, theme: ResolvedTheme, weight: number): string =>
  compositeOpaqueColor(primaryColor, theme.mode === ThemeMode.Light ? '#ffffff' : '#000000', weight);

/** 解析逻辑节点变体的字段级默认外观 */
const resolveLogicNodeVariant = (
  variant: LogicSemanticNode['variant'],
  primaryColor: string,
  theme: ResolvedTheme,
): Readonly<{ textColor: string; stroke: string; fill: string }> => {
  const effectiveVariant = variant ?? LogicNodeVariant.Default;
  switch (effectiveVariant) {
    case LogicNodeVariant.Default:
      return { textColor: primaryColor, stroke: primaryColor, fill: 'none' };
    case LogicNodeVariant.Primary:
      compositeOpaqueColor(primaryColor, theme.mode === ThemeMode.Light ? '#ffffff' : '#000000', 1);
      return { textColor: NodeTextColor.Contrast, stroke: primaryColor, fill: primaryColor };
    case LogicNodeVariant.Secondary:
      return { textColor: primaryColor, stroke: 'none', fill: tintedColor(primaryColor, theme, 0.1) };
    case LogicNodeVariant.Outline:
      return { textColor: primaryColor, stroke: tintedColor(primaryColor, theme, 0.6), fill: 'none' };
    case LogicNodeVariant.Vibrant:
      return { textColor: primaryColor, stroke: primaryColor, fill: tintedColor(primaryColor, theme, 0.15) };
  }
};

/** 把一个Notation基础单元展开为固定形状的同标识Core Node */
const expandSemanticNode = (
  node: LogicSemanticNode,
  shape: NonNullable<IRNode['shape']>,
  context: CompositeExpandContext,
): CompositeExpandResult => {
  const { namespace: _namespace, type: _type, variant: _variant, ...input } = node;
  const primaryColor = primaryColorOf(node, context.theme);
  const baseline = resolveLogicNodeVariant(node.variant, primaryColor, context.theme);
  void _namespace;
  void _type;
  void _variant;
  return {
    children: [
      {
        type: 'node',
        ...input,
        shape,
        color: primaryColor,
        textColor: input.textColor ?? materializeThemePaint(baseline.textColor, primaryColor),
        stroke: input.stroke ?? materializeThemePaint(baseline.stroke, primaryColor),
        fill: input.fill ?? materializeThemePaint(baseline.fill, primaryColor),
      },
    ],
  };
};

/** 创建四类逻辑节点 Definition */
export const createLogicNodeDefinitions = () => {
  const terminal: ExpandCompositeDefinition<
    IRTerminal,
    typeof NOTATION_NAMESPACE,
    typeof NotationElementType.Terminal
  > = defineComposite({
    namespace: NOTATION_NAMESPACE,
    type: NotationElementType.Terminal,
    schema: TerminalSchema,
    expand: (node, context) =>
      expandSemanticNode(node, { type: 'rectangle', params: { cornerRadius: 1_000_000 } }, context),
  });
  const stage: ExpandCompositeDefinition<IRStage, typeof NOTATION_NAMESPACE, typeof NotationElementType.Stage> =
    defineComposite({
      namespace: NOTATION_NAMESPACE,
      type: NotationElementType.Stage,
      schema: StageSchema,
      expand: (node, context) => expandSemanticNode(node, { type: 'rectangle', params: { cornerRadius: 8 } }, context),
    });
  const decision: ExpandCompositeDefinition<
    IRDecision,
    typeof NOTATION_NAMESPACE,
    typeof NotationElementType.Decision
  > = defineComposite({
    namespace: NOTATION_NAMESPACE,
    type: NotationElementType.Decision,
    schema: DecisionSchema,
    expand: (node, context) => expandSemanticNode(node, { type: 'diamond', params: { aspectRatio: 1.8 } }, context),
  });
  const junction: ExpandCompositeDefinition<
    IRJunction,
    typeof NOTATION_NAMESPACE,
    typeof NotationElementType.Junction
  > = defineComposite({
    namespace: NOTATION_NAMESPACE,
    type: NotationElementType.Junction,
    schema: JunctionSchema,
    expand: (node, context) => expandSemanticNode(node, 'circle', context),
  });
  return [terminal, stage, decision, junction] as const;
};

/** Notation 内置逻辑节点 Definition */
export const [TerminalDefinition, StageDefinition, DecisionDefinition, JunctionDefinition] =
  createLogicNodeDefinitions();
