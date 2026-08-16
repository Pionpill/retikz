import type { ResolvedTheme } from '@retikz/core';
import type { IRPlot, PlotThemeStyleDefinition } from '@retikz/plot';

import type { IRBaseChart } from '../schemas';
import type { ChartThemeStyleDefinition } from '../style';

/** Chart 解析器产出的唯一 Base 内部形态 */
export type CanonicalChart = IRBaseChart;

/** Chart 解析当前调用所需的窄上下文 */
export type ChartResolveContext = Readonly<{
  theme: ResolvedTheme;
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
}>;

/** Chart 解析后的 Base Chart 与完整 Plot */
export type ChartResolution = Readonly<{
  chart: CanonicalChart;
  plotSpec: IRPlot;
}>;
