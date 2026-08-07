import { ThemeMode, ThemeStyle } from '@retikz/core';
import { z } from 'zod';

import { PlotThemeToken, PlotThemeTokenSource } from './constants';
import { PlotThemeSchema } from './schema';
import { PlotColorPaletteSchema, PlotResolvedThemeTokensSchema } from './style';

/** 单个 Plot token 的最终 cascade 来源 */
export const PlotThemeTokenSourceRecordSchema = z
  .strictObject({
    token: z.enum(PlotThemeToken).describe('Canonical Plot theme token'),
    kind: z.enum(PlotThemeTokenSource).describe('Winning Plot token source layer'),
    path: z.string().min(1).describe('Stable source path for this resolved Plot token'),
  })
  .describe('Winning cascade source for one resolved Plot style token');

/** Plot shorthand 或 native theme 的 authored 入口 */
export const PlotThemeAuthoredOverrideRecordSchema = z
  .strictObject({
    kind: z
      .enum([PlotThemeTokenSource.Colors, PlotThemeTokenSource.PlotTheme])
      .describe('Authored Plot shorthand or native theme source'),
    path: z.string().min(1).describe('Stable authored Plot input path'),
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
    style: z.enum(ThemeStyle).describe('Effective Theme style selecting the Plot preset'),
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
    const authoredKinds = resolution.authoredOverrides.map(source => source.kind);
    const expected = [PlotThemeTokenSource.Colors, PlotThemeTokenSource.PlotTheme].filter(kind =>
      authoredKinds.includes(kind),
    );
    if (authoredKinds.length !== expected.length || authoredKinds.some((kind, index) => kind !== expected[index])) {
      context.addIssue({
        code: 'custom',
        path: ['authoredOverrides'],
        message: 'Plot authored overrides must be unique and ordered as colors then plotTheme',
      });
    }
  })
  .describe('Stable JSON-safe Plot theme resolution and inspection result');
