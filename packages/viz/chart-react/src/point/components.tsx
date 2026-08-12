import type {
  IRBubbleChartSpec,
  IRConnectedScatterChartSpec,
  IRScatterChartSpec,
  PointChartTypeValue,
} from '@retikz/chart/point';
import type { ResolvedTheme, ThemeStyleDefinition } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { EmbeddableAuthoringContext, EmbeddableContribution, EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import {
  ChartProvider,
  createChartProvider,
  DEFAULT_CHART_DATA_REFERENCE,
  PointChartType,
  resolvePointChartSpec,
} from '@retikz/chart/point';
import {
  DEFAULT_RESOLVED_THEME,
  resolveCompositeDependencies,
  resolveTheme,
  resolveThemeStyleRegistry,
} from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { createPlotProvider } from '@retikz/plot';
import { resolvePlotExtensionAuthoring, usePlotThemeStyles } from '@retikz/plot-react';
import { Layout, useTheme, useThemeStyles } from '@retikz/react';
import { SurfaceProvider } from '@retikz/standard';
import { createElement } from 'react';

import type { ChartCommonProps, ChartRootProps, EmbeddableChartComponent } from '../shared';

import { splitPresentationMarkers, useChartThemeStyles, wrapChartScope } from '../shared';

/** typed Point Chart 共享的 React input algebra */
export type TypedPointChartProps<TSpec> = Omit<
  TSpec,
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
    transform?: IRScatterChartSpec['transform'];
    /** recipe 外的 Plot scale members */
    scales?: IRScatterChartSpec['scales'];
    /** recipe 外的单 coordinate root */
    coordinate?: IRScatterChartSpec['coordinate'];
    /** recipe 外的 composition root */
    composition?: IRScatterChartSpec['composition'];
    /** recipe 外的 Plot guides */
    guides?: IRScatterChartSpec['guides'];
    /** recipe 外的 Plot marks */
    marks?: IRScatterChartSpec['marks'];
  };

/** ScatterChart React props */
export type ScatterChartProps = TypedPointChartProps<IRScatterChartSpec>;
/** BubbleChart React props */
export type BubbleChartProps = TypedPointChartProps<IRBubbleChartSpec>;
/** ConnectedScatterChart React props */
export type ConnectedScatterChartProps = TypedPointChartProps<IRConnectedScatterChartSpec>;

type AnyTypedPointChartProps = ScatterChartProps | BubbleChartProps | ConnectedScatterChartProps;

/** 解析 typed Point recipe 在当前 Chart 根上实际生效的 Core Theme */
const resolveTypedChartTheme = (
  inheritedTheme: ResolvedTheme,
  theme: ChartRootProps['theme'] | undefined,
  themeStyles: ReadonlyArray<ThemeStyleDefinition> | undefined,
): ResolvedTheme =>
  resolveTheme(inheritedTheme, theme, 'chart-react Point Chart Theme', resolveThemeStyleRegistry(themeStyles));

const mergeCoreThemeStyles = (
  inherited: ReadonlyArray<ThemeStyleDefinition> | undefined,
  local: ReadonlyArray<ThemeStyleDefinition> | undefined,
): ReadonlyArray<ThemeStyleDefinition> | undefined => {
  if (inherited === undefined) return local;
  if (local === undefined) return inherited;
  return [...inherited, ...local];
};

const resolveEmbeddedTypedChartTheme = (
  props: AnyTypedPointChartProps,
  context: EmbeddableAuthoringContext | undefined,
): ResolvedTheme => resolveTypedChartTheme(context?.theme ?? DEFAULT_RESOLVED_THEME, props.theme, context?.themeStyles);

const typedChartContribution = (
  type: PointChartTypeValue,
  props: AnyTypedPointChartProps,
  effectiveTheme: ResolvedTheme | undefined = undefined,
): EmbeddableContribution => {
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
    transform,
    scales,
    coordinate,
    composition,
    guides,
    marks,
    ...recipeInput
  } = props;
  void _className;
  void _style;
  void _renderer;
  void _runtime;
  void _animate;
  void _snapshotAt;
  void _animationRef;
  void _onArtifacts;
  void _onCompileResult;
  const reference = dataRef ?? DEFAULT_CHART_DATA_REFERENCE;
  const resolvedTheme = effectiveTheme ?? resolveTypedChartTheme(DEFAULT_RESOLVED_THEME, theme, _themeStyles);
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
  const resolution = resolvePointChartSpec(
    {
      namespace: 'chart',
      type,
      ...(id === undefined ? {} : { id }),
      data: { reference },
      ...recipeInput,
      ...extension.fragment,
      ...(_width === undefined ? {} : { width: _width }),
      ...(_height === undefined ? {} : { height: _height }),
    },
    resolvedTheme,
    { chartThemeStyles, plotThemeStyles },
    {
      ...(title === undefined ? {} : { title }),
      ...(subtitle === undefined ? {} : { subtitle }),
      ...(note === undefined ? {} : { note }),
      ...(source === undefined ? {} : { source }),
      ...(split.presentation.length === 0 ? {} : { presentation: split.presentation }),
    },
  );
  const plotProvider = createPlotProvider(
    { [reference]: data },
    {
      ...extension.runtime,
      ...(plotThemeStyles === undefined ? {} : { plotThemeStyles }),
    },
  );
  const chartProvider = createChartProvider(chartThemeStyles);
  return {
    node: wrapChartScope(resolution.chart, { x, y, transforms, placement, zIndex, clip, theme }),
    compositeDependencies: {
      roots: [ChartProvider.key],
      providers: [SurfaceProvider, FlexLayoutProvider, plotProvider, chartProvider],
    },
  };
};

const createTypedChartComponent = <TProps extends AnyTypedPointChartProps>(
  type: PointChartTypeValue,
  displayName: string,
): EmbeddableChartComponent<TProps> => {
  const adapter: EmbeddableTier2Adapter<TProps> = {
    displayName,
    contribute: (props, context) => typedChartContribution(type, props, resolveEmbeddedTypedChartTheme(props, context)),
  };
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
    const ambientTheme = useTheme();
    const ambientCoreThemeStyles = useThemeStyles();
    const ambientChartThemeStyles = useChartThemeStyles();
    const ambientPlotThemeStyles = usePlotThemeStyles();
    const coreThemeStyles = mergeCoreThemeStyles(ambientCoreThemeStyles, themeStyles);
    const contributionProps = {
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
    };
    const contribution = typedChartContribution(
      type,
      contributionProps,
      resolveTypedChartTheme(
        resolveTheme(
          DEFAULT_RESOLVED_THEME,
          ambientTheme,
          'chart-react ambient Theme',
          resolveThemeStyleRegistry(coreThemeStyles),
        ),
        props.theme,
        coreThemeStyles,
      ),
    );
    const composites = resolveCompositeDependencies({ contributions: [contribution.compositeDependencies] });
    return createElement(Layout, {
      ir: { version: 1, type: 'scene', children: [contribution.node] },
      composites,
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
  const chart = Component as EmbeddableChartComponent<TProps>;
  chart.displayName = displayName;
  chart.isTier2Embeddable = true;
  chart.embeddableAdapter = adapter;
  return chart;
};

/** Scatter typed Chart React component */
export const ScatterChart = createTypedChartComponent<ScatterChartProps>(PointChartType.Scatter, 'ScatterChart');
/** Bubble typed Chart React component */
export const BubbleChart = createTypedChartComponent<BubbleChartProps>(PointChartType.Bubble, 'BubbleChart');
/** Connected Scatter typed Chart React component */
export const ConnectedScatterChart = createTypedChartComponent<ConnectedScatterChartProps>(
  PointChartType.ConnectedScatter,
  'ConnectedScatterChart',
);
