import type { CoreDependencyProvider } from '@retikz/core';

import { FlexLayoutProvider } from '@retikz/layout';
import { PlotProviderKey } from '@retikz/plot';
import { SurfaceProvider } from '@retikz/standard';

import type { ChartThemeStyleDefinition } from './style';

import { RetikzChartError } from '../error';
import { ChartDefinition, createChartDefinition } from './definition';

const ChartRuntimeStyles = Symbol('retikz.chart.runtimeStyles');
const ChartRuntimeReferencePrefix = '@@retikz/chart/runtime/';

type ChartRuntimeEnvelope = Readonly<{
  [ChartRuntimeStyles]: ReadonlyArray<ChartThemeStyleDefinition>;
}>;

let chartRuntimeReferenceSeed = 0;

/** 读取提供器本地的 Chart 主题定义 */
const runtimeStylesOf = (value: unknown): ReadonlyArray<ChartThemeStyleDefinition> | undefined => {
  if (value === null || typeof value !== 'object' || !(ChartRuntimeStyles in value)) return undefined;
  return (value as ChartRuntimeEnvelope)[ChartRuntimeStyles];
};

/** 合并同一次组合装配中的 Chart 主题定义 */
const mergeChartThemeStyles = (
  definitionSets: ReadonlyArray<ReadonlyArray<ChartThemeStyleDefinition>>,
): ReadonlyArray<ChartThemeStyleDefinition> => {
  const merged = new Map<string, ChartThemeStyleDefinition>();
  for (const definitions of definitionSets) {
    for (const definition of definitions) {
      const existing = merged.get(definition.name);
      if (existing !== undefined && !Object.is(existing, definition)) {
        throw new RetikzChartError(
          `Chart provider: theme style definition "${definition.name}" conflicts within one assembly.`,
        );
      }
      if (existing === undefined) merged.set(definition.name, definition);
    }
  }
  return [...merged.values()];
};

/** 将 Chart 运行时外层输入合并为唯一的确定定义 */
const makeChartDefinition: CoreDependencyProvider['makeDefinition'] = mergedDatasets => {
  const definitionSets: Array<ReadonlyArray<ChartThemeStyleDefinition>> = [];
  for (const value of Object.values(mergedDatasets)) {
    const styles = runtimeStylesOf(value);
    if (styles !== undefined) definitionSets.push(styles);
  }
  const chartThemeStyles = mergeChartThemeStyles(definitionSets);
  return chartThemeStyles.length === 0 ? ChartDefinition : createChartDefinition(chartThemeStyles);
};

/** `chart.base` 的完整提供器键 */
export const ChartProviderKey = Object.freeze({
  capability: 'composite' as const,
  namespace: ChartDefinition.namespace,
  type: ChartDefinition.type,
});

/** 创建携带当前 Chart 主题定义的确定依赖提供器 */
export const createChartProvider = (
  chartThemeStyles: ReadonlyArray<ChartThemeStyleDefinition> | undefined = undefined,
): CoreDependencyProvider => {
  const datasets =
    chartThemeStyles === undefined || chartThemeStyles.length === 0
      ? {}
      : {
          [`${ChartRuntimeReferencePrefix}${chartRuntimeReferenceSeed++}`]: Object.freeze({
            [ChartRuntimeStyles]: chartThemeStyles,
          } satisfies ChartRuntimeEnvelope),
        };
  return Object.freeze({
    key: ChartProviderKey,
    dependencies: Object.freeze([SurfaceProvider.key, FlexLayoutProvider.key, PlotProviderKey]),
    datasets: Object.freeze(datasets),
    makeDefinition: makeChartDefinition,
  });
};

/** Chart 的默认单一提供器，依赖顺序与 IR 组合归属方一致 */
export const ChartProvider = createChartProvider();
