import type { z } from 'zod';

import type {
  LogicFrameAppearanceSchema,
  LogicFrameArtifactSchema,
  LogicFrameRegionSchema,
  LogicFrameSchema,
  LogicFrameSectionSchema,
  LogicOutlineAppearanceSchema,
} from './schema';

/** LogicFrame 规范 IR */
export type IRLogicFrame = z.infer<typeof LogicFrameSchema>;

/** LogicFrame 工厂输入 */
export type LogicFrameInput = Omit<z.input<typeof LogicFrameSchema>, 'namespace' | 'type'>;

/** LogicFrame 外壳外观的规范类型 */
export type LogicFrameAppearance = z.infer<typeof LogicFrameAppearanceSchema>;

/** LogicFrame 外壳外观的作者输入 */
export type LogicFrameAppearanceInput = z.input<typeof LogicFrameAppearanceSchema>;

/** LogicFrame 编译产物 */
export type LogicFrameArtifact = z.infer<typeof LogicFrameArtifactSchema>;

/** LogicFrame 区域的规范输入 */
export type LogicFrameRegion = z.infer<typeof LogicFrameRegionSchema>;

/** LogicFrame 区域的作者输入 */
export type LogicFrameRegionInput = z.input<typeof LogicFrameRegionSchema>;

/** LogicFrame 分段的规范输入 */
export type LogicFrameSection = z.infer<typeof LogicFrameSectionSchema>;

/** LogicFrame 分段的作者输入 */
export type LogicFrameSectionInput = z.input<typeof LogicFrameSectionSchema>;

/** LogicFrame 轮廓的规范外观 */
export type LogicOutlineAppearance = z.infer<typeof LogicOutlineAppearanceSchema>;

/** LogicFrame 轮廓的作者输入 */
export type LogicOutlineAppearanceInput = z.input<typeof LogicOutlineAppearanceSchema>;
