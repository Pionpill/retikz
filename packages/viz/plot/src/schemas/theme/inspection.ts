import { ThemeMode } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { array, enum as zodEnum, strictObject } from 'zod';

import { PlotColorPaletteSchema, PlotDefaultsSchema, PlotShapePaletteSchema } from './schema';
import { PlotAxisRuleSchema } from './token-rule';

/** Plot 默认来源在 resolver inspection 中的稳定分类 */
export const PlotThemeLayerKind = {
  Neutral: 'neutral',
  Style: 'style',
  Chart: 'chart',
  Source: 'source',
} as const;

/** 一个实际参与 Plot defaults cascade 的来源层 */
export const PlotDefaultsSourceRecordSchema = strictObject({
  kind: zodEnum(PlotThemeLayerKind).describe('Kind of Plot defaults source'),
  path: NonBlankStringSchema.describe('Stable path for this Plot defaults source'),
  defaults: PlotDefaultsSchema.optional().describe('Sparse defaults contributed by this source'),
}).describe('One Plot defaults source preserved in effective cascade order');

/** 一个实际参与 Axis 规则 cascade 的来源记录 */
export const PlotAxisRuleSourceRecordSchema = strictObject({
  kind: zodEnum(PlotThemeLayerKind).describe('Kind of Plot rule source'),
  sourcePath: NonBlankStringSchema.describe('Stable path of the Plot defaults source that owns this rule'),
  path: NonBlankStringSchema.describe('Stable path for this ordered Plot Axis rule'),
  rule: PlotAxisRuleSchema.describe('Axis rule preserved in effective cascade order'),
}).describe('One Axis rule and its actual Plot source');

/** scale、mark 与 legend 共享的完整 Plot palette */
export const PlotPaletteResolutionSchema = strictObject({
  categorical: PlotColorPaletteSchema.describe('Resolved categorical palette'),
  series: PlotColorPaletteSchema.describe('Resolved mark and series palette'),
  sequential: NonBlankStringSchema.describe('Resolved sequential scheme name'),
  diverging: NonBlankStringSchema.describe('Resolved diverging scheme name'),
  shape: PlotShapePaletteSchema.describe('Resolved categorical shape palette'),
}).describe('Complete Plot palette after the defaults cascade');

/** Plot-owned defaults resolution 与 inspection 契约 */
export const PlotThemeResolutionSchema = strictObject({
  style: NonBlankStringSchema.optional().describe('Optional Core Theme style selecting a Plot definition'),
  mode: zodEnum(ThemeMode).describe('Effective Core Theme mode selecting the Neutral Plot defaults'),
  defaults: PlotDefaultsSchema.describe('Resolved Plot defaults before dimension-specific Axis rules'),
  layers: array(PlotDefaultsSourceRecordSchema).min(1).describe('Plot defaults sources in their actual cascade order'),
  rules: array(PlotAxisRuleSourceRecordSchema).describe(
    'Axis rules in their actual cascade order with stable source paths',
  ),
  palette: PlotPaletteResolutionSchema.describe('Complete resolved Plot palette'),
})
  .superRefine((resolution, context) => {
    const neutral = resolution.layers[0];
    if (neutral.kind !== PlotThemeLayerKind.Neutral || neutral.path !== '$default/' + resolution.mode) {
      context.addIssue({
        code: 'custom',
        path: ['layers', 0],
        message: 'Plot defaults cascade must begin with the effective Neutral source',
      });
    }
    const sourcePaths = new Set(resolution.layers.map(layer => layer.path));
    resolution.rules.forEach((source, index) => {
      if (!sourcePaths.has(source.sourcePath) || !source.path.startsWith(source.sourcePath + '/plotRules/')) {
        context.addIssue({
          code: 'custom',
          path: ['rules', index],
          message: 'Plot Axis rule source must identify an effective defaults layer and ordered rule path',
        });
      }
    });
  })
  .describe('Stable JSON-safe Plot defaults resolution and inspection result');
