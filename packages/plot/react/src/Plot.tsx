import type { FC, ReactNode } from 'react';
import { Layout, type LayoutProps } from '@retikz/react';
import { type ExternalDatasets, type ExternalRow, type LowerPlotsOptions, type PlotSpec, lowerPlots } from '@retikz/plot';
import { buildPlotSpec } from './dsl';

/** <Plot> 两条入口共享的展示 props + lowerPlots 选项 */
type PlotCommonProps = Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer'> & LowerPlotsOptions;

/** spec 入口（薄包装）：给已构造好的完整 PlotSpec + 数据集表 */
export type PlotSpecProps = PlotCommonProps & {
  /** 已构造好的 Plot IR 根节点（手写 / 生成） */
  spec: PlotSpec;
  /** 外部数据集表（data.ref 按名查）；数据不进 IR，编译期经 lowerPlots 注入 */
  data: ExternalDatasets;
  children?: never;
};

/** 组合 DSL 入口：给裸数据行 + <LineMark>/<PointMark> 子图层 */
export type PlotDslProps = PlotCommonProps & {
  spec?: never;
  /** 裸数据行数组；内部包成单数据集注入，不进 IR */
  data: Array<ExternalRow>;
  /** mark 子图层（<LineMark> / <PointMark>） */
  children: ReactNode;
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
  const { width, height, className, style, renderer } = props;

  let spec: PlotSpec;
  let datasets: ExternalDatasets;
  if (props.spec) {
    spec = props.spec;
    datasets = props.data;
  } else {
    spec = buildPlotSpec(props.children, DSL_DATA_REF);
    datasets = { [DSL_DATA_REF]: props.data };
  }

  return (
    <Layout
      ir={{ version: 1, type: 'scene', children: [spec] }}
      composites={lowerPlots(datasets, { width, height })}
      width={width}
      height={height}
      className={className}
      style={style}
      renderer={renderer}
    />
  );
};
