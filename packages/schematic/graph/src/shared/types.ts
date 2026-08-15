import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { GraphElementType,GraphNeutralStyle } from './constants';
import type { GraphLayoutItemArtifactSchema, GraphOuterArtifactSchema } from './schema';

export type GraphElementTypeValue = ValueOf<typeof GraphElementType>;
export type GraphLayoutItemArtifact = z.infer<typeof GraphLayoutItemArtifactSchema>;
export type GraphOuterArtifact = z.infer<typeof GraphOuterArtifactSchema>;
export type GraphNeutralStyleValue = typeof GraphNeutralStyle;
