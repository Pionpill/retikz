/**
 * 供 Tier 2 owner 组合使用的 Standard 布局公共面
 *
 * @description 只公开 canonical Flex 编译器、必要的共享布局词汇，以及通用几何和 artifact 原子能力
 */
export type {
  FlexLayoutArtifact,
  FlexLayoutDirectionValue,
  FlexLayoutWrapValue,
  IRFlexLayout,
  IRFlexLayoutItem,
} from '../composites/layout/flex-layout';
export { FlexLayoutDirection, FlexLayoutSchema, FlexLayoutWrap } from '../composites/layout/flex-layout';
export { compileFlexLayout } from '../composites/layout/flex-layout/pipeline';
export type {
  CreateLayoutArtifactItemInput,
  LayoutInsets,
  LayoutRect,
  ResolvedLayoutAxisSize,
  ResolveLayoutAxisSizeInput,
} from '../composites/layout/internal';
export {
  alignAllocationInSlot,
  contentRectOf,
  createLayoutArtifactContainer,
  createLayoutArtifactItem,
  layoutClipOf,
  normalizeLayoutSpacing,
  resolveLayoutAxisSize,
  unionLayoutArtifactRects,
} from '../composites/layout/internal';
export type {
  IRLayoutAxisSize,
  IRLayoutSize,
  LayoutAlignmentValue,
  LayoutArtifactAlignmentGuide,
  LayoutArtifactContainer,
  LayoutArtifactItemBase,
  LayoutArtifactOverflow,
  LayoutArtifactRect,
  LayoutAxisSizeKindValue,
  LayoutDistributionValue,
  LayoutOverflowValue,
  LayoutSizeInput,
} from '../composites/layout/shared';
export {
  LayoutAlignment,
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutArtifactRectSchema,
  LayoutAxisSizeKind,
  LayoutDistribution,
  LayoutOverflow,
  LayoutOverflowSchema,
  LayoutSizeSchema,
} from '../composites/layout/shared';
