import type { IRScopeProps } from '@retikz/core';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { GridLineInputSchema, GridSchema } from './schema';

/** 单个 Grid 方向的线条输入配置 */
export type GridLineInput = ZodInput<typeof GridLineInputSchema>;

/** 持久化的单个 Grid 方向线条配置 */
export type IRGridLine = ZodInput<typeof GridLineInputSchema>;

/** 持久化的 Standard Grid composite */
export type IRGrid = Omit<ZodInput<typeof GridSchema>, keyof IRScopeProps | 'bounds'> &
  IRScopeProps &
  Pick<ZodInfer<typeof GridSchema>, 'bounds'>;

/** 创建 Grid 时允许省略固定 discriminator 的输入 */
export type GridInput = Omit<IRGrid, 'namespace' | 'type'>;
