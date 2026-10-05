import type { IRScopeProps } from '@retikz/core';
import type { input as ZodInput } from 'zod';

import type { AxesSchema } from './schema';

/** 持久化的 Standard Axes composite */
export type IRAxes = Omit<ZodInput<typeof AxesSchema>, keyof IRScopeProps> & IRScopeProps;

/** 创建 Axes 时允许省略固定 discriminator 的输入 */
export type AxesInput = Omit<IRAxes, 'namespace' | 'type'>;
