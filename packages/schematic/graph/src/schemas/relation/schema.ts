import type { IRStep } from '@retikz/core';
import {
  ArrowEndDetailSchema,
  GeometryLabelSchema,
  NodeTargetSchema,
  DrawableInstanceSchema,
  PathTransformSchema,
  GraphicColorSchema,
  GraphicElementOpacitySchema,
  GraphicStrokeSchema,
  GraphicEffectsSchema,
  PathStrokeSchema,
  PathStyleSchema,
  StepSchema,
} from '@retikz/core';
import { createOpenStringSchema, NonBlankStringSchema } from '@retikz/foundation';
import type { RefinementCtx, ZodType } from 'zod';
import { array, enum as zodEnum, literal, strictObject, string, union } from 'zod';

import { GRAPH_NAMESPACE, GraphType, BuiltinRelationRole } from '../../shared';
import { GraphPredicateRefSchema } from '../predicate';
import { GraphStatusSchema } from '../status';
import { RelationDirection } from './constants';

const requireAtLeastOneField = (value: object, context: RefinementCtx): void => {
  if (Object.keys(value).length === 0) {
    context.addIssue({ code: 'custom', message: 'Relation structure overrides require at least one field.' });
  }
};

/** 校验关系的语义方向 */
export const RelationDirectionSchema = zodEnum(RelationDirection).describe('Semantic Relation direction.');

/** 校验由关系角色注册表解析的开放角色键 */
export const RelationRoleSchema = createOpenStringSchema(BuiltinRelationRole).describe(
  'Open Relation role key resolved by the configured registry.',
);

/** 校验所选关系角色内部的开放子类型键 */
export const RelationKindSchema = NonBlankStringSchema.describe(
  'Open stable subtype key within the selected Relation role.',
);

type GraphRelationRouteStep = IRStep extends infer TStep
  ? TStep extends Readonly<Record<string, unknown>>
    ? Omit<TStep, 'label'>
    : never
  : never;

/** 校验关系路由使用的 Core 路径步骤，拒绝步骤标签，标签必须由关系统一声明 */
export const GraphRelationRouteStepSchema: ZodType<GraphRelationRouteStep> = StepSchema.superRefine((step, context) => {
  if ('label' in step) {
    context.addIssue({
      code: 'custom',
      path: ['label'],
      message: 'Relation route steps cannot contain labels; use the Relation labels field.',
    });
  }
}).transform(step => step);

/** 校验不含外观颜色的端点标记结构配方 */
export const GraphRelationMarkerRecipeSchema = ArrowEndDetailSchema.pick({
  shape: true,
  scale: true,
  length: true,
  width: true,
})
  .extend({
    shape: ArrowEndDetailSchema.shape.shape.unwrap().describe('Registered Core Arrow provider name.'),
  })
  .describe('Structural marker recipe without appearance tokens.');

/** 校验单个关系端点标记的稀疏外观覆盖 */
export const GraphRelationMarkerAppearanceSchema = ArrowEndDetailSchema.pick({
  color: true,
  fill: true,
  opacity: true,
  lineWidth: true,
}).describe('Sparse appearance fields for one Relation endpoint marker.');

/** 校验关系根级标签文本颜色 */
export const GraphRelationLabelTextForegroundSchema = GeometryLabelSchema.shape.textColor.describe(
  'Relation root label text color.',
);

/** 校验关系根级标签字体 */
export const GraphRelationLabelFontSchema = GeometryLabelSchema.shape.font.describe('Relation root label font.');

/** 校验关系根级标签不透明度 */
export const GraphRelationLabelOpacitySchema =
  GeometryLabelSchema.shape.opacity.describe('Relation root label opacity.');

/** 校验语义端点、角色与不冲突的 Core Path 字段组成的图关系 */
export const RelationSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.Relation).describe('Relation Source record discriminator.'),
  ...DrawableInstanceSchema.shape,
  ...PathTransformSchema.shape,
  style: strictObject({
    ...GraphicColorSchema.shape,
    ...GraphicElementOpacitySchema.shape,
    ...GraphicStrokeSchema.shape,
    ...GraphicEffectsSchema.shape,
    ...PathStrokeSchema.shape,
  })
    .optional()
    .describe('Path visual overrides without Relation fill fields.'),
  source: NodeTargetSchema.describe('Core source target reference.'),
  target: NodeTargetSchema.describe('Core target target reference.'),
  role: RelationRoleSchema,
  kind: RelationKindSchema.optional().describe('Open stable subtype key within the selected Relation role.'),
  predicate: GraphPredicateRefSchema.optional().describe('Optional precise semantic predicate reference.'),
  status: GraphStatusSchema.optional().describe('Optional closed Graph semantic status.'),
  direction: RelationDirectionSchema.optional().describe('Explicit semantic direction overriding role defaults.'),
  group: string().optional().describe('Optional Graph-root relation color grouping identifier.'),
  labels: array(GeometryLabelSchema)
    .optional()
    .describe('Optional complete Core Geometry Labels attached to the Relation path.'),
  route: array(GraphRelationRouteStepSchema)
    .min(2)
    .optional()
    .describe('Optional complete Core Path step sequence in the Graph root coordinate space.'),
  sourceMarker: GraphRelationMarkerAppearanceSchema.optional().describe('Source marker appearance fields.'),
  targetMarker: GraphRelationMarkerAppearanceSchema.optional().describe('Target marker appearance fields.'),
  labelTextForeground: GraphRelationLabelTextForegroundSchema,
  labelFont: GraphRelationLabelFontSchema,
  labelOpacity: GraphRelationLabelOpacitySchema,
}).describe('JSON-safe Graph Relation combining semantic endpoints with non-conflicting Core Path fields.');

const GraphRelationMarkerRecipeValueSchema = union([literal(false), GraphRelationMarkerRecipeSchema]);

const GraphRelationDashPatternRecipeSchema = union([literal(false), PathStyleSchema.shape.dashPattern.unwrap()]);

/** 校验关系角色在某方向下拥有的完整标记与虚线结构 */
export const GraphRelationRoleTokenRecipeSchema = strictObject({
  sourceMarker: GraphRelationMarkerRecipeValueSchema.describe('Complete source marker recipe or explicit absence.'),
  targetMarker: GraphRelationMarkerRecipeValueSchema.describe('Complete target marker recipe or explicit absence.'),
  dashPattern: GraphRelationDashPatternRecipeSchema.describe('Complete path dash recipe; false means a solid path.'),
}).describe('Complete Relation structure owned by a role direction.');

/** 校验至少包含一项的关系结构稀疏覆盖 */
export const GraphRelationStructureTokenOverridesSchema = strictObject({
  sourceMarker: GraphRelationMarkerRecipeValueSchema.optional().describe('Sparse source marker structure override.'),
  targetMarker: GraphRelationMarkerRecipeValueSchema.optional().describe('Sparse target marker structure override.'),
  dashPattern: GraphRelationDashPatternRecipeSchema.optional().describe('Sparse path dash structure override.'),
})
  .superRefine(requireAtLeastOneField)
  .describe('Non-empty sparse Relation structure overrides.');
