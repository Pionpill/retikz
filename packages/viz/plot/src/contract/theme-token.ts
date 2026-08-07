import type { ThemeTokenContribution, ThemeTokenDefinition } from '@retikz/core';

import { defineThemeTokenContribution, defineThemeTokenNamespace } from '@retikz/core';

import type { IRPlotThemeTokenOverrides } from '../schemas';

import { PlotThemeTokenOverridesSchema } from '../schemas';

/** Plot owner 的 canonical theme token namespace definition */
export const PlotThemeTokenDefinition: ThemeTokenDefinition<'plot', IRPlotThemeTokenOverrides> =
  defineThemeTokenNamespace<'plot', IRPlotThemeTokenOverrides>({
    namespace: 'plot',
    schema: PlotThemeTokenOverridesSchema,
  });

/** 创建脱离输入、经过 Plot owner schema 校验的 theme token contribution */
export const definePlotThemeTokens = (
  overrides: IRPlotThemeTokenOverrides,
): ThemeTokenContribution<'plot', IRPlotThemeTokenOverrides> =>
  defineThemeTokenContribution({
    namespace: 'plot',
    tokens: PlotThemeTokenDefinition.schema.parse(overrides),
  });
