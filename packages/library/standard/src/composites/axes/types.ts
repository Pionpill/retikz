import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { AxesArrowMode } from './constants';
import type { AxesSchema } from './schema';

/** Axes 坐标轴端点箭头模式取值 */
export type AxesArrowModeValue = ValueOf<typeof AxesArrowMode>;

/** 持久化的 Standard Axes composite */
export type IRAxes = z.infer<typeof AxesSchema>;

/** 创建 Axes 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type AxesInput = Omit<z.input<typeof AxesSchema>, 'namespace' | 'type'>;
