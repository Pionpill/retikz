import type { z } from 'zod';

import type {
  GraphFrameAppearanceSchema,
  GraphFrameArtifactSchema,
  GraphFrameRegionSchema,
  GraphFrameSchema,
  GraphFrameSectionSchema,
  GraphOutlineAppearanceSchema,
} from './schema';

/** GraphFrame 规范 IR */
export type IRGraphFrame = z.infer<typeof GraphFrameSchema>;

/** GraphFrame 工厂输入 */
export type GraphFrameCreateOptions = Omit<z.input<typeof GraphFrameSchema>, 'namespace' | 'type'>;

/** GraphFrame 外壳外观的规范类型 */
export type GraphFrameAppearance = z.infer<typeof GraphFrameAppearanceSchema>;

/** GraphFrame 外壳外观的作者输入 */
export type GraphFrameAppearanceCreateOptions = z.input<typeof GraphFrameAppearanceSchema>;

/** GraphFrame 编译产物 */
export type GraphFrameArtifact = z.infer<typeof GraphFrameArtifactSchema>;

/** GraphFrame 区域的规范输入 */
export type GraphFrameRegion = z.infer<typeof GraphFrameRegionSchema>;

/** GraphFrame 区域的作者输入 */
export type GraphFrameRegionCreateOptions = z.input<typeof GraphFrameRegionSchema>;

/** GraphFrame 分段的规范输入 */
export type GraphFrameSection = z.infer<typeof GraphFrameSectionSchema>;

/** GraphFrame 分段的作者输入 */
export type GraphFrameSectionCreateOptions = z.input<typeof GraphFrameSectionSchema>;

/** GraphFrame 轮廓的规范外观 */
export type GraphOutlineAppearance = z.infer<typeof GraphOutlineAppearanceSchema>;

/** GraphFrame 轮廓的作者输入 */
export type GraphOutlineAppearanceCreateOptions = z.input<typeof GraphOutlineAppearanceSchema>;
