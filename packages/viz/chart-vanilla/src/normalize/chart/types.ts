import type { ChartAuthoringInput, ChartThemeStyleDefinition, IRChart } from '@retikz/chart';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlot, LowerPlotsOptions } from '@retikz/plot';
import type { PlotSource } from '@retikz/plot-vanilla';
import type { InputScope } from '@retikz/vanilla';

/** Chart 嵌入场景时可选的根 Scope 输入 */
export type InputChartPanel = Pick<InputScope, 'clip' | 'placement' | 'theme' | 'transforms' | 'zIndex'> & {
  /** Chart 根的横向平移 */
  x?: number;
  /** Chart 根的纵向平移 */
  y?: number;
};

/** Chart InputEmbed adapter 消费的无框架 authoring 输入 */
export type InputChart = Omit<ChartAuthoringInput, 'plot'> &
  Readonly<{
    /** Plot Vanilla 的显式 Input 或 Source IR */
    plot: PlotSource;
    /** Plot lowering 消费的运行时数据集 */
    datasets: ExternalDatasets;
    /** Plot lowering 选项 */
    lowerOptions?: LowerPlotsOptions;
    /** Chart-owned Theme style definitions */
    chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
    /** 可选的 Chart 宿主 Scope */
    panel?: InputChartPanel;
  }>;

/** Chart Vanilla authoring normalizer 的结果 */
export type NormalizedChart = Readonly<{
  /** 已归一化的 Chart Source IR */
  chart: IRChart;
  /** 已归一化的 Plot Source IR */
  spec: IRPlot;
  /** 保留给后续 InputEmbed adapter 的原始 authoring 输入 */
  input: InputChart;
}>;
