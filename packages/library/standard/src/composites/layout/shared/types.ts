import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  LayoutAlignment,
  LayoutAxisSizeKind,
  LayoutDistribution,
  LayoutItemKind,
  LayoutOverflow,
} from './constants';
import type { LayoutAxisSizeSchema, LayoutContainerBoxSchema, LayoutItemBaseSchema, LayoutSizeSchema } from './schema';

/** 单轴容器尺寸策略判别值 */
export type LayoutAxisSizeKindValue = ValueOf<typeof LayoutAxisSizeKind>;

/** 持久化的单轴容器尺寸策略 */
export type IRLayoutAxisSize = z.infer<typeof LayoutAxisSizeSchema>;

/** 创建单轴尺寸策略时允许的 schema 输入 */
export type LayoutAxisSizeInput = z.input<typeof LayoutAxisSizeSchema>;

/** 持久化的双轴容器尺寸策略 */
export type IRLayoutSize = z.infer<typeof LayoutSizeSchema>;

/** 创建双轴尺寸策略时允许省略默认轴的输入 */
export type LayoutSizeInput = z.input<typeof LayoutSizeSchema>;

/** 持久化的通用 Layout container Box */
export type IRLayoutContainerBox = z.infer<typeof LayoutContainerBoxSchema>;

/** 创建通用 Layout container Box 时允许省略默认字段的输入 */
export type LayoutContainerBoxInput = z.input<typeof LayoutContainerBoxSchema>;

/** LayoutItem 容器种类判别值 */
export type LayoutItemKindValue = ValueOf<typeof LayoutItemKind>;

/** 持久化的通用 LayoutItem 字段 */
export type IRLayoutItemBase = z.infer<typeof LayoutItemBaseSchema>;

/** 创建通用 LayoutItem 时允许省略默认 margin 的输入 */
export type LayoutItemBaseInput = z.input<typeof LayoutItemBaseSchema>;

/** item 对齐方式取值 */
export type LayoutAlignmentValue = ValueOf<typeof LayoutAlignment>;

/** 不包含 baseline 的物理边对齐方式 */
export type LayoutEdgeAlignmentValue = Exclude<
  LayoutAlignmentValue,
  typeof LayoutAlignment.FirstBaseline | typeof LayoutAlignment.LastBaseline
>;

/** 剩余空间分布方式取值 */
export type LayoutDistributionValue = ValueOf<typeof LayoutDistribution>;

/** 容器视觉溢出策略取值 */
export type LayoutOverflowValue = ValueOf<typeof LayoutOverflow>;
