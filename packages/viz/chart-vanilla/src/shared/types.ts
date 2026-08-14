import type { ChartThemeStyleDefinition, IRChart } from '@retikz/chart';
import type { CoreProviderContribution, IRScene, ThemeStyleDefinition } from '@retikz/core';

import type { InputChart } from '../normalize/chart';

/** Chart Vanilla creation 的统一结果 */
export type ChartAuthoringResult = Readonly<{
  /** strict canonical Chart IR */
  chart: IRChart;
  /** 可直接交给 Chart Vanilla InputEmbed adapter 的领域输入 */
  input: InputChart;
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
