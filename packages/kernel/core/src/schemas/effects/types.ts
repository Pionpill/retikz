import type { infer as ZodInfer } from 'zod';

import type { DropShadowSchema } from './schema';

/** IR shadow 对象分支（可带 preset 与显式字段覆盖） */
export type IRDropShadow = ZodInfer<typeof DropShadowSchema>;

/** 解析后的投影对象（preset 已展开，offset / color 已补齐，不再携带 preset） */
export type ResolvedDropShadow = Omit<IRDropShadow, 'preset'> &
  Required<Pick<IRDropShadow, 'offsetX' | 'offsetY' | 'color'>>;
