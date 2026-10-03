import type { ChartThemeDefinition } from '@retikz/chart';
import type { InputChartPanel } from '@retikz/chart-vanilla';
import type { DataInputBindings, DataTransformExecutor, ExternalRow } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';
import type { FC } from 'react';

/** Chart React 的宿主 Scope 输入
 *
 * `panel` 只包装 Chart 在父 Scope 中的变换、裁剪与主题；它与 Source
 * 自身的 identity、Theme 和 layout 保持独立
 */
export type ChartPanelProps = Readonly<{
  panel?: InputChartPanel;
}>;

/** Chart React 命名主题 Definition 输入 */
export type ChartThemeDefinitionsProps = Readonly<{
  /** 当前具体 chartType provider 可见的命名 Chart Theme Definition */
  themeDefinitions?: ReadonlyArray<ChartThemeDefinition>;
  /** Plot lowering runtime options；不写入 Chart Source */
  lowerOptions?: LowerPlotsOptions;
}>;

/** Chart runtime 数据入口二选一；数据声明组件可提供缺省rows */
export type ChartDataRuntimeProps<TNative = never> = (
  | { rows?: Array<ExternalRow>; dataBindings?: never }
  | { dataBindings: DataInputBindings<TNative>; rows?: never }
) & {
  /** Data执行器与函数默认值 */
  dataTransformExecutor?: DataTransformExecutor<TNative>;
  /** 本次准备取消信号 */
  signal?: AbortSignal;
};

/** 可嵌入 Chart React component 的静态 Vanilla Input 契约 */
export type InputEmbeddableChartComponent<TProps, TInput, TAdapter> = (<TNative = never>(
  props: Omit<TProps, 'rows' | 'dataBindings' | 'dataTransformExecutor' | 'signal'> & ChartDataRuntimeProps<TNative>,
) => ReturnType<FC<TProps>>) & {
  displayName?: string;
  isTier2Embeddable: true;
  inputEmbedAdapter: TAdapter;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};
