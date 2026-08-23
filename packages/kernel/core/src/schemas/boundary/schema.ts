import { createOpenStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { BuiltinShape, ShapeRefSchema } from '../shape';
import { BoundaryKeyword } from './constants';

const BoundaryNameSchema = createOpenStringSchema({ ...BuiltinShape, Self: BoundaryKeyword.Self });

export const BoundarySchema = z
  .union([BoundaryNameSchema, ShapeRefSchema])
  .describe(
    'Connection surface for edge endpoints and direction anchors. "shape" uses the visual shape; registered boundary providers override shape fallback.',
  );
