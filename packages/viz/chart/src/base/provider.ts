import type { CompositeDependencyProvider } from '@retikz/core';

import { FlexLayoutProvider } from '@retikz/layout';
import { PlotProviderKey } from '@retikz/plot';
import { SurfaceProvider } from '@retikz/standard';

import type { ChartThemeStyleDefinition } from './style';

import { ChartDefinition, createChartDefinition } from './definition';

const ChartRuntimeStyles = Symbol('retikz.chart.runtimeStyles');
const ChartRuntimeReferencePrefix = '@@retikz/chart/runtime/';

type ChartRuntimeEnvelope = Readonly<{
  [ChartRuntimeStyles]: ReadonlyArray<ChartThemeStyleDefinition>;
}>;

let chartRuntimeReferenceSeed = 0;

/** 读取 provider-local Chart Theme definitions */
const runtimeStylesOf = (value: unknown): ReadonlyArray<ChartThemeStyleDefinition> | undefined => {
  if (value === null || typeof value !== 'object' || !(ChartRuntimeStyles in value)) return undefined;
  return (value as ChartRuntimeEnvelope)[ChartRuntimeStyles];
};

/** 合并同一次 composite assembly 内的 Chart Theme definitions */
const mergeChartThemeStyles = (
  definitionSets: ReadonlyArray<ReadonlyArray<ChartThemeStyleDefinition>>,
): ReadonlyArray<ChartThemeStyleDefinition> => {
  const merged = new Map<string, ChartThemeStyleDefinition>();
  for (const definitions of definitionSets) {
    for (const definition of definitions) {
      const existing = merged.get(definition.name);
      if (existing !== undefined && !Object.is(existing, definition)) {
        throw new Error(`Chart provider: theme style definition "${definition.name}" conflicts within one assembly.`);
      }
      if (existing === undefined) merged.set(definition.name, definition);
    }
  }
  return [...merged.values()];
};

/** 将 Chart runtime envelope 合并为唯一 canonical definition */
const makeChartDefinition: CompositeDependencyProvider['makeDefinition'] = mergedDatasets => {
  const definitionSets: Array<ReadonlyArray<ChartThemeStyleDefinition>> = [];
  for (const value of Object.values(mergedDatasets)) {
    const styles = runtimeStylesOf(value);
    if (styles !== undefined) definitionSets.push(styles);
  }
  const chartThemeStyles = mergeChartThemeStyles(definitionSets);
  return chartThemeStyles.length === 0 ? ChartDefinition : createChartDefinition(chartThemeStyles);
};

/** chart.chart 的完整 provider key */
export const ChartProviderKey = Object.freeze({
  namespace: ChartDefinition.namespace,
  type: ChartDefinition.type,
});

/** 创建携带当前 Chart Theme definitions 的 canonical dependency provider */
export const createChartProvider = (
  chartThemeStyles: ReadonlyArray<ChartThemeStyleDefinition> | undefined = undefined,
): CompositeDependencyProvider => {
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

/** Chart 的默认单一 provider，依赖顺序与 IR 组合 owner 一致 */
export const ChartProvider = createChartProvider();
