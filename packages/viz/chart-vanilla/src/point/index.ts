import type { BoundChart, ChartThemeStyleDefinition, IRBaseChart } from '@retikz/chart';
import type { IRBubbleChart, IRConnectedScatterChart, IRScatterChart } from '@retikz/chart/point';
import type { IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { PlotThemeStyleDefinition } from '@retikz/plot';

import { BubbleChartRecipe, ConnectedScatterChartRecipe, ScatterChartRecipe } from '@retikz/chart/point';

import type { InputChartPresentation } from '../normalize/chart';
import type { InputBubbleChart, InputConnectedScatterChart, InputScatterChart } from '../normalize/point';
import type { BoundChartAuthoring, ChartAuthoringResult } from '../shared/types';

import { createBoundChartResult } from '../_chart/adapter';
import {
  DEFAULT_CHART_DATA_REFERENCE,
  normalizeBubbleChart,
  normalizeConnectedScatterChart,
  normalizeScatterChart,
} from '../normalize/point';

export * from '../normalize/point';

type TypedChartSource = IRScatterChart | IRBubbleChart | IRConnectedScatterChart;

type TypedChartCommonInput = InputChartPresentation &
  Omit<IRScatterChart['plot'], 'data'> & {
    /** 具体类型解析方案使用的数据行 */
    data: Array<ExternalRow>;
    /** 稳定的数据引用；省略时固定为 `chart.data` */
    dataRef?: string;
    /** 可选的 Plot 数据模型 */
    dataModel?: IRScatterChart['plot']['data']['model'];
    /** Chart 外层标识 */
    id?: string;
    /** Chart 自有令牌的稀疏覆盖 */
    chartThemeTokens?: IRBaseChart['chartThemeTokens'];
    /** Chart 自有的运行时主题定义 */
    chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
    /** Plot 自有的运行时主题定义 */
    plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
    /** 创建时解析具体类型解析方案的根 Core 主题 */
    theme?: IRScene['theme'];
    /** 创建时解析具体类型解析方案的根 Core 主题样式定义 */
    themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
  };

/** ScatterChart 的 Vanilla 精确输入 */
export type CreateScatterChartInput = TypedChartCommonInput & Pick<InputScatterChart, 'encoding' | 'mark'>;

/** BubbleChart 的 Vanilla 精确输入 */
export type CreateBubbleChartInput = TypedChartCommonInput & Pick<InputBubbleChart, 'encoding' | 'mark'>;

/** ConnectedScatterChart 的 Vanilla 精确输入 */
export type CreateConnectedScatterChartInput = TypedChartCommonInput &
  Pick<InputConnectedScatterChart, 'encoding' | 'mark' | 'components'>;

type TypedRecipe<TSource extends TypedChartSource> = Readonly<{
  bind: (source: TSource) => BoundChart;
}>;

type TypedChartRuntimeInput = Readonly<{
  data: Array<ExternalRow>;
  reference: string;
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
  theme?: IRScene['theme'];
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;

type TypedChartNormalizeCommon = InputChartPresentation & Pick<IRScatterChart, 'id' | 'chartThemeTokens' | 'plot'>;

const typedChartAuthoringOf = (
  input: TypedChartCommonInput,
): { source: TypedChartNormalizeCommon; runtime: TypedChartRuntimeInput } => {
  const {
    data,
    dataRef,
    dataModel,
    id,
    chartThemeTokens,
    title,
    subtitle,
    note,
    source,
    presentation,
    chartThemeStyles,
    plotThemeStyles,
    theme,
    themeStyles,
    ...plot
  } = input;
  const reference = dataRef ?? DEFAULT_CHART_DATA_REFERENCE;
  return {
    source: {
      ...(id === undefined ? {} : { id }),
      ...(chartThemeTokens === undefined ? {} : { chartThemeTokens }),
      ...(title === undefined ? {} : { title }),
      ...(subtitle === undefined ? {} : { subtitle }),
      ...(note === undefined ? {} : { note }),
      ...(source === undefined ? {} : { source }),
      ...(presentation === undefined ? {} : { presentation }),
      plot: {
        data: {
          reference,
          ...(dataModel === undefined ? {} : { model: dataModel }),
        },
        ...plot,
      },
    },
    runtime: {
      data,
      reference,
      ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
      ...(plotThemeStyles === undefined ? {} : { plotThemeStyles }),
      ...(theme === undefined ? {} : { theme }),
      ...(themeStyles === undefined ? {} : { themeStyles }),
    },
  };
};

const createTypedChartResult = <TSource extends TypedChartSource>(
  spec: TSource,
  runtime: TypedChartRuntimeInput,
  recipe: TypedRecipe<TSource>,
): ChartAuthoringResult => {
  const bound: BoundChartAuthoring = {
    bound: recipe.bind(spec),
    datasets: { [runtime.reference]: runtime.data },
    ...(runtime.plotThemeStyles === undefined
      ? {}
      : { lowerOptions: { plotThemeStyles: runtime.plotThemeStyles }, plotThemeStyles: runtime.plotThemeStyles }),
    ...(runtime.chartThemeStyles === undefined ? {} : { chartThemeStyles: runtime.chartThemeStyles }),
  };
  return createBoundChartResult(bound, runtime.theme, runtime.themeStyles);
};

/** 创建确定形态的 ScatterChart */
export const createScatterChart = (input: CreateScatterChartInput): ChartAuthoringResult => {
  const { encoding, mark, ...common } = input;
  const { source, runtime } = typedChartAuthoringOf(common);
  const spec = normalizeScatterChart({ ...source, encoding, ...(mark === undefined ? {} : { mark }) });
  return createTypedChartResult(spec, runtime, { bind: value => ScatterChartRecipe.bind(value) });
};

/** 创建确定形态的 BubbleChart */
export const createBubbleChart = (input: CreateBubbleChartInput): ChartAuthoringResult => {
  const { encoding, mark, ...common } = input;
  const { source, runtime } = typedChartAuthoringOf(common);
  const spec = normalizeBubbleChart({ ...source, encoding, ...(mark === undefined ? {} : { mark }) });
  return createTypedChartResult(spec, runtime, { bind: value => BubbleChartRecipe.bind(value) });
};

/** 创建确定形态的 ConnectedScatterChart */
export const createConnectedScatterChart = (input: CreateConnectedScatterChartInput): ChartAuthoringResult => {
  const { encoding, mark, components, ...common } = input;
  const { source, runtime } = typedChartAuthoringOf(common);
  const spec = normalizeConnectedScatterChart({
    ...source,
    encoding,
    ...(mark === undefined ? {} : { mark }),
    ...(components === undefined ? {} : { components }),
  });
  return createTypedChartResult(spec, runtime, { bind: value => ConnectedScatterChartRecipe.bind(value) });
};
