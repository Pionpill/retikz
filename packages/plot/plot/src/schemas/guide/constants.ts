import type { ValueOf } from '@retikz/core';

/**
 * guide 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'axis'` 同样可用）
 * @description grammar-of-graphics 的 guide 是 scale 的可视化身（坐标轴 / 图例…）；alpha.2 仅 axis，后续加 legend / reference line
 */
export const PlotGuide = {
  /** 坐标轴：轴线 + 刻度 + 刻度标签，可选对齐网格 */
  Axis: 'axis',
  /** 图例：把非位置 scale（颜色 / 尺寸 / 透明度 / 形状）可视化为 swatch / 色带 ramp / 分箱 / 梯度符号 */
  Legend: 'legend',
} as const;

/** guide 类型 */
export type PlotGuideValue = ValueOf<typeof PlotGuide>;

/**
 * 图例可视化的非位置通道关键字（暴露给用户；成员值即判别串，裸字面量 `'color'` 同样可用）
 * @description 与 encoding 的非位置通道一一对应；legend 据绑定该通道的 scale 类型自动选 swatch / ramp / 分箱 / 梯度符号形态
 */
export const LegendChannel = {
  /** 颜色通道（ordinal → swatch；sequential/diverging → 色带 ramp；quantize/threshold/quantile → 分箱） */
  Color: 'color',
  /** 尺寸通道（sqrt 半径 → 梯度符号：几档代表性大小圈 + 值） */
  Size: 'size',
  /** 透明度通道（连续 linear → 梯度透明度条） */
  Opacity: 'opacity',
  /** 形状通道（categorical → 形状 swatch + 标签） */
  Shape: 'shape',
} as const;

/** 图例绑定的非位置通道 */
export type LegendChannelValue = ValueOf<typeof LegendChannel>;

/**
 * 图例摆放位置关键字（暴露给用户；裸字面量 `'right'` 同样可用）
 * @description 决定 legend 占据 plotArea 哪一边的预留带；省略默认 right（默认值在 lowering 给）
 */
export const LegendPosition = {
  /** plotArea 右侧 */
  Right: 'right',
  /** plotArea 左侧 */
  Left: 'left',
  /** plotArea 上方 */
  Top: 'top',
  /** plotArea 下方 */
  Bottom: 'bottom',
} as const;

/** 图例位置 */
export type LegendPositionValue = ValueOf<typeof LegendPosition>;

/**
 * 图例条目排布方向关键字（暴露给用户；裸字面量 `'vertical'` 同样可用）
 * @description 省略默认按 position（左右→vertical、上下→horizontal），默认值在 lowering 给
 */
export const LegendOrient = {
  /** 纵向堆叠（条目自上而下） */
  Vertical: 'vertical',
  /** 横向排布（条目自左而右） */
  Horizontal: 'horizontal',
} as const;

/** 图例排布方向 */
export type LegendOrientValue = ValueOf<typeof LegendOrient>;

/**
 * guide 绑定的坐标系定位维度关键字（暴露给用户；裸字面量 `'x'` / `'y'` 同样可用）
 * @description 指这根轴可视化坐标系的哪个定位维度，不是固定的屏幕「水平/垂直」方向。
 *   cartesian2D 的定位维度是 x / y；其它坐标系按自身定位维度扩展成员（如 polar 的 radius / angle），属非破坏新增。
 */
export const GuideDimension = {
  /** cartesian2D 水平定位维度 */
  X: 'x',
  /** cartesian2D 垂直定位维度 */
  Y: 'y',
  /** 三元坐标第三分量轴（左下顶点）；x / y / z 三轴共同构成三角外框 */
  Z: 'z',
} as const;

/** guide 维度 */
export type GuideDimensionValue = ValueOf<typeof GuideDimension>;
