import { z } from 'zod';

import { ShapeRefSchema } from '../shape';

export const BoundarySchema = z
  .union([z.string().min(1), ShapeRefSchema])
  .describe(
    'Connection surface for edge endpoints and standard direction anchors, independent of the visual `shape`. Reserved name: "shape"; other names first use CompileOptions.boundaries, then fall back to registered shape boundaries. Does not change node layout.',
  );
