import type {
  IRBubbleChart,
  IRConnectedScatterChart,
  IRScatterChart,
  PointChartTypeValue,
} from '@retikz/chart/point';
import type { InputPointChart } from '@retikz/chart-vanilla/point';
import type { ExternalRow } from '@retikz/data';
import type { FC, ReactNode } from 'react';

import { DEFAULT_CHART_DATA_REFERENCE, PointChartType } from '@retikz/chart/point';
import { PointChartInputEmbedAdapter } from '@retikz/chart-vanilla/point';
import { resolvePlotExtensionAuthoring, usePlotThemeStyles } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { createElement, useMemo } from 'react';

import type { ChartCommonProps, InputEmbeddableChartComponent } from '../shared';

import { splitPresentationMarkers, useChartThemeStyles } from '../shared';

/** typed Point Chart 共享的 React input algebra */
export type TypedPointChartProps<TVariant> = Omit<
  TVariant,
  | 'namespace'
  | 'type'
  | 'data'
  | 'transform'
  | 'scales'
  | 'coordinate'
  | 'composition'
  | 'guides'
  | 'marks'
  | keyof ChartCommonProps
> &
  ChartCommonProps & {
    /** typed recipe 使用的外部 rows */
    data: Array<ExternalRow>;
    /** 稳定的外部数据引用；省略时固定为 `chart.data` */
    dataRef?: string;
    /** Plot extension 与 Chart presentation marker 可混排 */
    children?: ReactNode;
    /** recipe 外的 Plot transform members */
    transform?: IRScatterChart['transform'];
    /** recipe 外的 Plot scale members */
    scales?: IRScatterChart['scales'];
    /** recipe 外的单 coordinate root */
    coordinate?: IRScatterChart['coordinate'];
    /** recipe 外的 composition root */
    composition?: IRScatterChart['composition'];
    /** recipe 外的 Plot guides */
    guides?: IRScatterChart['guides'];
    /** recipe 外的 Plot marks */
    marks?: IRScatterChart['marks'];
  };

/** ScatterChart React props */
export type ScatterChartProps = TypedPointChartProps<IRScatterChart>;
/** BubbleChart React props */
export type BubbleChartProps = TypedPointChartProps<IRBubbleChart>;
/** ConnectedScatterChart React props */
export type ConnectedScatterChartProps = TypedPointChartProps<IRConnectedScatterChart>;

type AnyTypedPointChartProps = ScatterChartProps | BubbleChartProps | ConnectedScatterChartProps;

/** 从 Point Chart 根 props 组装可由 Chart Vanilla adapter 消费的根 Scope */
const createPointChartPanelInput = (props: AnyTypedPointChartProps): InputPointChart['panel'] => {
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

/** 将 typed Point Chart React props 转换为唯一的 Chart Vanilla 输入 */
const createTypedPointChartInput = (
  type: PointChartTypeValue,
  props: Readonly<Record<string, unknown>>,
): InputPointChart => {
  const chartProps = props as AnyTypedPointChartProps;
  const {
    data,
    dataRef,
    title,
    subtitle,
    note,
    source,
    chartThemeStyles,
    plotThemeStyles,
    id,
    children,
    width: _width,
    height: _height,
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
    ...recipeInput
  } = chartProps;
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
    data: { reference },
    ...(transform === undefined ? {} : { dataTransforms: transform }),
    ...(scales === undefined ? {} : { scales: { value: scales, path: ['props', 'scales'] } }),
    ...(coordinate === undefined ? {} : { coordinate: { value: coordinate, path: ['props', 'coordinate'] } }),
    ...(composition === undefined ? {} : { composition: { value: composition, path: ['props', 'composition'] } }),
    ...(guides === undefined ? {} : { guides: { value: guides, path: ['props', 'guides'] } }),
    ...(marks === undefined ? {} : { marks: { value: marks, path: ['props', 'marks'] } }),
  });
  const input: InputPointChart['input'] = {
    data,
    ...(dataRef === undefined ? {} : { dataRef }),
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(note === undefined ? {} : { note }),
    ...(source === undefined ? {} : { source }),
    ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
    ...(plotThemeStyles === undefined ? {} : { plotThemeStyles }),
    ...(id === undefined ? {} : { id }),
    ...recipeInput,
    ...extension.fragment,
    ...(_width === undefined ? {} : { width: _width }),
    ...(_height === undefined ? {} : { height: _height }),
    ...(split.presentation.length === 0 ? {} : { presentation: split.presentation }),
  };
  const panel = createPointChartPanelInput(chartProps);
  return { type, input, ...(panel === undefined ? {} : { panel }) };
};

const createTypedChartComponent = <TProps extends AnyTypedPointChartProps>(
  type: PointChartTypeValue,
  displayName: string,
): InputEmbeddableChartComponent<TProps, InputPointChart, typeof PointChartInputEmbedAdapter> => {
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
  const chart = Component as InputEmbeddableChartComponent<TProps, InputPointChart, typeof PointChartInputEmbedAdapter>;
  chart.displayName = displayName;
  chart.isTier2Embeddable = true;
  chart.inputEmbedAdapter = PointChartInputEmbedAdapter;
  chart.createInputEmbedProps = props => createTypedPointChartInput(type, props);
  return chart;
};

/** Scatter typed Chart React component */
export const ScatterChart: InputEmbeddableChartComponent<
  ScatterChartProps,
  InputPointChart,
  typeof PointChartInputEmbedAdapter
> = createTypedChartComponent<ScatterChartProps>(PointChartType.Scatter, 'ScatterChart');
/** Bubble typed Chart React component */
export const BubbleChart: InputEmbeddableChartComponent<
  BubbleChartProps,
  InputPointChart,
  typeof PointChartInputEmbedAdapter
> = createTypedChartComponent<BubbleChartProps>(PointChartType.Bubble, 'BubbleChart');
/** Connected Scatter typed Chart React component */
export const ConnectedScatterChart: InputEmbeddableChartComponent<
  ConnectedScatterChartProps,
  InputPointChart,
  typeof PointChartInputEmbedAdapter
> = createTypedChartComponent<ConnectedScatterChartProps>(PointChartType.ConnectedScatter, 'ConnectedScatterChart');
