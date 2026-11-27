import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution, IRScene, ThemeDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { PreparedPlotData } from '@retikz/plot';
import type { PlotsLoweringOptions } from '@retikz/plot';
import type { InputScope } from '@retikz/vanilla';

/** Chart 嵌入场景时可选的根 Scope 输入 */
export type InputChartPanel = Pick<InputScope, 'clip' | 'position' | 'theme' | 'transforms' | 'zIndex'>;

/**
 * adapter 内部规范化后用于依赖组装的运行时输入；不作为公开编写结果
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export type InputChartRuntime<TSource extends IRChartSource = IRChartSource> = Readonly<{
  /** 已由精确 normalizer 组装的 Chart Source IR */
  source: TSource;
  /** Chart / Plot lowering 使用的外部数据集 */
  datasets: ExternalDatasets;
  /** 已完成的 Plot 数据 */
  preparedData?: PreparedPlotData;
  /** 当前具体 chartType 的 Core provider contribution */
  chartProviderContribution: CoreProviderContribution;
  /** Plot lowering 的运行时选项 */
  lowerOptions?: PlotsLoweringOptions;
  /** 可选的 Chart 宿主 Scope */
  panel?: InputChartPanel;
}>;

/** Vanilla 创建入口的宿主 Core Theme 选项 */
export type InputChartHostTheme = Readonly<{
  /** 创建时声明的 Core 根 Theme */
  theme?: IRScene['theme'];
  /** 创建时声明的 Core Theme definitions */
  themeDefinitions?: ReadonlyArray<ThemeDefinition>;
}>;
