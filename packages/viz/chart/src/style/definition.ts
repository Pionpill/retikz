import type { ThemeTokenContribution, ThemeTokenDefinition } from '@retikz/core';

import { defineThemeTokenContribution, defineThemeTokenNamespace } from '@retikz/core';

import type { IRChartThemeTokenOverrides } from './types';

import { ChartThemeTokenOverridesSchema } from './schema';

/** Chart owner 的冻结 theme token namespace singleton */
export const ChartThemeTokenDefinition: ThemeTokenDefinition<'chart', IRChartThemeTokenOverrides> =
  defineThemeTokenNamespace<'chart', IRChartThemeTokenOverrides>({
    namespace: 'chart',
    schema: ChartThemeTokenOverridesSchema,
  });

/** 创建脱离输入、经过 Chart owner schema 校验的 theme token contribution */
export const defineChartThemeTokens = (
  overrides: IRChartThemeTokenOverrides,
): ThemeTokenContribution<'chart', IRChartThemeTokenOverrides> =>
  defineThemeTokenContribution({
    namespace: 'chart',
    tokens: ChartThemeTokenDefinition.schema.parse(overrides),
  });
