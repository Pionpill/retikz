import { NodeSchema } from '@retikz/core';
import { z } from 'zod';

import { EntityRoleSchema, EntityVariantSchema } from '../entity';
import { GraphThemeToken } from './constants';

const GraphThemeTokenShape = {
  [GraphThemeToken.EntityColor]: NodeSchema.shape.color,
  [GraphThemeToken.EntityTextForeground]: NodeSchema.shape.textColor,
  [GraphThemeToken.EntityFill]: NodeSchema.shape.fill,
  [GraphThemeToken.EntityStroke]: NodeSchema.shape.stroke,
  [GraphThemeToken.EntityStrokeWidth]: NodeSchema.shape.strokeWidth,
  [GraphThemeToken.EntityFillOpacity]: NodeSchema.shape.fillOpacity,
  [GraphThemeToken.EntityStrokeOpacity]: NodeSchema.shape.strokeOpacity,
  [GraphThemeToken.EntityOpacity]: NodeSchema.shape.opacity,
};

/** Graph Entity 的稀疏主题 token 覆盖 */
export const GraphThemeTokenOverridesSchema = z
  .strictObject(GraphThemeTokenShape)
  .describe('Sparse Graph-owned Entity theme token overrides.');

/** Graph Entity 的稀疏外观 token 覆盖，不含主色 */
export const GraphEntityAppearanceTokenOverridesSchema = GraphThemeTokenOverridesSchema.omit({
  [GraphThemeToken.EntityColor]: true,
}).describe('Sparse Entity appearance tokens resolved by one variant definition.');

/** Graph Entity 的完整主题 token 解析结果 */
export const GraphThemeTokenResolutionSchema = z
  .strictObject({
    [GraphThemeToken.EntityColor]: NodeSchema.shape.color.unwrap(),
    [GraphThemeToken.EntityTextForeground]: NodeSchema.shape.textColor.unwrap(),
    [GraphThemeToken.EntityFill]: NodeSchema.shape.fill.unwrap(),
    [GraphThemeToken.EntityStroke]: NodeSchema.shape.stroke.unwrap(),
    [GraphThemeToken.EntityStrokeWidth]: NodeSchema.shape.strokeWidth.unwrap(),
    [GraphThemeToken.EntityFillOpacity]: NodeSchema.shape.fillOpacity.unwrap(),
    [GraphThemeToken.EntityStrokeOpacity]: NodeSchema.shape.strokeOpacity.unwrap(),
    [GraphThemeToken.EntityOpacity]: NodeSchema.shape.opacity.unwrap(),
  })
  .describe('Complete Graph-owned Entity theme token resolution.');

const graphEntitySelectorKeySchema = (keySchema: typeof EntityRoleSchema) =>
  z.union([
    keySchema,
    z
      .array(keySchema)
      .min(1)
      .superRefine((keys, context) => {
        const seen = new Set<string>();
        keys.forEach((key, index) => {
          if (seen.has(key)) {
            context.addIssue({
              code: 'custom',
              path: [index],
              message: `Duplicate Graph Entity selector key '${key}'.`,
            });
          }
          seen.add(key);
        });
      }),
  ]);

const GraphEntityRoleSelectorKeySchema = graphEntitySelectorKeySchema(EntityRoleSchema);
const GraphEntityVariantSelectorKeySchema = graphEntitySelectorKeySchema(EntityVariantSchema);

/** 按 Entity role、variant 或两者筛选的严格 selector */
export const GraphEntityThemeTokenSelectorSchema = z
  .strictObject({
    role: GraphEntityRoleSelectorKeySchema.optional().describe('One or more registered Entity role keys.'),
    variant: GraphEntityVariantSelectorKeySchema.optional().describe('One or more registered Entity variant keys.'),
  })
  .superRefine((selector, context) => {
    if (selector.role === undefined && selector.variant === undefined) {
      context.addIssue({ code: 'custom', message: 'Graph Entity selector requires role or variant.' });
    }
  })
  .describe('Graph Entity selector using role, variant, or their intersection.');

/** Graph Entity 的一条有序主题 token 规则 */
export const GraphEntityThemeTokenRuleSchema = z
  .strictObject({
    select: GraphEntityThemeTokenSelectorSchema,
    tokens: GraphThemeTokenOverridesSchema,
  })
  .describe('One ordered sparse Graph Entity theme token rule.');

/** Graph Entity 的有序主题 token 规则 */
export const GraphEntityThemeTokenRulesSchema = z
  .array(GraphEntityThemeTokenRuleSchema)
  .describe('Ordered Graph Entity theme token rules; later matching rules win.');
