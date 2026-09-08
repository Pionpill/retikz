import { NonBlankStringSchema } from '@retikz/foundation';
import { array, strictObject, union } from 'zod';

import { PlotAxisDefaultsSchema } from './schema';

const PlotAxisRuleDimensionListSchema = array(NonBlankStringSchema)
  .min(1)
  .superRefine((dimensions, context) => {
    const firstIndexByDimension = new Map<string, number>();
    dimensions.forEach((dimension, index) => {
      const previousIndex = firstIndexByDimension.get(dimension);
      if (previousIndex === undefined) {
        firstIndexByDimension.set(dimension, index);
        return;
      }
      context.addIssue({
        code: 'custom',
        path: [index],
        message: "Plot Axis rule selector dimension '" + dimension + "' duplicates index " + previousIndex,
        input: dimensions,
      });
    });
  })
  .describe('Non-empty unique Plot Axis dimensions selected by one Source rule');

/** Plot Source Axis rule 的 dimension selector */
export const PlotAxisRuleSelectorSchema = strictObject({
  dimension: union([NonBlankStringSchema, PlotAxisRuleDimensionListSchema]).describe(
    'One or more open Plot Axis dimensions selected by this rule',
  ),
}).describe('Dimension selector for one Plot Source Axis rule');

const hasDefinedVisualField = (value: unknown): boolean => {
  if (value === undefined) return false;
  if (value === null || typeof value !== 'object') return true;
  if (Array.isArray(value)) return value.length > 0;
  return Object.values(value).some(field => hasDefinedVisualField(field));
};

/** Plot Source 中按 Axis dimension 应用的有序视觉规则 */
export const PlotAxisRuleSchema = strictObject({
  select: PlotAxisRuleSelectorSchema.describe('Axis dimensions matched by this rule'),
  axis: PlotAxisDefaultsSchema.describe('Non-empty sparse Axis visual defaults applied to matched guides'),
})
  .superRefine((rule, context) => {
    if (!hasDefinedVisualField(rule.axis)) {
      context.addIssue({
        code: 'custom',
        path: ['axis'],
        message: 'Plot Axis rule requires at least one visual Axis default',
        input: rule.axis,
      });
    }
  })
  .describe('Ordered Plot Source rule scoped to existing Axis guides');

/** Plot Source Axis rule 列表 */
export const PlotAxisRulesSchema = array(PlotAxisRuleSchema).describe('Ordered Plot Source Axis rules');
