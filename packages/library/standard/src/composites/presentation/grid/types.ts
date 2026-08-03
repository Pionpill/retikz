import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { GridBorderOrder } from './constants';
import type { GridSchema } from './schema';

/** Grid 边框 sibling 绘制顺序取值 */
export type GridBorderOrderValue = ValueOf<typeof GridBorderOrder>;

/** 持久化的 Standard Grid composite */
export type IRGrid = z.infer<typeof GridSchema>;

/** 创建 Grid 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type GridInput = Omit<z.input<typeof GridSchema>, 'namespace' | 'type'>;
