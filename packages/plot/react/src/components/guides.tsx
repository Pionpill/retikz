import type { FC } from 'react';

/** <Axis> props：坐标轴配置；网格走 `grid` 布尔 prop（与 IR axis.grid 对应，非独立 <Grid> 组件） */
export type AxisProps = {
  /** 装饰哪个定位维度：cartesian 的 x（水平）/ y（垂直）；polar 的 angle（角向）/ radius（径向） */
  dimension: 'x' | 'y' | 'angle' | 'radius';
  /** 目标刻度数（缺省用默认刻度数）；网格线复用同刻度 */
  tickCount?: number;
  /** 是否出刻度标签；缺省 = true */
  tickLabels?: boolean;
  /** 是否在 plot area 画对齐本轴刻度的网格线；缺省 = false */
  grid?: boolean;
  /** 可选 guide 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/**
 * 坐标轴声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec.guides
 */
export const Axis: FC<AxisProps> = () => null;
