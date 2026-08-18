import type { z } from 'zod';

import type { ContainerNeutralStyle } from './constants';
import type {
  ContainerAppearanceSchema,
  ContainerArtifactSchema,
  ContainerLayoutItemArtifactSchema,
  ContainerOuterArtifactSchema,
  ContainerOutlineAppearanceSchema,
  ContainerRegionSchema,
  ContainerSchema,
  ContainerSectionSchema,
} from './schema';

/** Container 规范 IR */
export type IRContainer = z.infer<typeof ContainerSchema>;

/** Container 外壳外观的规范类型 */
export type ContainerAppearance = z.infer<typeof ContainerAppearanceSchema>;

/** Container 编译产物 */
export type ContainerArtifact = z.infer<typeof ContainerArtifactSchema>;

/** Container 区域的规范输入 */
export type ContainerRegion = z.infer<typeof ContainerRegionSchema>;

/** Container 分段的规范输入 */
export type ContainerSection = z.infer<typeof ContainerSectionSchema>;

/** Container 轮廓的规范外观 */
export type ContainerOutlineAppearance = z.infer<typeof ContainerOutlineAppearanceSchema>;

/** Container 内容放置 artifact */
export type ContainerLayoutItemArtifact = z.infer<typeof ContainerLayoutItemArtifactSchema>;

/** Container 外壳 artifact */
export type ContainerOuterArtifact = z.infer<typeof ContainerOuterArtifactSchema>;

/** Container 中性样式默认值类型 */
export type ContainerNeutralStyleValue = typeof ContainerNeutralStyle;
