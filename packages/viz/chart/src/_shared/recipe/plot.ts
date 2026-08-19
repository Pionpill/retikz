import type { IRPlot } from '@retikz/plot';

import { PLOT_NAMESPACE, PlotComposite } from '@retikz/plot';

import type { ChartRecipeSource } from './recipe';

/** Chart recipe 生成并允许 authoring 扩展的 Plot 核心成员 */
export type ChartRecipePlotParts = Pick<IRPlot, 'scales' | 'marks' | 'guides'> &
  Partial<Pick<IRPlot, 'coordinate' | 'composition'>>;

/** 将 Chart recipe 核心内容与用户提供的 Plot 字段组成完整 Plot */
export const createChartRecipePlot = (spec: ChartRecipeSource, parts: ChartRecipePlotParts): IRPlot => {
  const authoredScales = spec.plot.scales ?? [];
  const scales = [
    ...parts.scales.map(scale => authoredScales.find(authored => authored.name === scale.name) ?? scale),
    ...authoredScales.filter(authored => !parts.scales.some(scale => scale.name === authored.name)),
  ];
  const spatial =
    spec.plot.coordinate !== undefined
      ? { coordinate: spec.plot.coordinate }
      : spec.plot.composition !== undefined
        ? { composition: spec.plot.composition }
        : parts.coordinate !== undefined
          ? { coordinate: parts.coordinate }
          : parts.composition !== undefined
            ? { composition: parts.composition }
            : {};

  return {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(spec.id === undefined ? {} : { id: `${spec.id}/plot` }),
    data: spec.plot.data,
    ...(spec.plot.transform === undefined ? {} : { transform: spec.plot.transform }),
    scales,
    ...(spec.plot.plotThemeTokens === undefined ? {} : { plotThemeTokens: spec.plot.plotThemeTokens }),
    ...(spec.plot.plotThemeTokenRules === undefined ? {} : { plotThemeTokenRules: spec.plot.plotThemeTokenRules }),
    ...(spec.plot.plotTheme === undefined ? {} : { plotTheme: spec.plot.plotTheme }),
    ...(spec.plot.width === undefined ? {} : { width: spec.plot.width }),
    ...(spec.plot.height === undefined ? {} : { height: spec.plot.height }),
    ...spatial,
    marks: [...parts.marks, ...(spec.plot.marks ?? [])],
    guides: spec.plot.guides ?? parts.guides,
    ...(spec.plot.meta === undefined ? {} : { meta: spec.plot.meta }),
  };
};
