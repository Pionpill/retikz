import type { FC } from 'react';
import { Layout, type LayoutProps } from '@retikz/react';
import { type ExternalDatasets, type LowerPlotsOptions, type PlotSpec, lowerPlots } from '@retikz/plot';

/** <Plot> props：透传给 Layout 的展示 props + lowerPlots 选项 + 已构造好的 spec/data */
export type PlotProps = Pick<LayoutProps, 'width' | 'height' | 'className' | 'style' | 'renderer'> &
  LowerPlotsOptions & {
    /** 已构造好的 Plot IR 根节点（手写 / 生成） */
    spec: PlotSpec;
    /** 外部数据集表（data.ref 按名查）；数据不进 IR，编译期经 lowerPlots 注入 */
    data: ExternalDatasets;
  };

/**
 * Plot 薄包装组件
 * @description 把 Plot IR 包成 scene、经 lowerPlots 注入数据后交给 <Layout> 渲染；只转发、不引入额外语义
 */
export const Plot: FC<PlotProps> = props => {
  const { spec, data, width, height, ...rest } = props;
  return (
    <Layout
      ir={{ version: 1, type: 'scene', children: [spec] }}
      composites={lowerPlots(data, { width, height })}
      width={width}
      height={height}
      {...rest}
    />
  );
};
