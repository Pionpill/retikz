import { ThemeMode, ThemeTokenSource } from '@retikz/core';
import { z } from 'zod';

import { PlotThemeToken } from './constants';
import { PlotThemeSchema } from './schema';
import { PlotColorPaletteSchema, PlotResolvedThemeTokensSchema } from './style';

const PLOT_THEME_AUTHORED_OVERRIDE_PATHS = ['$spec/colors', '$spec/plotTheme'] as const;

/** 单个 Plot token 的最终 cascade 来源 */
export const PlotThemeTokenSourceRecordSchema = z
  .strictObject({
    token: z.enum(PlotThemeToken).describe('Canonical Plot theme token'),
    kind: z.enum(ThemeTokenSource).describe('Winning Plot token source relation to the Plot owner'),
    path: z.string().min(1).describe('Stable source path for this resolved Plot token'),
  })
  .describe('Winning cascade source for one resolved Plot style token');

/** Plot shorthand 或 native theme 的 authored 入口 */
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
    authoredOverrides: z
      .array(PlotThemeAuthoredOverrideRecordSchema)
      .describe('Authored colors and native Plot theme inputs in cascade order'),
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
    const authoredPaths = resolution.authoredOverrides.map(source => source.path);
    const expected = PLOT_THEME_AUTHORED_OVERRIDE_PATHS.filter(path => authoredPaths.includes(path));
    if (authoredPaths.length !== expected.length || authoredPaths.some((path, index) => path !== expected[index])) {
      context.addIssue({
        code: 'custom',
        path: ['authoredOverrides'],
        message: 'Plot authored overrides must be unique and ordered as colors then plotTheme',
      });
    }
  })
  .describe('Stable JSON-safe Plot theme resolution and inspection result');
