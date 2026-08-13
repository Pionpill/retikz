import type { ChartThemeStyleDefinition, IRChart } from '@retikz/chart';
import type { CoreProviderContribution, IRScene, ThemeStyleDefinition } from '@retikz/core';

/** Chart Vanilla creation 的统一结果 */
export type ChartAuthoringResult = Readonly<{
  /** strict canonical Chart IR */
  chart: IRChart;
  /** 只以 chart.chart 为 root 的完整 dependency contribution */
  contribution: CoreProviderContribution;
  /** factory 时声明的根 Core Theme */
  theme?: IRScene['theme'];
  /** factory 时声明的根 Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;

/** Chart-owned runtime Theme definitions */
export type ChartThemeInput = {
  /** Chart-owned runtime Theme definitions */
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  /** factory 时解析 Chart 的根 Core Theme */
  theme?: IRScene['theme'];
  /** factory 时解析 Chart 的根 Core Theme style definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
};
