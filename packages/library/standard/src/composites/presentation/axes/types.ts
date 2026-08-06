import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { AxesArrowMode, AxesLabelEnd, AxesTickExtent, AxesTickSide, AxesTickSourceKind } from './constants';
import type { AxesSchema } from './schemas';

/** Axes 坐标轴端点箭头模式取值 */
export type AxesArrowModeValue = ValueOf<typeof AxesArrowMode>;

/** Axes 规则刻度覆盖范围取值 */
export type AxesTickExtentValue = ValueOf<typeof AxesTickExtent>;

/** Axes 刻度线段伸出侧取值 */
export type AxesTickSideValue = ValueOf<typeof AxesTickSide>;

/** Axes 刻度来源类型取值 */
export type AxesTickSourceKindValue = ValueOf<typeof AxesTickSourceKind>;

/** Axes 轴名端点取值 */
export type AxesLabelEndValue = ValueOf<typeof AxesLabelEnd>;

/** 持久化的 Standard Axes composite */
export type IRAxes = z.infer<typeof AxesSchema>;

/** 创建 Axes 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type AxesInput = Omit<z.input<typeof AxesSchema>, 'namespace' | 'type'>;
