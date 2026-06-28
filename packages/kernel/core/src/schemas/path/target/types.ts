import type { z } from 'zod';
import type { AnchorRefSchema, NodeTargetSchema, RelativeAccumulateTargetSchema, RelativeTargetSchema, TargetSchema } from './schema';

/** anchor 引用：命名 anchor / 角度 / 边上比例点 */
export type IRAnchorRef = z.infer<typeof AnchorRefSchema>;

/** 节点 / Coordinate 引用对象：{ id, anchor?, offset? } */
export type IRNodeTarget = z.infer<typeof NodeTargetSchema>;

/** 路径端点：直接坐标 [x, y] / 极坐标 / NodeTarget 对象 `{ id, anchor?, offset? }` / 相对偏移对象 / offset / between；裸节点 id 字符串仅 React DSL，解析为 NodeTarget 后才进 IR */
export type IRTarget = z.infer<typeof TargetSchema>;

/** 相对前一 step 终点的偏移；不更新 prevEnd（TikZ `(+x, +y)`） */
export type IRRelativeTarget = z.infer<typeof RelativeTargetSchema>;

/** 累积相对偏移；更新 prevEnd（TikZ `(++x, ++y)`） */
export type IRRelativeAccumulateTarget = z.infer<typeof RelativeAccumulateTargetSchema>;
