import { CompositeBaseSchema, PositionSchema } from '@retikz/core';
import { z } from 'zod';

import { getLatticeRangeError } from '../shared/lattice';
import {
  StandardGridSpacingSchema,
  StandardPathBorderStyleSchema,
  StandardPathStrokeStyleSchema,
} from '../shared/schemas';
import { GridBorderOrder } from './constants';

const GridBoundsSchema = z.strictObject({
  min: PositionSchema.describe('Inclusive minimum corner of the grid bounds.'),
  max: PositionSchema.describe('Inclusive maximum corner of the grid bounds.'),
});

const GridLinesSchema = z
  .strictObject({
    vertical: z.boolean().default(true).describe('Whether vertical grid lines are emitted.'),
    horizontal: z.boolean().default(true).describe('Whether horizontal grid lines are emitted.'),
    includeBoundary: z.boolean().default(false).describe('Whether missing bounds edges are added as grid lines.'),
    style: StandardPathStrokeStyleSchema.optional().describe('Style for ordinary grid lines.'),
  })
  .default({ vertical: true, horizontal: true, includeBoundary: false });

const GridMajorSchema = z.strictObject({
  every: z.number().int().positive().describe('Positive origin-relative lattice interval for major lines.'),
  offset: z.number().int().default(0).describe('Origin-relative lattice index offset for major lines.'),
  style: StandardPathStrokeStyleSchema.optional().describe('Style fields overriding ordinary grid-line style.'),
});

const GridBorderSchema = z.strictObject({
  padding: z.number().nonnegative().default(0).describe('Uniform outward border padding in user units.'),
  order: z
    .enum(GridBorderOrder)
    .default(GridBorderOrder.Front)
    .describe('Whether the border is emitted behind or in front of grid lines.'),
  extendLines: z.boolean().default(false).describe('Whether grid lines extend to the padded border bounds.'),
  style: StandardPathBorderStyleSchema.optional().describe('Style for the optional border path.'),
});

const GridBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('grid').describe('Composite type for a regular Cartesian grid.'),
  bounds: GridBoundsSchema.describe('Strict two-dimensional bounds with min less than max on both axes.'),
  spacing: StandardGridSpacingSchema.describe('Uniform or axis-specific positive grid spacing.'),
  origin: PositionSchema.optional().describe('Optional lattice origin. Omitted uses bounds.min during lowering.'),
  lines: GridLinesSchema.describe('Visible grid directions and optional boundary insertion.'),
  major: GridMajorSchema.optional().describe('Optional major-line interval and style override.'),
  border: GridBorderSchema.optional().describe('Optional padded border and its drawing order.'),
});

type GridRefinementInput = z.infer<typeof GridBaseSchema>;

const refineGrid = (grid: GridRefinementInput, ctx: z.RefinementCtx): void => {
  if (grid.bounds.min[0] >= grid.bounds.max[0]) {
    ctx.addIssue({
      code: 'custom',
      path: ['bounds', 'max', 0],
      message: 'bounds.min[0] must be less than bounds.max[0].',
    });
  }
  if (grid.bounds.min[1] >= grid.bounds.max[1]) {
    ctx.addIssue({
      code: 'custom',
      path: ['bounds', 'max', 1],
      message: 'bounds.min[1] must be less than bounds.max[1].',
    });
  }
  if (!grid.lines.vertical && !grid.lines.horizontal) {
    ctx.addIssue({
      code: 'custom',
      path: ['lines'],
      message: 'At least one grid line direction must be enabled.',
    });
  }

  const [originX, originY] = grid.origin ?? grid.bounds.min;
  const [spacingX, spacingY] =
    typeof grid.spacing === 'number' ? [grid.spacing, grid.spacing] : [grid.spacing.x, grid.spacing.y];
  const verticalError = grid.lines.vertical
    ? getLatticeRangeError({
        min: grid.bounds.min[0],
        max: grid.bounds.max[0],
        spacing: spacingX,
        origin: originX,
        includeBoundary: grid.lines.includeBoundary,
      })
    : undefined;
  const horizontalError = grid.lines.horizontal
    ? getLatticeRangeError({
        min: grid.bounds.min[1],
        max: grid.bounds.max[1],
        spacing: spacingY,
        origin: originY,
        includeBoundary: grid.lines.includeBoundary,
      })
    : undefined;

  if (verticalError !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: typeof grid.spacing === 'number' ? ['spacing'] : ['spacing', 'x'],
      message: verticalError,
    });
  }
  if (horizontalError !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: typeof grid.spacing === 'number' ? ['spacing'] : ['spacing', 'y'],
      message: horizontalError,
    });
  }
};

export const GridSchema = GridBaseSchema.superRefine(refineGrid);
