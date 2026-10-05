import type { infer as ZodInfer } from 'zod';

import type {
  AxisGuideSchema,
  GuideSchema,
  GuideTickLabelFormatSchema,
  GuideTickSourceSchema,
  LegendGuideSchema,
} from './schema';

/**
 * 图例绑定的非位置通道名。
 * @description schema 只要求非空字符串；该通道是否存在、是否产出 legend descriptor，由 channel registry 在 lowering 时解析
 */
export type LegendChannelValue = string;

/**
 * guide 绑定的坐标系定位维度名。
 * @description schema 只要求非空字符串；该维度是否被坐标系支持，由 CoordinateDefinition.roles 在 lowering 时校验
 */
export type GuideDimensionValue = string;

/** guide（axis 或 legend） */
export type IRPlotGuide = ZodInfer<typeof GuideSchema>;

/** guide 刻度来源声明 */
export type IRPlotGuideTickSource = ZodInfer<typeof GuideTickSourceSchema>;

/** guide 刻度标签格式声明 */
export type IRPlotGuideTickLabelFormat = ZodInfer<typeof GuideTickLabelFormatSchema>;

/** 坐标轴 guide（轴线 + 刻度 + 标签 + 可选网格） */
export type IRPlotAxisGuide = ZodInfer<typeof AxisGuideSchema>;

/** 图例 guide（swatch / 色带 ramp / 分箱 / 梯度符号，由 color scale 或 channel definition 决定形态） */
export type IRPlotLegendGuide = ZodInfer<typeof LegendGuideSchema>;
