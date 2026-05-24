import { z } from 'zod';
import { FontSchema } from '../font';
import { JsonObjectSchema } from '../json';
import { PositionSchema } from '../position';
import { TargetSchema } from './target';

/**
 * 边标注：画线 step 上的 label
 * @description 按段几何 + side 偏移翻译为 TextPrim；move/cycle 不挂 label
 */
export const StepLabelSchema = z
  .object({
    text: z
      .string()
      .describe('Label text content. Single-line; for multi-line use \\n.'),
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
        'Normalized position t along the step (TikZ `pos`). Accepts a number 0..1 or one of 7 keyword sugars (at-start=0 / very-near-start=0.125 / near-start=0.25 / midway=0.5 / near-end=0.75 / very-near-end=0.875 / at-end=1). Geometric meaning of t varies by step kind: line/step use normalized arc length (fold partitions t equally across N legs — corner sits at t=j/N); curve/cubic/bend use the Bezier parameter (NOT arc length, so t=0.5 is not always the visual midpoint); arc maps t linearly across startAngle..endAngle; circlePath/ellipsePath use angle parametrization with t=0 at angle 0 (+x axis), CCW growth. Default `midway` (t=0.5).',
      ),
    side: z
      .enum(['above', 'below', 'left', 'right', 'sloped'])
      .optional()
      .describe(
        'Side relative to segment direction. `above` / `below` / `left` / `right` offset along segment normal; `sloped` rotates label along the tangent (no normal offset). Default `above`.',
      ),
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
        'Label-only opacity 0..1; multiplied with the owning path opacity (element-internal axis). Scope-level opacity does NOT compound.',
      ),
    font: FontSchema.optional().describe(
      'Label font overrides (family / size / weight / style); missing fields inherit from the scope labelDefault, then the renderer default.',
    ),
  })
  .describe(
    'Edge label spec attached to a drawn step; compiled to a TextPrim positioned along the segment.',
  );

/** 边标注 IR 类型 */
export type IRStepLabel = z.infer<typeof StepLabelSchema>;

export const MoveStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('move')
      .describe('Move the cursor to the target without drawing (TikZ `(A)`, no drawing operation)'),
    to: TargetSchema.describe('Destination point of the move'),
  })
  .describe('Move action: relocate the path cursor without drawing');

export const LineStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('line')
      .describe('Draw a straight line from the current cursor to the target (TikZ `(A) -- (B)`)'),
    to: TargetSchema.describe('Destination point of the line segment'),
    label: StepLabelSchema.optional().describe('Edge label attached to this line segment'),
  })
  .describe('Line action: straight-line segment from cursor to target');

export const FoldStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('step')
      .describe(
        'Folded right-angle segment from cursor to target through one intermediate point (TikZ `-|` / `|-`)',
      ),
    via: z
      .enum(['-|', '|-'])
      .describe(
        'Folding direction: `-|` first horizontal then vertical; `|-` first vertical then horizontal',
      ),
    to: TargetSchema.describe('Destination point of the folded segment'),
    label: StepLabelSchema.optional().describe(
      'Edge label attached to this folded segment; positioned along the corresponding leg by `position`.',
    ),
  })
  .describe(
    'Fold action: TikZ-style right-angle fold with a single intermediate point chosen by `via`',
  );

export const CycleStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('cycle')
      .describe(
        'Close the path back to the most recent move target (TikZ `cycle`)',
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

/** 控制点类型（曲线 step 用） */
export type IRControlPoint = z.infer<typeof ControlPointSchema>;

export const CurveStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('curve')
      .describe(
        'Quadratic Bezier curve from cursor to target with one control point (TikZ `.. controls (B) ..`)',
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
        'Cubic Bezier curve from cursor to target with two control points (TikZ `.. controls (B) and (C) ..`)',
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
        'Arc-like bend from cursor to target by direction + angle (TikZ `to[bend left=N]` / `to[bend right=N]`); compiles to a cubic Bezier approximation',
      ),
    to: TargetSchema.describe('Destination point of the bend'),
    bendDirection: z
      .enum(['left', 'right'])
      .describe('Bend side relative to from→to direction (visual left vs right of the chord)'),
    bendAngle: z
      .number()
      .optional()
      .describe('Bend angle in degrees; default 30 (matches TikZ `bend left` without explicit angle)'),
    label: StepLabelSchema.optional().describe('Edge label attached to this bend segment'),
  })
  .describe('Bend action: shorthand for an arc-like cubic; control points computed at compile time');

export const ArcStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('arc')
      .describe('Arc segment sweeping startAngle → endAngle around a center. Circular (radius) or elliptical (radiusX/radiusY). Center defaults to the cursor but can be set explicitly. Pen ends at the arc endpoint, not the center (TikZ `arc[start angle=…, end angle=…, radius=…]`).'),
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
      .describe('Circular arc radius in user units. Give EITHER radius (circular) OR both radiusX and radiusY (elliptical), never both — enforced by the sugar/compile layer, not schema.'),
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

export const CirclePathStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('circlePath')
      .describe('Circle centered at the cursor. Without angles: a full circle (TikZ `circle[radius=…]`), pen returns to center. With startAngle + endAngle: a partial arc closed per `closed` (half circle / segment).'),
    radius: z
      .number()
      .positive()
      .describe('Circle radius in user units'),
    startAngle: z
      .number()
      .optional()
      .describe('Partial-circle start angle in degrees (same convention as arc: 0°=+x, 90°=+y screen-down). Give both startAngle and endAngle for a partial circle, or neither for a full circle (enforced by the sugar/compile layer, not schema).'),
    endAngle: z
      .number()
      .optional()
      .describe('Partial-circle end angle in degrees; sweep direction inferred from startAngle vs endAngle.'),
    closed: z
      .enum(['closed', 'chord', 'open'])
      .optional()
      .describe("Closing mode. 'closed' = full circle (only valid with no angles; the default then). With angles: 'chord' (straight chord between the two arc ends → half circle / segment; default) or 'open' (pure unclosed arc)."),
    label: StepLabelSchema.optional().describe('Edge label attached to this circle'),
  })
  .describe('CirclePath action: full circle (no angles, pen returns to center) or partial arc (with angles, closed per chord/open).');

export const EllipsePathStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('ellipsePath')
      .describe('Ellipse centered at the cursor. Without angles: a full ellipse (TikZ `ellipse[x radius=…, y radius=…]`), pen returns to center. With startAngle + endAngle: a partial elliptical arc closed per `closed`.'),
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
      .enum(['closed', 'chord', 'open'])
      .optional()
      .describe("Closing mode. 'closed' = full ellipse (only valid with no angles; default then). With angles: 'chord' (chord between arc ends; default) or 'open' (pure unclosed arc)."),
    label: StepLabelSchema.optional().describe('Edge label attached to this ellipse'),
  })
  .describe('EllipsePath action: full ellipse (no angles, pen returns to center) or partial elliptical arc (with angles, closed per chord/open).');

export const RectangleStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('rectangle')
      .describe('Axis-aligned rectangle between two opposite corners (TikZ `(a) rectangle (b)`); compiled to path commands (4 lines + close, or rounded corners via quarter arcs). Self-contained: corners come from from/to, not the cursor.'),
    from: TargetSchema.describe('One corner of the rectangle'),
    to: TargetSchema.describe('The opposite corner; order is irrelevant (compile normalizes to min/max)'),
    roundedCorners: z
      .number()
      .nonnegative()
      .optional()
      .describe('Single corner radius applied to all four corners; omitted = sharp corners. Clamped to half the smaller side at compile time.'),
  })
  .describe('Rectangle action: closed axis-aligned rectangle (optionally rounded) drawn between two opposite corners.');

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
        'Registered generator name; resolved against CompileOptions.pathGenerators at compile time. An unregistered name throws at compile time (the error lists the available names). The IR only stores the string; the generator function itself is injected at runtime and never enters the IR.',
      ),
    to: TargetSchema.optional().describe(
      'Optional destination point passed to the generator as the segment end; omit for pure parametric curves that need no end target (e.g. a closed loop or a fixed-extent wave).',
    ),
    params: JsonObjectSchema.describe(
      'JSON-only parameter object handed to the generator. Must be a plain JSON object (validated by JsonObjectSchema); the generator validates its own shape via paramsSchema. Top-level keys listed in the generator targetParams are resolved from node targets to world coordinates before the generator runs.',
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
    ArcStepSchema,
    CirclePathStepSchema,
    EllipsePathStepSchema,
    RectangleStepSchema,
    GeneratorStepSchema,
  ])
  .describe('A single path action; the discriminator field is `kind`');

/** Move step：移动游标但不绘制 */
export type IRMoveStep = z.infer<typeof MoveStepSchema>;

/** Line step：从游标到目标画直线 */
export type IRLineStep = z.infer<typeof LineStepSchema>;

/** Fold step：折角段，经一个直角中间点（TikZ `-|`/`|-`） */
export type IRFoldStep = z.infer<typeof FoldStepSchema>;

/** Cycle step：闭合回起点（TikZ `cycle`） */
export type IRCycleStep = z.infer<typeof CycleStepSchema>;

/** Curve step：二次贝塞尔，一个控制点 */
export type IRCurveStep = z.infer<typeof CurveStepSchema>;

/** Cubic step：三次贝塞尔，两控制点 */
export type IRCubicStep = z.infer<typeof CubicStepSchema>;

/** Bend step：弧形简记，按方向+角度生成 */
export type IRBendStep = z.infer<typeof BendStepSchema>;

/** Arc step：以游标为圆心的圆弧段，按起末角度+半径定 */
export type IRArcStep = z.infer<typeof ArcStepSchema>;
/** CirclePath step：以游标为圆心的整圆 */
export type IRCirclePathStep = z.infer<typeof CirclePathStepSchema>;
/** EllipsePath step：以游标为圆心的整椭圆 */
export type IREllipsePathStep = z.infer<typeof EllipsePathStepSchema>;
/** Rectangle step：两对角定义的轴对齐矩形（可圆角） */
export type IRRectangleStep = z.infer<typeof RectangleStepSchema>;
/** Generator step：按 name 调注册的 path generator 产 sub-path（params 为 JSON 对象） */
export type IRGeneratorStep = z.infer<typeof GeneratorStepSchema>;

/**
 * 路径上的一个动作（十二种 kind）
 * @description 十二种 kind：move / line / step（折角）/ cycle / curve / cubic / bend / arc / circlePath / ellipsePath / rectangle（矩形）/ generator（注册生成器）；`to` 字段支持 relative / relativeAccumulate 变体；除 move/cycle/rectangle 外可挂 `label?` 边标注
 */
export type IRStep = z.infer<typeof StepSchema>;
