import { NonBlankStringSchema } from '@retikz/foundation';
import { array, strictObject, union } from 'zod';

import { PlotAxisThemeTokenOverridesSchema } from './style';

const PlotAxisThemeDimensionListSchema = array(NonBlankStringSchema)
  .min(1)
  .superRefine((dimensions, context) => {
    const firstIndex = new Map<string, number>();
    dimensions.forEach((dimension, index) => {
      const previous = firstIndex.get(dimension);
      if (previous === undefined) {
        firstIndex.set(dimension, index);
        return;
      }
      context.addIssue({
        code: 'custom',
        path: [index],
        message: `Axis theme selector dimension '${dimension}' duplicates index ${previous}`,
        input: dimensions,
      });
    });
  })
  .describe('Non-empty unique Plot Axis dimensions selected by one theme rule');

/** Axis theme rule 的 dimension selector */
export const PlotAxisThemeTokenSelectorSchema = strictObject({
  dimension: union([NonBlankStringSchema, PlotAxisThemeDimensionListSchema]).describe(
    'One or more open Plot Axis dimensions selected by this rule',
  ),
}).describe('Dimension selector for one Plot Axis theme token rule');

/** 单条 Axis theme token 作用域规则 */
export const PlotAxisThemeTokenRuleSchema = strictObject({
  select: PlotAxisThemeTokenSelectorSchema.describe('Axis dimensions matched by this rule'),
  tokens: PlotAxisThemeTokenOverridesSchema.describe('Sparse Axis token overrides applied to matched guides'),
}).describe('Scoped Plot Axis theme token rule');

/** 有序 Axis theme token 作用域规则列表 */
export const PlotAxisThemeTokenRulesSchema = array(PlotAxisThemeTokenRuleSchema).describe(
  'Ordered Plot Axis theme token rules',
);
