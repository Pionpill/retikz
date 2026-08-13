import type { PlotDslProps, PlotProps, PlotSpecProps } from '@retikz/plot-react';
import type { EmbeddableContribution, EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { ChartProvider, createChart, createChartProvider } from '@retikz/chart';
import { resolveCoreProviderDependencies } from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { createPlotProviderContribution } from '@retikz/plot';
import { resolvePlotAuthoring, usePlotThemeStyles } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { SurfaceProvider } from '@retikz/standard';
import { createElement } from 'react';

import type { ChartCommonProps, EmbeddableChartComponent } from '../shared';

import { hasPlotChild, splitPresentationMarkers, useChartThemeStyles, wrapChartScope } from '../shared';

export type {
  ChartCommonProps,
  ChartHostProps,
  ChartPresentationProps,
  ChartRootProps,
  ChartRuntimeThemeProps,
  ChartTextAuthoring,
  EmbeddableChartComponent,
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
    chartThemeTokens?: ReturnType<typeof createChart>['chartThemeTokens'];
  };

/** 基础 Chart 的 Plot JSX DSL authoring 入口 */
export type ChartDslProps = Omit<PlotDslProps, keyof ChartCommonProps | 'children' | 'id'> &
  ChartCommonProps & {
    /** Plot DSL children 与 Chart presentation marker 可混排 */
    children: ReactNode;
    /** Chart-owned token 稀疏覆盖 */
    chartThemeTokens?: ReturnType<typeof createChart>['chartThemeTokens'];
  };

/** 基础 Chart 的两条 Plot authoring 入口 */
export type ChartProps = ChartSpecProps | ChartDslProps;

const isSpecProps = (props: ChartProps): props is ChartSpecProps => 'spec' in props && props.spec !== undefined;

/** 将基础 Chart React props 统一为 canonical Chart 与 provider graph contribution */
export const resolveChartContribution = (props: ChartProps): EmbeddableContribution => {
  const {
    title,
    subtitle,
    note,
    source,
    chartThemeTokens,
    chartThemeStyles,
    id,
    x,
    y,
    transforms,
    placement,
    zIndex,
    clip,
    theme,
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
    ...plotProps
  } = props;
  void _width;
  void _height;
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
  const split = splitPresentationMarkers(children);
  if (isSpecProps(props) && hasPlotChild(split.plotChildren)) {
    throw new Error('chart react: Chart spec mode only accepts presentation markers as children');
  }
  const resolvedPlotProps = isSpecProps(props)
    ? ({ ...plotProps, width: _width, height: _height, children: undefined } as PlotProps)
    : ({
        ...plotProps,
        width: _width,
        height: _height,
        ...(id === undefined ? {} : { id: `${id}/plot` }),
        children: split.plotChildren,
      } as PlotProps);
  const plot = resolvePlotAuthoring(resolvedPlotProps);
  const chart = createChart({
    ...(id === undefined ? {} : { id }),
    ...(chartThemeTokens === undefined ? {} : { chartThemeTokens }),
    plot: plot.spec,
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
    ...(note === undefined ? {} : { note }),
    ...(source === undefined ? {} : { source }),
    ...(split.presentation.length === 0 ? {} : { presentation: split.presentation }),
  });
  const plotContribution = createPlotProviderContribution(plot.datasets, plot.lowerOptions);
  const chartProvider = createChartProvider(chartThemeStyles);
  return {
    node: wrapChartScope(chart, { x, y, transforms, placement, zIndex, clip, theme }),
    providerDependencies: {
      roots: [ChartProvider.key],
      providers: [SurfaceProvider, FlexLayoutProvider, ...plotContribution.providers, chartProvider],
    },
  };
};

const chartEmbeddableAdapter: EmbeddableTier2Adapter<ChartProps> = {
  displayName: 'Chart',
  contribute: resolveChartContribution,
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
  const contribution = resolveChartContribution({
    ...props,
    chartThemeStyles:
      ambientChartThemeStyles === undefined
        ? props.chartThemeStyles
        : props.chartThemeStyles === undefined
          ? ambientChartThemeStyles
          : [...ambientChartThemeStyles, ...props.chartThemeStyles],
    plotThemeStyles:
      ambientPlotThemeStyles === undefined
        ? props.plotThemeStyles
        : props.plotThemeStyles === undefined
          ? ambientPlotThemeStyles
          : [...ambientPlotThemeStyles, ...props.plotThemeStyles],
  });
  const providerDefinitions = resolveCoreProviderDependencies({ contributions: [contribution.providerDependencies] });
  return createElement(Layout, {
    ir: { version: 1, type: 'scene', children: [contribution.node] },
    ...providerDefinitions,
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
  });
};

/** 基础 Chart React 组件 */
export const Chart = ChartComponent as EmbeddableChartComponent<ChartProps>;
Chart.displayName = 'Chart';
Chart.isTier2Embeddable = true;
Chart.embeddableAdapter = chartEmbeddableAdapter;
