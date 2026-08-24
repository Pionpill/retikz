import type { infer as ZodInfer } from 'zod';

import type { RelativeAccumulateTargetSchema, RelativeTargetSchema, TargetSchema } from './schema';

export type { IRAnchorRef, IRNodeTarget } from '../../position';

/** 路径端点：直接坐标 [x, y] / 极坐标 / NodeTarget 对象 `{ id, anchor?, offset?, boundary? }` / 相对偏移对象 / offset / between；裸节点 id 字符串仅 React DSL，解析为 NodeTarget 后才进 IR */
export type IRTarget = ZodInfer<typeof TargetSchema>;

/** 相对前一 step 终点的偏移；不更新 prevEnd（TikZ `(+x, +y)`） */
export type IRRelativeTarget = ZodInfer<typeof RelativeTargetSchema>;

/** 累积相对偏移；更新 prevEnd（TikZ `(++x, ++y)`） */
export type IRRelativeAccumulateTarget = ZodInfer<typeof RelativeAccumulateTargetSchema>;
