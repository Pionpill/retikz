import type { FC, ReactNode } from 'react';
import { type EmbeddableContribution, type EmbeddableTier2Adapter, Layout, type LayoutProps, type ScopeProps } from '@retikz/react';
import { type DataModel, type ExternalDatasets, type ExternalRow, type LowerPlotsOptions, type PlotSpec, PlotSpecSchema, lowerPlots } from '@retikz/plot';
import { type CoordinateInput, type ResolveLabelMap, buildPlotSpec, resolveLabelOf } from './components';

/** <Plot> 作为 Layout 子面板时可直接承接的 core scope 属性 */
export type PlotPanelProps = Pick<ScopeProps, 'transforms' | 'zIndex' | 'clip'> & {
  /** 面板左上角 x（user units）；会转成外层 Scope translate，适合 Layout 内多 plot 绝对摆位 */
  x?: number;
  /** 面板左上角 y（user units）；会转成外层 Scope translate，适合 Layout 内多 plot 绝对摆位 */
  y?: number;
};

/** <Plot> 两条入口共享的展示 props + lowerPlots 选项 */
export type PlotCommonProps = Pick<LayoutProps, 'className' | 'style' | 'renderer'> & PlotPanelProps & LowerPlotsOptions;

export type PlotColorProps = {
  /** 默认颜色数组：分类 color scale 的 range；无 color 编码的 mark 按图层序取色，`currentColor` 表示继承当前文字颜色 */
  colors?: Array<string>;
};

/** spec 入口（薄包装）：给已构造好的完整 PlotSpec + 数据集表 */
export type PlotSpecProps = PlotCommonProps & PlotColorProps & {
  /** 已构造好的 Plot IR 根节点（手写 / 生成） */
  spec: PlotSpec;
  /** 外部数据集表（data.reference 按名查）；数据不进 IR，编译期经 lowerPlots 注入 */
  data: ExternalDatasets;
  children?: never;
};

/** 组合 DSL 入口：给裸数据行 + <LineMark>/<PointMark>/<Axis> 子组件 */
export type PlotDslProps = PlotCommonProps & PlotColorProps & {
  spec?: never;
  /** 面板 id：写入 PlotSpec.id，作为外部 anchor 句柄；嵌入态未显式 dataRef 时也作为默认数据集引用 */
  id?: string;
  /** 嵌入态/DSL 入口的数据集引用名；多 plot 共享同一数据源时可显式设成同名 */
  dataRef?: string;
  /** 裸数据行数组；内部包成单数据集注入，不进 IR */
  data: Array<ExternalRow>;
  /** mark / guide 子组件（<LineMark> / <PointMark> / <BarMark> / <AreaMark> / <Axis>） */
  children: ReactNode;
  /** 数据模型（字段名 + 类型）：声明则 strict 校验 + type-driven scale/guide；注入构造 spec 的 data.model */
  model?: DataModel;
  /** 逻辑字段 → 物理数据路径（扁平，单数据集）；需 model；内部映射到固定数据集名 */
  fieldMap?: Record<string, string>;
  /** 坐标系：缺省 cartesian2D；"polar2D" 简写或 polar2D 对象配置（innerRadius / startAngle / endAngle） */
  coordinate?: CoordinateInput;
};

/** <Plot> props：spec 入口与组合 DSL 入口二选一（按 spec/children 分流） */
export type PlotProps = PlotSpecProps | PlotDslProps;

/** 组合 DSL 内部固定的数据集名（用户不可见） */
const DSL_DATA_REF = '__plot';

const embeddedDataRefs = new WeakMap<Array<ExternalRow>, string>();
let embeddedDataRefSeed = 0;

const embeddedDataRefFor = (rows: Array<ExternalRow>): string => {
  const existing = embeddedDataRefs.get(rows);
  if (existing !== undefined) return existing;
  const next = `${DSL_DATA_REF}_${embeddedDataRefSeed}`;
  embeddedDataRefSeed += 1;
  embeddedDataRefs.set(rows, next);
  return next;
};

const lowerPlotOptionsOf = (
  props: PlotProps,
  effectiveFieldMaps: LowerPlotsOptions['fieldMaps'],
  collectedResolveLabel: ResolveLabelMap | undefined,
): LowerPlotsOptions => {
  const { width, height, fontSize, margin, provenance, datumProvenance, datumIdField, validateData, resolveField, resolveLabel, invalid, coordinates } = props;
  // DSL 入口 <TextMark resolveLabel> / <BarMark resolveLabel> 收集的 per-mark 函数，与显式 props.resolveLabel 合并（显式优先）
  const mergedResolveLabel = collectedResolveLabel !== undefined || resolveLabel !== undefined ? { ...collectedResolveLabel, ...resolveLabel } : undefined;
  return {
    width,
    height,
    fontSize,
    margin,
    provenance,
    datumProvenance,
    datumIdField,
    fieldMaps: effectiveFieldMaps,
    validateData,
    resolveField,
    resolveLabel: mergedResolveLabel,
    invalid,
    coordinates,
  };
};

const withIntrinsicSize = (spec: PlotSpec, width: number | undefined, height: number | undefined): PlotSpec => ({
  ...spec,
  ...(spec.width === undefined && width !== undefined ? { width } : {}),
  ...(spec.height === undefined && height !== undefined ? { height } : {}),
});

const withPlotColors = (spec: PlotSpec, colors: Array<string> | undefined): PlotSpec => ({
  ...spec,
  ...(colors !== undefined ? { colors } : {}),
});

const wrapPanelScope = (node: PlotSpec, props: PlotPanelProps): EmbeddableContribution['node'] => {
  const { x, y, transforms, zIndex, clip } = props;
  const panelTransforms =
    x !== undefined || y !== undefined
      ? ([{ kind: 'translate', x: x ?? 0, y: y ?? 0 }, ...(transforms ?? [])] as NonNullable<ScopeProps['transforms']>)
      : transforms;
  if (panelTransforms === undefined && zIndex === undefined && clip === undefined) return node;
  const scope: EmbeddableContribution['node'] = {
    type: 'scope',
    ...(panelTransforms !== undefined ? { transforms: panelTransforms } : {}),
    ...(zIndex !== undefined ? { zIndex } : {}),
    ...(clip !== undefined ? { clip } : {}),
    children: [node],
  };
  return scope;
};

const resolvePlotRuntime = (
  props: PlotProps,
  options: { embedded?: boolean } = {},
): { spec: PlotSpec; datasets: ExternalDatasets; lowerOptions: LowerPlotsOptions } => {
  const dataRef = !props.spec ? props.dataRef ?? (options.embedded && props.id !== undefined ? props.id : options.embedded ? embeddedDataRefFor(props.data) : DSL_DATA_REF) : DSL_DATA_REF;
  let spec: PlotSpec;
  let datasets: ExternalDatasets;
  let effectiveFieldMaps = props.fieldMaps;
  // DSL 入口 buildPlotSpec 旁路收集的 per-mark resolveLabel（运行时函数、不进 IR）；spec 入口由 props.resolveLabel 直接给
  let collectedResolveLabel: ResolveLabelMap | undefined;
  if (props.spec) {
    spec = withPlotColors(props.spec, props.colors);
    datasets = props.data;
  } else {
    // DSL 入口：model 经 buildPlotSpec 注入 data.model **并改走 type-driven 派生**（省略 AUTO 位置 scale 绑定，
    // 否则 model 的 temporal/nominal 不会派生 time/band、甚至被当显式 linear 校验）。扁平 fieldMap 映射到数据集名。
    spec = buildPlotSpec(props.children, dataRef, {
      id: props.id,
      width: props.width,
      height: props.height,
      coordinate: props.coordinate,
      model: props.model,
      colors: props.colors,
      deferPositionScaleInference: props.model === undefined,
    });
    collectedResolveLabel = resolveLabelOf(spec);
    datasets = { [dataRef]: props.data };
    if (props.fieldMap) effectiveFieldMaps = { [dataRef]: props.fieldMap };
  }
  // 入口校验：非法 spec（缺判别字段等）抛清晰 ZodError，而非落到 core 内部崩
  const validated = PlotSpecSchema.parse(withIntrinsicSize(spec, props.width, props.height));
  return { spec: validated, datasets, lowerOptions: lowerPlotOptionsOf(props, effectiveFieldMaps, collectedResolveLabel) };
};

const plotEmbeddableAdapter: EmbeddableTier2Adapter<PlotProps> = {
  displayName: 'Plot',
  namespace: 'plot',
  contribute: props => {
    const { spec, datasets, lowerOptions } = resolvePlotRuntime(props, { embedded: true });
    return {
      node: wrapPanelScope(spec, props),
      datasets,
      makeComposites: mergedDatasets => lowerPlots(mergedDatasets as ExternalDatasets, lowerOptions),
    };
  },
};

type EmbeddablePlotComponent = FC<PlotProps> & {
  isTier2Embeddable?: true;
  embeddableAdapter?: EmbeddableTier2Adapter<PlotProps>;
};

/**
 * Plot 组件（两条入口同名分流）
 * @description 给 spec → 薄包装直接渲染；给 children → builder 装配成 PlotSpec 再渲染。
 *   两路都把 spec 包成 scene、经 lowerPlots 注入数据后交 <Layout>；data 不进 IR
 */
export const Plot: EmbeddablePlotComponent = props => {
  const { width, height, className, style, renderer } = props;
  const { spec, datasets, lowerOptions } = resolvePlotRuntime(props);

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
