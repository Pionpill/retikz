import { z } from 'zod';

import { ShapeRefSchema } from '../shape';

export const BoundarySchema = z
  .union([z.string().min(1), ShapeRefSchema])
  .describe(
    'Connection surface for edge endpoints and direction anchors. "shape" uses the visual shape; registered boundary providers override shape fallback.',
  );
