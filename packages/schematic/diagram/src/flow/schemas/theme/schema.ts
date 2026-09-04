import type { RefinementCtx } from 'zod';

import { NodeSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import {
  EntitySchema,
  GraphEntityAppearanceTokenOverridesSchema,
  GraphRelationAppearanceTokenOverridesSchema,
  GroupCaptionTextSchema,
  GroupSchema,
  RelationSchema,
} from '@retikz/graph';
import { enum as zodEnum, literal, strictObject } from 'zod';

import { FlowDirection, FlowRoutingKind } from '../../shared';

const requireOverrides = (label: string) => ({
  message: `${label} must contain at least one override.`,
});

const FlowStraightRoutingSchema = strictObject({
  kind: literal(FlowRoutingKind.Straight).describe('Straight two-endpoint route intent.'),
});

const FlowOrthogonalRoutingSchema = strictObject({
  kind: literal(FlowRoutingKind.Orthogonal).describe('Axis-aligned route intent.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Optional corner radius; omission delegates to the selected layout Definition.',
  ),
});

/** Flow relation 的 provider-neutral 路由意图 */
export const FlowRoutingSchema = FlowStraightRoutingSchema.or(FlowOrthogonalRoutingSchema).describe(
  'Provider-neutral Flow relation routing intent.',
);

/** Flow layout scope 的稀疏布局意图 */
export const FlowLayoutIntentSchema = strictObject({
  direction: zodEnum(FlowDirection).optional().describe('Primary direction for this Flow layout scope.'),
  nodeGap: NonNegativeNumberSchema.optional().describe('Minimum gap between peers in the same rank.'),
  rankGap: NonNegativeNumberSchema.optional().describe('Minimum gap between adjacent ranks.'),
  routing: FlowRoutingSchema.optional().describe('Default relation routing intent for this scope.'),
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow layout intent'))
  .describe('Non-empty provider-neutral layout overrides for one Flow scope.');

/** Flow Entity 可操作的绘制字段 */
export const FlowEntityStyleSchema = strictObject({
  ...GraphEntityAppearanceTokenOverridesSchema.shape,
  align: EntitySchema.shape.align,
  lineHeight: EntitySchema.shape.lineHeight,
  maxTextWidth: EntitySchema.shape.maxTextWidth,
  font: EntitySchema.shape.font,
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow Entity style'))
  .describe('Non-empty Graph-compatible appearance and text overrides for one Flow Entity.');

/** Flow Entity 可操作的布局字段 */
export const FlowEntityLayoutSchema = strictObject({
  minimumSize: EntitySchema.shape.minimumSize,
  margin: EntitySchema.shape.margin,
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow Entity layout'))
  .describe('Non-empty size and collision-margin overrides for one Flow Entity.');

/** Flow Group 文本可操作字段 */
export const FlowTextStyleSchema = strictObject({
  align: GroupCaptionTextSchema.shape.align,
  lineHeight: GroupCaptionTextSchema.shape.lineHeight,
  maxTextWidth: GroupCaptionTextSchema.shape.maxTextWidth,
  textColor: GroupCaptionTextSchema.shape.textColor,
  font: GroupCaptionTextSchema.shape.font,
  opacity: GroupCaptionTextSchema.shape.opacity,
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow text style'))
  .describe('Non-empty Core-compatible text appearance overrides.');

/** Flow Group 可操作的绘制字段 */
export const FlowGroupStyleSchema = strictObject({
  padding: GroupSchema.shape.padding,
  background: GroupSchema.shape.background,
  border: GroupSchema.shape.border,
  cornerRadius: GroupSchema.shape.cornerRadius,
  overflow: GroupSchema.shape.overflow,
  label: FlowTextStyleSchema.optional().describe('Optional Group caption title appearance overrides.'),
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow Group style'))
  .describe('Non-empty Graph Group Surface and caption appearance overrides.');

/** Flow Relation 可操作的绘制字段 */
export const FlowRelationStyleSchema = strictObject({
  ...GraphRelationAppearanceTokenOverridesSchema.shape,
  dashPattern: RelationSchema.shape.dashPattern,
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow Relation style'))
  .describe('Non-empty Graph-compatible path, marker and label appearance overrides.');

/** Flow Relation 可操作的布局字段 */
export const FlowRelationLayoutSchema = strictObject({
  routing: FlowRoutingSchema.optional().describe('Relation-local routing override.'),
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow Relation layout'))
  .describe('Non-empty provider-neutral Relation layout overrides.');

const FlowEntityThemeSliceSchema = strictObject({
  style: FlowEntityStyleSchema.optional(),
  layout: FlowEntityLayoutSchema.optional(),
}).refine(value => Object.keys(value).length > 0, requireOverrides('Flow Entity theme slice'));

const FlowGroupThemeSliceSchema = strictObject({
  style: FlowGroupStyleSchema.optional(),
}).refine(value => Object.keys(value).length > 0, requireOverrides('Flow Group theme slice'));

const FlowRelationThemeSliceSchema = strictObject({
  style: FlowRelationStyleSchema.optional(),
  layout: FlowRelationLayoutSchema.optional(),
}).refine(value => Object.keys(value).length > 0, requireOverrides('Flow Relation theme slice'));

/** Flow drawing core 的结构化全局配置 */
export const FlowThemeSchema = strictObject({
  layout: FlowLayoutIntentSchema.optional().describe('Root and nested Flow scope layout baseline.'),
  entity: FlowEntityThemeSliceSchema.optional().describe('Global Flow Entity overrides.'),
  group: FlowGroupThemeSliceSchema.optional().describe('Global Flow Group overrides.'),
  relation: FlowRelationThemeSliceSchema.optional().describe('Global Flow Relation overrides.'),
})
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow theme'))
  .describe('Non-empty structured global configuration for a Flow drawing core.');

const tokenShape = {
  'flow.layout.direction': zodEnum(FlowDirection).optional(),
  'flow.layout.nodeGap': NonNegativeNumberSchema.optional(),
  'flow.layout.rankGap': NonNegativeNumberSchema.optional(),
  'flow.routing.kind': zodEnum(FlowRoutingKind).optional(),
  'flow.routing.cornerRadius': NonNegativeNumberSchema.optional(),
  'flow.entity.color': NodeSchema.shape.color,
  'flow.entity.textColor': NodeSchema.shape.textColor,
  'flow.entity.fill': NodeSchema.shape.fill,
  'flow.entity.stroke': NodeSchema.shape.stroke,
  'flow.entity.fillOpacity': NodeSchema.shape.fillOpacity,
  'flow.entity.strokeWidth': NodeSchema.shape.strokeWidth,
  'flow.entity.strokeOpacity': NodeSchema.shape.strokeOpacity,
  'flow.entity.opacity': NodeSchema.shape.opacity,
  'flow.entity.shadow': NodeSchema.shape.shadow,
  'flow.entity.blendMode': NodeSchema.shape.blendMode,
  'flow.entity.dashed': NodeSchema.shape.dashed,
  'flow.entity.dotted': NodeSchema.shape.dotted,
  'flow.entity.dashPattern': NodeSchema.shape.dashPattern,
  'flow.entity.dashOffset': NodeSchema.shape.dashOffset,
  'flow.entity.align': NodeSchema.shape.align,
  'flow.entity.lineHeight': NodeSchema.shape.lineHeight,
  'flow.entity.maxTextWidth': NodeSchema.shape.maxTextWidth,
  'flow.entity.font': NodeSchema.shape.font,
  'flow.entity.minimumSize': NodeSchema.shape.minimumSize,
  'flow.entity.margin': NodeSchema.shape.margin,
  'flow.group.padding': GroupSchema.shape.padding,
  'flow.group.background': GroupSchema.shape.background,
  'flow.group.border': GroupSchema.shape.border,
  'flow.group.cornerRadius': GroupSchema.shape.cornerRadius,
  'flow.group.overflow': GroupSchema.shape.overflow,
  'flow.group.label.textColor': GroupCaptionTextSchema.shape.textColor,
  'flow.group.label.font': GroupCaptionTextSchema.shape.font,
  'flow.group.label.align': GroupCaptionTextSchema.shape.align,
  'flow.group.label.lineHeight': GroupCaptionTextSchema.shape.lineHeight,
  'flow.group.label.maxTextWidth': GroupCaptionTextSchema.shape.maxTextWidth,
  'flow.group.label.opacity': GroupCaptionTextSchema.shape.opacity,
  'flow.relation.color': RelationSchema.shape.color,
  'flow.relation.stroke': RelationSchema.shape.stroke,
  'flow.relation.strokeWidth': RelationSchema.shape.strokeWidth,
  'flow.relation.strokeOpacity': RelationSchema.shape.strokeOpacity,
  'flow.relation.opacity': RelationSchema.shape.opacity,
  'flow.relation.shadow': RelationSchema.shape.shadow,
  'flow.relation.blendMode': RelationSchema.shape.blendMode,
  'flow.relation.lineCap': RelationSchema.shape.lineCap,
  'flow.relation.lineJoin': RelationSchema.shape.lineJoin,
  'flow.relation.dashPattern': RelationSchema.shape.dashPattern,
  'flow.relation.dashOffset': RelationSchema.shape.dashOffset,
  'flow.relation.sourceMarker': GraphRelationAppearanceTokenOverridesSchema.shape.sourceMarker,
  'flow.relation.targetMarker': GraphRelationAppearanceTokenOverridesSchema.shape.targetMarker,
  'flow.relation.labelTextForeground': GraphRelationAppearanceTokenOverridesSchema.shape.labelTextForeground,
  'flow.relation.labelFont': GraphRelationAppearanceTokenOverridesSchema.shape.labelFont,
  'flow.relation.labelOpacity': GraphRelationAppearanceTokenOverridesSchema.shape.labelOpacity,
  'flow.relation.routing.kind': zodEnum(FlowRoutingKind).optional(),
  'flow.relation.routing.cornerRadius': NonNegativeNumberSchema.optional(),
};

/** Flow Theme token refinement 使用的稀疏键集合 */
type FlowThemeTokenShape = {
  [TKey in keyof typeof tokenShape]?: unknown;
};

const refineRoutingTokenPair = (
  tokens: FlowThemeTokenShape,
  context: RefinementCtx,
  kindKey: 'flow.routing.kind' | 'flow.relation.routing.kind',
  cornerRadiusKey: 'flow.routing.cornerRadius' | 'flow.relation.routing.cornerRadius',
): void => {
  if (tokens[kindKey] !== FlowRoutingKind.Straight || tokens[cornerRadiusKey] === undefined) return;
  context.addIssue({
    code: 'custom',
    path: [cornerRadiusKey],
    message: `${cornerRadiusKey} is only valid with orthogonal routing.`,
  });
};

/** Flow Theme 的扁平 token 覆盖 */
export const FlowThemeTokenOverridesSchema = strictObject(tokenShape)
  .superRefine((tokens, context) => {
    refineRoutingTokenPair(tokens, context, 'flow.routing.kind', 'flow.routing.cornerRadius');
    refineRoutingTokenPair(tokens, context, 'flow.relation.routing.kind', 'flow.relation.routing.cornerRadius');
  })
  .refine(value => Object.keys(value).length > 0, requireOverrides('Flow theme tokens'))
  .describe('Non-empty flat Flow token overrides with exact owner field value schemas.');
