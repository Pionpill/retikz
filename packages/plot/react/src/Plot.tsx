import type { FC, ReactNode } from 'react';
import { Layout, type LayoutProps } from '@retikz/react';
import { type ExternalDatasets, type ExternalRow, type LowerPlotsOptions, type PlotSpec, PlotSpecSchema, lowerPlots } from '@retikz/plot';
import { type DslScaleX, buildPlotSpec } from './components';

/** <Plot> 两条入口共享的展示 props + lowerPlots 选项 */
type PlotCommonProps = Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer'> & LowerPlotsOptions;

/** spec 入口（薄包装）：给已构造好的完整 PlotSpec + 数据集表 */
export type PlotSpecProps = PlotCommonProps & {
  /** 已构造好的 Plot IR 根节点（手写 / 生成） */
  spec: PlotSpec;
  /** 外部数据集表（data.ref 按名查）；数据不进 IR，编译期经 lowerPlots 注入 */
  data: ExternalDatasets;
  children?: never;
  bare?: never;
};

/** 组合 DSL 入口：给裸数据行 + <LineMark>/<PointMark>/<Axis> 子组件 */
export type PlotDslProps = PlotCommonProps & {
  spec?: never;
  /** 裸数据行数组；内部包成单数据集注入，不进 IR */
  data: Array<ExternalRow>;
  /** mark / guide 子组件（<LineMark> / <PointMark> / <BarMark> / <Axis>） */
  children: ReactNode;
  /** 总开关：什么都不出（无轴无网格、plot area = 整图），只绘图 = alpha.1 行为；忽略任何 <Axis> */
  bare?: boolean;
  /** 连续 x scale 类型（缺省 linear；含 <BarMark> 时强制 band，忽略此项） */
  scaleX?: DslScaleX;
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
  const { width, height, className, style, renderer, fontSize, margin } = props;

  let spec: PlotSpec;
  let datasets: ExternalDatasets;
  if (props.spec) {
    spec = props.spec;
    datasets = props.data;
  } else {
    spec = buildPlotSpec(props.children, DSL_DATA_REF, { bare: props.bare, scaleX: props.scaleX });
    datasets = { [DSL_DATA_REF]: props.data };
  }
  // 入口校验：非法 spec（缺判别字段等）抛清晰 ZodError，而非落到 core 内部崩
  const validated = PlotSpecSchema.parse(spec);

  return (
    <Layout
      ir={{ version: 1, type: 'scene', children: [validated] }}
      composites={lowerPlots(datasets, { width, height, fontSize, margin })}
      width={width}
      height={height}
      className={className}
      style={style}
      renderer={renderer}
    />
  );
};
