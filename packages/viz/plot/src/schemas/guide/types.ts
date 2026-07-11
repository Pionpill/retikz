import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  AxisCardinalSide,
  AxisCrossingCorner,
  AxisCrossingLabelPolicy,
  AxisCrossingTickPolicy,
  AxisGridApplyTo,
  AxisPlacementKind,
  AxisTickDensityKind,
  AxisTickEndpointAffect,
  AxisTickLabelHideStrategy,
  AxisTickLabelOverflow,
  AxisTickMarkKind,
  AxisTickShapeOrientation,
  AxisTitleAnchor,
  AxisTitleOrientation,
  AxisTitlePlacementKeyword,
  GuideTickIntervalKind,
  GuideTickTimeUnit,
  LegendOrient,
  LegendPosition,
  LegendSymbolFit,
  PlotGuide,
} from './constants';
import type { AxisGuideSchema, GuideSchema, LegendGuideSchema } from './schema';

/** guide 类型 */
export type PlotGuideValue = ValueOf<typeof PlotGuide>;

/** 坐标轴摆放方式。 */
export type AxisPlacementKindValue = ValueOf<typeof AxisPlacementKind>;

/** 笛卡尔式四方向轴位置。 */
export type AxisCardinalSideValue = ValueOf<typeof AxisCardinalSide>;

/** 坐标轴网格投放模式取值。 */
export type AxisGridApplyToValue = ValueOf<typeof AxisGridApplyTo>;

/** 固定间隔 tick source kind 取值。 */
export type GuideTickIntervalKindValue = ValueOf<typeof GuideTickIntervalKind>;

/** 时间间隔单位取值。 */
export type GuideTickTimeUnitValue = ValueOf<typeof GuideTickTimeUnit>;

/** tick 可见密度策略 kind 取值。 */
export type AxisTickDensityKindValue = ValueOf<typeof AxisTickDensityKind>;

/** tick mark 形态 kind 取值。 */
export type AxisTickMarkKindValue = ValueOf<typeof AxisTickMarkKind>;

/** tick 端点避让影响范围取值。 */
export type AxisTickEndpointAffectValue = ValueOf<typeof AxisTickEndpointAffect>;

/** shape tick mark 方向策略取值。 */
export type AxisTickShapeOrientationValue = ValueOf<typeof AxisTickShapeOrientation>;

/** tick label 重叠隐藏策略取值。 */
export type AxisTickLabelHideStrategyValue = ValueOf<typeof AxisTickLabelHideStrategy>;

/** tick label 超出轴范围时的处理策略取值。 */
export type AxisTickLabelOverflowValue = ValueOf<typeof AxisTickLabelOverflow>;

/** axis title 沿轴线的定位关键字取值。 */
export type AxisTitlePlacementKeywordValue = ValueOf<typeof AxisTitlePlacementKeyword>;

/** axis title 对齐锚点取值。 */
export type AxisTitleAnchorValue = ValueOf<typeof AxisTitleAnchor>;

/** axis title 旋转策略取值。 */
export type AxisTitleOrientationValue = ValueOf<typeof AxisTitleOrientation>;

/** axis 交叉值处 tick mark 策略取值。 */
export type AxisCrossingTickPolicyValue = ValueOf<typeof AxisCrossingTickPolicy>;

/** axis 交叉值处 tick label 策略取值。 */
export type AxisCrossingLabelPolicyValue = ValueOf<typeof AxisCrossingLabelPolicy>;

/** axis 交叉值 label 的角落位置取值。 */
export type AxisCrossingCornerValue = ValueOf<typeof AxisCrossingCorner>;

/**
 * 图例绑定的非位置通道名。
 * @description schema 只要求非空字符串；该通道是否存在、是否产出 legend descriptor，由 channel registry 在 lowering 时解析。
 */
export type LegendChannelValue = string;

/** 图例位置 */
export type LegendPositionValue = ValueOf<typeof LegendPosition>;

/** 图例排布方向 */
export type LegendOrientValue = ValueOf<typeof LegendOrient>;

/** 图例符号尺寸适配策略。 */
export type LegendSymbolFitValue = ValueOf<typeof LegendSymbolFit>;

/**
 * guide 绑定的坐标系定位维度名。
 * @description schema 只要求非空字符串；该维度是否被坐标系支持，由 CoordinateDefinition.roles 在 lowering 时校验。
 */
export type GuideDimensionValue = string;

/** guide（axis 或 legend） */
export type Guide = z.infer<typeof GuideSchema>;

/** 坐标轴 guide（轴线 + 刻度 + 标签 + 可选网格） */
export type AxisGuide = z.infer<typeof AxisGuideSchema>;

/** 图例 guide（swatch / 色带 ramp / 分箱 / 梯度符号，由绑定 scale 类型决定形态） */
export type LegendGuide = z.infer<typeof LegendGuideSchema>;
