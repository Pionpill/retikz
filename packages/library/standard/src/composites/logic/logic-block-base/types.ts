import type { z } from 'zod';

import type {
  LogicBlockRegion,
  LogicBlockRegionInput,
  LogicBlockSection,
  LogicBlockSectionInput,
  LogicOutlineAppearance,
  LogicOutlineAppearanceInput,
} from '../shared';
import type { LogicBlockAppearanceSchema, LogicBlockBaseArtifactSchema, LogicBlockBaseSchema } from './schema';

/** LogicBlockBase canonical IR */
export type IRLogicBlockBase = z.infer<typeof LogicBlockBaseSchema>;

/** LogicBlockBase factory input */
export type LogicBlockBaseInput = Omit<z.input<typeof LogicBlockBaseSchema>, 'namespace' | 'type'>;

/** LogicBlockBase shell appearance canonical type */
export type LogicBlockAppearance = z.infer<typeof LogicBlockAppearanceSchema>;

/** LogicBlockBase shell appearance author input */
export type LogicBlockAppearanceInput = z.input<typeof LogicBlockAppearanceSchema>;

/** LogicBlockBase compile artifact */
export type LogicBlockBaseArtifact = z.infer<typeof LogicBlockBaseArtifactSchema>;

export type { LogicBlockRegion, LogicBlockRegionInput, LogicBlockSection, LogicBlockSectionInput };
export type { LogicOutlineAppearance, LogicOutlineAppearanceInput };
