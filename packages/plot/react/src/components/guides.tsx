import type { FC } from 'react';

/** <Axis> props：坐标轴配置；网格走 `grid` 布尔 prop（与 IR axis.grid 对应，非独立 <Grid> 组件） */
export type AxisProps = {
  /**
   * 装饰哪个定位维度：cartesian 的 x（水平）/ y（垂直）；polar 的 angle（角向）/ radius（径向）；
   * ternary 的 a / b / c（三角三边）。维度须匹配坐标系合法集，否则 lowering fail-loud。
   */
  dimension: 'x' | 'y' | 'angle' | 'radius' | 'a' | 'b' | 'c';
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

/** <Legend> props：图例配置；可视化哪个非位置通道由 channel 指定，形态（swatch / 色带 / 分箱 / 梯度符号）据绑定 scale 类型自动选 */
export type LegendProps = {
  /** 可视化哪个非位置通道：color（颜色）/ size（尺寸）/ opacity（透明度）/ shape（形状） */
  channel: 'color' | 'size' | 'opacity' | 'shape';
  /** 消歧 scale name（同通道被多个 scale 驱动时指定；省略 = 该通道唯一 scale，多于一个且省略 → lowering fail-loud） */
  scale?: string;
  /** 图例标题；省略 = 用绑定字段名 */
  title?: string;
  /** 图例位置（预留带所在边）；缺省 = right */
  position?: 'right' | 'left' | 'top' | 'bottom';
  /** 条目排布方向；省略 = 按 position（左右→vertical、上下→horizontal） */
  orient?: 'vertical' | 'horizontal';
  /** 连续色带刻度数提示（离散图例无意义、忽略） */
  tickCount?: number;
  /** 是否出 swatch / 刻度旁标签；缺省 = true */
  tickLabels?: boolean;
};

/**
 * 图例声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec.guides；
 *   <Legend> 不抑制默认坐标轴（与 <Axis> 区分），图例与默认轴共存。
 */
export const Legend: FC<LegendProps> = () => null;
