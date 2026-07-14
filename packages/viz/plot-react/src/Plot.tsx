import type { ExternalDatasets, ExternalRow, IRDataModel } from '@retikz/data';
import type {
  IRPlotSpec,
  IRPlotTransform,
  LowerPlotsOptions,
  PlotHostLineageMetadata,
  PlotLineageOptions,
  PlotLineageRun,
} from '@retikz/plot';
import type { EmbeddableContribution, EmbeddableTier2Adapter, LayoutProps, ScopeProps } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { lowerPlots, lowerPlotWithLineage } from '@retikz/plot';
import { Layout } from '@retikz/react';
import { useEffect, useRef } from 'react';

import type { CoordinateInput, MarkTransformShortcutDefinition } from './components';

import { makeEmbeddedPlotComposites, withEmbeddedPlotRuntime } from './embedded-runtime';
import { resolvePlotRuntime } from './plot-runtime';

/** <Plot> 作为 Layout 子面板时可直接承接的 core scope 属性 */
export type PlotPanelProps = Pick<ScopeProps, 'transforms' | 'zIndex' | 'clip'> & {
  /** 面板左上角 x（user units）；会转成外层 Scope translate，适合 Layout 内多 plot 绝对摆位 */
  x?: number;
  /** 面板左上角 y（user units）；会转成外层 Scope translate，适合 Layout 内多 plot 绝对摆位 */
  y?: number;
};

/** <Plot> 两条入口共享的展示 props + lowerPlots 选项 */
export type PlotCommonProps = Pick<LayoutProps, 'className' | 'style' | 'renderer'> &
  PlotPanelProps &
  LowerPlotsOptions &
  PlotLineageProps;

/** React adapter 暴露的运行时图元链路 props。 */
export type PlotLineageProps = {
  /**
   * 图元链路记录开关。
   * @description `false` 表示关闭；传对象时沿用 `@retikz/plot` 的独立开关。省略时只有 `onLineage`
   *   或 `resolvePlotLineage` 触发运行时链路计算，并使用最小默认摘要。
   */
  lineage?: false | PlotLineageOptions;
  /** 宿主侧查询 / AI / 权限 metadata；只有 `lineage.hostMetadata` 打开对应开关时才会透传。 */
  hostLineageMetadata?: PlotHostLineageMetadata;
  /** 渲染后接收 runtime-only 图元链路产物；不会把链路写入 IRPlotSpec 或 Scene meta。 */
  onLineage?: (lineage: PlotLineageRun) => void;
};

export type PlotColorProps = {
  /** 默认颜色数组：分类 color scale 的 range；无 color 编码的 mark 按图层序取色，`currentColor` 表示继承当前文字颜色 */
  colors?: Array<string>;
  /** Plot theme：背景、typography、axis、legend、palette 的 JSON-safe 默认值 */
  theme?: IRPlotSpec['theme'];
  /** 整图 label 空间布局策略。 */
  layout?: IRPlotSpec['layout'];
};

/** spec 入口（薄包装）：给已构造好的完整 IRPlotSpec + 数据集表 */
export type PlotSpecProps = PlotCommonProps &
  PlotColorProps & {
    /** 已构造好的 Plot IR 根节点（手写 / 生成） */
    spec: IRPlotSpec;
    /** 外部数据集表（data.reference 按名查）；数据不进 IR，编译期经 lowerPlots 注入 */
    data: ExternalDatasets;
    children?: never;
  };

/** 组合 DSL 入口：给裸数据行 + <PathMark>/<PointMark>/<Axis> 子组件 */
export type PlotDslProps = PlotCommonProps &
  PlotColorProps & {
    spec?: never;
    /** 面板 id：写入 IRPlotSpec.id，作为外部 anchor 句柄；嵌入态未显式 dataRef 时也作为默认数据集引用 */
    id?: string;
    /** 嵌入态/DSL 入口的数据集引用名；多 plot 共享同一数据源时可显式设成同名 */
    dataRef?: string;
    /** 裸数据行数组；内部包成单数据集注入，不进 IR */
    data: Array<ExternalRow>;
    /** mark / guide 子组件（<PathMark> / <PointMark> / <IntervalMark> / <Axis>） */
    children: ReactNode;
    /** 数据模型（字段名 + 类型）：声明则 strict 校验 + type-driven scale/guide；注入构造 spec 的 data.model */
    model?: IRDataModel;
    /** 逻辑字段 → 物理数据路径（扁平，单数据集）；需 model；内部映射到固定数据集名 */
    fieldMap?: Record<string, string>;
    /** 坐标系：缺省 cartesian2D；"polar2D" 简写或 polar2D 对象配置（innerRadius / startAngle / endAngle） */
    coordinate?: CoordinateInput;
    composition?: IRPlotSpec['composition'];
    /**
     * 数据变换 IR 直传（快捷入口）：拼到 `<Transform>` 子组件收集结果之前、自动装配 stack 之前。
     * @description 与 `<Transform kind="...">` 声明组件共用同一管线、可混用；程序化构造变换链时的便捷入口。
     *   命名 `dataTransforms` 以区别于 core scope 的几何 `transforms`（translate / rotate）。含 stack 时按签名抑制同款 mark shortcut stack。
     */
    dataTransforms?: Array<IRPlotTransform>;
    /**
     * Mark-level transform shortcuts for DSL children.
     * @description A shortcut observes assembled mark IR and emits ordinary plot-level transform operations.
     * It is useful for custom authoring sugar; explicit mark.transform remains a separate mark-local row view.
     */
    markTransformShortcuts?: Array<MarkTransformShortcutDefinition>;
  };

/** <Plot> props：spec 入口与组合 DSL 入口二选一（按 spec/children 分流） */
export type PlotProps = PlotSpecProps | PlotDslProps;

const wrapPanelScope = (node: IRPlotSpec, props: PlotPanelProps): EmbeddableContribution['node'] => {
  const { x, y, transforms, zIndex, clip } = props;
  const panelTransforms =
    x !== undefined || y !== undefined
      ? ([{ kind: 'translate', x: x ?? 0, y: y ?? 0 }, ...(transforms ?? [])] as NonNullable<ScopeProps['transforms']>)
      : transforms;
  if (panelTransforms === undefined && zIndex === undefined && clip === undefined) return node;
  const scope = {
    type: 'scope',
    ...(panelTransforms !== undefined ? { transforms: panelTransforms } : {}),
    ...(zIndex !== undefined ? { zIndex } : {}),
    ...(clip !== undefined ? { clip } : {}),
    children: [node],
  };
  return scope as EmbeddableContribution['node'];
};

const plotEmbeddableAdapter: EmbeddableTier2Adapter<PlotProps> = {
  displayName: 'Plot',
  namespace: 'plot',
  contribute: props => {
    const { spec, datasets, lowerOptions } = resolvePlotRuntime(props, { embedded: true });
    return {
      node: wrapPanelScope(spec, props),
      datasets: withEmbeddedPlotRuntime(datasets, lowerOptions),
      makeComposites: makeEmbeddedPlotComposites,
    };
  },
};

type EmbeddablePlotComponent = FC<PlotProps> & {
  isTier2Embeddable?: true;
  embeddableAdapter?: EmbeddableTier2Adapter<PlotProps>;
};

/**
 * Plot 组件（两条入口同名分流）
 * @description 给 spec → 薄包装直接渲染；给 children → builder 装配成 IRPlotSpec 再渲染。
 *   两路都把 spec 包成 scene、经 lowerPlots 注入数据后交 <Layout>；data 不进 IR
 */
export const Plot: EmbeddablePlotComponent = props => {
  const { width, height, className, style, renderer, onLineage } = props;
  const notifiedLineageKey = useRef<string>();
  const { spec, datasets, lowerOptions } = resolvePlotRuntime(props);
  const lineage =
    onLineage === undefined || props.lineage === false
      ? undefined
      : lowerPlotWithLineage(spec, datasets, {
          ...lowerOptions,
          lineage: props.lineage ?? {},
          hostLineageMetadata: props.hostLineageMetadata,
        }).lineage;
  const lineageKey = lineage === undefined ? undefined : JSON.stringify(lineage);

  useEffect(() => {
    if (lineage === undefined || lineageKey === undefined || onLineage === undefined) return;
    if (notifiedLineageKey.current === lineageKey) return;
    notifiedLineageKey.current = lineageKey;
    onLineage(lineage);
  }, [lineage, lineageKey, onLineage]);

  return (
    <Layout
      ir={{ version: 1, type: 'scene', children: [wrapPanelScope(spec, props)] }}
      composites={lowerPlots(datasets, lowerOptions)}
      width={width}
      height={height}
      className={className}
      style={style}
      renderer={renderer}
    />
  );
};

Plot.displayName = 'Plot';
Plot.isTier2Embeddable = true;
Plot.embeddableAdapter = plotEmbeddableAdapter;
