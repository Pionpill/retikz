import { NonNegativeNumberSchema, NormalizedFractionSchema, PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { Side } from '../../../shared';
import { JsonObjectSchema } from '../../json';
import { PositionSchema } from '../../position';
import { AngleDegreesSchema } from '../../scalar';
import { createLabelVisualStyleShape, LabelTextContentSchema } from '../../text';
import { NodeTargetSchema, TargetSchema } from '../target';
import { BendDirection, FoldStepVia, GeometryLabelPlacement, GeometryLabelPosition, PathCloseMode } from './constants';

export const GeometryLabelSchema = z
  .strictObject({
    ...createLabelVisualStyleShape({
      textColor: 'Label text color; falls back to label defaults, path color, then currentColor.',
      opacity: 'Label-only opacity, multiplied with the owning path opacity.',
      font: 'Label font overrides. Missing fields inherit from scope label defaults.',
    }),
    text: LabelTextContentSchema,
    position: z
      .union([z.enum(GeometryLabelPosition), NormalizedFractionSchema])
      .optional()
      .describe('Position along the step: keyword or normalized number. Parameter meaning follows the step kind.'),
    side: z.enum(Side).optional().describe('Canonical side relative to the label anchor. Default `top`.'),
    sloped: z
      .boolean()
      .optional()
      .describe('Rotate the label along the sampled tangent while keeping `side` responsible for label placement.'),
    placement: z
      .enum(GeometryLabelPlacement)
      .optional()
      .describe(
        'Geometry label placement mode. outside uses side offset; inside lets area hosts place labels within their band.',
      ),
    distance: NonNegativeNumberSchema.optional().describe(
      'Side offset distance in user units. Defaults to the same distance as Path step labels.',
    ),
  })
  .describe(
    'Geometry label spec attached to a path-like host; compiled to a TextPrim positioned from a centerline sample.',
  );

export const StepLabelSchema = GeometryLabelSchema;

export const MoveStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z.literal('move').describe('Move the cursor to the target without drawing.'),
    to: TargetSchema.describe('Destination point of the move'),
  })
  .describe('Move action: relocate the path cursor without drawing');

export const LineStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z.literal('line').describe('Draw a straight line from the current cursor to the target.'),
    to: TargetSchema.describe('Destination point of the line segment'),
    label: StepLabelSchema.optional().describe('Edge label attached to this line segment'),
  })
  .describe('Line action: straight-line segment from cursor to target');

export const AxisLineTargetSchema = z
  .union([PositionSchema, NodeTargetSchema])
  .describe('Axis-line target. Supports only a Cartesian position or a node target.');

export const AxisLineStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z.literal('axis-line').describe('Draw one horizontal or vertical segment by projecting a target.'),
    axis: z.enum(['horizontal', 'vertical']).describe('Local host axis preserved by the projected segment.'),
    to: AxisLineTargetSchema.describe('Target reference projected onto the selected local host axis.'),
    label: StepLabelSchema.optional().describe('Edge label attached to this projected line segment'),
  })
  .describe('Axis-line action: project a target to one local host axis and draw one straight segment.');

const FoldStepCommonShape = {
  type: z.literal('step').describe('Discriminator marking this as a path step node'),
  kind: z.literal('fold').describe('Folded orthogonal segment from cursor to target.'),
  to: TargetSchema.describe('Destination point of the folded segment'),
  label: StepLabelSchema.optional().describe(
    'Edge label attached to this folded segment; positioned along the corresponding leg by `position`.',
  ),
};

const TwoLegFoldStepSchema = z.strictObject({
  ...FoldStepCommonShape,
  via: z
    .enum([FoldStepVia.HorizontalThenVertical, FoldStepVia.VerticalThenHorizontal])
    .describe('Two-leg direction: `-|` is horizontal then vertical; `|-` is vertical then horizontal.'),
});

const ThreeLegFoldStepSchema = z.strictObject({
  ...FoldStepCommonShape,
  via: z
    .enum([FoldStepVia.HorizontalVerticalHorizontal, FoldStepVia.VerticalHorizontalVertical])
    .describe('Three-leg direction: `-|-` is H-V-H; `|-|` is V-H-V.'),
  fraction: NormalizedFractionSchema.optional().describe(
    'Normalized position of the middle leg. Omitted fields compile as 0.5.',
  ),
});

export const FoldStepSchema = z
  .discriminatedUnion('via', [TwoLegFoldStepSchema, ThreeLegFoldStepSchema])
  .describe('Fold action: a strict two-leg or three-leg orthogonal segment selected by `via`.');

export const CycleStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z.literal('cycle').describe('Close the path back to the most recent move target.'),
  })
  .describe('Cycle action: close the current sub-path back to its starting point; carries no `to` field');

export const ControlPointSchema = PositionSchema.describe('Bezier control point position.');

export const CurveStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z.literal('curve').describe('Quadratic Bezier curve from cursor to target with one control point.'),
    to: TargetSchema.describe('Destination point of the curve'),
    control: ControlPointSchema.describe('Single control point for the quadratic Bezier'),
    label: StepLabelSchema.optional().describe('Edge label attached to this quadratic Bezier'),
  })
  .describe('Curve action: quadratic Bezier; one control point shapes the bend');

export const CubicStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z.literal('cubic').describe('Cubic Bezier curve from cursor to target with two control points.'),
    to: TargetSchema.describe('Destination point of the cubic curve'),
    control1: ControlPointSchema.describe('First control point (influences the start tangent)'),
    control2: ControlPointSchema.describe('Second control point (influences the end tangent)'),
    label: StepLabelSchema.optional().describe('Edge label attached to this cubic Bezier'),
  })
  .describe('Cubic action: cubic Bezier; two control points give precise tangent control at both ends');

export const BendStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('bend')
      .describe(
        'Arc-like bend from cursor to target by direction and angle; compiles to a cubic Bezier approximation.',
      ),
    to: TargetSchema.describe('Destination point of the bend'),
    bendDirection: z
      .enum(BendDirection)
      .optional()
      .describe(
        'Bend side relative to the from-to direction. Use with bendAngle unless outAngle and inAngle are provided.',
      ),
    bendAngle: AngleDegreesSchema.gt(-180).lt(180).optional().describe('Bend angle in degrees. Omitted fields use 30.'),
    outAngle: AngleDegreesSchema.optional().describe(
      'Outgoing tangent angle in degrees at the start point. With `inAngle`, takes precedence over bendDirection and bendAngle.',
    ),
    inAngle: AngleDegreesSchema.optional().describe(
      'Incoming tangent angle in degrees at the end point. Used with `outAngle` for explicit tangent control.',
    ),
    looseness: PositiveNumberSchema.optional().describe(
      'Curve looseness factor controlling control-point distance from the endpoints. Larger values produce a looser curve.',
    ),
    label: StepLabelSchema.optional().describe('Edge label attached to this bend segment'),
  })
  .describe('Bend action: shorthand for an arc-like cubic; control points computed at compile time');

export const StepAnisotropicRadiusSchema = z
  .strictObject({
    x: PositiveNumberSchema.describe('Horizontal radius in user units.'),
    y: PositiveNumberSchema.describe('Vertical radius in user units.'),
  })
  .describe('Anisotropic radius object.');

export const StepRadiusSchema = z
  .union([PositiveNumberSchema, StepAnisotropicRadiusSchema])
  .describe('Circular radius number or anisotropic radius object.');

const refinePartialAngles = (
  step: { startAngle?: number; endAngle?: number; closed?: string },
  ctx: z.RefinementCtx,
  kind: 'circlePath' | 'ellipsePath',
): void => {
  const hasStart = step.startAngle !== undefined;
  const hasEnd = step.endAngle !== undefined;
  if (hasStart !== hasEnd) {
    ctx.addIssue({
      code: 'custom',
      path: hasStart ? ['endAngle'] : ['startAngle'],
      message: `${kind} requires startAngle and endAngle together`,
    });
  }
  if (step.closed === 'closed' && (hasStart || hasEnd)) {
    ctx.addIssue({
      code: 'custom',
      path: ['closed'],
      message: `${kind} closed:'closed' is only valid without angles`,
    });
  }
};

const ArcStepBaseSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('arc')
      .describe(
        'Arc segment sweeping from startAngle to endAngle around a center. Use radius as a number or `{ x, y }`.',
      ),
    startAngle: AngleDegreesSchema.describe(
      'Arc start angle in degrees, measured from +x axis. 0° = +x, 90° = +y = screen-down (visual clockwise under screen y-down); matches polar / Node label angle convention.',
    ),
    endAngle: AngleDegreesSchema.describe(
      'Arc end angle in degrees; sweep direction inferred from startAngle vs endAngle',
    ),
    radius: StepRadiusSchema.describe(
      'Arc radius. Number creates a circular arc; `{ x, y }` creates an elliptical arc.',
    ),
    center: TargetSchema.optional().describe('Explicit arc center. Omitted fields use the current cursor as center.'),
    label: StepLabelSchema.optional().describe('Edge label attached to this arc'),
  })
  .describe(
    'Arc action: circular or elliptical arc around a center (cursor by default, or explicit). Pen is left at the arc endpoint.',
  );

export const ArcStepSchema = ArcStepBaseSchema;

const CirclePathStepBaseSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('circlePath')
      .describe(
        'Circle centered at the cursor. Without angles, emits a full circle; with angles, emits a partial arc closed by `closed`.',
      ),
    radius: PositiveNumberSchema.describe('Circle radius in user units'),
    startAngle: AngleDegreesSchema.optional().describe(
      'Partial-circle start angle in degrees (same convention as arc: 0°=+x, 90°=+y screen-down). Give both startAngle and endAngle for a partial circle, or neither for a full circle.',
    ),
    endAngle: AngleDegreesSchema.optional().describe(
      'Partial-circle end angle in degrees; sweep direction inferred from startAngle vs endAngle.',
    ),
    closed: z
      .enum(PathCloseMode)
      .optional()
      .describe(
        'Closing mode for a circle path: closed, chord, sector, or open. With angles, omitted fields use chord.',
      ),
    label: StepLabelSchema.optional().describe('Edge label attached to this circle'),
  })
  .describe(
    'CirclePath action: full circle (no angles, pen returns to center) or partial arc (with angles, closed per chord/open).',
  );

export const CirclePathStepSchema = CirclePathStepBaseSchema.superRefine((step, ctx) =>
  refinePartialAngles(step, ctx, 'circlePath'),
);

const EllipsePathStepBaseSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('ellipsePath')
      .describe(
        'Ellipse centered at the cursor. Without angles, emits a full ellipse; with angles, emits a partial arc closed by `closed`.',
      ),
    radius: StepAnisotropicRadiusSchema.describe('Ellipse radius object `{ x, y }` in user units.'),
    startAngle: AngleDegreesSchema.optional().describe(
      'Partial-ellipse start angle in degrees (parametric, same convention as arc). Give both startAngle and endAngle for a partial ellipse, or neither for a full ellipse.',
    ),
    endAngle: AngleDegreesSchema.optional().describe('Partial-ellipse end angle in degrees.'),
    closed: z
      .enum(PathCloseMode)
      .optional()
      .describe(
        'Closing mode for an ellipse path: closed, chord, sector, or open. With angles, omitted fields use chord.',
      ),
    label: StepLabelSchema.optional().describe('Edge label attached to this ellipse'),
  })
  .describe(
    'EllipsePath action: full ellipse (no angles, pen returns to center) or partial elliptical arc (with angles, closed per chord/open).',
  );

export const EllipsePathStepSchema = EllipsePathStepBaseSchema.superRefine((step, ctx) =>
  refinePartialAngles(step, ctx, 'ellipsePath'),
);

export const RectangleStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('rectangle')
      .describe(
        'Axis-aligned rectangle between two opposite corners. Corners come from `from` and `to`, not the cursor.',
      ),
    from: TargetSchema.describe('One corner of the rectangle'),
    to: TargetSchema.describe('The opposite corner; order is irrelevant (compile normalizes to min/max)'),
    cornerRadius: NonNegativeNumberSchema.optional().describe(
      'Single corner radius applied to all four corners; omitted = sharp corners. Clamped to half the smaller side at compile time.',
    ),
  })
  .describe('Rectangle action: closed axis-aligned rectangle (optionally rounded) drawn between two opposite corners.');

export const SmoothStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('smooth')
      .describe(
        'Smooth curve passing through the current cursor and each point in `points`, in order. Compiles to cubic Bezier commands.',
      ),
    points: z
      .array(TargetSchema)
      .min(1)
      .describe(
        'Through-points after the cursor, in order. The cursor is the implicit first knot and ends at the last point.',
      ),
    tension: PositiveNumberSchema.optional().describe(
      'Tangent-length multiplier controlling curve slackness. Omitted fields use 1.',
    ),
    label: StepLabelSchema.optional().describe(
      'Edge label attached to the generated curve; positioned along the produced cubic commands by Bezier parameter (same as curve / cubic step labels).',
    ),
  })
  .describe('Smooth action: a curve passing through the cursor and the given points, compiled to cubic Beziers.');

export const GeneratorStepSchema = z
  .strictObject({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('generator')
      .describe(
        'Registered path generator segment. `name` selects a built-in or CompileOptions.pathGenerators provider; `params` is JSON input.',
      ),
    name: z
      .string()
      .min(1)
      .describe('Path generator provider name. Built-ins and custom CompileOptions.pathGenerators names are accepted.'),
    to: TargetSchema.optional().describe('Optional destination point passed to the generator as the segment end.'),
    params: JsonObjectSchema.describe(
      'JSON parameter object passed to the generator. The registered generator validates its own parameter fields.',
    ),
    label: StepLabelSchema.optional().describe(
      'Edge label attached to the generated segment; positioned along the produced commands.',
    ),
  })
  .describe('Generator action: produce a sub-path by invoking a built-in or registered path generator.');

export const StepSchema = z
  .discriminatedUnion('kind', [
    MoveStepSchema,
    LineStepSchema,
    AxisLineStepSchema,
    FoldStepSchema,
    CycleStepSchema,
    CurveStepSchema,
    CubicStepSchema,
    BendStepSchema,
    ArcStepSchema,
    CirclePathStepBaseSchema,
    EllipsePathStepBaseSchema,
    RectangleStepSchema,
    SmoothStepSchema,
    GeneratorStepSchema,
  ])
  .superRefine((step, ctx) => {
    if (step.kind === 'circlePath') {
      refinePartialAngles(step, ctx, 'circlePath');
      return;
    }
    if (step.kind === 'ellipsePath') {
      refinePartialAngles(step, ctx, 'ellipsePath');
    }
  })
  .describe('A single path action; the discriminator field is `kind`');
