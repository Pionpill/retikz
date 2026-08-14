import type { IRChart } from '@retikz/chart';
import type { InputChart } from '@retikz/chart-vanilla';
import type { PlotDslProps, PlotProps, PlotSpecProps } from '@retikz/plot-react';
import type { FC, ReactNode } from 'react';

import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import { resolvePlotAuthoring, usePlotThemeStyles } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { createElement, useMemo } from 'react';

import type { ChartCommonProps, InputEmbeddableChartComponent } from '../shared';

import { hasPlotChild, splitPresentationMarkers, useChartThemeStyles } from '../shared';

export type {
  ChartCommonProps,
  ChartHostProps,
  ChartPresentationProps,
  ChartRootProps,
  ChartRuntimeThemeProps,
  ChartTextAuthoring,
  InputEmbeddableChartComponent,
} from '../shared';
export { ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '../shared';
export type { ChartThemeProviderProps } from './theme-provider';
export { ChartThemeProvider } from './theme-provider';

/** 基础 Chart 的完整 PlotSpec authoring 入口 */
export type ChartSpecProps = Omit<PlotSpecProps, keyof ChartCommonProps | 'children'> &
  ChartCommonProps & {
    /** spec 入口只允许 presentation markers */
    children?: ReactNode;
    /** Chart-owned token 稀疏覆盖 */
    chartThemeTokens?: IRChart['chartThemeTokens'];
  };

/** 基础 Chart 的 Plot JSX DSL authoring 入口 */
export type ChartDslProps = Omit<PlotDslProps, keyof ChartCommonProps | 'children' | 'id'> &
  ChartCommonProps & {
    /** Plot DSL children 与 Chart presentation marker 可混排 */
    children: ReactNode;
    /** Chart-owned token 稀疏覆盖 */
    chartThemeTokens?: IRChart['chartThemeTokens'];
  };

/** 基础 Chart 的两条 Plot authoring 入口 */
export type ChartProps = ChartSpecProps | ChartDslProps;

const isSpecProps = (props: ChartProps): props is ChartSpecProps => 'spec' in props && props.spec !== undefined;

/** 从 Chart 根 props 组装可由 Chart Vanilla adapter 消费的根 Scope */
const createChartPanelInput = (props: ChartProps): InputChart['panel'] => {
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

/** 将基础 Chart React props 转换为唯一的 Chart Vanilla 输入 */
const createChartInput = (props: Readonly<Record<string, unknown>>): InputChart => {
  const chartProps = props as ChartProps;
  const {
    title,
    subtitle,
    note,
    source,
    chartThemeTokens,
    chartThemeStyles,
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
    ...plotProps
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
  const split = splitPresentationMarkers(children);
  if (isSpecProps(chartProps) && hasPlotChild(split.plotChildren)) {
    throw new Error('chart react: Chart spec mode only accepts presentation markers as children');
  }
  const resolvedPlotProps = isSpecProps(chartProps)
    ? ({ ...plotProps, width: _width, height: _height, children: undefined } as PlotProps)
    : ({
        ...plotProps,
        width: _width,
        height: _height,
        ...(id === undefined ? {} : { id: `${id}/plot` }),
        children: split.plotChildren,
      } as PlotProps);
  const plot = resolvePlotAuthoring(resolvedPlotProps);
  const panel = createChartPanelInput(chartProps);
  return {
    ...(id === undefined ? {} : { id }),
    ...(chartThemeTokens === undefined ? {} : { chartThemeTokens }),
    plot: plot.input,
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(note === undefined ? {} : { note }),
    ...(source === undefined ? {} : { source }),
    ...(split.presentation.length === 0 ? {} : { presentation: split.presentation }),
    datasets: plot.datasets,
    lowerOptions: plot.lowerOptions,
    ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
    ...(panel === undefined ? {} : { panel }),
  };
};

const ChartComponent: FC<ChartProps> = props => {
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
  const effectiveProps = useMemo(() => {
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
    createElement(ChartComponent, effectiveProps),
  );
};

/** 基础 Chart React 组件 */
export const Chart = ChartComponent as InputEmbeddableChartComponent<
  ChartProps,
  InputChart,
  typeof ChartInputEmbedAdapter
>;
Chart.displayName = 'Chart';
Chart.isTier2Embeddable = true;
Chart.inputEmbedAdapter = ChartInputEmbedAdapter;
Chart.createInputEmbedProps = createChartInput;
