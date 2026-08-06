import { CompositeBaseSchema, PolarPositionSchema, PositionSchema, ScopePropsSchema } from '@retikz/core';
import { z } from 'zod';

import { STANDARD_NAMESPACE } from '../../shared';
import { getLatticeRangeError } from '../shared/lattice';
import { StandardPathBorderStyleSchema, StandardPathStrokeStyleSchema } from '../shared/schemas';
import { DEFAULT_GRID_LINE_SPACING, GridBorderOrder } from './constants';

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

const GridLineMajorSchema = z.strictObject({
  every: z.number().int().positive().describe('Positive origin-relative lattice interval for major lines.'),
  offset: z.number().int().default(0).describe('Origin-relative lattice index offset for major lines.'),
  style: StandardPathStrokeStyleSchema.optional().describe('Style fields overriding ordinary grid-line style.'),
});

export const GridLineInputSchema = z
  .strictObject({
    spacing: z
      .number()
      .positive()
      .default(DEFAULT_GRID_LINE_SPACING)
      .describe('Positive distance between adjacent grid lines in this direction.'),
    origin: z.number().optional().describe('Optional origin-relative lattice coordinate for this direction.'),
    includeBoundary: z.boolean().default(false).describe('Whether missing bounds edges are added as grid lines.'),
    style: StandardPathStrokeStyleSchema.optional().describe('Style for ordinary grid lines.'),
    major: GridLineMajorSchema.optional().describe('Optional major-line interval and style override.'),
  })
  .describe('Configuration shared by one grid-line direction.');

const GridLinePairSchema = z.strictObject({
  vertical: GridLineInputSchema.describe('Configuration for vertical grid lines.'),
  horizontal: GridLineInputSchema.describe('Configuration for horizontal grid lines.'),
});

export const GridLineSchema = z
  .union([z.boolean(), GridLineInputSchema, GridLinePairSchema])
  .default(true)
  .describe('Disabled, shared, or direction-specific grid-line configuration.');

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
  ...ScopePropsSchema.shape,
  bounds: GridBoundsSchema.describe('Unordered Cartesian corners or a center position with non-negative dimensions.'),
  line: GridLineSchema,
  border: GridBorderSchema.optional().describe('Optional padded border and its drawing order.'),
});

type GridRefinementInput = z.infer<typeof GridBaseSchema>;
type GridLineConfig = z.infer<typeof GridLineInputSchema>;
type GridLinePair = { vertical: GridLineConfig; horizontal: GridLineConfig };

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
  const line = resolveGridLines(grid.line);
  if (line === false) return;

  const bounds = getGridNumericBounds(grid);
  const verticalError = getLatticeRangeError({
    min: bounds.minX,
    max: bounds.maxX,
    spacing: line.vertical.spacing,
    origin: line.vertical.origin ?? bounds.minX,
    includeBoundary: line.vertical.includeBoundary,
  });
  const horizontalError = getLatticeRangeError({
    min: bounds.minY,
    max: bounds.maxY,
    spacing: line.horizontal.spacing,
    origin: line.horizontal.origin ?? bounds.minY,
    includeBoundary: line.horizontal.includeBoundary,
  });

  if (verticalError !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: getGridLineSpacingPath(grid.line, 'vertical'),
      message: verticalError,
    });
  }
  if (horizontalError !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: getGridLineSpacingPath(grid.line, 'horizontal'),
      message: horizontalError,
    });
  }
};

const resolveGridLines = (line: GridRefinementInput['line']): GridLinePair | false => {
  if (line === false) return false;
  if (line === true) {
    const defaultLine: GridLineConfig = { spacing: DEFAULT_GRID_LINE_SPACING, includeBoundary: false };
    return { vertical: defaultLine, horizontal: defaultLine };
  }
  if ('vertical' in line) return line;
  return { vertical: line, horizontal: line };
};

const getGridLineSpacingPath = (
  line: GridRefinementInput['line'],
  direction: 'vertical' | 'horizontal',
): Array<string> => {
  if (line === true) return ['line'];
  if (typeof line === 'object' && 'vertical' in line) return ['line', direction, 'spacing'];
  return ['line', 'spacing'];
};

export const GridSchema = GridBaseSchema.superRefine(refineGrid);
