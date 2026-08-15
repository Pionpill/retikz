import type { ExternalDatasets, ExternalRow, IRDataModel } from '@retikz/data';
import type {
  IRPlotSpec,
  IRPlotTransform,
  LowerPlotsOptions,
  PlotHostLineageMetadata,
  PlotLineageOptions,
  PlotLineageRun,
} from '@retikz/plot';
import type {
  InputPlotCoordinate,
  InputPlotEmbed,
  InputPlotPanel,
  MarkTransformShortcutDefinition,
} from '@retikz/plot-vanilla';
import type { LayoutProps } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { PlotInputEmbedAdapter } from '@retikz/plot-vanilla';
import { Layout } from '@retikz/react';
import { useEffect, useMemo, useRef } from 'react';

import { resolvePlotAuthoring, resolvePlotLineage } from './plot-runtime';
import { usePlotThemeStyles } from './theme-context';

/** <Plot> 作为 Layout 子面板时可直接承接的 Scope 输入 */
export type PlotPanelProps = InputPlotPanel;

/** <Plot> 两条入口共享的展示 props 与 Plot lowering 选项 */
export type PlotCommonProps = Pick<LayoutProps, 'className' | 'style' | 'renderer' | 'themeStyles'> &
  PlotPanelProps &
  LowerPlotsOptions &
  PlotLineageProps;

/** React adapter 暴露的运行时图元链路 props */
export type PlotLineageProps = {
  /** 图元链路记录开关 */
  lineage?: false | PlotLineageOptions;
  /** 宿主侧查询或权限元数据 */
  hostLineageMetadata?: PlotHostLineageMetadata;
  /** 渲染后接收 runtime-only 图元链路产物 */
  onLineage?: (lineage: PlotLineageRun) => void;
};

/** Plot-owned theme 输入 */
export type PlotThemeProps = {
  /** Plot-owned canonical theme token 稀疏覆盖 */
  plotThemeTokens?: IRPlotSpec['plotThemeTokens'];
  /** 按 Axis dimension 覆盖 Plot-owned token 的有序规则 */
  plotThemeTokenRules?: IRPlotSpec['plotThemeTokenRules'];
  /** Plot theme 的 JSON-safe 默认值 */
  plotTheme?: IRPlotSpec['plotTheme'];
};

/** 已构造 Plot Source IR 的薄包装入口 */
export type PlotSpecProps = PlotCommonProps &
  PlotThemeProps & {
    /** 完整 Plot Source IR 根节点 */
    spec: IRPlotSpec;
    /** 由 Plot lowering 消费的外部数据集表 */
    data: ExternalDatasets;
    children?: never;
  };

/** 由 React 组合 DSL 构造 Plot Source IR 的入口 */
export type PlotDslProps = PlotCommonProps &
  PlotThemeProps & {
    /** 不与 children 入口并存 */
    spec?: never;
    /** 面板身份和嵌入式 DSL 默认数据集引用 */
    id?: string;
    /** 嵌入式 DSL 使用的显式数据集引用 */
    dataRef?: string;
    /** 运行时数据行 */
    data: Array<ExternalRow>;
    /** mark 与 guide React 子组件 */
    children: ReactNode;
    /** 字段名与字段类型模型 */
    model?: IRDataModel;
    /** 逻辑字段到物理数据路径的映射 */
    fieldMap?: Record<string, string>;
    /** 坐标系输入 */
    coordinate?: InputPlotCoordinate;
    /** Plot composition 输入 */
    composition?: IRPlotSpec['composition'];
    /** 组合 DSL 前插入的 Plot data transforms */
    dataTransforms?: Array<IRPlotTransform>;
    /** 由 mark 组件收集的 transform shortcut 定义 */
    markTransformShortcuts?: Array<MarkTransformShortcutDefinition>;
  };

/** <Plot> props，spec 入口与组合 DSL 入口二选一 */
export type PlotProps = PlotSpecProps | PlotDslProps;

/** 从 React 面板 props 组装 Plot Vanilla Input 的 Scope 部分 */
const createPlotPanelInput = (props: PlotPanelProps): InputPlotPanel | undefined => {
  const { x, y, transforms, zIndex, clip, theme } = props;
  if (
    x === undefined &&
    y === undefined &&
    transforms === undefined &&
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
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
  };
};

/** 将 React Plot props 收敛为由 Plot Vanilla adapter 消费的 Input */
const createPlotInput = (props: Readonly<Record<string, unknown>>): InputPlotEmbed => {
  const plotProps = props as PlotProps;
  const { spec, datasets, lowerOptions } = resolvePlotAuthoring(plotProps, { embedded: true });
  const panel = createPlotPanelInput(plotProps);
  return {
    spec,
    datasets,
    lowerOptions,
    preserveRootIdentity: true,
    ...(panel === undefined ? {} : { panel }),
  };
};

type InputEmbeddablePlotComponent = FC<PlotProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: typeof PlotInputEmbedAdapter;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => InputPlotEmbed;
};

/** Plot React 组件 */
const PlotComponent: FC<PlotProps> = props => {
  const { width, height, className, style, renderer, themeStyles, onLineage } = props;
  const ambientPlotThemeStyles = usePlotThemeStyles();
  const effectiveProps = useMemo(() => {
    if (ambientPlotThemeStyles === undefined) return props;
    if (props.plotThemeStyles === undefined) return { ...props, plotThemeStyles: ambientPlotThemeStyles };
    return { ...props, plotThemeStyles: [...ambientPlotThemeStyles, ...props.plotThemeStyles] };
  }, [ambientPlotThemeStyles, props]);
  const notifiedLineageKey = useRef<string>();
  const lineage = onLineage === undefined || props.lineage === false ? undefined : resolvePlotLineage(effectiveProps);
  const lineageKey = lineage === undefined ? undefined : JSON.stringify(lineage);

  useEffect(() => {
    if (lineage === undefined || lineageKey === undefined || onLineage === undefined) return;
    if (notifiedLineageKey.current === lineageKey) return;
    notifiedLineageKey.current = lineageKey;
    onLineage(lineage);
  }, [lineage, lineageKey, onLineage]);

  return (
    <Layout
      width={width}
      height={height}
      className={className}
      style={style}
      renderer={renderer}
      themeStyles={themeStyles}
    >
      <PlotComponent {...effectiveProps} />
    </Layout>
  );
};

/** Plot React authoring 入口 */
export const Plot = PlotComponent as InputEmbeddablePlotComponent;

Plot.displayName = 'Plot';
Plot.isTier2Embeddable = true;
Plot.inputEmbedAdapter = PlotInputEmbedAdapter;
Plot.createInputEmbedProps = createPlotInput;
