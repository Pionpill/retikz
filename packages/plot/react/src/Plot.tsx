import type { FC, ReactNode } from 'react';
import { Layout, type LayoutProps } from '@retikz/react';
import { type DataModel, type ExternalDatasets, type ExternalRow, type LowerPlotsOptions, type PlotSpec, PlotSpecSchema, lowerPlots } from '@retikz/plot';
import { type CoordinateInput, type DslScaleX, buildPlotSpec } from './components';

/** <Plot> 两条入口共享的展示 props + lowerPlots 选项 */
export type PlotCommonProps = Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer'> & LowerPlotsOptions;

/** spec 入口（薄包装）：给已构造好的完整 PlotSpec + 数据集表 */
export type PlotSpecProps = PlotCommonProps & {
  /** 已构造好的 Plot IR 根节点（手写 / 生成） */
  spec: PlotSpec;
  /** 外部数据集表（data.reference 按名查）；数据不进 IR，编译期经 lowerPlots 注入 */
  data: ExternalDatasets;
  children?: never;
  bare?: never;
};

/** 组合 DSL 入口：给裸数据行 + <LineMark>/<PointMark>/<Axis> 子组件 */
export type PlotDslProps = PlotCommonProps & {
  spec?: never;
  /** 裸数据行数组；内部包成单数据集注入，不进 IR */
  data: Array<ExternalRow>;
  /** mark / guide 子组件（<LineMark> / <PointMark> / <BarMark> / <SectorMark> / <AreaMark> / <Axis>） */
  children: ReactNode;
  /** 数据模型（字段名 + 类型）：声明则 strict 校验 + type-driven scale/guide；注入构造 spec 的 data.model */
  model?: DataModel;
  /** 逻辑字段 → 物理数据路径（扁平，单数据集）；需 model；内部映射到固定数据集名 */
  fieldMap?: Record<string, string>;
  /** 总开关：什么都不出（无轴无网格、plot area = 整图），只绘图 = alpha.1 行为；忽略任何 <Axis> */
  bare?: boolean;
  /** 连续 x scale 类型（缺省 linear；含 <BarMark> 时强制 band，忽略此项；polar 下忽略） */
  scaleX?: DslScaleX;
  /** 坐标系：缺省 cartesian2D；"polar2D" 简写或 polar2D 对象配置（innerRadius / startAngle / endAngle） */
  coordinate?: CoordinateInput;
};

/** <Plot> props：spec 入口与组合 DSL 入口二选一（按 spec/children 分流） */
export type PlotProps = PlotSpecProps | PlotDslProps;

/** 组合 DSL 内部固定的数据集名（用户不可见） */
const DSL_DATA_REF = '__plot';

/**
 * Plot 组件（两条入口同名分流）
 * @description 给 spec → 薄包装直接渲染；给 children → builder 装配成 PlotSpec 再渲染。
 *   两路都把 spec 包成 scene、经 lowerPlots 注入数据后交 <Layout>；data 不进 IR
 */
export const Plot: FC<PlotProps> = props => {
  const { width, height, className, style, renderer, fontSize, margin, provenance, datumProvenance, datumIdField, fieldMaps, validateData } = props;

  let spec: PlotSpec;
  let datasets: ExternalDatasets;
  let effectiveFieldMaps = fieldMaps;
  if (props.spec) {
    spec = props.spec;
    datasets = props.data;
  } else {
    const built = buildPlotSpec(props.children, DSL_DATA_REF, { bare: props.bare, scaleX: props.scaleX, coordinate: props.coordinate });
    // DSL 入口：model prop 注入构造 spec 的 data.model；扁平 fieldMap 映射到固定数据集名（用户不写内部 ref）
    spec = props.model ? { ...built, data: { ...built.data, model: props.model } } : built;
    datasets = { [DSL_DATA_REF]: props.data };
    if (props.fieldMap) effectiveFieldMaps = { [DSL_DATA_REF]: props.fieldMap };
  }
  // 入口校验：非法 spec（缺判别字段等）抛清晰 ZodError，而非落到 core 内部崩
  const validated = PlotSpecSchema.parse(spec);

  return (
    <Layout
      ir={{ version: 1, type: 'scene', children: [validated] }}
      composites={lowerPlots(datasets, { width, height, fontSize, margin, provenance, datumProvenance, datumIdField, fieldMaps: effectiveFieldMaps, validateData })}
      width={width}
      height={height}
      className={className}
      style={style}
      renderer={renderer}
    />
  );
};
