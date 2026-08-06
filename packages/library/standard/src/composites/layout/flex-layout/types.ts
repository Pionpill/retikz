import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { FlexLayoutDirection, FlexLayoutWrap } from './constants';
import type {
  FlexLayoutArtifactSchema,
  FlexLayoutInspectLocalOptionsInputSchema,
  FlexLayoutInspectLocalOptionsSchema,
  FlexLayoutInspectOptionsInputSchema,
  FlexLayoutItemSchema,
  FlexLayoutSchema,
  FlexMainDistributionSchema,
} from './schema';

/** FlexLayout 主轴方向取值 */
export type FlexLayoutDirectionValue = ValueOf<typeof FlexLayoutDirection>;

/** FlexLayout 换行策略取值 */
export type FlexLayoutWrapValue = ValueOf<typeof FlexLayoutWrap>;

/** FlexLayout 主轴剩余空间分布取值 */
export type FlexMainDistributionValue = z.infer<typeof FlexMainDistributionSchema>;

/** 持久化的 FlexLayout item */
export type IRFlexLayoutItem = z.infer<typeof FlexLayoutItemSchema>;

/** 创建 FlexLayout item 时允许省略默认字段的输入 */
export type FlexLayoutItemInput = z.input<typeof FlexLayoutItemSchema>;

/** 持久化的 Standard FlexLayout composite */
export type IRFlexLayout = z.infer<typeof FlexLayoutSchema>;

/** 创建 FlexLayout 时允许省略固定 discriminator 与 schema 默认字段的输入 */
export type FlexLayoutInput = Omit<z.input<typeof FlexLayoutSchema>, 'namespace' | 'type'>;

/** FlexLayout 的 JSON-safe compile artifact payload */
export type FlexLayoutArtifact = z.infer<typeof FlexLayoutArtifactSchema>;

/** FlexLayout inspector 的作者输入 */
export type FlexLayoutInspectOptions = z.input<typeof FlexLayoutInspectOptionsInputSchema>;

/** FlexLayout inspector 的局部作者输入 */
export type FlexLayoutInspectLocalOptions = z.input<typeof FlexLayoutInspectLocalOptionsInputSchema>;

/** FlexLayout inspector 的规范化局部选项 */
export type ResolvedFlexLayoutInspectLocalOptions = z.output<typeof FlexLayoutInspectLocalOptionsSchema>;
