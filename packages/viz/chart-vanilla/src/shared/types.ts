import type { BoundChart, ChartThemeStyleDefinition, IRBaseChart } from '@retikz/chart';
import type { CoreProviderContribution, IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { LowerPlotsOptions, PlotThemeStyleDefinition } from '@retikz/plot';
import type { InputScope } from '@retikz/vanilla';

/** Chart 嵌入场景时可选的根 Scope 输入 */
export type InputChartPanel = Pick<InputScope, 'clip' | 'placement' | 'theme' | 'transforms' | 'zIndex'> & {
  /** Chart 根的横向平移 */
  x?: number;
  /** Chart 根的纵向平移 */
  y?: number;
};

/** 只在适配器内部流转的已绑定 Chart 编写输入 */
export type BoundChartAuthoring = Readonly<{
  /** 已由精确数据结构解析并绑定的 Chart */
  bound: BoundChart;
  /** Plot 下沉使用的运行时数据集 */
  datasets: ExternalDatasets;
  /** Plot 下沉选项 */
  lowerOptions?: LowerPlotsOptions;
  /** Chart 自有的主题样式定义 */
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  /** Plot 自有的主题样式定义 */
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
  /** 可选的 Chart 宿主 Scope */
  panel?: InputChartPanel;
}>;

/** Chart Vanilla 的统一创建结果 */
export type ChartAuthoringResult = Readonly<{
  /** 严格且确定形态的 Chart IR */
  chart: IRBaseChart;
  /** 可直接交给内部 Chart 适配器的已绑定输入 */
  input: BoundChartAuthoring;
  /** 仅以 `chart.base` 为根的完整依赖贡献 */
  contribution: CoreProviderContribution;
  /** 创建时声明的根 Core 主题 */
  theme?: IRScene['theme'];
  /** 创建时声明的根 Core 主题样式定义 */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;

/** Chart 自有的运行时主题定义 */
export type ChartThemeInput = {
  /** Chart 自有的运行时主题定义 */
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  /** 创建时解析 Chart 的根 Core 主题 */
  theme?: IRScene['theme'];
  /** 创建时解析 Chart 的根 Core 主题样式定义 */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
};
