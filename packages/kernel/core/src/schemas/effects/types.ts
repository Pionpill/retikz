import type { z } from 'zod';
import type { DropShadowSchema } from './schema';

/** 解析后的投影对象类型（compile 已把预设展开 + 显式字段覆盖合并） */
export type DropShadow = z.infer<typeof DropShadowSchema>;
