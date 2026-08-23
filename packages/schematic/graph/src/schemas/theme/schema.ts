import { JsonObjectSchema, NodeSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { GraphType } from '../../shared';
import { EntityRoleSchema } from '../entity';
import {
  GraphRelationAppearanceTokenOverridesSchema,
  RelationDirectionSchema,
  RelationKindSchema,
  RelationRoleSchema,
} from '../relation';

const requireAtLeastOneField =
  (label: string) =>
  (value: object, context: z.RefinementCtx): void => {
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

export const GraphEntityAppearanceTokenOverridesSchema = z
  .strictObject({
    ...GraphEntityNodeAppearanceShape,
  })
  .superRefine(requireAtLeastOneField('Entity appearance'))
  .describe('Non-empty appearance-only Entity overrides.');

const selectorKeySchema = (keySchema: z.ZodType<string>, label: string) =>
  z.union([
    keySchema,
    z
      .array(keySchema)
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

const GraphPredicateThemeSelectorSchema = z
  .strictObject({
    name: selectorKeySchema(NonBlankStringSchema, 'predicate').describe(
      'One or more registered predicate definition names.',
    ),
    params: JsonObjectSchema.optional().describe('Recursive subset matched against Canonical predicate params.'),
  })
  .describe('Predicate name and optional Canonical params subset selector.');

export const GraphEntityThemeSelectorSchema = z
  .strictObject({
    role: selectorKeySchema(EntityRoleSchema, 'Entity role')
      .optional()
      .describe('One or more registered Entity role keys.'),
    kind: selectorKeySchema(NonBlankStringSchema, 'Entity kind')
      .optional()
      .describe('One or more registered Entity kind keys.'),
    predicate: GraphPredicateThemeSelectorSchema.optional().describe('Optional Entity predicate selector.'),
  })
  .superRefine(requireAtLeastOneField('Entity Theme selector'))
  .describe('Entity selector over complete Canonical semantics.');

export const GraphRelationThemeSelectorSchema = z
  .strictObject({
    role: selectorKeySchema(RelationRoleSchema, 'Relation role')
      .optional()
      .describe('One or more registered Relation role keys.'),
    kind: selectorKeySchema(RelationKindSchema, 'Relation kind')
      .optional()
      .describe('One or more registered Relation kind keys.'),
    predicate: GraphPredicateThemeSelectorSchema.optional().describe('Optional Relation predicate selector.'),
    direction: z
      .union([RelationDirectionSchema, z.array(RelationDirectionSchema).min(1)])
      .optional()
      .describe('One or more effective Relation directions.'),
  })
  .superRefine(requireAtLeastOneField('Relation Theme selector'))
  .describe('Relation selector over complete Canonical semantics and effective direction.');

export const GraphEntityThemeRuleSchema = z
  .strictObject({
    type: z.literal(GraphType.Entity).describe('Entity Theme rule discriminator.'),
    selector: GraphEntityThemeSelectorSchema.optional().describe('Optional Entity selector; omission matches all.'),
    appearance: GraphEntityAppearanceTokenOverridesSchema.describe('Entity appearance overrides.'),
  })
  .describe('One ordered Entity appearance rule.');

export const GraphRelationThemeRuleSchema = z
  .strictObject({
    type: z.literal(GraphType.Relation).describe('Relation Theme rule discriminator.'),
    selector: GraphRelationThemeSelectorSchema.optional().describe('Optional Relation selector; omission matches all.'),
    appearance: GraphRelationAppearanceTokenOverridesSchema.describe('Relation appearance overrides.'),
  })
  .describe('One ordered Relation appearance rule.');

export const GraphThemeRuleSchema = z.discriminatedUnion('type', [
  GraphEntityThemeRuleSchema,
  GraphRelationThemeRuleSchema,
]);

export const GraphThemeLayerSchema = z
  .strictObject({
    rules: z.array(GraphThemeRuleSchema).min(1).describe('Non-empty ordered Graph appearance rules.'),
  })
  .describe('Graph-local appearance layer with no structural recipes or default materialization.');
