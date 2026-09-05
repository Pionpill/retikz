import type { RefinementCtx, ZodType } from 'zod';

import { JsonObjectSchema, NonBlankStringSchema } from '@retikz/foundation';
import { SurfaceInputSchema } from '@retikz/standard';
import { array, discriminatedUnion, literal, strictObject, union } from 'zod';

import { GraphType } from '../../shared';
import { EntityRoleSchema, EntitySchema } from '../entity';
import { RelationDirectionSchema, RelationKindSchema, RelationRoleSchema, RelationSchema } from '../relation';
import { GraphStatusSchema } from '../status';

const requireAtLeastOneField =
  (label: string) =>
  (value: object, context: RefinementCtx): void => {
    if (Object.keys(value).length === 0) {
      context.addIssue({ code: 'custom', message: `${label} requires at least one field.` });
    }
  };

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
  .superRefine(requireAtLeastOneField('Entity Graph selector'))
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
  .superRefine(requireAtLeastOneField('Relation Graph selector'))
  .describe('Relation selector over complete Canonical semantics and effective direction.');

export const GraphEntityDefaultsStyleSchema = EntitySchema.shape.style
  .unwrap()
  .pick({
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
    font: true,
  })
  .describe('Sparse Entity Source style defaults.');

export const GraphEntityRuleStyleSchema = GraphEntityDefaultsStyleSchema.omit({ font: true }).describe(
  'Sparse Entity Source style rule fields without font.',
);

export const GraphEntityDefaultsLayoutSchema = EntitySchema.shape.layout
  .unwrap()
  .pick({
    align: true,
    lineHeight: true,
    maxTextWidth: true,
    minimumSize: true,
    margin: true,
  })
  .describe('Sparse Entity Source layout defaults without role-owned padding.');

export const GraphRelationDefaultsStyleSchema = RelationSchema.shape.style
  .unwrap()
  .pick({
    color: true,
    stroke: true,
    strokeWidth: true,
    strokeOpacity: true,
    opacity: true,
    shadow: true,
    blendMode: true,
    lineCap: true,
    lineJoin: true,
    dashOffset: true,
  })
  .describe('Sparse Relation Source path style without structural dash pattern or fill fields.');

const GraphRelationDefaultsRootSchema = RelationSchema.pick({
  sourceMarker: true,
  targetMarker: true,
  labelTextForeground: true,
  labelFont: true,
  labelOpacity: true,
});

export const GraphRelationDefaultsSchema = strictObject({
  style: GraphRelationDefaultsStyleSchema.optional(),
  ...GraphRelationDefaultsRootSchema.shape,
}).describe('Sparse Relation Source defaults.');

export const GraphSurfaceDefaultsSchema = strictObject({
  background: SurfaceInputSchema.shape.background,
  border: SurfaceInputSchema.shape.border,
  cornerRadius: SurfaceInputSchema.shape.cornerRadius,
}).describe('Sparse Group or Block Surface root defaults.');

export const GraphEntityDefaultsSchema = strictObject({
  style: GraphEntityDefaultsStyleSchema.optional(),
  layout: GraphEntityDefaultsLayoutSchema.optional(),
}).describe('Sparse Entity Source defaults.');

export const GraphDefaultsSchema = strictObject({
  entity: GraphEntityDefaultsSchema.optional(),
  relation: GraphRelationDefaultsSchema.optional(),
  group: GraphSurfaceDefaultsSchema.optional(),
  block: GraphSurfaceDefaultsSchema.optional(),
}).describe('Sparse Graph defaults grouped by semantic target.');

export const GraphEntityRuleSchema = strictObject({
  type: literal(GraphType.Entity).describe('Entity Graph rule discriminator.'),
  selector: GraphEntityThemeSelectorSchema.optional().describe('Optional Entity selector; omission matches all.'),
  style: GraphEntityRuleStyleSchema.optional().describe('Entity Source style rule fields.'),
}).describe('One ordered Entity Source rule.');

export const GraphRelationRuleSchema = strictObject({
  type: literal(GraphType.Relation).describe('Relation Graph rule discriminator.'),
  selector: GraphRelationThemeSelectorSchema.optional().describe('Optional Relation selector; omission matches all.'),
  ...GraphRelationDefaultsSchema.shape,
}).describe('One ordered Relation Source rule.');

export const GraphRuleSchema = discriminatedUnion('type', [GraphEntityRuleSchema, GraphRelationRuleSchema]).describe(
  'Ordered Graph Source rules for Entity and Relation targets.',
);
