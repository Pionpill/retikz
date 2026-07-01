import type { z } from 'zod';

import type { ValueOf } from '../../../types';
import type { StepSchema } from '../step';
import type { PathFillRule, PathLineCap, PathLineJoin, PathThickness } from './constants';
import type { ArrowMarkSchema, PathBaseSchema, PathScaleSchema } from './schema';

/** 路径填充规则关键字类型。 */
export type PathFillRuleValue = ValueOf<typeof PathFillRule>;

/** 路径端点线帽关键字类型。 */
export type PathLineCapValue = ValueOf<typeof PathLineCap>;

/** 路径拐角连接关键字类型。 */
export type PathLineJoinValue = ValueOf<typeof PathLineJoin>;

/** 路径语义线宽关键字类型。 */
export type PathThicknessValue = ValueOf<typeof PathThickness>;

/** 路径整条缩放类型：number（等比）或 {x,y}（非等比） */
export type IRPathScale = z.infer<typeof PathScaleSchema>;

/** 路径中段箭头标记类型 */
export type IRArrowMark = z.infer<typeof ArrowMarkSchema>;

/** Path schema 的原始输出类型：供 kind 派生、boundary ribbon 等特殊形态使用。 */
export type IRPathBase = z.infer<typeof PathBaseSchema>;

/** 路径：由若干 step 动作（move/line/...）组成；常规 stroke path 与中心线 ribbon 均携带 children。 */
export type IRPath = Omit<IRPathBase, 'children'> & { children: Array<z.infer<typeof StepSchema>> };
