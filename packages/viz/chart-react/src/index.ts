import type { IRChild, IRFont, IRLineSpec, IRNode, IRScope } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type { IRTextBlock } from '@retikz/core';
import type { EmbeddableContribution, EmbeddableTier2Adapter, LayoutProps, ScopeProps } from '@retikz/react';
import type { PlotDslProps, PlotProps, PlotSpecProps } from '@retikz/plot-react';
import type { FC, ReactNode } from 'react';

import { resolveCompositeDependencies } from '@retikz/core';
import {
  ChartPresentationPreset,
  ChartProvider,
  ChartType,
  createChart,
  DEFAULT_CHART_DATA_REFERENCE,
  resolveChartSpec,
  type ChartPresentationAuthoringRecord,
  type ChartPresentationFlexItem,
  type ChartPresentationPresetValue,
  type ChartTypeValue,
  type IRBubbleChartSpec,
  type IRConnectedScatterChartSpec,
  type IRScatterChartSpec,
} from '@retikz/chart';
import { FlexLayoutProvider } from '@retikz/layout';
import { createPlotProvider } from '@retikz/plot';
import { Layout, Text } from '@retikz/react';
import { resolvePlotAuthoring, resolvePlotExtensionAuthoring } from '@retikz/plot-react';
import { SurfaceProvider } from '@retikz/standard';
import { createElement, Fragment, isValidElement } from 'react';

/** Chart 的四个 presentation shorthand */
export type ChartPresentationProps = Readonly<{
  /** Chart 标题 */
  title?: string;
  /** Chart 副标题 */
  subtitle?: string;
  /** Chart 注记 */
  note?: string;
  /** Chart 数据来源 */
  source?: string;
}>;

/** Chart standalone 复用的 Layout host 字段 */
export type ChartHostProps = Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer' | 'themeStyles'>;

/** Chart 整图根的 Scope 字段 */
export type ChartRootProps = Pick<ScopeProps, 'id' | 'transforms' | 'placement' | 'zIndex' | 'clip' | 'theme'> & {
  /** x 方向外层平移 */
  x?: number;
  /** y 方向外层平移 */
  y?: number;
};

/** Chart 的 host、根和 presentation 公共字段 */
export type ChartCommonProps = ChartHostProps & ChartRootProps & ChartPresentationProps;

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

/** typed Chart 共享的 React input algebra */
export type TypedChartProps<TSpec> = Omit<
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
export type ScatterChartProps = TypedChartProps<IRScatterChartSpec>;
/** BubbleChart React props */
export type BubbleChartProps = TypedChartProps<IRBubbleChartSpec>;
/** ConnectedScatterChart React props */
export type ConnectedScatterChartProps = TypedChartProps<IRConnectedScatterChartSpec>;

/** Chart marker 中支持的整行 Text authoring */
export type ChartTextAuthoring = ReactNode;

/** Headless Chart presentation marker 的公共字段 */
export type ChartPresentationMarkerProps = ChartPresentationFlexItem & {
  /** marker 正文：字符串、透明 Fragment 或 Core Text */
  children: ChartTextAuthoring;
  /** authoring 期位置；不进入 canonical IR */
  position?: 'top' | 'bottom';
  /** block-level 字体覆盖 */
  font?: IRFont;
  /** block-level 文本颜色覆盖 */
  textColor?: IRNode['textColor'];
  /** block-level 文本对齐覆盖 */
  align?: IRNode['align'];
  /** block-level 行高覆盖 */
  lineHeight?: IRNode['lineHeight'];
  /** block-level 最大文本宽度覆盖 */
  maxTextWidth?: IRNode['maxTextWidth'];
};

type ChartPresentationMarkerComponent = FC<ChartPresentationMarkerProps> & {
  presentationPreset: ChartPresentationPresetValue;
};

const createPresentationMarker = (preset: ChartPresentationPresetValue): ChartPresentationMarkerComponent => {
  const Marker: FC<ChartPresentationMarkerProps> = () => null;
  const component = Marker as ChartPresentationMarkerComponent;
  component.presentationPreset = preset;
  component.displayName = `Chart${preset.slice(0, 1).toUpperCase()}${preset.slice(1)}`;
  return component;
};

/** Chart 标题的 headless JSX marker */
export const ChartTitle = createPresentationMarker(ChartPresentationPreset.Title);
/** Chart 副标题的 headless JSX marker */
export const ChartSubtitle = createPresentationMarker(ChartPresentationPreset.Subtitle);
/** Chart 注记的 headless JSX marker */
export const ChartNote = createPresentationMarker(ChartPresentationPreset.Note);
/** Chart 来源的 headless JSX marker */
export const ChartSource = createPresentationMarker(ChartPresentationPreset.Source);

const isPresentationMarker = (value: unknown): value is ChartPresentationMarkerComponent =>
  value === ChartTitle || value === ChartSubtitle || value === ChartNote || value === ChartSource;

type ChartTextLine = IRLineSpec;

const textLinesOf = (children: ReactNode): Array<ChartTextLine> => {
  const lines: Array<ChartTextLine> = [];
  const append = (value: ReactNode): void => {
    if (value === null || value === undefined || typeof value === 'boolean') return;
    if (typeof value === 'string') {
      lines.push(value);
      return;
    }
    if (isValidElement(value) && value.type === Fragment) {
      append(value.props.children as ReactNode);
      return;
    }
    if (isValidElement(value) && value.type === Text) {
      const props = value.props as { children: string | number; fill?: string; opacity?: number; font?: IRFont };
      const text = String(props.children);
      const line: ChartTextLine =
        props.fill === undefined && props.opacity === undefined && props.font === undefined
          ? text
          : {
              text,
              ...(props.fill === undefined ? {} : { fill: props.fill }),
              ...(props.opacity === undefined ? {} : { opacity: props.opacity }),
              ...(props.font === undefined ? {} : { font: props.font }),
            };
      lines.push(line);
      return;
    }
    throw new Error('chart react: presentation marker children accept only strings, Fragment, or Text');
  };
  append(children);
  if (lines.length === 0) throw new Error('chart react: presentation marker requires at least one text line');
  return lines;
};

const textBlockOf = (children: ReactNode): IRTextBlock => {
  const lines = textLinesOf(children);
  const first = lines.at(0);
  if (first === undefined) throw new Error('chart react: presentation marker requires at least one text line');
  return lines.length === 1 && typeof first === 'string' ? first : lines;
};

const recordOf = (
  preset: ChartPresentationPresetValue,
  props: ChartPresentationMarkerProps,
): ChartPresentationAuthoringRecord => {
  const {
    children,
    position,
    font,
    textColor,
    align,
    lineHeight,
    maxTextWidth,
    margin,
    basis,
    grow,
    shrink,
    min,
    max,
    alignSelf,
  } = props;
  return {
    preset,
    text: textBlockOf(children),
    ...(position === undefined ? {} : { position }),
    ...(font === undefined ? {} : { font }),
    ...(textColor === undefined ? {} : { textColor }),
    ...(align === undefined ? {} : { align }),
    ...(lineHeight === undefined ? {} : { lineHeight }),
    ...(maxTextWidth === undefined ? {} : { maxTextWidth }),
    ...(margin === undefined ? {} : { margin }),
    ...(basis === undefined ? {} : { basis }),
    ...(grow === undefined ? {} : { grow }),
    ...(shrink === undefined ? {} : { shrink }),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
    ...(alignSelf === undefined ? {} : { alignSelf }),
  };
};

type MarkerSplit = {
  presentation: Array<ChartPresentationAuthoringRecord>;
  plotChildren: ReactNode;
};

/** 从透明 Fragment 中按出现顺序抽取 marker，同时保留其余 Plot React tree 的位置 */
const splitPresentationMarkers = (children: ReactNode): MarkerSplit => {
  const presentation: Array<ChartPresentationAuthoringRecord> = [];
  const visit = (value: ReactNode): ReactNode => {
    if (Array.isArray(value)) return value.map(visit);
    if (!isValidElement(value)) return value;
    if (value.type === Fragment) return createElement(Fragment, null, visit(value.props.children as ReactNode));
    if (!isPresentationMarker(value.type)) return value;
    presentation.push(recordOf(value.type.presentationPreset, value.props as ChartPresentationMarkerProps));
    return null;
  };
  return { presentation, plotChildren: visit(children) };
};

const hasPlotChild = (value: ReactNode): boolean => {
  if (value === null || value === undefined || typeof value === 'boolean') return false;
  if (Array.isArray(value)) return value.some(hasPlotChild);
  if (isValidElement(value) && value.type === Fragment) return hasPlotChild(value.props.children as ReactNode);
  return true;
};

const isSpecProps = (props: ChartProps): props is ChartSpecProps => 'spec' in props && props.spec !== undefined;

const wrapChartScope = (chart: ReturnType<typeof createChart>, props: ChartRootProps): IRChild => {
  const { id, x, y, transforms, placement, zIndex, clip, theme } = props;
  const scopeTransforms =
    x !== undefined || y !== undefined
      ? ([{ kind: 'translate', x: x ?? 0, y: y ?? 0 }, ...(transforms ?? [])] as NonNullable<IRScope['transforms']>)
      : transforms;
  if (
    scopeTransforms === undefined &&
    placement === undefined &&
    zIndex === undefined &&
    clip === undefined &&
    theme === undefined
  ) {
    return chart;
  }
  return {
    type: 'scope',
    ...(id === undefined ? {} : { id }),
    ...(scopeTransforms === undefined ? {} : { transforms: scopeTransforms }),
    ...(placement === undefined ? {} : { placement }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
    children: [chart],
  };
};

/** 将基础 Chart React props 统一为 canonical Chart 与 provider graph contribution */
export const resolveChartContribution = (props: ChartProps): EmbeddableContribution => {
  const {
    title,
    subtitle,
    note,
    source,
    chartThemeTokens,
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
    ...plotProps
  } = props;
  void _width;
  void _height;
  void _className;
  void _style;
  void _renderer;
  void _themeStyles;
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
  const plotProvider = createPlotProvider(plot.datasets, plot.lowerOptions);
  return {
    node: wrapChartScope(chart, { id, x, y, transforms, placement, zIndex, clip, theme }),
    compositeDependencies: {
      roots: [ChartProvider.key],
      providers: [SurfaceProvider, FlexLayoutProvider, plotProvider, ChartProvider],
    },
  };
};

const chartEmbeddableAdapter: EmbeddableTier2Adapter<ChartProps> = {
  displayName: 'Chart',
  contribute: resolveChartContribution,
};

/** 可嵌入基础 Chart React component 的静态契约 */
export type EmbeddableChartComponent<TProps> = FC<TProps> & {
  isTier2Embeddable: true;
  embeddableAdapter: EmbeddableTier2Adapter<TProps>;
};

const ChartComponent: FC<ChartProps> = props => {
  const { width, height, className, style, renderer, themeStyles } = props;
  const contribution = resolveChartContribution(props);
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
  });
};

/** 基础 Chart React 组件 */
export const Chart = ChartComponent as EmbeddableChartComponent<ChartProps>;
Chart.displayName = 'Chart';
Chart.isTier2Embeddable = true;
Chart.embeddableAdapter = chartEmbeddableAdapter;

type AnyTypedChartProps = ScatterChartProps | BubbleChartProps | ConnectedScatterChartProps;

const typedChartContribution = (type: ChartTypeValue, props: AnyTypedChartProps): EmbeddableContribution => {
  const {
    data,
    dataRef,
    title,
    subtitle,
    note,
    source,
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
  void _themeStyles;
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
  const resolution = resolveChartSpec(
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
    undefined,
    {},
    {
      ...(title === undefined ? {} : { title }),
      ...(subtitle === undefined ? {} : { subtitle }),
      ...(note === undefined ? {} : { note }),
      ...(source === undefined ? {} : { source }),
      ...(split.presentation.length === 0 ? {} : { presentation: split.presentation }),
    },
  );
  const plotProvider = createPlotProvider({ [reference]: data }, { ...extension.runtime });
  return {
    node: wrapChartScope(resolution.chart, { id, x, y, transforms, placement, zIndex, clip, theme }),
    compositeDependencies: {
      roots: [ChartProvider.key],
      providers: [SurfaceProvider, FlexLayoutProvider, plotProvider, ChartProvider],
    },
  };
};

const createTypedChartComponent = <TProps extends AnyTypedChartProps>(
  type: ChartTypeValue,
  displayName: string,
): EmbeddableChartComponent<TProps> => {
  const adapter: EmbeddableTier2Adapter<TProps> = {
    displayName,
    contribute: props => typedChartContribution(type, props),
  };
  const Component: FC<TProps> = props => {
    const { width, height, className, style, renderer, themeStyles } = props;
    const contribution = adapter.contribute(props);
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
    });
  };
  const chart = Component as EmbeddableChartComponent<TProps>;
  chart.displayName = displayName;
  chart.isTier2Embeddable = true;
  chart.embeddableAdapter = adapter;
  return chart;
};

/** Scatter typed Chart React component */
export const ScatterChart = createTypedChartComponent<ScatterChartProps>(ChartType.Scatter, 'ScatterChart');
/** Bubble typed Chart React component */
export const BubbleChart = createTypedChartComponent<BubbleChartProps>(ChartType.Bubble, 'BubbleChart');
/** Connected Scatter typed Chart React component */
export const ConnectedScatterChart = createTypedChartComponent<ConnectedScatterChartProps>(
  ChartType.ConnectedScatter,
  'ConnectedScatterChart',
);
