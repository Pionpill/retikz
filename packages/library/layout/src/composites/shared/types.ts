import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { LayoutAlignment } from './constants';
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

/** 持久化的单轴容器尺寸策略 */
export type IRLayoutAxisSize = ZodInput<typeof LayoutAxisSizeSchema>;

/** 创建单轴尺寸策略时允许的 schema 输入 */
export type LayoutAxisSizeInput = ZodInput<typeof LayoutAxisSizeSchema>;

/** 持久化的双轴容器尺寸策略 */
export type IRLayoutSize = ZodInput<typeof LayoutSizeSchema>;

/** 创建双轴尺寸策略时允许省略默认轴的输入 */
export type LayoutSizeInput = ZodInput<typeof LayoutSizeSchema>;

/** 持久化的通用 Layout container Box */
export type IRLayoutContainerBox = ZodInput<typeof LayoutContainerBoxSchema>;

/** 创建通用 Layout container Box 时允许省略默认字段的输入 */
export type LayoutContainerBoxInput = ZodInput<typeof LayoutContainerBoxSchema>;

/** 持久化的通用 LayoutItem 字段 */
export type IRLayoutItemBase = Omit<ZodInput<typeof LayoutItemBaseSchema>, 'child'> &
  Pick<ZodInfer<typeof LayoutItemBaseSchema>, 'child'>;

/** 创建通用 LayoutItem 时允许省略默认 margin 的输入 */
export type LayoutItemBaseInput = IRLayoutItemBase;

/** 不包含 baseline 的物理边对齐方式 */
export type LayoutEdgeAlignment = Exclude<
  LayoutAlignment,
  typeof LayoutAlignment.FirstBaseline | typeof LayoutAlignment.LastBaseline
>;

/** Layout artifact 的 container-local 矩形 */
export type LayoutArtifactRect = ZodInfer<typeof LayoutArtifactRectSchema>;

/** Flex/Grid 最终物理布局中的固定或分布式间距区域 */
export type LayoutSpacingArtifact = ZodInfer<typeof LayoutSpacingArtifactSchema>;

/** Layout item 的可观察溢出状态 */
export type LayoutArtifactOverflow = ZodInfer<typeof LayoutArtifactOverflowSchema>;

/** Layout item 实际采用的 alignment guide */
export type LayoutArtifactAlignmentGuide = ZodInfer<typeof LayoutArtifactAlignmentGuideSchema>;

/** 三种布局 item 共用的 placement artifact */
export type LayoutArtifactItemBase = ZodInfer<typeof LayoutArtifactItemBaseSchema>;

/** 三种布局 container 共用的几何 artifact */
export type LayoutArtifactContainer = ZodInfer<typeof LayoutArtifactContainerSchema>;
