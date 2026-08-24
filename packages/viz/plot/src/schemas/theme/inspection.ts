import { ThemeMode, ThemeTokenSource } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { PlotThemeToken } from './constants';
import { PlotThemeSchema } from './schema';
import { PlotColorPaletteSchema, PlotShapePaletteSchema, PlotThemeTokenResolutionSchema } from './style';
import { PlotAxisThemeTokenRuleSchema } from './token-rule';

const PLOT_THEME_AUTHORED_OVERRIDE_PATHS = ['$spec/plotTheme'] as const;
const PLOT_INHERITED_COLOR_TOKENS = new Set<string>([
  PlotThemeToken.PlotPaletteCategorical,
  PlotThemeToken.PlotPaletteSeries,
  PlotThemeToken.PlotPaletteSector,
]);

/** 单个 Plot token 的最终 cascade 来源 */
export const PlotThemeTokenSourceRecordSchema = z
  .strictObject({
    token: z.enum(PlotThemeToken).describe('Canonical Plot theme token'),
    kind: z.enum(ThemeTokenSource).describe('Winning Plot token source relation to the Plot owner'),
    path: NonBlankStringSchema.describe('Stable source path for this resolved Plot token'),
  })
  .describe('Winning cascade source for one resolved Plot style token');

/** 单条 Axis theme token rule 的稳定来源记录 */
export const PlotThemeTokenRuleSourceRecordSchema = z
  .strictObject({
    rule: PlotAxisThemeTokenRuleSchema.describe('Axis theme token rule preserved in cascade order'),
    kind: z.literal(ThemeTokenSource.Local).describe('Rule authored by the Plot owner'),
    path: NonBlankStringSchema.describe('Stable source path for this Axis theme token rule'),
  })
  .describe('Ordered source record for one scoped Plot Axis theme token rule');

/** Plot native theme 的 authored 入口 */
export const PlotThemeAuthoredOverrideRecordSchema = z
  .strictObject({
    kind: z.literal(ThemeTokenSource.Local).describe('Plot-authored override local to the Plot owner'),
    path: z.enum(PLOT_THEME_AUTHORED_OVERRIDE_PATHS).describe('Stable authored Plot input path'),
  })
  .describe('Authored Plot override entry applied after Plot token overrides');

/** scale、mark 与 legend 共享的完整 Plot palette */
export const PlotPaletteResolutionSchema = z
  .strictObject({
    categorical: PlotColorPaletteSchema.describe('Resolved categorical palette'),
    series: PlotColorPaletteSchema.describe('Resolved mark and series palette'),
    sector: PlotColorPaletteSchema.describe('Resolved sector palette'),
    sequential: NonBlankStringSchema.describe('Resolved sequential scheme name'),
    diverging: NonBlankStringSchema.describe('Resolved diverging scheme name'),
    shape: PlotShapePaletteSchema.describe('Resolved categorical shape palette'),
  })
  .describe('Complete Plot palette after the domain theme cascade');

/** Plot-owned theme resolution 与 inspection 契约 */
export const PlotThemeResolutionSchema = z
  .strictObject({
    style: NonBlankStringSchema.optional().describe('Optional Theme style selecting a host-injected Plot definition'),
    mode: z.enum(ThemeMode).describe('Effective Theme mode selecting Plot paints'),
    tokens: PlotThemeTokenResolutionSchema.describe('Complete resolved Plot theme token map'),
    tokenSources: z.array(PlotThemeTokenSourceRecordSchema).describe('Canonical one-source-per-token records'),
    tokenRules: z
      .array(PlotThemeTokenRuleSourceRecordSchema)
      .describe('Axis theme token rules preserved in effective cascade order'),
    authoredOverrides: z
      .array(PlotThemeAuthoredOverrideRecordSchema)
      .describe('Authored native Plot theme inputs in cascade order'),
    plotTheme: PlotThemeSchema.describe('Complete resolved native Plot theme'),
    palette: PlotPaletteResolutionSchema.describe('Complete resolved Plot palette'),
  })
  .superRefine((resolution, context) => {
    const canonical = Object.values(PlotThemeToken);
    if (
      resolution.tokenSources.length !== canonical.length ||
      resolution.tokenSources.some((source, index) => source.token !== canonical[index])
    ) {
      context.addIssue({
        code: 'custom',
        path: ['tokenSources'],
        message: 'Plot token sources must contain every canonical token exactly once and in order',
      });
    }
    resolution.tokenSources.forEach((source, index) => {
      const inherited =
        source.kind === ThemeTokenSource.Inherit &&
        PLOT_INHERITED_COLOR_TOKENS.has(source.token) &&
        source.path === '$theme/colors/categorical';
      const baselinePaths = [
        `$default/${resolution.mode}/${source.token}`,
        ...(resolution.style === undefined ? [] : [`$style/${resolution.style}/${resolution.mode}/${source.token}`]),
      ];
      const local =
        source.kind === ThemeTokenSource.Local &&
        (baselinePaths.includes(source.path) ||
          source.path === `$spec/plotThemeTokens/${source.token}` ||
          source.path.startsWith('$spec/plotTheme/'));
      if (!inherited && !local) {
        context.addIssue({
          code: 'custom',
          path: ['tokenSources', index, 'path'],
          message: 'Plot token source relation and path must identify a canonical owner input',
        });
      }
    });
    const rulePathLayers = [
      `$default/${resolution.mode}/tokenRules/`,
      ...(resolution.style === undefined ? [] : [`$style/${resolution.style}/${resolution.mode}/tokenRules/`]),
      '$spec/plotThemeTokenRules/',
    ];
    const ruleCounts = rulePathLayers.map(() => 0);
    let currentRuleLayer = 0;
    if (resolution.tokenRules[0]?.path !== `${rulePathLayers[0]}0`) {
      context.addIssue({
        code: 'custom',
        path: ['tokenRules'],
        message: 'Plot token rules must start with the default rule layer',
      });
    }
    resolution.tokenRules.forEach((source, index) => {
      const ruleLayer = rulePathLayers.findIndex(
        (prefix, layer) => layer >= currentRuleLayer && source.path === `${prefix}${ruleCounts[layer]}`,
      );
      if (ruleLayer === -1) {
        context.addIssue({
          code: 'custom',
          path: ['tokenRules', index, 'path'],
          message: 'Plot token rule source path must identify an ordered default, style, or IRPlot rule entry',
        });
        return;
      }
      currentRuleLayer = ruleLayer;
      ruleCounts[ruleLayer] += 1;
    });
    const authoredPaths = resolution.authoredOverrides.map(source => source.path);
    if (authoredPaths.length > 1) {
      context.addIssue({
        code: 'custom',
        path: ['authoredOverrides'],
        message: 'Plot authored overrides may contain at most one native plotTheme entry',
      });
    }
  })
  .describe('Stable JSON-safe Plot theme resolution and inspection result');
