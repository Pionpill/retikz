import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution, IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalDatasets, DataInputBindings, DataTransformExecutor } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';
import type { InputScope } from '@retikz/vanilla';

/** Chart 嵌入场景时可选的根 Scope 输入 */
export type InputChartPanel = Pick<InputScope, 'clip' | 'placement' | 'theme' | 'transforms' | 'zIndex'> & {
  /** Chart 根的横向平移 */
  x?: number;
  /** Chart 根的纵向平移 */
  y?: number;
};

/** adapter 内部规范化后用于依赖组装的运行时输入；不作为公开编写结果 */
export type ChartRuntimeInput<TSource extends IRChartSource = IRChartSource, TNative = never> = Readonly<{
  /** 已由精确 normalizer 组装的 Chart Source IR */
  source: TSource;
  /** Chart / Plot lowering 使用的外部数据集 */
  datasets: ExternalDatasets;
  /** 规范结果或原生源运行时绑定 */
  dataBindings?: DataInputBindings<TNative>;
  /** Data 执行器 */
  dataTransformExecutor?: DataTransformExecutor<TNative>;
  /** 本次请求取消信号 */
  signal?: AbortSignal;
  /** 当前具体 chartType 的 Core provider contribution */
  chartProviderContribution: CoreProviderContribution;
  /** Plot lowering 的运行时选项 */
  lowerOptions?: LowerPlotsOptions;
  /** 可选的 Chart 宿主 Scope */
  panel?: InputChartPanel;
}>;

/** Vanilla 创建入口的宿主 Core Theme 选项 */
export type ChartHostThemeInput = Readonly<{
  /** 创建时声明的 Core 根 Theme */
  theme?: IRScene['theme'];
  /** 创建时声明的 Core Theme definitions */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;
