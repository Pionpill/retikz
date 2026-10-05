import type { infer as ZodInfer } from 'zod';

import type { StepSchema } from '../step';
import type {
  ArrowMarkSchema,
  PathBaseSchema,
  PathDecorationSchema,
  PathFillSchema,
  PathGeometrySchema,
  PathScaleSchema,
  PathStrokeSchema,
  PathStructureSchema,
  PathStyleSchema,
  PathTransformSchema,
} from './schema';

/** 路径整条缩放类型：number（等比）或 {x,y}（非等比） */
export type IRPathScale = ZodInfer<typeof PathScaleSchema>;

/** 路径描边片段类型 */
export type IRPathStroke = ZodInfer<typeof PathStrokeSchema>;

/** 路径填充片段类型 */
export type IRPathFill = ZodInfer<typeof PathFillSchema>;

/** 路径几何片段类型 */
export type IRPathGeometry = ZodInfer<typeof PathGeometrySchema>;

/** 路径装饰片段类型 */
export type IRPathDecoration = ZodInfer<typeof PathDecorationSchema>;

/** 路径结构片段类型 */
export type IRPathStructure = ZodInfer<typeof PathStructureSchema>;

/** 路径中段箭头标记类型 */
export type IRArrowMark = ZodInfer<typeof ArrowMarkSchema>;

/** Path schema 的原始输出类型：供 kind 派生与特殊形态使用 */
export type IRPathBase = ZodInfer<typeof PathBaseSchema>;

/** 路径：由若干 step 动作（move/line/...）组成并携带 children */
export type IRPath = Omit<IRPathBase, 'children'> & {
  /** 按执行顺序排列的路径步骤 */
  children: Array<ZodInfer<typeof StepSchema>>;
};

export type IRPathStyle = ZodInfer<typeof PathStyleSchema>;

export type IRPathTransform = ZodInfer<typeof PathTransformSchema>;
