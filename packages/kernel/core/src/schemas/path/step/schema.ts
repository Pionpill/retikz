import { z } from 'zod';
import { FontSchema } from '../../font';
import { JsonObjectSchema } from '../../json';
import { PositionSchema } from '../../position';
import { MixedLineSchema } from '../../text';
import { TargetSchema } from '../target';
import { FoldStepVia, GeometryLabelPlacement } from './constants';

/**
 * 边标注：画线 step 上的 label
 * @description 按段几何 + side 偏移翻译为 TextPrim；move/cycle 不挂 label
 */
export const GeometryLabelSchema = z
  .object({
    text: z
      .union([z.string(), MixedLineSchema])
      .describe(
        'Label text content: a string (with `$...$` / `$$...$$` math sugar) or a `{ runs }` mixed text+math line. Single-line.',
      ),
    position: z
      .union([
        z.enum([
          'at-start',
          'very-near-start',
          'near-start',
          'midway',
          'near-end',
          'very-near-end',
          'at-end',
        ]),
        z.number().min(0).max(1),
      ])
      .optional()
      .describe(
        'Position along the step. Use a normalized number or a keyword: at-start, very-near-start, near-start, midway, near-end, very-near-end, or at-end. Parameter meaning follows the step kind.',
      ),
    side: z
      .enum(['above', 'below', 'left', 'right', 'sloped'])
      .optional()
      .describe(
        'Side relative to the label anchor. `above` / `below` / `left` / `right` place the label around the anchor; legacy `sloped` rotates label along the tangent with no side offset. Default `above`.',
      ),
    sloped: z
      .boolean()
      .optional()
      .describe(
        'Rotate the label along the sampled tangent while keeping `side` responsible for label placement.',
      ),
    placement: z
      .enum(GeometryLabelPlacement)
      .optional()
      .describe(
        'Placement mode for path-like labels. `outside` keeps the default Path label behavior; `inside` lets area-like hosts such as Ribbon place labels in the band when no side is specified.',
      ),
    distance: z
      .number()
      .nonnegative()
      .optional()
      .describe('Side offset distance in user units. Defaults to the same distance as Path step labels.'),
    textColor: z
      .string()
      .optional()
      .describe(
        "Label text color; falls back to the scope labelDefault, then the owning path's resolved master color, then currentColor. To match a colored line set the path color (not stroke).",
      ),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        'Label-only opacity, multiplied with the owning path opacity.',
      ),
    font: FontSchema.optional().describe(
      'Label font overrides. Missing fields inherit from scope label defaults.',
    ),
  })
  .strict()
  .describe(
    'Geometry label spec attached to a path-like host; compiled to a TextPrim positioned from a centerline sample.',
  );

/** 边标注 IR 类型 */
export const StepLabelSchema = GeometryLabelSchema;

export const MoveStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('move')
      .describe('Move the cursor to the target without drawing.'),
    to: TargetSchema.describe('Destination point of the move'),
  })
  .describe('Move action: relocate the path cursor without drawing');

export const LineStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('line')
      .describe('Draw a straight line from the current cursor to the target.'),
    to: TargetSchema.describe('Destination point of the line segment'),
    label: StepLabelSchema.optional().describe('Edge label attached to this line segment'),
  })
  .describe('Line action: straight-line segment from cursor to target');

export const FoldStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('fold')
      .describe(
        'Folded right-angle segment from cursor to target through one intermediate point.',
      ),
    via: z
      .enum(FoldStepVia)
      .describe(
        'Folding direction: `-|` first horizontal then vertical; `|-` first vertical then horizontal',
      ),
    to: TargetSchema.describe('Destination point of the folded segment'),
    label: StepLabelSchema.optional().describe(
      'Edge label attached to this folded segment; positioned along the corresponding leg by `position`.',
    ),
  })
  .describe(
    'Fold action: right-angle segment with a single intermediate point chosen by `via`.',
  );

export const CycleStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('cycle')
      .describe(
        'Close the path back to the most recent move target.',
      ),
  })
  .describe(
    'Cycle action: close the current sub-path back to its starting point; carries no `to` field',
  );

/**
 * 控制点 schema 别名
 * @description 当前仅支持笛卡尔 `[x,y]`；未来扩展节点 ref/极坐标时只改本处 union，curve/cubic schema 与下游不变
 */
export const ControlPointSchema = PositionSchema.describe(
  'Bezier control point. Currently Cartesian [x, y]; reserved for node ref / polar in future versions.',
);

export const CurveStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('curve')
      .describe(
        'Quadratic Bezier curve from cursor to target with one control point.',
      ),
    to: TargetSchema.describe('Destination point of the curve'),
    control: ControlPointSchema.describe('Single control point for the quadratic Bezier'),
    label: StepLabelSchema.optional().describe('Edge label attached to this quadratic Bezier'),
  })
  .describe('Curve action: quadratic Bezier; one control point shapes the bend');

export const CubicStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('cubic')
      .describe(
        'Cubic Bezier curve from cursor to target with two control points.',
      ),
    to: TargetSchema.describe('Destination point of the cubic curve'),
    control1: ControlPointSchema.describe('First control point (influences the start tangent)'),
    control2: ControlPointSchema.describe('Second control point (influences the end tangent)'),
    label: StepLabelSchema.optional().describe('Edge label attached to this cubic Bezier'),
  })
  .describe(
    'Cubic action: cubic Bezier; two control points give precise tangent control at both ends',
  );

export const BendStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('bend')
      .describe(
        'Arc-like bend from cursor to target by direction and angle; compiles to a cubic Bezier approximation.',
      ),
    to: TargetSchema.describe('Destination point of the bend'),
    bendDirection: z
      .enum(['left', 'right'])
      .optional()
      .describe(
        'Bend side relative to the from-to direction. Use with bendAngle unless outAngle and inAngle are provided.',
      ),
    bendAngle: z
      .number()

      .gt(-180)
      .lt(180)
      .optional()
      .describe('Bend angle in degrees. Omitted fields use 30.'),
    outAngle: z
      .number()

      .optional()
      .describe(
        'Outgoing tangent angle in degrees at the start point. With `inAngle`, takes precedence over bendDirection and bendAngle.',
      ),
    inAngle: z
      .number()

      .optional()
      .describe(
        'Incoming tangent angle in degrees at the end point. Used with `outAngle` for explicit tangent control.',
      ),
    looseness: z
      .number()

      .positive()
      .optional()
      .describe(
        'Curve looseness factor controlling control-point distance from the endpoints. Larger values produce a looser curve.',
      ),
    label: StepLabelSchema.optional().describe('Edge label attached to this bend segment'),
  })
  .describe('Bend action: shorthand for an arc-like cubic; control points computed at compile time');

const refineArcStep = (
  step: { radius?: number; radiusX?: number; radiusY?: number },
  ctx: z.RefinementCtx,
): void => {
  const hasRadius = step.radius !== undefined;
  const hasRadiusX = step.radiusX !== undefined;
  const hasRadiusY = step.radiusY !== undefined;
  if (hasRadius && (hasRadiusX || hasRadiusY)) {
    ctx.addIssue({
      code: 'custom',
      path: ['radius'],
      message: 'Arc step must use either radius or radiusX/radiusY, not both',
    });
  }
  if (!hasRadius && !(hasRadiusX && hasRadiusY)) {
    ctx.addIssue({
      code: 'custom',
      path: ['radius'],
      message: 'Arc step requires radius or both radiusX and radiusY',
    });
  }
  if (hasRadiusX !== hasRadiusY) {
    ctx.addIssue({
      code: 'custom',
      path: hasRadiusX ? ['radiusY'] : ['radiusX'],
      message: 'Arc step requires radiusX and radiusY together',
    });
  }
};

const refinePartialAngles = (
  step: { startAngle?: number; endAngle?: number; closed?: 'closed' | 'chord' | 'open' | 'sector' },
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
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('arc')
      .describe('Arc segment sweeping from startAngle to endAngle around a center. Use either radius or radiusX/radiusY.'),
    startAngle: z
      .number()

      .describe('Arc start angle in degrees, measured from +x axis. 0° = +x, 90° = +y = screen-down (visual clockwise under screen y-down); matches polar / Node label angle convention.'),
    endAngle: z
      .number()

      .describe('Arc end angle in degrees; sweep direction inferred from startAngle vs endAngle'),
    radius: z
      .number()

      .positive()
      .optional()
      .describe('Circular arc radius in user units. Give either radius (circular) or both radiusX and radiusY (elliptical), never both.'),
    radiusX: z
      .number()

      .positive()
      .optional()
      .describe('Elliptical arc x-axis radius; requires radiusX and radiusY together (mutually exclusive with radius).'),
    radiusY: z
      .number()

      .positive()
      .optional()
      .describe('Elliptical arc y-axis radius; requires radiusX and radiusY together (mutually exclusive with radius).'),
    center: TargetSchema.optional().describe(
      'Explicit arc center. Defaults to the cursor (previous step anchor) for backward compatibility; set it to anchor the arc independently of the cursor (used by <Sector> to draw a correct wedge).',
    ),
    label: StepLabelSchema.optional().describe('Edge label attached to this arc'),
  })
  .describe('Arc action: circular (radius) or elliptical (radiusX/radiusY) arc around a center (cursor by default, or explicit). Pen is left at the arc endpoint.');

export const ArcStepSchema = ArcStepBaseSchema.superRefine(refineArcStep);

const CirclePathStepBaseSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('circlePath')
      .describe('Circle centered at the cursor. Without angles, emits a full circle; with angles, emits a partial arc closed by `closed`.'),
    radius: z
      .number()

      .positive()
      .describe('Circle radius in user units'),
    startAngle: z
      .number()

      .optional()
      .describe('Partial-circle start angle in degrees (same convention as arc: 0°=+x, 90°=+y screen-down). Give both startAngle and endAngle for a partial circle, or neither for a full circle.'),
    endAngle: z
      .number()

      .optional()
      .describe('Partial-circle end angle in degrees; sweep direction inferred from startAngle vs endAngle.'),
    closed: z
      .enum(['closed', 'chord', 'open', 'sector'])
      .optional()
      .describe("Closing mode for a circle path: closed, chord, sector, or open. With angles, omitted fields use chord."),
    label: StepLabelSchema.optional().describe('Edge label attached to this circle'),
  })
  .describe('CirclePath action: full circle (no angles, pen returns to center) or partial arc (with angles, closed per chord/open).');

export const CirclePathStepSchema = CirclePathStepBaseSchema.superRefine((step, ctx) =>
  refinePartialAngles(step, ctx, 'circlePath'),
);

const EllipsePathStepBaseSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('ellipsePath')
      .describe('Ellipse centered at the cursor. Without angles, emits a full ellipse; with angles, emits a partial arc closed by `closed`.'),
    radiusX: z
      .number()

      .positive()
      .describe('Ellipse x-axis radius (semi-major or semi-minor on x)'),
    radiusY: z
      .number()

      .positive()
      .describe('Ellipse y-axis radius (semi-major or semi-minor on y)'),
    startAngle: z
      .number()

      .optional()
      .describe('Partial-ellipse start angle in degrees (parametric, same convention as arc). Give both startAngle and endAngle for a partial ellipse, or neither for a full ellipse.'),
    endAngle: z
      .number()

      .optional()
      .describe('Partial-ellipse end angle in degrees.'),
    closed: z
      .enum(['closed', 'chord', 'open', 'sector'])
      .optional()
      .describe("Closing mode for an ellipse path: closed, chord, sector, or open. With angles, omitted fields use chord."),
    label: StepLabelSchema.optional().describe('Edge label attached to this ellipse'),
  })
  .describe('EllipsePath action: full ellipse (no angles, pen returns to center) or partial elliptical arc (with angles, closed per chord/open).');

export const EllipsePathStepSchema = EllipsePathStepBaseSchema.superRefine((step, ctx) =>
  refinePartialAngles(step, ctx, 'ellipsePath'),
);

export const RectangleStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('rectangle')
      .describe('Axis-aligned rectangle between two opposite corners. Corners come from `from` and `to`, not the cursor.'),
    from: TargetSchema.describe('One corner of the rectangle'),
    to: TargetSchema.describe('The opposite corner; order is irrelevant (compile normalizes to min/max)'),
    cornerRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe('Single corner radius applied to all four corners; omitted = sharp corners. Clamped to half the smaller side at compile time.'),
  })
  .describe('Rectangle action: closed axis-aligned rectangle (optionally rounded) drawn between two opposite corners.');

export const SmoothStepSchema = z
  .object({
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
        'Through-points after the cursor, in order; the curve passes through each. The current cursor is the implicit first knot, so a single point yields one segment. The cursor ends at the last point.',
      ),
    tension: z
      .number()
      .positive()

      .optional()
      .describe(
        'Tangent-length multiplier controlling curve slackness. Omitted fields use 1.',
      ),
    label: StepLabelSchema.optional().describe(
      'Edge label attached to the generated curve; positioned along the produced cubic commands by Bezier parameter (same as curve / cubic step labels).',
    ),
  })
  .describe(
    'Smooth action: a curve passing through the cursor and the given points, compiled to cubic Beziers.',
  );

export const GeneratorStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('generator')
      .describe(
        'Delegate this segment to a registered path generator looked up by `name` in CompileOptions.pathGenerators; the generator turns `from` / `to` / `params` into low-level path commands at compile time',
      ),
    name: z
        .string()
        .min(1)
        .describe(
          'Path generator provider name. Custom names must be registered via CompileOptions.pathGenerators.',
        ),
    to: TargetSchema.optional().describe(
      'Optional destination point passed to the generator as the segment end.',
    ),
    params: JsonObjectSchema.describe(
      'JSON parameter object passed to the generator. The registered generator validates its own parameter fields.',
    ),
    label: StepLabelSchema.optional().describe(
      'Edge label attached to the generated segment; positioned along the produced commands.',
    ),
  })
  .describe(
    'Generator action: produce a sub-path by invoking a registered path generator (parabola / sin / etc.); core ships no built-in curve generators.',
  );

export const StepSchema = z
  .discriminatedUnion('kind', [
    MoveStepSchema,
    LineStepSchema,
    FoldStepSchema,
    CycleStepSchema,
    CurveStepSchema,
    CubicStepSchema,
    BendStepSchema,
    ArcStepBaseSchema,
    CirclePathStepBaseSchema,
    EllipsePathStepBaseSchema,
    RectangleStepSchema,
    SmoothStepSchema,
    GeneratorStepSchema,
  ])
  .superRefine((step, ctx) => {
    if (step.kind === 'arc') {
      refineArcStep(step, ctx);
      return;
    }
    if (step.kind === 'circlePath') {
      refinePartialAngles(step, ctx, 'circlePath');
      return;
    }
    if (step.kind === 'ellipsePath') {
      refinePartialAngles(step, ctx, 'ellipsePath');
    }
  })
  .describe('A single path action; the discriminator field is `kind`');
