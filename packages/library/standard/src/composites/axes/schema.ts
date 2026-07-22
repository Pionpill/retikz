import { CompositeBaseSchema, PositionSchema } from '@retikz/core';
import { z } from 'zod';

import { getGridLatticeRangeError } from '../../shared';
import { StandardGridSpacingSchema, StandardPathStrokeStyleSchema } from '../shared';

/** Axes 坐标轴端点的箭头模式 */
export const AxesArrowMode = {
  None: 'none',
  Positive: 'positive',
  Both: 'both',
} as const;

const AxesRangeSchema = z.strictObject({
  min: z.number().finite().describe('Inclusive minimum coordinate.'),
  max: z.number().finite().describe('Inclusive maximum coordinate.'),
});

const AxesBoundsSchema = z.strictObject({
  x: AxesRangeSchema.describe('Horizontal coordinate range.'),
  y: AxesRangeSchema.describe('Vertical coordinate range.'),
});

const AxesGridSchema = z.strictObject({
  spacing: StandardGridSpacingSchema.describe('Uniform or axis-specific positive grid spacing.'),
  style: StandardPathStrokeStyleSchema.optional().describe('Shared style defaults for both grid directions.'),
  vertical: StandardPathStrokeStyleSchema.optional().describe('Style fields overriding vertical grid lines.'),
  horizontal: StandardPathStrokeStyleSchema.optional().describe('Style fields overriding horizontal grid lines.'),
});

const AxesLinesSchema = z
  .strictObject({
    arrows: z.enum(AxesArrowMode).default(AxesArrowMode.Positive).describe('Arrow placement on both coordinate axes.'),
    style: StandardPathStrokeStyleSchema.optional().describe('Style for both coordinate axes.'),
  })
  .default({ arrows: AxesArrowMode.Positive });

const AxesTicksSchema = z.strictObject({
  x: z.number().finite().positive().optional().describe('Positive spacing between ticks on the x axis.'),
  y: z.number().finite().positive().optional().describe('Positive spacing between ticks on the y axis.'),
  size: z.number().finite().positive().default(6).describe('Full tick length in user units.'),
  style: StandardPathStrokeStyleSchema.optional().describe('Style for ticks on both axes.'),
});

const AxesLabelsSchema = z
  .strictObject({
    x: z.string().nullable().default('x').describe('Horizontal axis label, or null to suppress it.'),
    y: z.string().nullable().default('y').describe('Vertical axis label, or null to suppress it.'),
  })
  .default({ x: 'x', y: 'y' });

/** Axes 的 JSON-safe Tier 2 composite schema */
export const AxesSchema = CompositeBaseSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('axes').describe('Composite type for a Cartesian pair of coordinate axes.'),
  bounds: AxesBoundsSchema.describe('Strict horizontal and vertical coordinate ranges.'),
  origin: PositionSchema.default([0, 0]).describe('Shared origin for axes, grid lines, and ticks.'),
  grid: AxesGridSchema.optional().describe('Optional origin-aligned Cartesian grid.'),
  axes: AxesLinesSchema.describe('Coordinate-axis arrow mode and shared style.'),
  ticks: AxesTicksSchema.optional().describe('Optional origin-relative ticks for either axis.'),
  labels: AxesLabelsSchema.describe('Labels placed beyond the positive ends of the axes.'),
}).superRefine((axes, ctx) => {
  if (axes.bounds.x.min >= axes.bounds.x.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bounds', 'x', 'max'],
      message: 'bounds.x.min must be less than bounds.x.max.',
    });
  }
  if (axes.bounds.y.min >= axes.bounds.y.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bounds', 'y', 'max'],
      message: 'bounds.y.min must be less than bounds.y.max.',
    });
  }

  const [originX, originY] = axes.origin;
  if (originX < axes.bounds.x.min || originX > axes.bounds.x.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['origin', 0],
      message: 'origin[0] must be inside bounds.x.',
    });
  }
  if (originY < axes.bounds.y.min || originY > axes.bounds.y.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['origin', 1],
      message: 'origin[1] must be inside bounds.y.',
    });
  }

  if (axes.grid !== undefined) {
    const [spacingX, spacingY] =
      typeof axes.grid.spacing === 'number'
        ? [axes.grid.spacing, axes.grid.spacing]
        : [axes.grid.spacing.x, axes.grid.spacing.y];
    const verticalError = getGridLatticeRangeError({
      min: axes.bounds.x.min,
      max: axes.bounds.x.max,
      spacing: spacingX,
      origin: originX,
      includeBoundary: false,
    });
    const horizontalError = getGridLatticeRangeError({
      min: axes.bounds.y.min,
      max: axes.bounds.y.max,
      spacing: spacingY,
      origin: originY,
      includeBoundary: false,
    });
    if (verticalError !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: typeof axes.grid.spacing === 'number' ? ['grid', 'spacing'] : ['grid', 'spacing', 'x'],
        message: verticalError,
      });
    }
    if (horizontalError !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: typeof axes.grid.spacing === 'number' ? ['grid', 'spacing'] : ['grid', 'spacing', 'y'],
        message: horizontalError,
      });
    }
  }

  if (axes.ticks?.x !== undefined) {
    const tickXError = getGridLatticeRangeError({
      min: axes.bounds.x.min,
      max: axes.bounds.x.max,
      spacing: axes.ticks.x,
      origin: originX,
      includeBoundary: false,
    });
    if (tickXError !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ticks', 'x'], message: tickXError });
    }
  }
  if (axes.ticks?.y !== undefined) {
    const tickYError = getGridLatticeRangeError({
      min: axes.bounds.y.min,
      max: axes.bounds.y.max,
      spacing: axes.ticks.y,
      origin: originY,
      includeBoundary: false,
    });
    if (tickYError !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ticks', 'y'], message: tickYError });
    }
  }
});
