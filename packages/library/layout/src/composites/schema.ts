import { z } from 'zod';

import { FlexLayoutArtifactSchema, FlexLayoutItemSchema } from './flex-layout';
import { GridLayoutArtifactSchema, GridLayoutItemSchema } from './grid-layout';
import { OverlayLayoutArtifactSchema, OverlayLayoutItemSchema } from './overlay-layout';

export const LayoutArtifactSchema = z
  .discriminatedUnion('kind', [FlexLayoutArtifactSchema, GridLayoutArtifactSchema, OverlayLayoutArtifactSchema])
  .describe('Closed union of Layout compile artifact payloads.');

export const LayoutItemSchema = z
  .discriminatedUnion('kind', [FlexLayoutItemSchema, GridLayoutItemSchema, OverlayLayoutItemSchema])
  .describe('Closed union of items accepted by Layout containers.');
