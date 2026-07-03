import type { z } from 'zod';

import type { AnchorRefSchema, NodeTargetSchema } from './schema';

/** anchor 引用：命名 anchor / 角度 / 边上比例点 */
export type IRAnchorRef = z.infer<typeof AnchorRefSchema>;

/** 节点 / Coordinate 引用对象：`{ id, anchor?, offset? }` */
export type IRNodeTarget = z.infer<typeof NodeTargetSchema>;
