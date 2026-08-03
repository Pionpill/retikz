import { z } from 'zod';

import { FlexLayoutItemSchema } from '../flex-layout';
import { GridLayoutItemSchema } from '../grid-layout';
import { OverlayLayoutItemSchema } from '../overlay-layout';

export const LayoutItemSchema = z
  .discriminatedUnion('kind', [FlexLayoutItemSchema, GridLayoutItemSchema, OverlayLayoutItemSchema])
  .describe('Closed union of items accepted by Standard layout containers.');
