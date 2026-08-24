import type { IRChartPlotExtension, IRChartSource } from '@retikz/chart';
import type { ChartAuthoringResult, ChartInput } from '@retikz/chart-vanilla';
import type { ExternalRow } from '@retikz/data';
import type { FC, ReactNode } from 'react';

import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import { resolvePlotExtensionAuthoring, usePlotThemeStyles } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { createElement, useMemo } from 'react';

import type { ChartCommonProps, InputEmbeddableChartComponent } from '../../shared';

import { RetikzChartReactError } from '../../error';
import { hasPlotChild, mergeThemeDefinitions, splitPresentationMarkers, useChartThemeDefinitions } from '../../shared';
import { lowerOptionsWithAmbientThemeOf, lowerOptionsWithPlotRuntimeOf } from './helpers';
import { splitPointChartChildren } from './mark-collection';

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
  facet?: unknown;
  marks?: ReadonlyArray<unknown>;
}>;

type PlotExtensionAuthoringContext = Parameters<typeof resolvePlotExtensionAuthoring>[1];

const dataFieldNamesOf = (rows: Array<ExternalRow>): ReadonlySet<string> =>
  new Set(rows.flatMap(row => Object.keys(row)));

const plotExtensionContextOf = (
  data: Array<ExternalRow>,
  dataRef: string | undefined,
  dataModel: IRChartSource['data']['model'],
  extension: IRChartPlotExtension | undefined,
): PlotExtensionAuthoringContext => ({
  data: { reference: dataRef ?? 'chart.data', ...(dataModel === undefined ? {} : { model: dataModel }) },
  ...(dataModel === undefined ? {} : { model: dataModel }),
  dataFieldNames: dataFieldNamesOf(data),
  ...(extension?.scales === undefined
    ? {}
    : { scales: { value: extension.scales, path: ['props', 'plotExtension', 'scales'] } }),
  ...(extension?.coordinate === undefined
    ? {}
    : { coordinate: { value: extension.coordinate, path: ['props', 'plotExtension', 'coordinate'] } }),
  ...(extension?.composition === undefined
    ? {}
    : { composition: { value: extension.composition, path: ['props', 'plotExtension', 'composition'] } }),
  ...(extension?.guides === undefined
    ? {}
    : { guides: { value: extension.guides, path: ['props', 'plotExtension', 'guides'] } }),
  ...(extension?.marks === undefined
    ? {}
    : { marks: { value: extension.marks, path: ['props', 'plotExtension', 'marks'] } }),
  ...(extension?.transform === undefined ? {} : { dataTransforms: extension.transform }),
});

const plotExtensionOf = (
  extension: IRChartPlotExtension | undefined,
  fragment: ReturnType<typeof resolvePlotExtensionAuthoring>['fragment'] | undefined,
): IRChartPlotExtension | undefined => {
  if (fragment === undefined) return extension;
  const passive = {
    ...(extension?.plotThemeTokens === undefined ? {} : { plotThemeTokens: extension.plotThemeTokens }),
    ...(extension?.plotThemeTokenRules === undefined ? {} : { plotThemeTokenRules: extension.plotThemeTokenRules }),
    ...(extension?.plotTheme === undefined ? {} : { plotTheme: extension.plotTheme }),
    ...(extension?.meta === undefined ? {} : { meta: extension.meta }),
  };
  const combined = { ...passive, ...fragment };
  return Object.keys(combined).length === 0 ? undefined : combined;
};

/** 从 typed Point props 组装 Vanilla 精确输入，并将 marker 作为有序 marks 追加 */
export const createTypedChartInput = <
  TProps extends TypedChartCommonProps<TSource>,
  TSource extends IRChartSource,
  TInput extends PointFactoryInput,
>(
  props: TProps,
  payload: Pick<TInput, 'encodings' | 'properties' | 'facet' | 'marks'>,
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
  const pointChildren = splitPointChartChildren(split.plotChildren);
  const marks = [...(payload.marks ?? []), ...pointChildren.marks];
  const plotAuthoring = hasPlotChild(pointChildren.plotChildren)
    ? resolvePlotExtensionAuthoring(
        pointChildren.plotChildren,
        plotExtensionContextOf(data, dataRef, dataModel, plotExtension),
      )
    : undefined;
  const effectivePlotExtension = plotExtensionOf(plotExtension, plotAuthoring?.fragment);
  if (pointChildren.facet !== undefined && payload.facet !== undefined) {
    throw new RetikzChartReactError('chart react: facet cannot be declared by both prop and child');
  }
  const facet = pointChildren.facet ?? payload.facet;
  if (
    facet !== undefined &&
    (effectivePlotExtension?.coordinate !== undefined || effectivePlotExtension?.composition)
  ) {
    throw new RetikzChartReactError('chart react: ChartFacet cannot be combined with Plot-owned spatial declarations');
  }
  const effectiveLowerOptions = lowerOptionsWithPlotRuntimeOf(lowerOptions, plotAuthoring?.runtime ?? {});
  const presentation = split.presentation;
  const input = {
    data,
    ...(dataRef === undefined ? {} : { dataRef }),
    ...(dataModel === undefined ? {} : { dataModel }),
    ...(layout === undefined ? {} : { layout }),
    ...(id === undefined ? {} : { id }),
    ...(theme === undefined ? {} : { theme }),
    ...(effectivePlotExtension === undefined ? {} : { plotExtension: effectivePlotExtension }),
    ...(panel === undefined ? {} : { panel }),
    ...(themeDefinitions === undefined ? {} : { themeDefinitions }),
    ...(effectiveLowerOptions === undefined ? {} : { lowerOptions: effectiveLowerOptions }),
    ...(presentation.title === undefined ? {} : { title: presentation.title }),
    ...(presentation.subtitle === undefined ? {} : { subtitle: presentation.subtitle }),
    ...(presentation.note === undefined ? {} : { note: presentation.note }),
    ...(presentation.source === undefined ? {} : { source: presentation.source }),
    encodings: payload.encodings,
    ...(payload.properties === undefined ? {} : { properties: payload.properties }),
    ...(facet === undefined ? {} : { facet }),
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
    const {
      width,
      height,
      className,
      style,
      renderer,
      themeStyles,
      runtime,
      animate,
      snapshotAt,
      animationRef,
      onArtifacts,
      onCompileResult,
      lowerOptions,
      themeDefinitions,
    } = props;
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
    return createElement(
      Layout,
      {
        width,
        height,
        className,
        style,
        renderer,
        themeStyles,
        runtime,
        animate,
        snapshotAt,
        animationRef,
        onArtifacts,
        onCompileResult,
      },
      createElement(Component, effectiveProps),
    );
  };
  const chart = Component as InputEmbeddableChartComponent<TProps, ChartInput<TSource>, typeof ChartInputEmbedAdapter>;
  chart.displayName = displayName;
  chart.isTier2Embeddable = true;
  chart.inputEmbedAdapter = ChartInputEmbedAdapter;
  chart.createInputEmbedProps = props => createInput(props as TProps);
  return chart;
};
