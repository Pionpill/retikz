import type { ResolvedTheme } from '@retikz/core';

import { ThemeTokenSource } from '@retikz/core';
import { assertPlainDataContainers } from '@retikz/foundation';
import { custom, strictObject } from 'zod';

import type { PlotThemeStyleDefinition } from '../../contract';
import type { IRPlot, IRPlotThemeResolution, IRPlotThemeTokenResolution } from '../../schemas';

import { RetikzPlotError } from '../../error';
import { getDefaultPlotThemePreset, resolvePlotThemeStyleRegistry } from '../../providers/theme';
import { getAxisTokenRules } from '../../providers/theme/preset';
import {
  PlotAxisThemeTokenFieldShape,
  PlotAxisThemeTokenRulesSchema,
  PlotThemeResolutionSchema,
  PlotThemeToken,
  PlotThemeTokenOverridesSchema,
} from '../../schemas';
import { applyPlotThemeToTokens, mergePlotTheme, plotThemeFromTokens } from './mapping';

const plotThemeTokenKeys = new Set<string>(Object.values(PlotThemeToken));
const plotAxisThemeTokenKeys = new Set<string>(Object.keys(PlotAxisThemeTokenFieldShape));
const plotThemeStyleOverrideKeys = new Set(['tokens', 'tokenRules']);

/** 判断 runtime provider 输出是否为可枚举的普通对象 */
const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const PlotThemeStyleOverridesSchema = custom<Record<string, unknown>>(isPlainRecord, {
  error: 'Plot theme style definition must return a plain object.',
}).pipe(
  strictObject({
    tokens: PlotThemeTokenOverridesSchema.optional(),
    tokenRules: PlotAxisThemeTokenRulesSchema.optional(),
  }),
);

const PlotThemeStylePlainDataSchema = custom<unknown>(
  value => {
    try {
      assertPlainDataContainers(value, 'Plot theme style definition output');
      return true;
    } catch {
      return false;
    }
  },
  { error: 'Plot theme style definition must return JSON-safe plain data.' },
);

/** 只把 runtime style definition 中已知且显式为 undefined 的字段规范化为省略 */
const omitKnownUndefinedProperties = (value: unknown, knownKeys: ReadonlySet<string>): unknown => {
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => item !== undefined || !knownKeys.has(key)));
};

/** 规范化 Plot runtime style 的已知 sparse 字段，同时保留未知字段交给严格 schema */
const normalizePlotThemeStyleOverrides = (overrides: unknown): unknown => {
  const normalized = omitKnownUndefinedProperties(overrides, plotThemeStyleOverrideKeys);
  if (!isPlainRecord(normalized)) return normalized;
  const output = { ...normalized };
  if (Object.hasOwn(output, 'tokens')) {
    output.tokens = omitKnownUndefinedProperties(output.tokens, plotThemeTokenKeys);
  }
  if (Array.isArray(output.tokenRules)) {
    output.tokenRules = output.tokenRules.map(rule => {
      if (!isPlainRecord(rule) || !Object.hasOwn(rule, 'tokens')) return rule;
      return {
        ...rule,
        tokens: omitKnownUndefinedProperties(rule.tokens, plotAxisThemeTokenKeys),
      };
    });
  }
  return output;
};

/** 按 Plot style、Plot token 与 native Plot theme 顺序解析主题 */
export const resolvePlotTheme = (
  effectiveTheme: ResolvedTheme,
  input: Pick<IRPlot, 'plotThemeTokens' | 'plotThemeTokenRules' | 'plotTheme'> = {},
  plotThemeStyles: ReadonlyArray<PlotThemeStyleDefinition> | undefined = undefined,
): IRPlotThemeResolution => {
  const { style, mode } = effectiveTheme;
  const styles = resolvePlotThemeStyleRegistry(plotThemeStyles);
  const definition = style === undefined ? undefined : styles.get(style);
  if (style !== undefined && definition === undefined)
    throw new RetikzPlotError(`Plot theme style '${style}' is not registered.`);
  const plotThemeTokens = input.plotThemeTokens ?? {};
  const localTokenRules = input.plotThemeTokenRules ?? [];
  const authoredTheme = input.plotTheme;
  const defaultTokens = getDefaultPlotThemePreset(mode, effectiveTheme.colors.categorical);
  const defaultTokenRules = getAxisTokenRules();
  const styleOverrides = (() => {
    if (definition === undefined) return {};
    try {
      const rawStyleOverrides = definition.resolve(effectiveTheme);
      PlotThemeStylePlainDataSchema.parse(rawStyleOverrides);
      const normalizedStyleOverrides = normalizePlotThemeStyleOverrides(rawStyleOverrides);
      return PlotThemeStyleOverridesSchema.parse(normalizedStyleOverrides);
    } catch (cause) {
      throw new RetikzPlotError(`Plot theme style '${style}' resolution failed.`, { cause });
    }
  })();
  const styleTokens = styleOverrides.tokens ?? {};
  const styleTokenRules = styleOverrides.tokenRules ?? [];
  const baseline: IRPlotThemeTokenResolution = {
    ...defaultTokens,
    ...structuredClone(styleTokens),
  };
  const tokensAfterLocal: IRPlotThemeTokenResolution = {
    ...baseline,
    ...structuredClone(plotThemeTokens),
  };
  const tokenTheme = plotThemeFromTokens(tokensAfterLocal);
  const theme = authoredTheme === undefined ? tokenTheme : mergePlotTheme(tokenTheme, authoredTheme);
  const nativeResult =
    authoredTheme === undefined
      ? { tokens: tokensAfterLocal, overrides: [] }
      : applyPlotThemeToTokens(tokensAfterLocal, theme, authoredTheme);
  const tokens = nativeResult.tokens;
  const nativeSources = new Map(nativeResult.overrides.map(source => [source.token, source.path]));
  const tokenSources = Object.values(PlotThemeToken).map(token => {
    const nativePath = nativeSources.get(token);
    if (nativePath !== undefined) {
      return { token, kind: ThemeTokenSource.Local, path: nativePath };
    }
    if (Object.hasOwn(plotThemeTokens, token)) {
      return { token, kind: ThemeTokenSource.Local, path: `$spec/plotThemeTokens/${token}` };
    }
    const styleOwnsToken = style !== undefined && Object.hasOwn(styleTokens, token);
    return {
      token,
      kind: ThemeTokenSource.Local,
      path: styleOwnsToken ? `$style/${style}/${mode}/${token}` : `$default/${mode}/${token}`,
    };
  });
  const palette = {
    categorical: [...tokens[PlotThemeToken.PlotPaletteCategorical]],
    series: [...tokens[PlotThemeToken.PlotPaletteSeries]],
    sector: [...tokens[PlotThemeToken.PlotPaletteSector]],
    sequential: tokens[PlotThemeToken.PlotPaletteSequential],
    diverging: tokens[PlotThemeToken.PlotPaletteDiverging],
    shape: structuredClone(tokens[PlotThemeToken.PlotPaletteShape]),
  };
  const authoredOverrides: IRPlotThemeResolution['authoredOverrides'] =
    authoredTheme === undefined ? [] : [{ kind: ThemeTokenSource.Local, path: '$spec/plotTheme' }];
  const tokenRules: IRPlotThemeResolution['tokenRules'] = [
    ...defaultTokenRules.map((rule, index) => ({
      rule,
      kind: ThemeTokenSource.Local,
      path: `$default/${mode}/tokenRules/${index}`,
    })),
    ...styleTokenRules.map((rule, index) => ({
      rule,
      kind: ThemeTokenSource.Local,
      path: `$style/${style}/${mode}/tokenRules/${index}`,
    })),
    ...localTokenRules.map((rule, index) => ({
      rule,
      kind: ThemeTokenSource.Local,
      path: `$spec/plotThemeTokenRules/${index}`,
    })),
  ];
  return PlotThemeResolutionSchema.parse({
    ...(style === undefined ? {} : { style }),
    mode,
    tokens,
    tokenSources,
    tokenRules,
    authoredOverrides,
    plotTheme: theme,
    palette,
  });
};
