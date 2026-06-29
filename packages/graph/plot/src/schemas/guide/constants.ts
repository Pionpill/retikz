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
 * 坐标轴摆放方式关键字。
 * @description auto 由坐标系按维度推断；side 使用笛卡尔式四边；edge 使用坐标系原生边。
 */
export const AxisPlacementKind = {
  /** 由坐标系和 dimension 自动推断。 */
  Auto: 'auto',
  /** 放在 plotArea 的四个方向之一。 */
  Side: 'side',
  /** 放在坐标系原生 edge 上，供 ternary / custom coordinate 使用。 */
  Edge: 'edge',
} as const;

/** 坐标轴摆放方式。 */
export type AxisPlacementKindValue = ValueOf<typeof AxisPlacementKind>;

/**
 * 笛卡尔式四方向轴位置。
 * @description 只表达 top/right/bottom/left；非四边形坐标系应使用 auto 或 edge。
 */
export const AxisCardinalSide = {
  /** plotArea 上边。 */
  Top: 'top',
  /** plotArea 右边。 */
  Right: 'right',
  /** plotArea 下边。 */
  Bottom: 'bottom',
  /** plotArea 左边。 */
  Left: 'left',
} as const;

/** 笛卡尔式四方向轴位置。 */
export type AxisCardinalSideValue = ValueOf<typeof AxisCardinalSide>;

/**
 * axis grid 投放模式。
 * @description self 只投放到 axis 自身 scope；sharedRole 投放到共享 role 的 scope；selected 使用显式 selector。
 */
export const AxisGridApplyTo = {
  /** 只投放到 axis 自己绑定的 coordinate scope。 */
  Self: 'self',
  /** 投放到与 axis 共享 coordinate role / scale identity 的目标。 */
  SharedRole: 'sharedRole',
  /** 只投放到 selector 命中的 scope / facet panel / track。 */
  Selected: 'selected',
} as const;

/** axis grid 投放模式取值。 */
export type AxisGridApplyToValue = ValueOf<typeof AxisGridApplyTo>;

/**
 * 图例绑定的非位置通道名。
 * @description schema 只要求非空字符串；该通道是否存在、是否产出 legend descriptor，由 channel registry 在 lowering 时解析。
 */
export type LegendChannelValue = string;

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
 * guide 绑定的坐标系定位维度名。
 * @description schema 只要求非空字符串；该维度是否被坐标系支持，由 CoordinateDefinition.roles 在 lowering 时校验。
 */
export type GuideDimensionValue = string;
