import type {
  CompositeExpandContext,
  CompositeExpandResult,
  ExpandCompositeDefinition,
  IRNode,
  ResolvedTheme,
} from '@retikz/core';

import { compositeOpaqueColor, defineComposite, NodeTextColor, ThemeMode } from '@retikz/core';

import type { Entity, IREntity } from './types';

import { GRAPH_NAMESPACE, GraphType } from '../shared';
import { EntityRole, EntityVariant } from './constants';
import { EntitySchema } from './schema';

type EntityDefaults = Readonly<{
  minimumSize?: NonNullable<IRNode['minimumSize']>;
  padding: NonNullable<IRNode['padding']>;
  shape: NonNullable<IRNode['shape']>;
}>;

const ENTITY_DEFAULTS: Readonly<Record<Entity['role'], EntityDefaults>> = {
  [EntityRole.Terminal]: {
    minimumSize: { width: 48, height: 24 },
    padding: { x: 12, y: 6 },
    shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
  },
  [EntityRole.Stage]: {
    padding: 8,
    shape: { type: 'rectangle', params: { cornerRadius: 8 } },
  },
  [EntityRole.Decision]: {
    padding: { x: 3, y: 2 },
    shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
  },
  [EntityRole.Junction]: {
    minimumSize: { width: 8, height: 8 },
    padding: 0,
    shape: 'circle',
  },
};

/** 返回 Entity 主要色；currentColor 和缺省值按当前模式解析为确定黑白色 */
const primaryColorOf = (node: Entity, theme: ResolvedTheme): string =>
  node.color === undefined || node.color === 'currentColor'
    ? theme.mode === ThemeMode.Light
      ? '#000000'
      : '#ffffff'
    : node.color;

/** 在下沉边界把 Entity variant 的 currentColor 绑定到最终主要色 */
const materializeThemePaint = (paint: string, primaryColor: string): string =>
  paint === 'currentColor' ? primaryColor : paint;

/** 计算使用当前模式底色的 Entity 浅色预合成结果 */
const tintedColor = (primaryColor: string, theme: ResolvedTheme, weight: number): string =>
  compositeOpaqueColor(primaryColor, theme.mode === ThemeMode.Light ? '#ffffff' : '#000000', weight);

/** 解析 Entity variant 的字段级默认外观 */
const resolveEntityVariant = (
  variant: Entity['variant'],
  primaryColor: string,
  theme: ResolvedTheme,
): Readonly<{ textColor: string; stroke: string; fill: string }> => {
  const effectiveVariant = variant ?? EntityVariant.Default;
  switch (effectiveVariant) {
    case EntityVariant.Default:
      return { textColor: primaryColor, stroke: primaryColor, fill: 'none' };
    case EntityVariant.Primary:
      return { textColor: NodeTextColor.Contrast, stroke: primaryColor, fill: primaryColor };
    case EntityVariant.Secondary:
      return { textColor: primaryColor, stroke: 'none', fill: tintedColor(primaryColor, theme, 0.1) };
    case EntityVariant.Outline:
      return { textColor: primaryColor, stroke: tintedColor(primaryColor, theme, 0.6), fill: 'none' };
    case EntityVariant.Vibrant:
      return { textColor: primaryColor, stroke: primaryColor, fill: tintedColor(primaryColor, theme, 0.15) };
  }
};

/** 把 Entity 展开为固定角色默认值或显式 shape 的同标识 Core Node */
const expandEntity = (node: IREntity, context: CompositeExpandContext): CompositeExpandResult => {
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
  const defaults = ENTITY_DEFAULTS[role];
  const primaryColor = primaryColorOf(node, context.theme);
  const baseline = resolveEntityVariant(node.variant, primaryColor, context.theme);
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

/** Entity 的 Core Composite Definition */
export const EntityDefinition: ExpandCompositeDefinition<IREntity, typeof GRAPH_NAMESPACE, typeof GraphType.Entity> =
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Entity,
    schema: EntitySchema,
    expand: expandEntity,
  });
