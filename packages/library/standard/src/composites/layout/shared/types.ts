import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  LayoutAlignment,
  LayoutAxisSizeKind,
  LayoutDistribution,
  LayoutItemKind,
  LayoutOverflow,
  LayoutSpacingKind,
} from './constants';
import type {
  LayoutArtifactAlignmentGuideSchema,
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutArtifactOverflowSchema,
  LayoutArtifactRectSchema,
  LayoutAxisSizeSchema,
  LayoutContainerBoxSchema,
  LayoutItemBaseSchema,
  LayoutSizeSchema,
  LayoutSpacingArtifactSchema,
} from './schema';

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

/** 布局产物中间距区域的语义取值 */
export type LayoutSpacingKindValue = ValueOf<typeof LayoutSpacingKind>;

/** Layout artifact 的 container-local 矩形 */
export type LayoutArtifactRect = z.infer<typeof LayoutArtifactRectSchema>;

/** Flex/Grid 最终物理布局中的固定或分布式间距区域 */
export type LayoutSpacingArtifact = z.infer<typeof LayoutSpacingArtifactSchema>;

/** Layout item 的可观察溢出状态 */
export type LayoutArtifactOverflow = z.infer<typeof LayoutArtifactOverflowSchema>;

/** Layout item 实际采用的 alignment guide */
export type LayoutArtifactAlignmentGuide = z.infer<typeof LayoutArtifactAlignmentGuideSchema>;

/** 三种布局 item 共用的 placement artifact */
export type LayoutArtifactItemBase = z.infer<typeof LayoutArtifactItemBaseSchema>;

/** 三种布局 container 共用的几何 artifact */
export type LayoutArtifactContainer = z.infer<typeof LayoutArtifactContainerSchema>;
