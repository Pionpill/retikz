import {
  JsonObjectSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import type { RefinementCtx } from 'zod';
import { array, boolean, discriminatedUnion, enum as zodEnum, literal, strictObject, union } from 'zod';

import { Side } from '../../../shared';
import {
  DEFAULT_BEND_ANGLE,
  DEFAULT_BEND_OUT_ANGLE,
  DEFAULT_BEND_IN_ANGLE,
  DEFAULT_BEND_LOOSENESS,
} from '../../../shared/geometry';
import { PositionSchema } from '../../position';
import { AngleDegreesSchema } from '../../scalar';
import { createLabelVisualStyleShape, TextBlockSchema } from '../../text';
import { NodeTargetSchema, TargetSchema } from '../target';
import { BendDirection, FoldStepVia, GeometryLabelPlacement, GeometryLabelPosition, PathCloseMode } from './constants';

/** 校验附着于路径类宿主、由中心线采样确定位置的文本标签 */
export const GeometryLabelSchema = strictObject({
  ...createLabelVisualStyleShape({
    textColor: 'Label text color; falls back to label defaults, path color, then currentColor.',
    opacity: 'Label-only opacity, multiplied with the owning path opacity.',
    font: 'Label font overrides. Missing fields inherit from scope label defaults.',
  }),
  text: TextBlockSchema.describe(
    'One text block for this geometry label. Arrays provide authored lines with optional per-line styles.',
  ),
  position: union([zodEnum(GeometryLabelPosition), NormalizedFractionSchema])
    .optional()
    .describe('Position along the step: keyword or normalized number. Parameter meaning follows the step kind.'),
  side: zodEnum(Side)
    .optional()
    .describe(
      'Authored side relative to the label anchor. An omitted value canonicalizes to `top`, or `center` when `sloped` is true.',
    ),
  sloped: boolean()
    .optional()
    .describe('Rotate the label along the sampled tangent. An omitted `side` canonicalizes to `center`.'),
  interrupt: boolean()
    .optional()
    .describe('Whether this label requests a gap in a compatible host stroke. Omitted values use the host policy.'),
  gap: NonNegativeNumberSchema.optional().describe(
    'Extra clearance in user units on each side of an interrupted host stroke gap. Defaults to 4.',
  ),
  placement: zodEnum(GeometryLabelPlacement)
    .optional()
    .describe(
      'Geometry label placement mode. outside uses side offset; inside lets area hosts place labels within their band.',
    ),
  distance: NonNegativeNumberSchema.optional().describe(
    'Side offset distance in user units. Defaults to the same distance as Path step labels.',
  ),
}).describe(
  'Geometry label spec attached to a path-like host; compiled as one text block positioned from a centerline sample.',
);

/** 复用几何标签规则，校验路径步骤附属标签 */
export const StepLabelSchema = GeometryLabelSchema;

/** 校验只移动路径游标、不绘制线段的动作 */
export const MoveStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('move').describe('Move the cursor to the target without drawing.'),
  to: TargetSchema.describe('Destination point of the move'),
}).describe('Move action: relocate the path cursor without drawing');

/** 校验从当前游标向目标绘制直线的动作 */
export const LineStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('line').describe('Draw a straight line from the current cursor to the target.'),
  to: TargetSchema.describe('Destination point of the line segment'),
  label: StepLabelSchema.optional().describe('Edge label attached to this line segment'),
}).describe('Line action: straight-line segment from cursor to target');

/** 校验轴向直线支持的笛卡尔位置或节点目标 */
export const AxisLineTargetSchema = union([PositionSchema, NodeTargetSchema]).describe(
  'Axis-line target. Supports only a Cartesian position or a node target.',
);

/** 校验将目标投影到宿主局部单轴后绘制直线的动作 */
export const AxisLineStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('axis-line').describe('Draw one horizontal or vertical segment by projecting a target.'),
  axis: zodEnum(['horizontal', 'vertical']).describe('Local host axis preserved by the projected segment.'),
  to: AxisLineTargetSchema.describe('Target reference projected onto the selected local host axis.'),
  label: StepLabelSchema.optional().describe('Edge label attached to this projected line segment'),
}).describe('Axis-line action: project a target to one local host axis and draw one straight segment.');

const FoldStepCommonShape = {
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('fold').describe('Folded orthogonal segment from cursor to target.'),
  to: TargetSchema.describe('Destination point of the folded segment'),
  label: StepLabelSchema.optional().describe(
    'Edge label attached to this folded segment; positioned along the corresponding leg by `position`.',
  ),
};

const TwoLegFoldStepSchema = strictObject({
  ...FoldStepCommonShape,
  via: zodEnum([FoldStepVia.HorizontalThenVertical, FoldStepVia.VerticalThenHorizontal]).describe(
    'Two-leg direction: `-|` is horizontal then vertical; `|-` is vertical then horizontal.',
  ),
});

const ThreeLegFoldStepSchema = strictObject({
  ...FoldStepCommonShape,
  via: zodEnum([FoldStepVia.HorizontalVerticalHorizontal, FoldStepVia.VerticalHorizontalVertical]).describe(
    'Three-leg direction: `-|-` is H-V-H; `|-|` is V-H-V.',
  ),
  fraction: NormalizedFractionSchema.optional().describe(
    'Normalized position of the middle leg. Omitted fields compile as 0.5.',
  ),
});

/** 校验由 via 选择两段或三段结构的正交折线动作 */
export const FoldStepSchema = discriminatedUnion('via', [TwoLegFoldStepSchema, ThreeLegFoldStepSchema]).describe(
  'Fold action: a strict two-leg or three-leg orthogonal segment selected by `via`.',
);

/** 校验闭合当前子路径至起点的动作，不接受终点字段 */
export const CycleStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('cycle').describe('Close the path back to the most recent move target.'),
}).describe('Cycle action: close the current sub-path back to its starting point; carries no `to` field');

/** 校验贝塞尔曲线控制点的位置 */
export const ControlPointSchema = PositionSchema.describe('Bezier control point position.');

/** 校验由一个控制点决定弯曲形状的二次贝塞尔动作 */
export const CurveStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('curve').describe('Quadratic Bezier curve from cursor to target with one control point.'),
  to: TargetSchema.describe('Destination point of the curve'),
  control: ControlPointSchema.describe('Single control point for the quadratic Bezier'),
  label: StepLabelSchema.optional().describe('Edge label attached to this quadratic Bezier'),
}).describe('Curve action: quadratic Bezier; one control point shapes the bend');

/** 校验由两个控制点分别控制两端切线的三次贝塞尔动作 */
export const CubicStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('cubic').describe('Cubic Bezier curve from cursor to target with two control points.'),
  to: TargetSchema.describe('Destination point of the cubic curve'),
  control1: ControlPointSchema.describe('First control point (influences the start tangent)'),
  control2: ControlPointSchema.describe('Second control point (influences the end tangent)'),
  label: StepLabelSchema.optional().describe('Edge label attached to this cubic Bezier'),
}).describe('Cubic action: cubic Bezier; two control points give precise tangent control at both ends');

/** 对称 bend 角度的权威约束与默认 */
export const BendAngleSchema = AngleDegreesSchema.gt(-180)
  .lt(180)
  .describe('Symmetric bend angle in degrees; negative values reverse the side. Defaults to 30.')
  .default(DEFAULT_BEND_ANGLE);

/** 切线 bend 出射角的权威约束与默认 */
export const BendOutAngleSchema = AngleDegreesSchema.describe(
  'Absolute outgoing tangent angle in screen coordinates (positive toward +y). Either tangent angle activates tangent mode and overrides symmetric bend parameters. Defaults to 0.',
).default(DEFAULT_BEND_OUT_ANGLE);

/** 切线 bend 入射角的权威约束与默认 */
export const BendInAngleSchema = AngleDegreesSchema.describe(
  'Absolute incoming tangent angle in screen coordinates, measured from the endpoint toward its control point. Either tangent angle activates tangent mode. Defaults to 180.',
).default(DEFAULT_BEND_IN_ANGLE);

/** 切线 bend 松弛度的权威约束与默认 */
export const BendLoosenessSchema = PositiveNumberSchema.describe(
  'Control-point distance multiplier used only in tangent mode; does not activate tangent mode by itself. Defaults to 1.',
).default(DEFAULT_BEND_LOOSENESS);

/** 校验在编译时计算控制点的弯曲路径简写 */
export const BendStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('bend').describe(
    'Arc-like bend from cursor to target by direction and angle; compiles to a cubic Bezier approximation.',
  ),
  to: TargetSchema.describe('Destination point of the bend'),
  bendDirection: zodEnum(BendDirection)
    .optional()
    .describe('Bend side relative to the from-to direction. Ignored when either outAngle or inAngle is provided.'),
  bendAngle: BendAngleSchema.unwrap().optional(),
  outAngle: BendOutAngleSchema.unwrap().optional(),
  inAngle: BendInAngleSchema.unwrap().optional(),
  looseness: BendLoosenessSchema.unwrap().optional(),
  label: StepLabelSchema.optional().describe('Edge label attached to this bend segment'),
}).describe('Bend action: shorthand for an arc-like cubic; control points computed at compile time');

/** 校验分别指定 x 与 y 方向半径的对象 */
export const StepAnisotropicRadiusSchema = strictObject({
  x: PositiveNumberSchema.describe('Horizontal radius in user units.'),
  y: PositiveNumberSchema.describe('Vertical radius in user units.'),
}).describe('Anisotropic radius object.');

/** 校验圆形统一半径或椭圆双轴半径 */
export const StepRadiusSchema = union([PositiveNumberSchema, StepAnisotropicRadiusSchema]).describe(
  'Circular radius number or anisotropic radius object.',
);

const refinePartialAngles = (
  step: { startAngle?: number; endAngle?: number; closed?: string },
  ctx: RefinementCtx,
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

const ArcStepBaseSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('arc').describe(
    'Arc segment sweeping from startAngle to endAngle around a center. Use radius as a number or `{ x, y }`.',
  ),
  startAngle: AngleDegreesSchema.describe(
    'Arc start angle in degrees, measured from +x axis. 0° = +x, 90° = +y = screen-down (visual clockwise under screen y-down); matches polar / Node label angle convention.',
  ),
  endAngle: AngleDegreesSchema.describe(
    'Arc end angle in degrees; sweep direction inferred from startAngle vs endAngle',
  ),
  radius: StepRadiusSchema.describe('Arc radius. Number creates a circular arc; `{ x, y }` creates an elliptical arc.'),
  center: TargetSchema.optional().describe('Explicit arc center. Omitted fields use the current cursor as center.'),
  label: StepLabelSchema.optional().describe('Edge label attached to this arc'),
}).describe(
  'Arc action: circular or elliptical arc around a center (cursor by default, or explicit). Pen is left at the arc endpoint.',
);

/** 校验从路径游标出发的圆弧或椭圆弧动作 */
export const ArcStepSchema = ArcStepBaseSchema;

const CirclePathStepBaseSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('circlePath').describe(
    'Circle centered at the cursor. Without angles, emits a full circle; with angles, emits a partial arc closed by `closed`.',
  ),
  radius: PositiveNumberSchema.describe('Circle radius in user units'),
  startAngle: AngleDegreesSchema.optional().describe(
    'Partial-circle start angle in degrees (same convention as arc: 0°=+x, 90°=+y screen-down). Give both startAngle and endAngle for a partial circle, or neither for a full circle.',
  ),
  endAngle: AngleDegreesSchema.optional().describe(
    'Partial-circle end angle in degrees; sweep direction inferred from startAngle vs endAngle.',
  ),
  closed: zodEnum(PathCloseMode)
    .optional()
    .describe('Closing mode for a circle path: closed, chord, sector, or open. With angles, omitted fields use chord.'),
  label: StepLabelSchema.optional().describe('Edge label attached to this circle'),
}).describe(
  'CirclePath action: full circle (no angles, pen returns to center) or partial arc (with angles, closed per chord/open).',
);

/** 校验以游标为圆心的圆路径；局部圆弧必须同时给出起止角 */
export const CirclePathStepSchema = CirclePathStepBaseSchema.superRefine((step, ctx) =>
  refinePartialAngles(step, ctx, 'circlePath'),
);

const EllipsePathStepBaseSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('ellipsePath').describe(
    'Ellipse centered at the cursor. Without angles, emits a full ellipse; with angles, emits a partial arc closed by `closed`.',
  ),
  radius: StepAnisotropicRadiusSchema.describe('Ellipse radius object `{ x, y }` in user units.'),
  startAngle: AngleDegreesSchema.optional().describe(
    'Partial-ellipse start angle in degrees (parametric, same convention as arc). Give both startAngle and endAngle for a partial ellipse, or neither for a full ellipse.',
  ),
  endAngle: AngleDegreesSchema.optional().describe('Partial-ellipse end angle in degrees.'),
  closed: zodEnum(PathCloseMode)
    .optional()
    .describe(
      'Closing mode for an ellipse path: closed, chord, sector, or open. With angles, omitted fields use chord.',
    ),
  label: StepLabelSchema.optional().describe('Edge label attached to this ellipse'),
}).describe(
  'EllipsePath action: full ellipse (no angles, pen returns to center) or partial elliptical arc (with angles, closed per chord/open).',
);

/** 校验以游标为中心的椭圆路径；局部椭圆弧必须同时给出起止角 */
export const EllipsePathStepSchema = EllipsePathStepBaseSchema.superRefine((step, ctx) =>
  refinePartialAngles(step, ctx, 'ellipsePath'),
);

/** 校验由相对两角确定的闭合轴对齐矩形与可选圆角 */
export const RectangleStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('rectangle').describe(
    'Axis-aligned rectangle between two opposite corners. Corners come from `from` and `to`, not the cursor.',
  ),
  from: TargetSchema.describe('One corner of the rectangle'),
  to: TargetSchema.describe('The opposite corner; order is irrelevant (compile normalizes to min/max)'),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Single corner radius applied to all four corners; omitted = sharp corners. Clamped to half the smaller side at compile time.',
  ),
}).describe('Rectangle action: closed axis-aligned rectangle (optionally rounded) drawn between two opposite corners.');

/** 校验控制平滑曲线松弛程度的切线长度倍率 */
export const SmoothTensionSchema = PositiveNumberSchema.default(1).describe(
  'Tangent-length multiplier controlling curve slackness; defaults to 1.',
);

/** 校验经过当前游标与给定点列、编译为三次贝塞尔段的平滑曲线 */
export const SmoothStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('smooth').describe(
    'Smooth curve passing through the current cursor and each point in `points`, in order. Compiles to cubic Bezier commands.',
  ),
  points: array(TargetSchema)
    .min(1)
    .describe(
      'Through-points after the cursor, in order. The cursor is the implicit first knot and ends at the last point.',
    ),
  tension: SmoothTensionSchema.unwrap().optional().describe(SmoothTensionSchema.description!),
  label: StepLabelSchema.optional().describe(
    'Edge label attached to the generated curve; positioned along the produced cubic commands by Bezier parameter (same as curve / cubic step labels).',
  ),
}).describe('Smooth action: a curve passing through the cursor and the given points, compiled to cubic Beziers.');

/** 校验调用内置或注册生成器产出子路径的动作 */
export const GeneratorStepSchema = strictObject({
  type: literal('step').describe('Discriminator marking this as a path step node'),
  kind: literal('generator').describe(
    'Registered path generator segment. `name` selects a built-in or CompileOptions.pathGenerators provider; `params` is JSON input.',
  ),
  name: NonBlankStringSchema.describe(
    'Path generator provider name. Built-ins and custom CompileOptions.pathGenerators names are accepted.',
  ),
  to: TargetSchema.optional().describe('Optional destination point passed to the generator as the segment end.'),
  params: JsonObjectSchema.describe(
    'JSON parameter object passed to the generator. The registered generator validates its own parameter fields.',
  ),
  label: StepLabelSchema.optional().describe(
    'Edge label attached to the generated segment; positioned along the produced commands.',
  ),
}).describe('Generator action: produce a sub-path by invoking a built-in or registered path generator.');

/** 校验按 kind 区分的单个路径动作 */
export const StepSchema = discriminatedUnion('kind', [
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
