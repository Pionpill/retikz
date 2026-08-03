import { CompositeBaseSchema, PolarPositionSchema, PositionSchema } from '@retikz/core';
import { z } from 'zod';

import { STANDARD_NAMESPACE } from '../../shared';
import { getLatticeRangeError } from '../shared/lattice';
import {
  StandardGridSpacingSchema,
  StandardPathBorderStyleSchema,
  StandardPathStrokeStyleSchema,
} from '../shared/schemas';
import { GridBorderOrder } from './constants';

const GridCartesianBoundsSchema = z.strictObject({
  start: PositionSchema.describe('First inclusive Cartesian corner of the grid bounds.'),
  end: PositionSchema.describe('Second inclusive Cartesian corner of the grid bounds.'),
});

const GridCenteredBoundsSchema = z.strictObject({
  position: z
    .union([PositionSchema, PolarPositionSchema])
    .describe('Geometric grid center; PolarPosition is resolved by Core during Scene compilation.'),
  width: z.number().nonnegative().describe('Non-negative grid width in user units.'),
  height: z.number().nonnegative().describe('Non-negative grid height in user units.'),
});

const GridBoundsSchema = z
  .union([GridCartesianBoundsSchema, GridCenteredBoundsSchema])
  .describe('Either two unordered Cartesian corners or a center position with width and height.');

const GridLinesSchema = z
  .strictObject({
    vertical: z.boolean().default(true).describe('Whether vertical grid lines are emitted.'),
    horizontal: z.boolean().default(true).describe('Whether horizontal grid lines are emitted.'),
    includeBoundary: z.boolean().default(false).describe('Whether missing bounds edges are added as grid lines.'),
    style: StandardPathStrokeStyleSchema.optional().describe('Style for ordinary grid lines.'),
  })
  .default({ vertical: true, horizontal: true, includeBoundary: false })
  .describe('Visible grid directions and optional boundary insertion.');

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
  namespace: z.literal(STANDARD_NAMESPACE).describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('grid').describe('Composite type for a regular Cartesian grid.'),
  bounds: GridBoundsSchema.describe('Unordered Cartesian corners or a center position with non-negative dimensions.'),
  spacing: StandardGridSpacingSchema.describe('Uniform or axis-specific positive grid spacing.'),
  origin: PositionSchema.optional().describe(
    'Optional lattice origin; its coordinate frame depends on the bounds form.',
  ),
  lines: GridLinesSchema,
  major: GridMajorSchema.optional().describe('Optional major-line interval and style override.'),
  border: GridBorderSchema.optional().describe('Optional padded border and its drawing order.'),
});

type GridRefinementInput = z.infer<typeof GridBaseSchema>;

type GridNumericBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const getGridNumericBounds = (grid: GridRefinementInput): GridNumericBounds => {
  if ('start' in grid.bounds) {
    const [startX, startY] = grid.bounds.start;
    const [endX, endY] = grid.bounds.end;
    return {
      minX: Math.min(startX, endX),
      minY: Math.min(startY, endY),
      maxX: Math.max(startX, endX),
      maxY: Math.max(startY, endY),
    };
  }

  return {
    minX: -grid.bounds.width / 2,
    minY: -grid.bounds.height / 2,
    maxX: grid.bounds.width / 2,
    maxY: grid.bounds.height / 2,
  };
};

const refineGrid = (grid: GridRefinementInput, ctx: z.RefinementCtx): void => {
  if (!grid.lines.vertical && !grid.lines.horizontal) {
    ctx.addIssue({
      code: 'custom',
      path: ['lines'],
      message: 'At least one grid line direction must be enabled.',
    });
  }

  const bounds = getGridNumericBounds(grid);
  const [originX, originY] = grid.origin ?? [bounds.minX, bounds.minY];
  const [spacingX, spacingY] =
    typeof grid.spacing === 'number' ? [grid.spacing, grid.spacing] : [grid.spacing.x, grid.spacing.y];
  const verticalError = grid.lines.vertical
    ? getLatticeRangeError({
        min: bounds.minX,
        max: bounds.maxX,
        spacing: spacingX,
        origin: originX,
        includeBoundary: grid.lines.includeBoundary,
      })
    : undefined;
  const horizontalError = grid.lines.horizontal
    ? getLatticeRangeError({
        min: bounds.minY,
        max: bounds.maxY,
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
