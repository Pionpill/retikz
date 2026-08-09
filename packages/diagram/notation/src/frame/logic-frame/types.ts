import type { z } from 'zod';

import type {
  LogicFrameAppearanceSchema,
  LogicFrameArtifactSchema,
  LogicFrameRegionSchema,
  LogicFrameSchema,
  LogicFrameSectionSchema,
  LogicOutlineAppearanceSchema,
} from './schema';

/** LogicFrame canonical IR */
export type IRLogicFrame = z.infer<typeof LogicFrameSchema>;

/** LogicFrame factory input */
export type LogicFrameInput = Omit<z.input<typeof LogicFrameSchema>, 'namespace' | 'type'>;

/** LogicFrame shell appearance canonical type */
export type LogicFrameAppearance = z.infer<typeof LogicFrameAppearanceSchema>;

/** LogicFrame shell appearance author input */
export type LogicFrameAppearanceInput = z.input<typeof LogicFrameAppearanceSchema>;

/** LogicFrame compile artifact */
export type LogicFrameArtifact = z.infer<typeof LogicFrameArtifactSchema>;

/** LogicFrame region canonical input */
export type LogicFrameRegion = z.infer<typeof LogicFrameRegionSchema>;

/** LogicFrame region author input */
export type LogicFrameRegionInput = z.input<typeof LogicFrameRegionSchema>;

/** LogicFrame section canonical input */
export type LogicFrameSection = z.infer<typeof LogicFrameSectionSchema>;

/** LogicFrame section author input */
export type LogicFrameSectionInput = z.input<typeof LogicFrameSectionSchema>;

/** LogicFrame outline canonical appearance */
export type LogicOutlineAppearance = z.infer<typeof LogicOutlineAppearanceSchema>;

/** LogicFrame outline author input */
export type LogicOutlineAppearanceInput = z.input<typeof LogicOutlineAppearanceSchema>;
