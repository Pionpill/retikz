import { AxisLineTargetSchema, createPathStepSchema, PositionSchema, TargetSchema } from '@retikz/core';
import type { IRAxisLineTarget, IRTarget } from '@retikz/core';
import { never, object, union } from 'zod';
import type { ZodType, infer as ZodInfer } from 'zod';

import { PositionEncodingSchema } from '../encoding';
import { MarkTargetSchema } from './anchor';

// Core 的部分目标允许剥离未知字段；在解析前排除 Plot 位置与图元身份，避免混合输入被静默接受
const coreTargetFields = object({
  x: never().optional(),
  y: never().optional(),
  z: never().optional(),
  mark: never().optional(),
});
const coreTargetSchema: ZodType<IRTarget> = TargetSchema.and(coreTargetFields.or(PositionSchema));
const coreAxisTargetSchema: ZodType<IRAxisLineTarget> = AxisLineTargetSchema.and(coreTargetFields.or(PositionSchema));

/** 校验绘图空间目标、数据位置或图元实例引用 */
export const PlotPathStepTargetSchema = union([coreTargetSchema, PositionEncodingSchema, MarkTargetSchema]);

/** 校验只接受绝对笛卡尔坐标或数据投影的控制点 */
export const PlotPathStepControlSchema = union([PositionSchema, PositionEncodingSchema]);

/** 校验单轴步骤可消费的局部坐标或实例目标 */
export const PlotPathStepAxisTargetSchema = union([coreAxisTargetSchema, PositionEncodingSchema, MarkTargetSchema]);

/** 校验沿用 Core 构造约束的数据绑定路径步骤 */
const pathStepSchema = createPathStepSchema(
  PlotPathStepTargetSchema,
  PlotPathStepControlSchema,
  PlotPathStepAxisTargetSchema,
).describe('Path construction after data position projection, with Core geometry parameters');

export type IRPlotPathStep = ZodInfer<typeof pathStepSchema>;
/** 数据绑定步骤的持久化入口，隐藏组合 schema 的内部类型展开 */
export const PlotPathStepSchema: ZodType<IRPlotPathStep> = pathStepSchema;
export type IRPlotPathStepTarget = ZodInfer<typeof PlotPathStepTargetSchema>;
