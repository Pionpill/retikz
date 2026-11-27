import type {
  DataFieldMap,
  ExternalDatasets,
  ExternalRow,
  IRDataModel,
  IRDataTransformDeclaration,
} from '@retikz/data';
import type { RequireExactlyOne } from '@retikz/foundation';
import type { AssertEqual } from '@retikz/foundation';
import { lowerPlotWithLineage } from '@retikz/plot';
import type {
  IRPlot,
  PlotsLoweringOptions,
  PlotHostLineageMetadata,
  PlotLineageOptions,
  PlotLineageRun,
  PreparedPlotData,
} from '@retikz/plot';
import type {
  InputPlotCoordinate,
  InputPlotEmbed,
  InputPlotPanel,
  MarkTransformShortcutDefinition,
} from '@retikz/plot-vanilla';
import { plotInputEmbedAdapter } from '@retikz/plot-vanilla';
import type { LayoutProps } from '@retikz/react';
import { Layout, useTheme, useThemeDefinitions } from '@retikz/react';
import type { CompileOptions } from '@retikz/reconciler';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';

import { RetikzPlotReactError } from './error';
import { resolvePlotAuthoring } from './plot-runtime';
import { usePlotThemeDefinitions } from './theme-context';

/** <Plot> 作为 Layout 子面板时可直接承接的 Scope 输入 */
export type PlotPanelProps = InputPlotPanel;

type PlotLayoutHostProps = Pick<LayoutProps & CompileOptions, 'className' | 'style' | 'renderer' | 'themeDefinitions'>;

/** React adapter 暴露的运行时图元链路 props */
export type PlotLineageProps = {
  /** 图元链路记录开关 */
  lineage?: false | PlotLineageOptions;
  /** 宿主侧查询或权限元数据 */
  hostLineageMetadata?: PlotHostLineageMetadata;
  /** 渲染后接收 runtime-only 图元链路产物 */
  onLineage?: (lineage: PlotLineageRun) => void;
};

type PlotStandaloneProps = PlotLayoutHostProps & PlotLineageProps;

/** Plot standalone 入口消费且 embedded 不支持的字段 */
const PLOT_STANDALONE_PROP_KEYS = [
  'className',
  'style',
  'renderer',
  'themeDefinitions',
  'lineage',
  'hostLineageMetadata',
  'onLineage',
] as const satisfies ReadonlyArray<keyof PlotStandaloneProps>;

type PlotStandalonePropKeysCheck = AssertEqual<(typeof PLOT_STANDALONE_PROP_KEYS)[number], keyof PlotStandaloneProps>;

const plotStandalonePropKeysCheck: PlotStandalonePropKeysCheck = true;
void plotStandalonePropKeysCheck;

/**
 * <Plot> 两条入口共享的展示 props 与 Plot lowering 选项
 */
export type PlotCommonProps = PlotStandaloneProps &
  PlotPanelProps &
  Pick<IRPlot, 'width' | 'height'> &
  PlotsLoweringOptions & {
    /** 根级执行配置；spec已声明时不能重复提供 */
    dataExecution?: IRPlot['dataExecution'];
  };

/** Plot-owned theme 输入 */
export type PlotThemeProps = {
  /** Plot Source 的稀疏默认片段 */
  defaultPlot?: IRPlot['defaultPlot'];
  /** 按 Axis dimension 应用的有序 Plot Source 规则 */
  plotRules?: IRPlot['plotRules'];
};

/**
 * 已构造 Plot Source IR 的薄包装入口
 */
export type PlotIRProps = PlotCommonProps &
  PlotThemeProps &
  RequireExactlyOne<{
    /** 以数据引用名索引的外部行数据集，与 preparedData 互斥 */
    data: ExternalDatasets;
    /** 与当前 spec 匹配的已完成数据计算，与 data 互斥 */
    preparedData: PreparedPlotData;
  }> & {
    /** 完整 Plot Source IR 根节点 */
    spec: IRPlot;
    /** 由 Plot lowering 消费的外部数据集表 */
    children?: never;
  };

/**
 * 由 React 组合 DSL 构造 Plot Source IR 的入口
 */
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
    /** 行数据 DSL 不叠加第二份 runtime 绑定 */
    preparedData?: never;
    /** mark 与 guide React 子组件 */
    children: ReactNode;
    /** 字段名与字段类型模型 */
    model?: IRDataModel;
    /** 逻辑字段到物理数据路径的映射 */
    fieldMap?: DataFieldMap;
    /** 坐标系输入 */
    coordinate?: InputPlotCoordinate;
    /** Plot composition 输入 */
    composition?: IRPlot['composition'];
    /** 组合 DSL 前插入的 Plot data transforms */
    dataTransforms?: Array<IRDataTransformDeclaration>;
    /** 由 mark 组件收集的 transform shortcut 定义 */
    markTransformShortcuts?: Array<MarkTransformShortcutDefinition>;
  };

/**
 * <Plot> props，spec 入口与组合 DSL 入口二选一
 */
export type PlotProps = PlotIRProps | PlotDslProps;

/** 从 React 面板 props 组装 Plot Vanilla Input 的 Scope 部分 */
const createPlotPanelInput = (props: PlotPanelProps): InputPlotPanel | undefined => {
  const { position, transforms, zIndex, clip, theme } = props;
  if (
    position === undefined &&
    transforms === undefined &&
    zIndex === undefined &&
    clip === undefined &&
    theme === undefined
  ) {
    return undefined;
  }

  return {
    ...(position === undefined ? {} : { position }),
    ...(transforms === undefined ? {} : { transforms }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
  };
};

/** 将 React Plot props 收敛为由 Plot Vanilla adapter 消费的 Input */
const createPlotInput = (props: Readonly<Record<string, unknown>>): InputPlotEmbed => {
  const plotProps = props as PlotProps;
  const unsupportedStandaloneProps = PLOT_STANDALONE_PROP_KEYS.filter(key => Object.hasOwn(plotProps, key));
  if (unsupportedStandaloneProps.length > 0) {
    throw new RetikzPlotReactError(
      `plot react: embedded Plot does not support standalone props: ${unsupportedStandaloneProps.join(', ')}; move Layout host props to the outer <Layout> and remove standalone lineage props`,
    );
  }

  const authored = resolvePlotAuthoring(plotProps, { embedded: true });
  const panel = createPlotPanelInput(plotProps);

  return {
    ...authored,
    ...(panel === undefined ? {} : { panel }),
  };
};

type InputEmbeddablePlotComponent = FC<PlotProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: typeof plotInputEmbedAdapter;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => InputPlotEmbed;
  displayName?: string;
};

/** Plot React 组件 */
const PlotContent: FC<InputPlotEmbed> = () => null;

const EmbeddablePlotContent = Object.assign(PlotContent, {
  isTier2Embeddable: true as const,
  inputEmbedAdapter: plotInputEmbedAdapter,
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => props,
});

const PlotComponent: FC<PlotProps> = props => {
  const { className, style, renderer, themeDefinitions, onLineage, definitions, lineage, hostLineageMetadata } = props;
  const ambientPlotThemeDefinitions = usePlotThemeDefinitions();
  const theme = useTheme();
  const ambientDefinitions = useThemeDefinitions();
  const effectiveProps = useMemo(() => {
    if (ambientPlotThemeDefinitions === undefined) return props;
    const explicit = definitions?.plotThemeDefinitions;
    return {
      ...props,
      definitions: {
        ...definitions,
        plotThemeDefinitions:
          explicit === undefined ? ambientPlotThemeDefinitions : [...ambientPlotThemeDefinitions, ...explicit],
      },
    };
  }, [ambientPlotThemeDefinitions, definitions, props]);
  const authored = resolvePlotAuthoring(effectiveProps);
  const panel = createPlotPanelInput(effectiveProps);
  const notifyLineage =
    onLineage && lineage !== false
      ? () => {
          const compiledDefinitions = [...(ambientDefinitions ?? []), ...(themeDefinitions ?? [])];
          const result = lowerPlotWithLineage(
            authored.spec,
            authored.datasets ?? {},
            {
              ...authored.lowerOptions,
              environment: { theme, compile: { themeDefinitions: compiledDefinitions } },
              lineage: lineage ?? {},
              hostLineageMetadata,
            },
            authored.preparedData,
          );
          onLineage(result.lineage);
        }
      : undefined;

  return (
    <Layout
      className={className}
      style={style}
      renderer={renderer}
      compile={{ themeDefinitions }}
      onCompileResult={notifyLineage}
    >
      <EmbeddablePlotContent {...authored} {...(panel === undefined ? {} : { panel })} />
    </Layout>
  );
};

/** Plot React authoring 入口 */
export const Plot = PlotComponent as InputEmbeddablePlotComponent;

Plot.displayName = 'Plot';
Plot.isTier2Embeddable = true;
Plot.inputEmbedAdapter = plotInputEmbedAdapter;
Plot.createInputEmbedProps = createPlotInput;
