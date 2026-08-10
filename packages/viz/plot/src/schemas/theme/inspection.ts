import { ThemeMode, ThemeTokenSource } from '@retikz/core';
import { z } from 'zod';

import { PlotThemeToken } from './constants';
import { PlotThemeSchema } from './schema';
import { PlotColorPaletteSchema, PlotResolvedThemeTokensSchema } from './style';
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
    path: z.string().min(1).describe('Stable source path for this resolved Plot token'),
  })
  .describe('Winning cascade source for one resolved Plot style token');

/** 单条 Axis theme token rule 的稳定来源记录 */
export const PlotThemeTokenRuleSourceRecordSchema = z
  .strictObject({
    rule: PlotAxisThemeTokenRuleSchema.describe('Axis theme token rule preserved in cascade order'),
    kind: z.literal(ThemeTokenSource.Local).describe('Rule authored by the Plot owner'),
    path: z.string().min(1).describe('Stable source path for this Axis theme token rule'),
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
export const ResolvedPlotPaletteSchema = z
  .strictObject({
    categorical: PlotColorPaletteSchema.describe('Resolved categorical palette'),
    series: PlotColorPaletteSchema.describe('Resolved mark and series palette'),
    sector: PlotColorPaletteSchema.describe('Resolved sector palette'),
    sequential: z.string().min(1).describe('Resolved sequential scheme name'),
    diverging: z.string().min(1).describe('Resolved diverging scheme name'),
  })
  .describe('Complete Plot palette after the domain theme cascade');

/** Plot-owned theme resolution 与 inspection 契约 */
export const PlotThemeResolutionSchema = z
  .strictObject({
    style: z.string().min(1).describe('Effective Theme style selecting the Plot style definition'),
    mode: z.enum(ThemeMode).describe('Effective Theme mode selecting Plot paints'),
    tokens: PlotResolvedThemeTokensSchema.describe('Complete resolved Plot theme token map'),
    tokenSources: z.array(PlotThemeTokenSourceRecordSchema).describe('Canonical one-source-per-token records'),
    tokenRules: z
      .array(PlotThemeTokenRuleSourceRecordSchema)
      .describe('Axis theme token rules preserved in effective cascade order'),
    authoredOverrides: z
      .array(PlotThemeAuthoredOverrideRecordSchema)
      .describe('Authored native Plot theme inputs in cascade order'),
    plotTheme: PlotThemeSchema.describe('Complete resolved native Plot theme'),
    palette: ResolvedPlotPaletteSchema.describe('Complete resolved Plot palette'),
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
      const local =
        source.kind === ThemeTokenSource.Local &&
        (source.path === `$style/${resolution.style}/${resolution.mode}/${source.token}` ||
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
    resolution.tokenRules.forEach((source, index) => {
      const stylePath = `$style/${resolution.style}/${resolution.mode}/tokenRules/`;
      const localPath = '$spec/plotThemeTokenRules/';
      const validPath =
        source.path === `${stylePath}${index}` ||
        (source.path.startsWith(localPath) && /^\$spec\/plotThemeTokenRules\/\d+$/.test(source.path));
      if (!validPath) {
        context.addIssue({
          code: 'custom',
          path: ['tokenRules', index, 'path'],
          message: 'Plot token rule source path must identify a style or PlotSpec rule entry',
        });
      }
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
