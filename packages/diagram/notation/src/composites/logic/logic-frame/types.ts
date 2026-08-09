import type { z } from 'zod';

import type {
  LogicFrameRegion,
  LogicFrameRegionInput,
  LogicFrameSection,
  LogicFrameSectionInput,
  LogicOutlineAppearance,
  LogicOutlineAppearanceInput,
} from '../shared';
import type { LogicFrameAppearanceSchema, LogicFrameArtifactSchema, LogicFrameSchema } from './schema';

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

export type { LogicFrameRegion, LogicFrameRegionInput, LogicFrameSection, LogicFrameSectionInput };
export type { LogicOutlineAppearance, LogicOutlineAppearanceInput };
