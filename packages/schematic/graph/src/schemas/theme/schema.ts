import type { RefinementCtx, ZodType } from 'zod';

import { JsonObjectSchema, NodeSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, discriminatedUnion, literal, strictObject, union } from 'zod';

import { GraphType } from '../../shared';
import { EntityRoleSchema } from '../entity';
import {
  GraphRelationAppearanceTokenOverridesSchema,
  RelationDirectionSchema,
  RelationKindSchema,
  RelationRoleSchema,
} from '../relation';
import { GraphStatusSchema } from '../status';

const requireAtLeastOneField =
  (label: string) =>
  (value: object, context: RefinementCtx): void => {
    if (Object.keys(value).length === 0) {
      context.addIssue({ code: 'custom', message: `${label} requires at least one field.` });
    }
  };

const GraphEntityNodeAppearanceShape = NodeSchema.pick({
  color: true,
  textColor: true,
  fill: true,
  stroke: true,
  fillOpacity: true,
  strokeWidth: true,
  strokeOpacity: true,
  opacity: true,
  shadow: true,
  blendMode: true,
  dashed: true,
  dotted: true,
  dashPattern: true,
  dashOffset: true,
}).shape;

export const GraphEntityAppearanceTokenOverridesSchema = strictObject({
  ...GraphEntityNodeAppearanceShape,
})
  .superRefine(requireAtLeastOneField('Entity appearance'))
  .describe('Non-empty appearance-only Entity overrides.');

const selectorKeySchema = (keySchema: ZodType<string>, label: string) =>
  union([
    keySchema,
    array(keySchema)
      .min(1)
      .superRefine((keys, context) => {
        const seen = new Set<string>();
        keys.forEach((key, index) => {
          if (seen.has(key)) {
            context.addIssue({ code: 'custom', path: [index], message: `Duplicate ${label} selector key '${key}'.` });
          }
          seen.add(key);
        });
      }),
  ]);

const GraphPredicateThemeSelectorSchema = strictObject({
  name: selectorKeySchema(NonBlankStringSchema, 'predicate').describe(
    'One or more registered predicate definition names.',
  ),
  params: JsonObjectSchema.optional().describe('Recursive subset matched against Canonical predicate params.'),
}).describe('Predicate name and optional Canonical params subset selector.');

export const GraphEntityThemeSelectorSchema = strictObject({
  role: selectorKeySchema(EntityRoleSchema, 'Entity role')
    .optional()
    .describe('One or more registered Entity role keys.'),
  kind: selectorKeySchema(NonBlankStringSchema, 'Entity kind')
    .optional()
    .describe('One or more registered Entity kind keys.'),
  predicate: GraphPredicateThemeSelectorSchema.optional().describe('Optional Entity predicate selector.'),
  status: selectorKeySchema(GraphStatusSchema, 'Entity status')
    .optional()
    .describe('One or more closed Entity semantic statuses.'),
})
  .superRefine(requireAtLeastOneField('Entity Theme selector'))
  .describe('Entity selector over complete Canonical semantics.');

export const GraphRelationThemeSelectorSchema = strictObject({
  role: selectorKeySchema(RelationRoleSchema, 'Relation role')
    .optional()
    .describe('One or more registered Relation role keys.'),
  kind: selectorKeySchema(RelationKindSchema, 'Relation kind')
    .optional()
    .describe('One or more registered Relation kind keys.'),
  predicate: GraphPredicateThemeSelectorSchema.optional().describe('Optional Relation predicate selector.'),
  status: selectorKeySchema(GraphStatusSchema, 'Relation status')
    .optional()
    .describe('One or more closed Relation semantic statuses.'),
  direction: union([RelationDirectionSchema, array(RelationDirectionSchema).min(1)])
    .optional()
    .describe('One or more effective Relation directions.'),
})
  .superRefine(requireAtLeastOneField('Relation Theme selector'))
  .describe('Relation selector over complete Canonical semantics and effective direction.');

export const GraphEntityThemeRuleSchema = strictObject({
  type: literal(GraphType.Entity).describe('Entity Theme rule discriminator.'),
  selector: GraphEntityThemeSelectorSchema.optional().describe('Optional Entity selector; omission matches all.'),
  appearance: GraphEntityAppearanceTokenOverridesSchema.describe('Entity appearance overrides.'),
}).describe('One ordered Entity appearance rule.');

export const GraphRelationThemeRuleSchema = strictObject({
  type: literal(GraphType.Relation).describe('Relation Theme rule discriminator.'),
  selector: GraphRelationThemeSelectorSchema.optional().describe('Optional Relation selector; omission matches all.'),
  appearance: GraphRelationAppearanceTokenOverridesSchema.describe('Relation appearance overrides.'),
}).describe('One ordered Relation appearance rule.');

export const GraphThemeRuleSchema = discriminatedUnion('type', [
  GraphEntityThemeRuleSchema,
  GraphRelationThemeRuleSchema,
]);

export const GraphThemeLayerSchema = strictObject({
  rules: array(GraphThemeRuleSchema).min(1).describe('Non-empty ordered Graph appearance rules.'),
}).describe('Graph-local appearance layer with no structural recipes or default materialization.');
