import type { BoundChart, IRBaseChart } from '@retikz/chart';
import type { IRBubbleChart, IRConnectedScatterChart, IRScatterChart } from '@retikz/chart/point';
import type { InputChartPresentation } from '@retikz/chart-vanilla';
import type { InputScatterChart } from '@retikz/chart-vanilla/point';
import type { ExternalRow } from '@retikz/data';
import type { FC, ReactNode } from 'react';

import { BubbleChartRecipe, ConnectedScatterChartRecipe, ScatterChartRecipe } from '@retikz/chart/point';
import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import {
  DEFAULT_CHART_DATA_REFERENCE,
  normalizeBubbleChart,
  normalizeConnectedScatterChart,
  normalizeScatterChart,
} from '@retikz/chart-vanilla/point';
import { resolvePlotExtensionAuthoring, usePlotThemeStyles } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { createElement, useMemo } from 'react';

import type { ChartCommonProps, InputEmbeddableChartComponent } from '../shared';

import { splitPresentationMarkers, useChartThemeStyles } from '../shared';

type BoundChartAuthoring = Parameters<typeof ChartInputEmbedAdapter.lower>[0];
type TypedChartSource = IRScatterChart | IRBubbleChart | IRConnectedScatterChart;

type TypedChartCommonProps = ChartCommonProps &
  Omit<IRScatterChart['plot'], 'data' | 'width' | 'height'> & {
    /** 具体类型解析方案使用的外部数据行 */
    data: Array<ExternalRow>;
    /** 稳定的外部数据引用；省略时固定为 `chart.data` */
    dataRef?: string;
    /** 可选的 Plot 数据模型 */
    dataModel?: IRScatterChart['plot']['data']['model'];
    /** Plot 扩展与 Chart 展示标记可混排 */
    children?: ReactNode;
    /** Chart 自有令牌的稀疏覆盖 */
    chartThemeTokens?: IRBaseChart['chartThemeTokens'];
  };

/** ScatterChart React 属性 */
export type ScatterChartProps = TypedChartCommonProps & IRScatterChart['config'];

/** BubbleChart React 属性 */
export type BubbleChartProps = TypedChartCommonProps & IRBubbleChart['config'];

/** ConnectedScatterChart React 属性 */
export type ConnectedScatterChartProps = TypedChartCommonProps & IRConnectedScatterChart['config'];

type TypedRecipe<TSource extends TypedChartSource> = Readonly<{
  normalize: (source: TypedChartNormalizeCommon, config: TSource['config']) => TSource;
  bind: (source: TSource) => BoundChart;
}>;

type TypedChartNormalizeCommon = InputChartPresentation & Pick<InputScatterChart, 'id' | 'chartThemeTokens' | 'plot'>;

/** 从 Chart 根属性组装可由 Chart 适配器使用的根 Scope */
const createChartPanelInput = (props: TypedChartCommonProps): BoundChartAuthoring['panel'] => {
  const { x, y, transforms, placement, zIndex, clip, theme } = props;
  if (
    x === undefined &&
    y === undefined &&
    transforms === undefined &&
    placement === undefined &&
    zIndex === undefined &&
    clip === undefined &&
    theme === undefined
  ) {
    return undefined;
  }
  return {
    ...(x === undefined ? {} : { x }),
    ...(y === undefined ? {} : { y }),
    ...(transforms === undefined ? {} : { transforms }),
    ...(placement === undefined ? {} : { placement }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
  };
};

const createTypedChartInput = <TSource extends TypedChartSource>(
  props: TypedChartCommonProps,
  config: TSource['config'],
  recipe: TypedRecipe<TSource>,
): BoundChartAuthoring => {
  const {
    data,
    dataRef,
    dataModel,
    title,
    subtitle,
    note,
    source,
    chartThemeTokens,
    chartThemeStyles,
    plotThemeStyles,
    id,
    children,
    width,
    height,
    className: _className,
    style: _style,
    renderer: _renderer,
    themeStyles: _themeStyles,
    runtime: _runtime,
    animate: _animate,
    snapshotAt: _snapshotAt,
    animationRef: _animationRef,
    onArtifacts: _onArtifacts,
    onCompileResult: _onCompileResult,
    x: _x,
    y: _y,
    transforms: _transforms,
    placement: _placement,
    zIndex: _zIndex,
    clip: _clip,
    theme: _theme,
    transform,
    scales,
    coordinate,
    composition,
    guides,
    marks,
    ...plotFields
  } = props;
  void _className;
  void _style;
  void _renderer;
  void _themeStyles;
  void _runtime;
  void _animate;
  void _snapshotAt;
  void _animationRef;
  void _onArtifacts;
  void _onCompileResult;
  void _x;
  void _y;
  void _transforms;
  void _placement;
  void _zIndex;
  void _clip;
  void _theme;
  const reference = dataRef ?? DEFAULT_CHART_DATA_REFERENCE;
  const split = splitPresentationMarkers(children);
  const extension = resolvePlotExtensionAuthoring(split.plotChildren, {
    data: {
      reference,
      ...(dataModel === undefined ? {} : { model: dataModel }),
    },
    ...(transform === undefined ? {} : { dataTransforms: transform }),
    ...(scales === undefined ? {} : { scales: { value: scales, path: ['props', 'scales'] } }),
    ...(coordinate === undefined ? {} : { coordinate: { value: coordinate, path: ['props', 'coordinate'] } }),
    ...(composition === undefined ? {} : { composition: { value: composition, path: ['props', 'composition'] } }),
    ...(guides === undefined ? {} : { guides: { value: guides, path: ['props', 'guides'] } }),
    ...(marks === undefined ? {} : { marks: { value: marks, path: ['props', 'marks'] } }),
  });
  const spec = recipe.normalize(
    {
      ...(id === undefined ? {} : { id }),
      ...(chartThemeTokens === undefined ? {} : { chartThemeTokens }),
      ...(title === undefined ? {} : { title }),
      ...(subtitle === undefined ? {} : { subtitle }),
      ...(note === undefined ? {} : { note }),
      ...(source === undefined ? {} : { source }),
      ...(split.presentation.length === 0 ? {} : { presentation: split.presentation }),
      plot: {
        data: {
          reference,
          ...(dataModel === undefined ? {} : { model: dataModel }),
        },
        ...plotFields,
        ...extension.fragment,
        ...(typeof width === 'number' ? { width } : {}),
        ...(typeof height === 'number' ? { height } : {}),
      },
    },
    config,
  );
  const panel = createChartPanelInput(props);
  return {
    bound: recipe.bind(spec),
    datasets: { [reference]: data },
    lowerOptions: {
      ...(extension.runtime.resolveLabel === undefined ? {} : { resolveLabel: extension.runtime.resolveLabel }),
      ...(plotThemeStyles === undefined ? {} : { plotThemeStyles }),
    },
    ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
    ...(plotThemeStyles === undefined ? {} : { plotThemeStyles }),
    ...(panel === undefined ? {} : { panel }),
  };
};

const createTypedChartComponent = <TProps extends TypedChartCommonProps>(
  displayName: string,
  createInput: (props: TProps) => BoundChartAuthoring,
): InputEmbeddableChartComponent<TProps, BoundChartAuthoring, typeof ChartInputEmbedAdapter> => {
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
    } = props;
    const ambientChartThemeStyles = useChartThemeStyles();
    const ambientPlotThemeStyles = usePlotThemeStyles();
    const effectiveProps = useMemo<TProps>(() => {
      const chartThemeStyles =
        ambientChartThemeStyles === undefined
          ? props.chartThemeStyles
          : props.chartThemeStyles === undefined
            ? ambientChartThemeStyles
            : [...ambientChartThemeStyles, ...props.chartThemeStyles];
      const plotThemeStyles =
        ambientPlotThemeStyles === undefined
          ? props.plotThemeStyles
          : props.plotThemeStyles === undefined
            ? ambientPlotThemeStyles
            : [...ambientPlotThemeStyles, ...props.plotThemeStyles];
      return {
        ...props,
        ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
        ...(plotThemeStyles === undefined ? {} : { plotThemeStyles }),
      };
    }, [ambientChartThemeStyles, ambientPlotThemeStyles, props]);
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
  const chart = Component as InputEmbeddableChartComponent<TProps, BoundChartAuthoring, typeof ChartInputEmbedAdapter>;
  chart.displayName = displayName;
  chart.isTier2Embeddable = true;
  chart.inputEmbedAdapter = ChartInputEmbedAdapter;
  chart.createInputEmbedProps = props => createInput(props as TProps);
  return chart;
};

/** Scatter 具体类型的 Chart React 组件 */
export const ScatterChart = createTypedChartComponent<ScatterChartProps>('ScatterChart', props => {
  const { encoding, mark, ...common } = props;
  return createTypedChartInput<IRScatterChart>(
    common,
    { encoding, ...(mark === undefined ? {} : { mark }) },
    {
      normalize: (source, config) => normalizeScatterChart({ ...source, ...config }),
      bind: spec => ScatterChartRecipe.bind(spec),
    },
  );
});

/** Bubble 具体类型的 Chart React 组件 */
export const BubbleChart = createTypedChartComponent<BubbleChartProps>('BubbleChart', props => {
  const { encoding, mark, ...common } = props;
  return createTypedChartInput<IRBubbleChart>(
    common,
    { encoding, ...(mark === undefined ? {} : { mark }) },
    {
      normalize: (source, config) => normalizeBubbleChart({ ...source, ...config }),
      bind: spec => BubbleChartRecipe.bind(spec),
    },
  );
});

/** Connected Scatter 具体类型的 Chart React 组件 */
export const ConnectedScatterChart = createTypedChartComponent<ConnectedScatterChartProps>(
  'ConnectedScatterChart',
  props => {
    const { encoding, mark, components, ...common } = props;
    return createTypedChartInput<IRConnectedScatterChart>(
      common,
      {
        encoding,
        ...(mark === undefined ? {} : { mark }),
        ...(components === undefined ? {} : { components }),
      },
      {
        normalize: (source, config) => normalizeConnectedScatterChart({ ...source, ...config }),
        bind: spec => ConnectedScatterChartRecipe.bind(spec),
      },
    );
  },
);
