import type { FC } from 'react';

/** <LineMark> props：折线图层，按 order（缺省按数据顺序）连点 */
export type LineMarkProps = {
  /** 绑 x 位置通道的字段路径 */
  x: string;
  /** 绑 y 位置通道的字段路径 */
  y: string;
  /** 驱动连接顺序的字段；缺省按数据数组顺序 */
  order?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <PointMark> props：散点图层，每行一个 glyph */
export type PointMarkProps = {
  /** 绑 x 位置通道的字段路径 */
  x: string;
  /** 绑 y 位置通道的字段路径 */
  y: string;
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
