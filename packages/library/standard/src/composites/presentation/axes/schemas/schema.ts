import {
  ArrowDetailSchema,
  CompositeBaseSchema,
  LabelVisualStyleSchema,
  PositionSchema,
  ScopePropsSchema,
  TextBlockSchema,
} from '@retikz/core';
import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { STANDARD_NAMESPACE } from '../../../shared';
import { getLatticeRangeError } from '../../shared/lattice';
import { StandardPathStrokeStyleSchema } from '../../shared/schemas';
import { AxesArrowMode, AxesLabelEnd, AxesTickExtent, AxesTickSide, AxesTickSourceKind } from '../constants';
import { axesTickRangeOf, enumerateAxesTickValues, normalizeAxesExtent } from './utils';

const AxesDirectionalExtentSchema = z.strictObject({
  negative: NonNegativeNumberSchema.describe('Drawing length in the negative axis direction.'),
  positive: NonNegativeNumberSchema.describe('Drawing length in the positive axis direction.'),
});

const AxesExtentSchema = z
  .union([
    PositiveNumberSchema.describe('Symmetric drawing length in both axis directions.'),
    AxesDirectionalExtentSchema,
  ])
  .describe('Symmetric or direction-specific axis drawing lengths.');

const AxesGridSchema = z.strictObject({
  spacing: PositiveNumberSchema.describe('Positive grid spacing along the owning axis.'),
  offset: z.number().default(0).describe('Axis-local mathematical offset used as the grid lattice alignment origin.'),
  style: StandardPathStrokeStyleSchema.optional().describe('Stroke style for grid lines projected from this axis.'),
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
  offset: NonNegativeNumberSchema.default(8).describe('Label-center offset beyond the selected endpoint.'),
  style: LabelVisualStyleSchema.optional().describe('Core text style fields for this axis label.'),
});

const AxesAxisLabelSchema = z.union([z.literal(false), TextBlockSchema, AxesAxisLabelObjectSchema]);

const AxesTickSpacingSourceSchema = z.strictObject({
  kind: z.literal(AxesTickSourceKind.Spacing).describe('Discriminator for regularly spaced ticks.'),
  spacing: PositiveNumberSchema.describe('Positive distance between adjacent ticks in axis-local user units.'),
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
  offset: NonNegativeNumberSchema.default(4).describe('Gap from the tick endpoint to the label center.'),
  style: LabelVisualStyleSchema.optional().describe('Core text style fields shared by these tick labels.'),
});

const AxesTicksSchema = z.strictObject({
  source: AxesTickSourceSchema.describe('Regular or explicit tick source.'),
  side: z
    .enum(AxesTickSide)
    .default(AxesTickSide.Both)
    .describe('Perpendicular positive, negative, or both sides of the axis on which tick segments extend.'),
  endpointGap: NonNegativeNumberSchema.default(6).describe(
    'Minimum distance from either axis endpoint at which a tick may be emitted.',
  ),
  length: PositiveNumberSchema.default(6).describe('Total tick-segment length distributed across the selected side.'),
  style: StandardPathStrokeStyleSchema.optional().describe('Stroke style for ticks on this axis.'),
  labels: z
    .union([z.literal(false), AxesTickLabelsSchema])
    .optional()
    .describe('Optional static labels for selected emitted ticks.'),
});

const createAxesAxisSchema = (defaultLabel: 'x' | 'y') =>
  z.strictObject({
    extent: AxesExtentSchema.describe('Drawing lengths in the negative and positive directions of this axis.'),
    line: z
      .union([z.literal(false), AxesLineSchema])
      .default({ arrows: AxesArrowMode.Positive })
      .describe('Axis baseline and endpoint arrows, or false to hide only the baseline.'),
    ticks: z
      .union([z.literal(false), AxesTicksSchema])
      .optional()
      .describe('Ticks and optional static tick labels for this axis.'),
    grid: z
      .union([z.literal(false), AxesGridSchema])
      .optional()
      .describe('Optional lightweight grid lines projected perpendicular to this axis.'),
    label: AxesAxisLabelSchema.default(defaultLabel).describe('Axis name, styled label, or false to hide it.'),
  });

const AxesXAxisSchema = createAxesAxisSchema('x');
const AxesYAxisSchema = createAxesAxisSchema('y');

const AxesOriginLabelObjectSchema = z.strictObject({
  text: TextBlockSchema.describe('Static origin-label text block.'),
  offset: NonNegativeNumberSchema.default(10).describe('Diagonal label-center offset from the origin.'),
  style: LabelVisualStyleSchema.optional().describe('Core text style fields for the origin label.'),
});

const AxesOriginLabelSchema = z.union([z.literal(false), TextBlockSchema, AxesOriginLabelObjectSchema]);

const AxesOriginSchema = z.strictObject({
  position: PositionSchema.default([0, 0]).describe('Screen-space origin shared by axes, grids, ticks, and labels.'),
  label: AxesOriginLabelSchema.default(false).describe('Optional single static label at the shared origin.'),
});

const AxesBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal(STANDARD_NAMESPACE).describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('axes').describe('Composite type for static Cartesian reference axes.'),
  ...ScopePropsSchema.shape,
  origin: AxesOriginSchema.default({ position: [0, 0], label: false }),
  x: AxesXAxisSchema.describe('Horizontal axis configuration and its perpendicular grid projection.'),
  y: AxesYAxisSchema.describe('Vertical axis configuration and its perpendicular grid projection.'),
});

type AxesRefinementInput = z.infer<typeof AxesBaseSchema>;
type AxesAxisInput = AxesRefinementInput['x'];

const valuesEqual = (left: number, right: number): boolean =>
  Math.abs(left - right) <= Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right)) * 8;

const refineAxisTicks = (axis: AxesAxisInput, axisKey: 'x' | 'y', ctx: z.RefinementCtx): void => {
  if (axis.ticks === undefined || axis.ticks === false) return;

  const extent = normalizeAxesExtent(axis.extent);
  const ticks = axis.ticks;
  const source = ticks.source;
  if (source.kind === AxesTickSourceKind.Spacing) {
    const range = axesTickRangeOf(extent, source.extent);
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

const axisHasOutput = (axis: AxesAxisInput): boolean =>
  axis.line !== false ||
  (axis.ticks !== undefined && axis.ticks !== false) ||
  (axis.grid !== undefined && axis.grid !== false) ||
  axis.label !== false;

const refineAxis = (axis: AxesAxisInput, axisKey: 'x' | 'y', ctx: z.RefinementCtx): void => {
  const extent = normalizeAxesExtent(axis.extent);
  if (extent.negative === 0 && extent.positive === 0) {
    ctx.addIssue({
      code: 'custom',
      path: [axisKey, 'extent'],
      message: `${axisKey}.extent requires a positive direction length.`,
    });
  }

  if (axis.grid !== undefined && axis.grid !== false) {
    const error = getLatticeRangeError({
      min: -extent.negative,
      max: extent.positive,
      spacing: axis.grid.spacing,
      origin: axis.grid.offset,
      includeBoundary: false,
    });
    if (error !== undefined) {
      ctx.addIssue({ code: 'custom', path: [axisKey, 'grid', 'spacing'], message: error });
    }
  }

  refineAxisTicks(axis, axisKey, ctx);
};

const refineAxes = (axes: AxesRefinementInput, ctx: z.RefinementCtx): void => {
  if (!axisHasOutput(axes.x) && !axisHasOutput(axes.y) && axes.origin.label === false) {
    ctx.addIssue({ code: 'custom', path: ['x'], message: 'Axes requires at least one visible axis artifact.' });
  }

  refineAxis(axes.x, 'x', ctx);
  refineAxis(axes.y, 'y', ctx);
};

export const AxesSchema = AxesBaseSchema.superRefine(refineAxes);
