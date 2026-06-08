import type { FC } from 'react';

/** <LineMark> props：折线图层，按 order（缺省按数据顺序）连点 */
export type LineMarkProps = {
  /** 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值） */
  x: string;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值） */
  y: string;
  /** 驱动连接顺序的字段；缺省按数据数组顺序 */
  order?: string;
  /** 系列字段：按其拆成多条折线（多系列）；缺省单线 */
  series?: string;
  /** 颜色字段（categorical，自动 ordinal 色 scale）：无显式 series 时按此字段隐式拆多条线；缺省取 series。连续 / 时间字段报错 */
  color?: string;
  /** 末点回连首点闭合成多边形（polar 下即雷达轮廓）；缺省 false */
  closed?: boolean;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <PointMark> props：散点图层，每行一个 glyph */
export type PointMarkProps = {
  /** 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值） */
  x: string;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值） */
  y: string;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale） */
  color?: string;
  /** 尺寸字段（数值）：→ size 通道，经 sqrt 半径 scale 映射成 glyph 半径（面积感知正确）；负值报错 */
  size?: string;
  /** 不透明度字段（连续）：→ opacity 通道，经 clamp linear scale 映射到 [minOpacity, 1]；时间/分类字段报错 */
  opacity?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <BarMark> props：柱状图层，从 baseline 到值的矩形（cartesian 下 x 自动 band；polar 下自动成径向柱、角向自动 band） */
export type BarMarkProps = {
  /** 绑 x 位置通道的字段路径（分类，自动 band scale；polar 下作角向类别） */
  x: string;
  /** 绑 y 位置通道的字段路径（数值；polar 下作径向值） */
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

/** <SectorMark> props：扇形图层（饼 / 环），按 angle 值字段自动累积成角界 */
export type SectorMarkProps = {
  /** 角向值字段：内建自动累积成 [起角, 止角]（同 <BarMark stack> 约定，DSL 层不暴露 transform） */
  angle: string;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale）；缺省取 angle 字段本身分类上色 */
  color?: string;
  /** 系列字段：累积时按其排序分段；缺省按数据顺序 */
  series?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <AreaMark> props：面积图层（上沿折线 ↔ baseline 围成可填充区域；polar 下闭合成填充雷达） */
export type AreaMarkProps = {
  /** 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值） */
  x: string;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值） */
  y: string;
  /** 上沿连接顺序的字段；缺省按数据数组顺序 */
  order?: string;
  /** 系列字段：拆成多块面积（多系列）；缺省单块 */
  series?: string;
  /** 回边贴附的 baseline 值；缺省 0 */
  baseline?: number;
  /** 末点回连首点闭合成多边形（polar 下即填充雷达）；缺省 false */
  closed?: boolean;
  /** 颜色字段（categorical，自动 ordinal 色 scale）：无显式 series 时按此字段隐式拆多个面；缺省取 series。连续 / 时间字段报错 */
  color?: string;
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

/**
 * 扇形（饼 / 环）图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec；
 *   内建自动累积——同步装配 stack transform（无分组单链）+ sector mark 读累积界为角度
 */
export const SectorMark: FC<SectorMarkProps> = () => null;

/**
 * 面积图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec
 */
export const AreaMark: FC<AreaMarkProps> = () => null;
