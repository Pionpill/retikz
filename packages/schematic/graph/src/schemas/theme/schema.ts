import { JsonObjectSchema, NonBlankStringSchema } from '@retikz/foundation';
import { SurfaceSchema } from '@retikz/standard/presentation';
import type { RefinementCtx, ZodType } from 'zod';
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

/** 校验根据完整规范实体语义匹配的主题选择器 */
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

/** 校验根据完整规范关系语义及有效方向匹配的主题选择器 */
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

/** 校验实体输入可继承的稀疏视觉默认值 */
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

/** 校验实体规则可覆盖的稀疏样式，排除字体字段 */
export const GraphEntityRuleStyleSchema = GraphEntityDefaultsStyleSchema.omit({ font: true }).describe(
  'Sparse Entity Source style rule fields without font.',
);

/** 校验实体的稀疏布局默认值，排除角色拥有的内边距 */
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

/** 校验关系的稀疏路径样式默认值，排除结构虚线与填充字段 */
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

/** 校验关系输入可继承的稀疏默认值 */
export const GraphRelationDefaultsSchema = strictObject({
  style: GraphRelationDefaultsStyleSchema.optional(),
  ...GraphRelationDefaultsRootSchema.shape,
}).describe('Sparse Relation Source defaults.');

/** 校验关系规则仅针对虚线配方的结构覆盖 */
export const GraphRelationRuleStructureSchema = strictObject({
  dashPattern: RelationSchema.shape.style
    .unwrap()
    .shape.dashPattern.unwrap()
    .describe('Complete Relation dash pattern.'),
}).describe('Relation rule structural override limited to the dash recipe.');

/** 校验分组或块的 Surface 背景、边框与圆角默认值 */
export const GraphSurfaceDefaultsSchema = strictObject({
  background: SurfaceSchema.shape.background,
  border: SurfaceSchema.shape.border,
  cornerRadius: SurfaceSchema.shape.cornerRadius.unwrap().optional(),
}).describe('Sparse Group or Block Surface root defaults.');

/** 校验实体样式与布局的稀疏默认值 */
export const GraphEntityDefaultsSchema = strictObject({
  style: GraphEntityDefaultsStyleSchema.optional(),
  layout: GraphEntityDefaultsLayoutSchema.optional(),
}).describe('Sparse Entity Source defaults.');

/** 校验按实体、关系、分组与块组织的图默认值 */
export const GraphDefaultsSchema = strictObject({
  entity: GraphEntityDefaultsSchema.optional(),
  relation: GraphRelationDefaultsSchema.optional(),
  group: GraphSurfaceDefaultsSchema.optional(),
  block: GraphSurfaceDefaultsSchema.optional(),
}).describe('Sparse Graph defaults grouped by semantic target.');

/** 校验单条按顺序匹配并覆盖实体输入的规则 */
export const GraphEntityRuleSchema = strictObject({
  type: literal(GraphType.Entity).describe('Entity Graph rule discriminator.'),
  selector: GraphEntityThemeSelectorSchema.optional().describe('Optional Entity selector; omission matches all.'),
  style: GraphEntityRuleStyleSchema.optional().describe('Entity Source style rule fields.'),
}).describe('One ordered Entity Source rule.');

/** 校验单条按顺序匹配并覆盖关系结构的规则 */
export const GraphRelationRuleSchema = strictObject({
  type: literal(GraphType.Relation).describe('Relation Graph rule discriminator.'),
  selector: GraphRelationThemeSelectorSchema.optional().describe('Optional Relation selector; omission matches all.'),
  structure: GraphRelationRuleStructureSchema.optional().describe('Optional Relation structural dash recipe.'),
  ...GraphRelationDefaultsSchema.shape,
}).describe('One ordered Relation Source rule.');

/** 校验面向实体或关系的有序图规则 */
export const GraphRuleSchema = discriminatedUnion('type', [GraphEntityRuleSchema, GraphRelationRuleSchema]).describe(
  'Ordered Graph Source rules for Entity and Relation targets.',
);
