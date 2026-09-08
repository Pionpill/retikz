import type { IRStep } from '@retikz/core';
import type { RefinementCtx, ZodType } from 'zod';

import {
  ArrowEndDetailSchema,
  GeometryLabelSchema,
  NodeTargetSchema,
  PathBaseSchema,
  PathStyleSchema,
  StepSchema,
} from '@retikz/core';
import { createOpenStringSchema } from '@retikz/foundation';
import { array, enum as zodEnum, literal, strictObject, union } from 'zod';

import { GRAPH_NAMESPACE, GraphType, RelationKind, RelationRole } from '../../shared';
import { GraphPredicateRefSchema } from '../predicate';
import { GraphStatusSchema } from '../status';
import { RelationDirection } from './constants';

const requireAtLeastOneField = (value: object, context: RefinementCtx): void => {
  if (Object.keys(value).length === 0) {
    context.addIssue({ code: 'custom', message: 'Relation structure overrides require at least one field.' });
  }
};

export const RelationDirectionSchema = zodEnum(RelationDirection).describe('Semantic Relation direction.');

export const RelationRoleSchema = createOpenStringSchema(RelationRole).describe(
  'Open Relation role key resolved by the configured registry.',
);

export const RelationKindSchema = createOpenStringSchema(RelationKind).describe(
  'Open stable subtype key within the selected Relation role.',
);

type GraphRelationRouteStep = IRStep extends infer TStep
  ? TStep extends Readonly<Record<string, unknown>>
    ? Omit<TStep, 'label'>
    : never
  : never;

export const GraphRelationRouteStepSchema: ZodType<GraphRelationRouteStep> = StepSchema.superRefine((step, context) => {
  if ('label' in step) {
    context.addIssue({
      code: 'custom',
      path: ['label'],
      message: 'Relation route steps cannot contain labels; use the Relation labels field.',
    });
  }
}).transform(step => step);

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

export const GraphRelationMarkerAppearanceSchema = ArrowEndDetailSchema.pick({
  color: true,
  fill: true,
  opacity: true,
  lineWidth: true,
}).describe('Sparse appearance fields for one Relation endpoint marker.');

export const GraphRelationLabelTextForegroundSchema = GeometryLabelSchema.shape.textColor.describe(
  'Relation root label text color.',
);

export const GraphRelationLabelFontSchema = GeometryLabelSchema.shape.font.describe('Relation root label font.');

export const GraphRelationLabelOpacitySchema =
  GeometryLabelSchema.shape.opacity.describe('Relation root label opacity.');

const RelationPathShape = PathBaseSchema.omit({
  type: true,
  kind: true,
  kindOptions: true,
  children: true,
  label: true,
  marks: true,
  style: true,
}).shape;

export const RelationSchema = strictObject({
  namespace: literal(GRAPH_NAMESPACE).describe('Graph semantic element namespace.'),
  type: literal(GraphType.Relation).describe('Relation Source record discriminator.'),
  ...RelationPathShape,
  style: PathStyleSchema.omit({ fill: true, fillOpacity: true, fillRule: true })
    .optional()
    .describe('Path visual overrides without Relation fill fields.'),
  source: NodeTargetSchema.describe('Core source target reference.'),
  target: NodeTargetSchema.describe('Core target target reference.'),
  role: RelationRoleSchema,
  kind: RelationKindSchema.optional().describe('Open stable subtype key within the selected Relation role.'),
  predicate: GraphPredicateRefSchema.optional().describe('Optional precise semantic predicate reference.'),
  status: GraphStatusSchema.optional().describe('Optional closed Graph semantic status.'),
  direction: RelationDirectionSchema.optional().describe('Explicit semantic direction overriding role defaults.'),
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

export const GraphRelationRoleTokenRecipeSchema = strictObject({
  sourceMarker: GraphRelationMarkerRecipeValueSchema.describe('Complete source marker recipe or explicit absence.'),
  targetMarker: GraphRelationMarkerRecipeValueSchema.describe('Complete target marker recipe or explicit absence.'),
  dashPattern: GraphRelationDashPatternRecipeSchema.describe('Complete path dash recipe; false means a solid path.'),
}).describe('Complete Relation structure owned by a role direction.');

export const GraphRelationStructureTokenOverridesSchema = strictObject({
  sourceMarker: GraphRelationMarkerRecipeValueSchema.optional().describe('Sparse source marker structure override.'),
  targetMarker: GraphRelationMarkerRecipeValueSchema.optional().describe('Sparse target marker structure override.'),
  dashPattern: GraphRelationDashPatternRecipeSchema.optional().describe('Sparse path dash structure override.'),
})
  .superRefine(requireAtLeastOneField)
  .describe('Non-empty sparse Relation structure overrides.');
