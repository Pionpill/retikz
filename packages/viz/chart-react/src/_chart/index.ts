import type { IRBaseChart } from '@retikz/chart';
import type { PlotDslProps, PlotIRProps, PlotProps } from '@retikz/plot-react';
import type { FC, ReactNode } from 'react';

import { BaseChartRecipe } from '@retikz/chart';
import { ChartInputEmbedAdapter, normalizeChart } from '@retikz/chart-vanilla';
import { resolvePlotAuthoring, usePlotThemeStyles } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { createElement, useMemo } from 'react';

import type { ChartCommonProps, InputEmbeddableChartComponent } from '../shared';

import { RetikzChartReactError } from '../error';
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

type BoundChartAuthoring = Parameters<typeof ChartInputEmbedAdapter.lower>[0];

/** 基础 Chart 的完整 `IRPlot` 编写入口 */
export type ChartIRProps = Omit<PlotIRProps, keyof ChartCommonProps | 'children'> &
  ChartCommonProps & {
    /** 配置入口只允许展示标记 */
    children?: ReactNode;
    /** Chart 自有令牌的稀疏覆盖 */
    chartThemeTokens?: IRBaseChart['chartThemeTokens'];
  };

/** 基础 Chart 的 Plot JSX DSL 编写入口 */
export type ChartDslProps = Omit<PlotDslProps, keyof ChartCommonProps | 'children' | 'id'> &
  ChartCommonProps & {
    /** Plot DSL 子项与 Chart 展示标记可混排 */
    children: ReactNode;
    /** Chart 自有令牌的稀疏覆盖 */
    chartThemeTokens?: IRBaseChart['chartThemeTokens'];
  };

/** 基础 Chart 的两条 Plot 编写入口 */
export type ChartProps = ChartIRProps | ChartDslProps;

const isIRProps = (props: ChartProps): props is ChartIRProps => 'spec' in props && props.spec !== undefined;

/** 从 Chart 根属性组装可由 Chart 适配器使用的根 Scope */
const createChartPanelInput = (props: ChartProps): BoundChartAuthoring['panel'] => {
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

/** 将基础 Chart React 属性转换为已绑定的 Base Chart 输入 */
const createChartInput = (props: Readonly<Record<string, unknown>>): BoundChartAuthoring => {
  const chartProps = props as ChartProps;
  const {
    title,
    subtitle,
    note,
    source,
    chartThemeTokens,
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
  if (isIRProps(chartProps) && hasPlotChild(split.plotChildren)) {
    throw new RetikzChartReactError('chart react: Chart spec mode only accepts presentation markers as children');
  }
  const resolvedPlotProps = isIRProps(chartProps)
    ? ({ ...plotProps, width: _width, height: _height, children: undefined } as PlotProps)
    : ({
        ...plotProps,
        width: _width,
        height: _height,
        ...(id === undefined ? {} : { id: `${id}/plot` }),
        children: split.plotChildren,
      } as PlotProps);
  const plot = resolvePlotAuthoring(resolvedPlotProps);
  const chart = normalizeChart({
    ...(id === undefined ? {} : { id }),
    ...(chartThemeTokens === undefined ? {} : { chartThemeTokens }),
    plot: plot.spec,
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(note === undefined ? {} : { note }),
    ...(source === undefined ? {} : { source }),
    ...(split.presentation.length === 0 ? {} : { presentation: split.presentation }),
  });
  const panel = createChartPanelInput(chartProps);
  return {
    bound: BaseChartRecipe.bind(chart),
    datasets: plot.datasets,
    lowerOptions: {
      ...plot.lowerOptions,
      ...(plotThemeStyles === undefined ? {} : { plotThemeStyles }),
    },
    ...(chartThemeStyles === undefined ? {} : { chartThemeStyles }),
    ...(plotThemeStyles === undefined ? {} : { plotThemeStyles }),
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
  BoundChartAuthoring,
  typeof ChartInputEmbedAdapter
>;
Chart.displayName = 'Chart';
Chart.isTier2Embeddable = true;
Chart.inputEmbedAdapter = ChartInputEmbedAdapter;
Chart.createInputEmbedProps = createChartInput;
