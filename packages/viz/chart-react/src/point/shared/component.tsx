import type { IRChartSource } from '@retikz/chart';
import type { ChartAuthoringResult, ChartInput } from '@retikz/chart-vanilla';
import type { ExternalRow } from '@retikz/data';
import type { FC, ReactNode } from 'react';

import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import { usePlotThemeStyles } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { createElement, useMemo } from 'react';

import type { ChartCommonProps, InputEmbeddableChartComponent } from '../../shared';

import {
  assertEmbeddedChartHostProps,
  chartContentPropsOf,
  chartHostPropsOf,
  mergeThemeDefinitions,
  splitPresentationMarkers,
  useChartThemeDefinitions,
} from '../../shared';
import { lowerOptionsWithAmbientThemeOf } from './helpers';
import { pointMarksOf } from './mark-collection';

/** Point family concrete Chart 共用的 React props */
export type TypedChartCommonProps<TSource extends IRChartSource> = ChartCommonProps &
  Readonly<{
    /** Point recipe 使用的运行时数据行 */
    data: Array<ExternalRow>;
    /** Source.data.reference；省略时使用稳定的 chart.data */
    dataRef?: string;
    /** Source data model */
    dataModel?: TSource['data']['model'];
    /** Chart Source 的外层 border-box 尺寸 */
    layout?: TSource['layout'];
    /** Chart Source 的可选身份 */
    id?: string;
    /** Source-owned named / inline Chart Theme */
    theme?: TSource['theme'];
    /** 显式 Plot-owned fragment */
    plotExtension?: TSource['plotExtension'];
    /** presentation marker 与 Chart mark 声明组件 */
    children?: ReactNode;
  }>;

type PointFactoryInput = Readonly<{
  data: Array<ExternalRow>;
  encodings: unknown;
  properties?: unknown;
  marks?: ReadonlyArray<unknown>;
}>;

/** 从 typed Point props 组装 Vanilla 精确输入，并将 marker 作为有序 marks 追加 */
export const createTypedChartInput = <
  TProps extends TypedChartCommonProps<TSource>,
  TSource extends IRChartSource,
  TInput extends PointFactoryInput,
>(
  props: TProps,
  payload: Pick<TInput, 'encodings' | 'properties' | 'marks'>,
  factory: (input: TInput) => ChartAuthoringResult<TSource>,
): ChartInput<TSource> => {
  const {
    children,
    data,
    dataRef,
    dataModel,
    layout,
    id,
    theme,
    plotExtension,
    panel,
    themeDefinitions,
    lowerOptions,
  } = props;
  const split = splitPresentationMarkers(children);
  const childMarks = pointMarksOf(split.plotChildren);
  const marks = [...(payload.marks ?? []), ...childMarks];
  const presentation = split.presentation;
  const input = {
    data,
    ...(dataRef === undefined ? {} : { dataRef }),
    ...(dataModel === undefined ? {} : { dataModel }),
    ...(layout === undefined ? {} : { layout }),
    ...(id === undefined ? {} : { id }),
    ...(theme === undefined ? {} : { theme }),
    ...(plotExtension === undefined ? {} : { plotExtension }),
    ...(panel === undefined ? {} : { panel }),
    ...(themeDefinitions === undefined ? {} : { themeDefinitions }),
    ...(lowerOptions === undefined ? {} : { lowerOptions }),
    ...(presentation.title === undefined ? {} : { title: presentation.title }),
    ...(presentation.subtitle === undefined ? {} : { subtitle: presentation.subtitle }),
    ...(presentation.note === undefined ? {} : { note: presentation.note }),
    ...(presentation.source === undefined ? {} : { source: presentation.source }),
    encodings: payload.encodings,
    ...(payload.properties === undefined ? {} : { properties: payload.properties }),
    ...(marks.length === 0 ? {} : { marks }),
  } as TInput;
  return factory(input).input;
};

/** 创建共享 InputEmbed 生命周期接线的 concrete Chart 组件 */
export const createTypedChartComponent = <TProps extends TypedChartCommonProps<TSource>, TSource extends IRChartSource>(
  displayName: string,
  createInput: (props: TProps) => ChartInput<TSource>,
): InputEmbeddableChartComponent<TProps, ChartInput<TSource>, typeof ChartInputEmbedAdapter> => {
  const Component: FC<TProps> = props => {
    const { lowerOptions, themeDefinitions } = props;
    const ambientThemeDefinitions = useChartThemeDefinitions();
    const ambientPlotThemeStyles = usePlotThemeStyles();
    const effectiveProps = useMemo<TProps>(() => {
      const effectiveThemeDefinitions = mergeThemeDefinitions(themeDefinitions, ambientThemeDefinitions);
      const effectiveLowerOptions = lowerOptionsWithAmbientThemeOf(lowerOptions, ambientPlotThemeStyles);
      return {
        ...props,
        ...(effectiveThemeDefinitions === undefined ? {} : { themeDefinitions: effectiveThemeDefinitions }),
        ...(effectiveLowerOptions === undefined ? {} : { lowerOptions: effectiveLowerOptions }),
      };
    }, [ambientPlotThemeStyles, ambientThemeDefinitions, themeDefinitions, lowerOptions, props]);
    const hostProps = chartHostPropsOf(props);
    return createElement(Layout, hostProps, createElement(Component, chartContentPropsOf(effectiveProps)));
  };
  const chart = Component as InputEmbeddableChartComponent<TProps, ChartInput<TSource>, typeof ChartInputEmbedAdapter>;
  chart.displayName = displayName;
  chart.isTier2Embeddable = true;
  chart.inputEmbedAdapter = ChartInputEmbedAdapter;
  chart.createInputEmbedProps = props => {
    const chartProps = props as TProps;
    assertEmbeddedChartHostProps(chartProps);
    return createInput(chartProps);
  };
  return chart;
};
