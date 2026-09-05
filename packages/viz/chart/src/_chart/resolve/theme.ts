import type { ResolvedTheme, ThemeModeValue } from '@retikz/core';
import type { IRPlotDefaults } from '@retikz/plot';

import { ThemeMode } from '@retikz/core';
import { mergePlotDefaults } from '@retikz/plot';

import type { ChartThemeDefinition, ChartThemeResolution } from '../contract/theme';
import type { IRChartDefaults, IRChartSource } from '../schemas';

/** 构造 Core mode 对应的 Chart Neutral defaults */
const neutralChartDefaultsOf = (mode: ThemeModeValue): IRChartDefaults => {
  const isDark = mode === ThemeMode.Dark;
  return {
    background: { fill: isDark ? '#09090B' : '#FFFFFF' },
    layout: { padding: 16, gap: 6 },
    presentation: {
      title: {
        style: {
          textColor: isDark ? '#FAFAFA' : '#09090B',
          font: { family: 'system-ui, Segoe UI, sans-serif', size: 18, weight: 600 },
        },
        layout: { align: 'start', lineHeight: 22 },
      },
      subtitle: {
        style: {
          textColor: isDark ? '#D4D4D8' : '#3F3F46',
          font: { family: 'system-ui, Segoe UI, sans-serif', size: 13, weight: 400 },
        },
        layout: { align: 'start', lineHeight: 18 },
      },
      note: {
        style: {
          textColor: isDark ? '#A1A1AA' : '#71717A',
          font: { family: 'system-ui, Segoe UI, sans-serif', size: 11, weight: 400 },
        },
        layout: { align: 'start', lineHeight: 15 },
      },
      source: {
        style: {
          textColor: isDark ? '#A1A1AA' : '#71717A',
          font: { family: 'system-ui, Segoe UI, sans-serif', size: 11, weight: 500 },
        },
        layout: { align: 'start', lineHeight: 15 },
      },
    },
  };
};

/** 合并 Chart shell 默认片段，font/background 保持正式 Source 覆盖粒度 */
export const mergeChartDefaults = (
  base: IRChartDefaults | undefined,
  override: IRChartDefaults | undefined,
): IRChartDefaults => {
  const presentation: NonNullable<IRChartDefaults['presentation']> = {};
  for (const slot of ['title', 'subtitle', 'note', 'source'] as const) {
    const current = base?.presentation?.[slot];
    const next = override?.presentation?.[slot];
    if (current === undefined && next === undefined) continue;
    presentation[slot] = {
      ...(current?.style === undefined && next?.style === undefined
        ? {}
        : { style: { ...current?.style, ...next?.style } }),
      ...(current?.layout === undefined && next?.layout === undefined
        ? {}
        : { layout: { ...current?.layout, ...next?.layout } }),
    };
  }
  return {
    ...(base?.background === undefined && override?.background === undefined
      ? {}
      : { background: override?.background ?? base?.background }),
    ...(base?.layout === undefined && override?.layout === undefined
      ? {}
      : { layout: { ...base?.layout, ...override?.layout } }),
    ...(Object.keys(presentation).length === 0 ? {} : { presentation }),
  };
};

/** 解析 Chart shell defaults 与原样转交 Plot 的 defaults */
export const resolveChartTheme = (
  source: IRChartSource,
  context: Readonly<{
    theme: ResolvedTheme;
    themeDefinitions: ReadonlyArray<ChartThemeDefinition>;
  }>,
): ChartThemeResolution => {
  let defaults = neutralChartDefaultsOf(context.theme.mode);
  let plotDefaults: IRPlotDefaults | undefined;
  for (const definition of context.themeDefinitions) {
    defaults = mergeChartDefaults(defaults, definition.defaults);
    plotDefaults = mergePlotDefaults(plotDefaults, definition.plotDefaults);
  }
  defaults = mergeChartDefaults(defaults, source.chartDefaults);
  return {
    defaults,
    ...(plotDefaults === undefined || Object.keys(plotDefaults).length === 0 ? {} : { plotDefaults }),
    mode: context.theme.mode,
  };
};
