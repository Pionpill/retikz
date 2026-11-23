import type { ChartThemeDefinition } from '@retikz/chart';
import type { InputChartPanel } from '@retikz/chart-vanilla';
import type { ExternalRow } from '@retikz/data';
import type { PreparedPlotData } from '@retikz/plot';
import type { PlotsLoweringOptions } from '@retikz/plot';
import type { FC } from 'react';

/** Chart React 的宿主 Scope 输入
 *
 * `panel` 只包装 Chart 在父 Scope 中的变换、裁剪与主题；它与 Source
 * 自身的 identity、Theme 和 layout 保持独立
 */
export type ChartPanelProps = Readonly<{
  /** 嵌入图表外部的可选面板配置 */
  panel?: InputChartPanel;
}>;

/** Chart React 命名主题 Definition 输入 */
export type ChartThemeDefinitionsProps = Readonly<{
  /** 当前具体 chartType provider 可见的命名 Chart Theme Definition */
  chartThemeDefinitions?: ReadonlyArray<ChartThemeDefinition>;
  /** Plot lowering runtime options；不写入 Chart Source */
  lowerOptions?: PlotsLoweringOptions;
}>;

/**
 * Chart runtime 数据入口二选一；数据声明组件可提供缺省rows
 */
export type ChartDataRuntimeProps =
  | {
      /** 直接提供的行数据，与 preparedData 互斥 */
      rows?: Array<ExternalRow>;
      preparedData?: never;
    }
  | {
      /** 当前图表已完成的数据计算，与 rows 互斥 */
      preparedData: PreparedPlotData;
      rows?: never;
    };

/**
 * 可嵌入 Chart React component 的静态 Vanilla Input 契约
 * @template TProps 具体图表 React 组件或声明组件接受的属性类型
 * @template TInput 交给 Vanilla factory 与嵌入 adapter 的领域输入类型
 * @template TAdapter 嵌入适配器类型，绑定同步下沉能力
 */
export type InputEmbeddableChartComponent<TProps, TInput, TAdapter> = FC<TProps> & {
  /** React 调试工具中显示的组件名称 */
  displayName?: string;
  /** 标识该组件可作为 Tier 2 嵌入内容收集 */
  isTier2Embeddable: true;
  /** 消费组件生成输入的 Vanilla 嵌入 adapter */
  inputEmbedAdapter: TAdapter;
  /** 把 React 作者属性转换为领域输入 */
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};
