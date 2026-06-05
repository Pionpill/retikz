import type { FC } from 'react';

/** <LineMark> props：折线图层，按 order（缺省按数据顺序）连点 */
export type LineMarkProps = {
  /** 绑 x 位置通道的字段路径 */
  x: string;
  /** 绑 y 位置通道的字段路径 */
  y: string;
  /** 驱动连接顺序的字段；缺省按数据数组顺序 */
  order?: string;
  /** 系列字段：按其拆成多条折线（多系列）；缺省单线 */
  series?: string;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale）；缺省取 series */
  color?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <PointMark> props：散点图层，每行一个 glyph */
export type PointMarkProps = {
  /** 绑 x 位置通道的字段路径 */
  x: string;
  /** 绑 y 位置通道的字段路径 */
  y: string;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale） */
  color?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <BarMark> props：柱状图层，从 baseline 到值的矩形（x 自动用 band scale） */
export type BarMarkProps = {
  /** 绑 x 位置通道的字段路径（分类，自动 band scale） */
  x: string;
  /** 绑 y 位置通道的字段路径（数值） */
  y: string;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale）；缺省取 series */
  color?: string;
  /** 系列字段：拆成多组柱；缺省单系列 */
  series?: string;
  /** 多系列时是否堆叠（true=stack，自动装配 stack transform）；否则并排（dodge） */
  stack?: boolean;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/**
 * 折线图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 type + props 装配进 PlotSpec
 */
export const LineMark: FC<LineMarkProps> = () => null;

/**
 * 散点图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 type + props 装配进 PlotSpec
 */
export const PointMark: FC<PointMarkProps> = () => null;

/**
 * 柱状图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 type + props 装配进 PlotSpec
 */
export const BarMark: FC<BarMarkProps> = () => null;
