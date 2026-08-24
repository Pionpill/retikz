import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution, IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';
import type { InputScope } from '@retikz/vanilla';

/** Chart 嵌入场景时可选的根 Scope 输入 */
export type InputChartPanel = Pick<InputScope, 'clip' | 'placement' | 'theme' | 'transforms' | 'zIndex'> & {
  /** Chart 根的横向平移 */
  x?: number;
  /** Chart 根的纵向平移 */
  y?: number;
};

/** Chart InputEmbed adapter 消费的完整 Vanilla 输入
 *
 * `source` 只保存 JSON-safe Chart Source；Definition、解析函数和其他运行时
 * 当前 chartType 的 provider contribution 与命名主题只由具体 factory 组装
 */
export type ChartInput<TSource extends IRChartSource = IRChartSource> = Readonly<{
  /** 已由精确 normalizer 组装的 Chart Source IR */
  source: TSource;
  /** Chart / Plot lowering 使用的外部数据集 */
  datasets: ExternalDatasets;
  /** 当前具体 chartType 的 Core provider contribution */
  chartProviderContribution: CoreProviderContribution;
  /** Plot lowering 的运行时选项 */
  lowerOptions?: LowerPlotsOptions;
  /** 可选的 Chart 宿主 Scope */
  panel?: InputChartPanel;
}>;

/** Chart Vanilla 的统一创建结果 */
export type ChartAuthoringResult<TSource extends IRChartSource = IRChartSource> = Readonly<{
  /** 保持用户视角的精简 Chart Source IR */
  source: TSource;
  /** 可直接交给 Chart InputEmbed adapter 的输入 */
  input: ChartInput<TSource>;
  /** Chart、Plot 与其底层依赖的 provider contribution */
  contribution: CoreProviderContribution;
  /** SSR 或 standalone compile 使用的 Core 根 Theme */
  theme?: IRScene['theme'];
  /** SSR 或 standalone compile 使用的 Core Theme definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;

/** Vanilla 创建入口的宿主 Core Theme 选项 */
export type ChartHostThemeInput = Readonly<{
  /** 创建时声明的 Core 根 Theme */
  theme?: IRScene['theme'];
  /** 创建时声明的 Core Theme definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;
