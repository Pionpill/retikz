import { z } from 'zod';
import { PositionSchema } from '../position';
import { TargetSchema } from './target';

/**
 * 边标注（ADR-0004）：挂在画线 step 上的 label，渲染时按段几何 + side 偏移
 * 翻译为一个 TextPrim。`move` / `cycle` 不挂 label——前者不画线、后者是闭合
 * 标记，标签语义不清。
 */
export const StepLabelSchema = z
  .object({
    text: z
      .string()
      .describe('Label text content. Single-line; for multi-line use \\n.'),
    position: z
      .enum(['midway', 'near-start', 'near-end'])
      .optional()
      .describe(
        'Position along the step segment (TikZ `midway` / `near start` / `near end`). Default `midway`.',
      ),
    side: z
      .enum(['above', 'below', 'left', 'right', 'sloped'])
      .optional()
      .describe(
        'Side relative to segment direction. `above` / `below` / `left` / `right` offset along segment normal; `sloped` rotates label along the tangent (no normal offset). Default `above`.',
      ),
  })
  .describe(
    'Edge label spec attached to a drawn step (ADR-0004); compiled to a TextPrim positioned along the segment.',
  );

/** 边标注：单段 step 的位置 + side 修饰，编译期变成 TextPrim */
export type IRStepLabel = z.infer<typeof StepLabelSchema>;

export const MoveStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('move')
      .describe('Move the cursor to the target without drawing (like SVG path "M")'),
    to: TargetSchema.describe('Destination point of the move'),
  })
  .describe('Move action: relocate the path cursor without drawing');

export const LineStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('line')
      .describe('Draw a straight line from the current cursor to the target (like SVG path "L")'),
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
        'Close the path back to the most recent move target (TikZ `cycle` / SVG path "Z")',
      ),
  })
  .describe(
    'Cycle action: close the current sub-path back to its starting point; carries no `to` field',
  );

/**
 * 控制点的 schema 别名。
 *
 * alpha.3：仅支持笛卡尔 `[x, y]`（与 ADR-0001 字面一致）。
 * 未来扩展点：要支持节点 ref / 极坐标作为控制点（如 TikZ `controls (B)`）时，
 * 只把这里改成 `z.union([PositionSchema, PolarPositionSchema, z.string().min(1)])`，
 * curve / cubic schema 与下游消费侧不变。
 */
export const ControlPointSchema = PositionSchema.describe(
  'Bezier control point. Currently Cartesian [x, y]; reserved for node ref / polar in future versions.',
);

/** 控制点类型（曲线 step 用）；alpha.3 = `[number, number]`，未来可能扩展 */
export type IRControlPoint = z.infer<typeof ControlPointSchema>;

export const CurveStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('curve')
      .describe(
        'Quadratic Bezier curve from cursor to target with one control point (TikZ `.. controls (B) ..`, SVG path "Q")',
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
        'Cubic Bezier curve from cursor to target with two control points (TikZ `.. controls (B) and (C) ..`, SVG path "C")',
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
      .describe('Arc segment from cursor as center, sweeping startAngle → endAngle on a circle of given radius (TikZ `arc[start angle=…, end angle=…, radius=…]`); pen ends at the arc endpoint, not the center'),
    startAngle: z
      .number()
      .describe('Arc start angle in degrees, CCW from +x axis (math convention; SVG y-down means visual CW)'),
    endAngle: z
      .number()
      .describe('Arc end angle in degrees; sweep direction inferred from startAngle vs endAngle'),
    radius: z
      .number()
      .positive()
      .describe('Arc radius in user units'),
    label: StepLabelSchema.optional().describe('Edge label attached to this arc'),
  })
  .describe('Arc action: TikZ-style arc with implicit center at the cursor; startAngle / endAngle / radius give the geometry. Pen is left at the arc endpoint.');

export const CirclePathStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('circlePath')
      .describe('Full circle centered at the cursor with given radius (TikZ `circle[radius=…]`); SVG path emits two semi-arcs to avoid the 360° A-command degeneracy. Pen returns to the center.'),
    radius: z
      .number()
      .positive()
      .describe('Circle radius in user units'),
    label: StepLabelSchema.optional().describe('Edge label attached to this full circle'),
  })
  .describe('CirclePath action: full closed circle around the cursor as center; pen returns to center after.');

export const EllipsePathStepSchema = z
  .object({
    type: z.literal('step').describe('Discriminator marking this as a path step node'),
    kind: z
      .literal('ellipsePath')
      .describe('Full ellipse centered at the cursor with given x/y radii (TikZ `ellipse[x radius=…, y radius=…]`); SVG path emits two semi-arcs. Pen returns to the center.'),
    radiusX: z
      .number()
      .positive()
      .describe('Ellipse x-axis radius (semi-major or semi-minor on x)'),
    radiusY: z
      .number()
      .positive()
      .describe('Ellipse y-axis radius (semi-major or semi-minor on y)'),
    label: StepLabelSchema.optional().describe('Edge label attached to this full ellipse'),
  })
  .describe('EllipsePath action: full closed ellipse around the cursor; pen returns to center.');

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
  ])
  .describe('A single path action; the discriminator field is `kind`');

/** Move step：移动游标但不绘制 */
export type IRMoveStep = z.infer<typeof MoveStepSchema>;

/** Line step：从游标到目标画直线 */
export type IRLineStep = z.infer<typeof LineStepSchema>;

/** Fold step：折角段，从游标到目标经一个直角中间点（TikZ `-|` / `|-`） */
export type IRFoldStep = z.infer<typeof FoldStepSchema>;

/** Cycle step：把当前子路径闭合回起点（TikZ `cycle` / SVG `Z`） */
export type IRCycleStep = z.infer<typeof CycleStepSchema>;

/** Curve step：二次贝塞尔，一个控制点 */
export type IRCurveStep = z.infer<typeof CurveStepSchema>;

/** Cubic step：三次贝塞尔，两控制点 */
export type IRCubicStep = z.infer<typeof CubicStepSchema>;

/** Bend step：弧形简记，按方向 + 角度生成 */
export type IRBendStep = z.infer<typeof BendStepSchema>;

/** Arc step：以游标为圆心的圆弧段，按起末角度 + 半径定 */
export type IRArcStep = z.infer<typeof ArcStepSchema>;
/** CirclePath step：以游标为圆心的整圆 */
export type IRCirclePathStep = z.infer<typeof CirclePathStepSchema>;
/** EllipsePath step：以游标为圆心的整椭圆 */
export type IREllipsePathStep = z.infer<typeof EllipsePathStepSchema>;

/**
 * 路径上的一个动作。alpha.3 起支持十种 kind：'move' / 'line' / 'step'（折角）/
 * 'cycle' / 'curve' / 'cubic' / 'bend'（曲线三件套，ADR-0001）/
 * 'arc' / 'circlePath' / 'ellipsePath'（path-level 形状，ADR-0002）。
 * ADR-0003 引入 `to` 字段的 rel / relAccumulate 变体。
 * ADR-0004 给除 move/cycle 外八种 kind 加 `label?` 字段（边标注）。
 */
export type IRStep = z.infer<typeof StepSchema>;
