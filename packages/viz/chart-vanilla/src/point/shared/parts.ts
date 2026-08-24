import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution, IRScene, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';

import type { ChartAuthoringResult, InputChartPanel } from '../../shared';
import type { TypedChartCommonInput } from './types';

import { chartContributionOf } from '../../shared';

/** 未显式提供 dataRef 时使用的稳定数据引用 */
export const DEFAULT_CHART_DATA_REFERENCE = 'chart.data';

/** Typed Chart factory 在 Source 与运行时之间传递的共享拆分结果 */
export type TypedChartParts<TSource extends IRChartSource> = Readonly<{
  root: Readonly<{
    id?: string;
    data: TSource['data'];
    layout?: TSource['layout'];
    theme?: TSource['theme'];
    plotExtension?: TSource['plotExtension'];
  }>;
  datasets: Readonly<Record<string, Array<ExternalRow>>>;
  themeDefinitions?: TypedChartCommonInput<TSource>['themeDefinitions'];
  lowerOptions?: LowerPlotsOptions;
  panel?: InputChartPanel;
  hostTheme?: IRScene['theme'];
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
}>;

/** 把 typed Chart 输入拆分为 JSON-safe Source root 与 runtime 输入 */
export const typedChartPartsOf = <TSource extends IRChartSource>(
  input: TypedChartCommonInput<TSource>,
): TypedChartParts<TSource> => {
  const { data, dataRef, dataModel, layout, id, theme, themeDefinitions, lowerOptions, panel, themeStyles } = input;
  const isCoreTheme = (value: TypedChartCommonInput<TSource>['theme']): value is IRScene['theme'] =>
    typeof value === 'object' && (Object.hasOwn(value, 'style') || Object.hasOwn(value, 'mode'));
  const sourceTheme = isCoreTheme(theme) ? undefined : theme;
  const hostTheme = isCoreTheme(theme) ? theme : undefined;
  const reference = dataRef ?? DEFAULT_CHART_DATA_REFERENCE;
  return {
    root: {
      ...(id === undefined ? {} : { id }),
      data: {
        reference,
        ...(dataModel === undefined ? {} : { model: dataModel }),
      },
      ...(layout === undefined ? {} : { layout }),
      ...(sourceTheme === undefined ? {} : { theme: sourceTheme }),
      ...(input.plotExtension === undefined ? {} : { plotExtension: input.plotExtension }),
    },
    datasets: { [reference]: data },
    ...(themeDefinitions === undefined ? {} : { themeDefinitions }),
    ...(lowerOptions === undefined ? {} : { lowerOptions }),
    ...(panel === undefined ? {} : { panel }),
    ...(hostTheme === undefined ? {} : { hostTheme }),
    ...(themeStyles === undefined ? {} : { themeStyles }),
  };
};

/** 将 typed input 归一为 Source 并复用当前 chartType provider pipeline */
export const createPointChart = <TSource extends IRChartSource>(
  source: TSource,
  parts: TypedChartParts<TSource>,
  provider: CoreProviderContribution,
): ChartAuthoringResult<TSource> =>
  chartContributionOf({
    source,
    datasets: parts.datasets,
    chartProviderContribution: provider,
    ...(parts.lowerOptions === undefined ? {} : { lowerOptions: parts.lowerOptions }),
    ...(parts.panel === undefined ? {} : { panel: parts.panel }),
    ...(parts.hostTheme === undefined ? {} : { theme: parts.hostTheme }),
    ...(parts.themeStyles === undefined ? {} : { themeStyles: parts.themeStyles }),
  });
