import { z } from 'zod';

import { ShapeValueSchema } from '../shape';

export const BoundarySchema = z
  .union([ShapeValueSchema])
  .describe(
    'Connection surface for edge endpoints and direction anchors. "shape" uses the visual shape; registered boundary providers override shape fallback.',
  );
