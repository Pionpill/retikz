import { z } from 'zod';

import { FlexLayoutArtifactSchema } from '../flex-layout';
import { GridLayoutArtifactSchema } from '../grid-layout';
import { OverlayLayoutArtifactSchema } from '../overlay-layout';

export const LayoutArtifactSchema = z
  .discriminatedUnion('kind', [FlexLayoutArtifactSchema, GridLayoutArtifactSchema, OverlayLayoutArtifactSchema])
  .describe('Closed union of Standard layout compile artifact payloads.');
