import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { LegendContentKind, LegendDirection, LegendSampleAlignment, LegendWrap } from './constants';
import type {
  LegendItemSchema,
  LegendItemsContentSchema,
  LegendRampContentSchema,
  LegendSchema,
  LegendTickSchema,
} from './schema';

/** Legend 内容形态取值 */
export type LegendContentKindValue = ValueOf<typeof LegendContentKind>;

/** Legend 物理排列方向取值 */
export type LegendDirectionValue = ValueOf<typeof LegendDirection>;

/** Legend 离散条目换行策略取值 */
export type LegendWrapValue = ValueOf<typeof LegendWrap>;

/** Legend 样本物理 y 轴对齐方式取值 */
export type LegendSampleAlignmentValue = ValueOf<typeof LegendSampleAlignment>;

/** 持久化的 Legend 离散条目 */
export type IRLegendItem = z.infer<typeof LegendItemSchema>;

/** 持久化的 Legend 离散内容 */
export type IRLegendItemsContent = z.infer<typeof LegendItemsContentSchema>;

/** 持久化的 Legend 连续刻度 */
export type IRLegendTick = z.infer<typeof LegendTickSchema>;

/** 持久化的 Legend 连续样本内容 */
export type IRLegendRampContent = z.infer<typeof LegendRampContentSchema>;

/** 持久化的 Standard Legend composite */
export type IRLegend = z.infer<typeof LegendSchema>;

/** 创建 Legend 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type LegendInput = Omit<z.input<typeof LegendSchema>, 'namespace' | 'type'>;
