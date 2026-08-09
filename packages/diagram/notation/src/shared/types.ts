import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { LogicCompositeType, LogicNeutralStyle } from './constants';
import type { LogicLayoutItemArtifactSchema, LogicOuterArtifactSchema } from './schema';

export type LogicCompositeTypeValue = ValueOf<typeof LogicCompositeType>;
export type LogicLayoutItemArtifact = z.infer<typeof LogicLayoutItemArtifactSchema>;
export type LogicOuterArtifact = z.infer<typeof LogicOuterArtifactSchema>;
export type LogicNeutralStyleValue = typeof LogicNeutralStyle;
