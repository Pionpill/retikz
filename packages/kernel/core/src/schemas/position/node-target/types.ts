import type { infer as ZodInfer } from 'zod';

import type { AnchorRefSchema, NodeTargetSchema } from './schema';

/** anchor 引用：命名 anchor / 角度 / 边上比例点 */
export type IRAnchorRef = ZodInfer<typeof AnchorRefSchema>;

/** Node / Coordinate / 已解析 Scope 引用对象：`{ id, anchor?, offset?, boundary? }` */
export type IRNodeTarget = ZodInfer<typeof NodeTargetSchema>;
