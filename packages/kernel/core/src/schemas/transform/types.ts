import type { infer as ZodInfer } from 'zod';

import type { TransformSchema } from './schema';

/** IR 层 transform 类型——7 变体 discriminated union（5 translate + rotate + scale） */
export type IRTransform = ZodInfer<typeof TransformSchema>;

/** 笛卡尔 translate 子分支 */
export type IRTranslateTransform = Extract<IRTransform, { kind: 'translate' }>;

/** 极坐标 translate 子分支 */
export type IRPolarTranslateTransform = Extract<IRTransform, { kind: 'polar-translate' }>;

/** 相对方向 translate 子分支 */
export type IRAtTranslateTransform = Extract<IRTransform, { kind: 'at-translate' }>;

/** 偏移 translate 子分支 */
export type IROffsetTranslateTransform = Extract<IRTransform, { kind: 'offset-translate' }>;

/** 两端点比例 translate 子分支 */
export type IRBetweenTranslateTransform = Extract<IRTransform, { kind: 'between-translate' }>;

/** 旋转子分支 */
export type IRRotateTransform = Extract<IRTransform, { kind: 'rotate' }>;

/** 缩放子分支 */
export type IRScaleTransform = Extract<IRTransform, { kind: 'scale' }>;
