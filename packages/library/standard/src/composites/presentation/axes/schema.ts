import {
  ArrowDetailSchema,
  CompositeBaseSchema,
  LabelVisualStyleSchema,
  PositionSchema,
  TextBlockSchema,
} from '@retikz/core';
import { z } from 'zod';

import { getLatticeRangeError } from '../shared/lattice';
import { StandardGridSpacingSchema, StandardPathStrokeStyleSchema } from '../shared/schemas';
import { enumerateAxesTickValues, resolveAxesExtent, resolveAxesTickRange } from './axis';
import { AxesArrowMode, AxesLabelEnd, AxesTickExtent, AxesTickSide, AxesTickSourceKind } from './constants';

const AxesDirectionalExtentSchema = z.strictObject({
  negative: z.number().nonnegative().describe('Drawing length in the negative axis direction.'),
  positive: z.number().nonnegative().describe('Drawing length in the positive axis direction.'),
});

const AxesExtentSchema = z
  .union([
    z.number().positive().describe('Symmetric drawing length in both axis directions.'),
    AxesDirectionalExtentSchema,
  ])
  .describe('Symmetric or direction-specific axis drawing lengths.');

const AxesGridSchema = z.strictObject({
  spacing: StandardGridSpacingSchema.describe('Uniform or axis-specific positive grid spacing.'),
  offset: PositionSchema.default([0, 0]).describe(
    'Axis-local mathematical offset used as the grid lattice alignment origin.',
  ),
  style: StandardPathStrokeStyleSchema.optional().describe('Shared style defaults for both grid directions.'),
  vertical: StandardPathStrokeStyleSchema.optional().describe('Style fields overriding vertical grid lines.'),
  horizontal: StandardPathStrokeStyleSchema.optional().describe('Style fields overriding horizontal grid lines.'),
});

const AxesLineSchema = z.strictObject({
  arrows: z
    .enum(AxesArrowMode)
    .default(AxesArrowMode.Positive)
    .describe('Arrow placement at the negative and positive endpoints of this axis.'),
  arrowDetail: ArrowDetailSchema.optional().describe(
    'Core arrow visual details shared by both endpoints, with start and end overrides for negative and positive ends.',
  ),
  style: StandardPathStrokeStyleSchema.optional().describe('Stroke style for this axis line.'),
});

const AxesAxisLabelObjectSchema = z.strictObject({
  text: TextBlockSchema.describe('Static axis-label text block.'),
  end: z.enum(AxesLabelEnd).default(AxesLabelEnd.Positive).describe('Axis endpoint beyond which the label is placed.'),
  offset: z.number().nonnegative().default(8).describe('Label-center offset beyond the selected endpoint.'),
  style: LabelVisualStyleSchema.optional().describe('Core text style fields for this axis label.'),
});

const AxesAxisLabelSchema = z.union([z.literal(false), TextBlockSchema, AxesAxisLabelObjectSchema]);

const AxesTickSpacingSourceSchema = z.strictObject({
  kind: z.literal(AxesTickSourceKind.Spacing).describe('Discriminator for regularly spaced ticks.'),
  spacing: z.number().positive().describe('Positive distance between adjacent ticks in axis-local user units.'),
  extent: z
    .enum(AxesTickExtent)
    .default(AxesTickExtent.Both)
    .describe('Negative, positive, or both half-axes on which ticks are emitted.'),
});

const AxesTickValuesSourceSchema = z.strictObject({
  kind: z.literal(AxesTickSourceKind.Values).describe('Discriminator for explicit signed tick values.'),
  values: z
    .array(z.number())
    .min(1)
    .max(10_000)
    .describe('Strictly increasing nonzero axis-local values inside the axis extent.'),
});

const AxesTickSourceSchema = z.discriminatedUnion('kind', [AxesTickSpacingSourceSchema, AxesTickValuesSourceSchema]);

const AxesTickLabelEntrySchema = z.strictObject({
  value: z.number().describe('Existing tick value to annotate.'),
  text: TextBlockSchema.describe('Static text block shown for this tick.'),
});

const AxesTickLabelsSchema = z.strictObject({
  entries: z
    .array(AxesTickLabelEntrySchema)
    .min(1)
    .describe('Static labels attached to a subset of emitted tick values.'),
  offset: z.number().nonnegative().default(4).describe('Gap from the tick endpoint to the label center.'),
  style: LabelVisualStyleSchema.optional().describe('Core text style fields shared by these tick labels.'),
});

const AxesTicksSchema = z.strictObject({
  source: AxesTickSourceSchema.describe('Regular or explicit tick source.'),
  side: z
    .enum(AxesTickSide)
    .default(AxesTickSide.Both)
    .describe('Perpendicular positive, negative, or both sides of the axis on which tick segments extend.'),
  endpointGap: z
    .number()
    .nonnegative()
    .default(6)
    .describe('Minimum distance from either axis endpoint at which a tick may be emitted.'),
  length: z.number().positive().default(6).describe('Total tick-segment length distributed across the selected side.'),
  style: StandardPathStrokeStyleSchema.optional().describe('Stroke style for ticks on this axis.'),
  labels: z
    .union([z.literal(false), AxesTickLabelsSchema])
    .optional()
    .describe('Optional static labels for selected emitted ticks.'),
});

const createAxesAxisSchema = (defaultLabel: 'x' | 'y') =>
  z.strictObject({
    line: z
      .union([z.literal(false), AxesLineSchema])
      .default({ arrows: AxesArrowMode.Positive })
      .describe('Axis baseline and endpoint arrows, or false to hide only the baseline.'),
    ticks: z
      .union([z.literal(false), AxesTicksSchema])
      .optional()
      .describe('Ticks and optional static tick labels for this axis.'),
    label: AxesAxisLabelSchema.default(defaultLabel).describe('Axis name, styled label, or false to hide it.'),
  });

const AxesXAxisSchema = createAxesAxisSchema('x');
const AxesYAxisSchema = createAxesAxisSchema('y');

const AxesOriginLabelObjectSchema = z.strictObject({
  text: TextBlockSchema.describe('Static origin-label text block.'),
  offset: z.number().nonnegative().default(10).describe('Diagonal label-center offset from the origin.'),
  style: LabelVisualStyleSchema.optional().describe('Core text style fields for the origin label.'),
});

const AxesOriginLabelSchema = z.union([z.literal(false), TextBlockSchema, AxesOriginLabelObjectSchema]);

const AxesBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('axes').describe('Composite type for static Cartesian reference axes.'),
  origin: PositionSchema.default([0, 0]).describe('Screen-space origin shared by axes, grid, ticks, and labels.'),
  extent: z.strictObject({
    x: AxesExtentSchema.describe('Horizontal axis drawing lengths.'),
    y: AxesExtentSchema.describe('Vertical axis drawing lengths with positive values mapped screen-up.'),
  }),
  grid: AxesGridSchema.optional().describe('Optional lightweight origin-aligned Cartesian grid.'),
  x: z
    .union([z.literal(false), AxesXAxisSchema])
    .default({ line: { arrows: AxesArrowMode.Positive }, label: 'x' })
    .describe('Horizontal axis configuration, or false to suppress all horizontal-axis artifacts.'),
  y: z
    .union([z.literal(false), AxesYAxisSchema])
    .default({ line: { arrows: AxesArrowMode.Positive }, label: 'y' })
    .describe('Vertical axis configuration, or false to suppress all vertical-axis artifacts.'),
  originLabel: AxesOriginLabelSchema.default(false).describe('Optional single static label at the shared origin.'),
});

type AxesRefinementInput = z.infer<typeof AxesBaseSchema>;
type AxesAxisInput = Exclude<AxesRefinementInput['x'], false>;

const valuesEqual = (left: number, right: number): boolean =>
  Math.abs(left - right) <= Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right)) * 8;

const refineAxisTicks = (
  axis: AxesAxisInput,
  extentInput: AxesRefinementInput['extent']['x'],
  axisKey: 'x' | 'y',
  ctx: z.RefinementCtx,
): void => {
  if (axis.ticks === undefined || axis.ticks === false) return;

  const extent = resolveAxesExtent(extentInput);
  const ticks = axis.ticks;
  const source = ticks.source;
  if (source.kind === AxesTickSourceKind.Spacing) {
    const range = resolveAxesTickRange(extent, source.extent);
    const error = getLatticeRangeError({ ...range, spacing: source.spacing, origin: 0, includeBoundary: false });
    if (error !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [axisKey, 'ticks', 'source', 'spacing'],
        message: error,
      });
      return;
    }
  } else {
    source.values.forEach((value, index) => {
      if (value === 0) {
        ctx.addIssue({
          code: 'custom',
          path: [axisKey, 'ticks', 'source', 'values', index],
          message: 'Explicit tick values must exclude the origin.',
        });
        return;
      }
      if (value < -extent.negative || value > extent.positive) {
        ctx.addIssue({
          code: 'custom',
          path: [axisKey, 'ticks', 'source', 'values', index],
          message: 'Explicit tick values must be inside the axis extent.',
        });
        return;
      }
      if (index > 0 && value <= source.values[index - 1]) {
        ctx.addIssue({
          code: 'custom',
          path: [axisKey, 'ticks', 'source', 'values', index],
          message: 'Explicit tick values must be strictly increasing.',
        });
      }
    });
  }

  if (ticks.labels === undefined || ticks.labels === false) return;

  const tickValues = enumerateAxesTickValues(source, extent, ticks.endpointGap);
  const labels = ticks.labels;
  labels.entries.forEach((entry, index) => {
    if (!tickValues.some(value => valuesEqual(value, entry.value))) {
      ctx.addIssue({
        code: 'custom',
        path: [axisKey, 'ticks', 'labels', 'entries', index, 'value'],
        message: 'Tick label values must refer to an emitted tick.',
      });
    }
    if (index > 0 && labels.entries.slice(0, index).some(previous => valuesEqual(previous.value, entry.value))) {
      ctx.addIssue({
        code: 'custom',
        path: [axisKey, 'ticks', 'labels', 'entries', index, 'value'],
        message: 'Tick label values must be unique.',
      });
    }
  });
};

const refineAxes = (axes: AxesRefinementInput, ctx: z.RefinementCtx): void => {
  const extentX = resolveAxesExtent(axes.extent.x);
  const extentY = resolveAxesExtent(axes.extent.y);

  if (extentX.negative === 0 && extentX.positive === 0) {
    ctx.addIssue({ code: 'custom', path: ['extent', 'x'], message: 'extent.x requires a positive direction length.' });
  }
  if (extentY.negative === 0 && extentY.positive === 0) {
    ctx.addIssue({ code: 'custom', path: ['extent', 'y'], message: 'extent.y requires a positive direction length.' });
  }
  if (axes.x === false && axes.y === false) {
    ctx.addIssue({ code: 'custom', path: ['x'], message: 'Axes requires at least one enabled axis.' });
  }

  if (axes.grid !== undefined) {
    const [spacingX, spacingY] =
      typeof axes.grid.spacing === 'number'
        ? [axes.grid.spacing, axes.grid.spacing]
        : [axes.grid.spacing.x, axes.grid.spacing.y];
    const [offsetX, offsetY] = axes.grid.offset;
    const verticalError = getLatticeRangeError({
      min: -extentX.negative,
      max: extentX.positive,
      spacing: spacingX,
      origin: offsetX,
      includeBoundary: false,
    });
    const horizontalError = getLatticeRangeError({
      min: -extentY.negative,
      max: extentY.positive,
      spacing: spacingY,
      origin: offsetY,
      includeBoundary: false,
    });
    if (verticalError !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: typeof axes.grid.spacing === 'number' ? ['grid', 'spacing'] : ['grid', 'spacing', 'x'],
        message: verticalError,
      });
    }
    if (horizontalError !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: typeof axes.grid.spacing === 'number' ? ['grid', 'spacing'] : ['grid', 'spacing', 'y'],
        message: horizontalError,
      });
    }
  }

  if (axes.x !== false) refineAxisTicks(axes.x, axes.extent.x, 'x', ctx);
  if (axes.y !== false) refineAxisTicks(axes.y, axes.extent.y, 'y', ctx);
};

export const AxesSchema = AxesBaseSchema.superRefine(refineAxes);
