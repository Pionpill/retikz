import { z } from 'zod';
import type { ValueOf } from '../types';
import { AnimationTrackSchema } from './animation';
import { BoundarySchema } from './boundary';
import { FontSchema } from './font';
import { JsonObjectSchema } from './json';
import { PaintSpecSchema } from './paint';
import { AtDirection, AtPositionSchema, BetweenPositionSchema, OffsetPositionSchema, PolarPositionSchema, PositionSchema } from './position';
import { ShapeRefSchema } from './shape';
import { TextBlockSchema } from './text';

/**
 * 节点形状常量（用 const + ValueOf 派生，不用 TS enum）
 * @description rectangle 默认；几何语义：node 视觉边界包"text 矩形 + padding"；rectangle: 视觉=text；ellipse: rx=innerHalfW×√2,ry=innerHalfH×√2。circle 是 ellipse 等轴 preset 别名（`{ type:'ellipse', params:{ circumscribe:'equal' } }`，两轴 = 内框对角线半长 √(innerHalfW²+innerHalfH²)）；diamond 是 polygon 4 边形 preset 别名（`{ type:'polygon', params:{ sides:4, rotate:0 } }`）——circle / diamond 均保留为合法 shape 名向后兼容，编译期分别消解为 ellipse / polygon，不进 shape 注册表
 */
export const BuiltinShape = {
  Rectangle: 'rectangle',
  Circle: 'circle',
  Ellipse: 'ellipse',
  Diamond: 'diamond',
} as const;

/**
 * 内置 4 shape 名联合
 * @description `BUILTIN_SHAPES` 的 Record key（保穷尽性约束，不随 `NodeShape` 开放而退化为 `string`）
 */
export type BuiltinShapeValue = ValueOf<typeof BuiltinShape>;
export type BuiltinShapeName = BuiltinShapeValue;

/**
 * 节点形状名：开放字符串
 * @description 内置 `BuiltinShapeName`，或经 `CompileOptions.shapes` 注册的扩展 shape 名；
 *   `& {}` 让 IDE 仍对内置 4 名自动补全，同时接受任意非空字符串
 */
export type NodeShape = BuiltinShapeName | (string & {});

/** 节点文本对齐（TikZ `align=` 同义） */
export const NodeTextAlign = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
} as const;

export type NodeTextAlignValue = ValueOf<typeof NodeTextAlign>;

/**
 * 节点附属标签 label（TikZ `[label=above:foo]` 同义）
 * @description 可挂多个；label 不参与 layout。position 支持 8 方向枚举或数字角度（polar 约定：0°=+x，90°=+y 屏幕下方）；默认 position='above'，distance=12
 */
export const NodeLabelSchema = z
  .object({
    text: z
      .string()
      .describe('Label text content; rendered as a single line.'),
    position: z
      .union([z.nativeEnum(AtDirection), z.number()])
      .optional()
      .describe(
        'Placement around the node border: 8-direction enum (above / right / above-left / ...) or numeric angle in degrees (`label=30:foo` for radial placement). Default `above`. Numeric uses the polar convention (0° = +x, 90° = +y, screen-down).',
      ),
    distance: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Gap between the node border and the label center, in user units. Default 12.',
      ),
    textColor: z
      .string()
      .optional()
      .describe('Label text color; falls back to currentColor.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Label-only opacity 0..1; multiplied with the node opacity if both are set.'),
    font: FontSchema.optional().describe(
      'Label font overrides; missing fields inherit from the parent node font, then renderer defaults.',
    ),
    rotate: z
      .union([z.enum(['none', 'radial', 'tangent']), z.number()])
      .optional()
      .describe(
        'Rotate the label text around its own center. `none` (default) = horizontal; `radial` = along the node-center -> label-center direction; `tangent` = radial + 90 deg; a number = explicit degrees (screen y-down: 0 = +x, 90 = +y). Only changes text orientation, not placement.',
      ),
    keepUpright: z
      .boolean()
      .optional()
      .describe(
        'When true, flips the rotated label 180 deg if it would otherwise read upside-down (more than 90 deg from upright). Default false (strict geometric angle).',
      ),
    pin: z
      .union([
        z.boolean(),
        z.object({
          stroke: z.string().optional().describe('Leader line color; defaults to the label color / currentColor'),
          strokeWidth: z.number().finite().positive().optional().describe('Leader line width (user units); default 1'),
          dashPattern: z.array(z.number().finite()).optional().describe('Leader dash pattern (e.g. [2, 2])'),
        }),
      ])
      .optional()
      .describe(
        'Draw a leader line from the node border to the label (TikZ `pin`). `true` = default thin solid line; an object = leader with style overrides (`stroke` / `strokeWidth` / `dashPattern`); omitted / `false` = no leader. Label placement is unchanged either way.',
      ),
  })
  .describe(
    'Extra text attached around a node border. Multiple labels supported via array form on `Node.label`.',
  );

/** Node label IR 类型 */
export type IRNodeLabel = z.infer<typeof NodeLabelSchema>;

export const NodeSchema = z
  .object({
    type: z
      .literal('node')
      .describe('Discriminator marking this child as a node'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional unique id; required if any path needs to reference this node by string',
      ),
    shape: z
      .union([z.string().min(1), ShapeRefSchema])
      .optional()
      .describe(
        'Node visual shape: a bare name string (parameterless, e.g. "rectangle") or `{ type, params }` carrying a JSON params object (e.g. `{ type:"sector", params:{ innerRadius, outerRadius, startAngle, endAngle } }`). Built-in or registered via CompileOptions.shapes; unregistered type rejected at compile time. Defaults to "rectangle".',
      ),
    boundary: BoundarySchema.optional().describe(
      'Default connection surface for edges meeting this node (see BoundarySchema). Defaults to "shape" (use the visual shape). Per-edge overridable via the edge endpoint `boundary` field.',
    ),
    meta: JsonObjectSchema.optional().describe(
      'Opaque provenance metadata carried by this element (e.g. a Tier 2 lowering tagging which datum / series / layer it came from). Provenance passthrough: preserved verbatim into the Scene primitive(s) this element emits, ignored by renderers, and never interpreted by the compiler — it does not affect layout, connection, style, or bounding box. Must be a JSON object (fully serializable). Not inherited across scopes; not part of the every-X style defaults.',
    ),
    animations: z
      .array(AnimationTrackSchema)
      .optional()
      .describe(
        'Declarative timeline animation tracks for this element (fadeIn / drawOn / pulse / …). Each track animates one renderer-agnostic property over normalized time; the element base value is the settled (animation-end) state. Carried verbatim into the Scene primitive(s) this element emits; renderers play them or, when unable, render the static settled state with a diagnosable warning. Does not affect layout / bounding box (animations may transiently overflow). Not inherited across scopes; not part of the every-X style defaults.',
      ),
    position: z
      .union([
        PositionSchema,
        PolarPositionSchema,
        AtPositionSchema,
        OffsetPositionSchema,
        BetweenPositionSchema,
      ])
      .describe(
        'Center point of the node content box; Cartesian [x, y], polar, relative-to-another-node (`at`-style with `direction` / `of` / `distance?`), offset from a base point (`{ of, offset }` form mirroring TikZ `calc`), or between two endpoints (`{ between: [A, B], t }` proportional point). All non-Cartesian forms resolve at compile time.',
      ),
    rotate: z
      .number()
      .finite()
      .optional()
      .describe(
        'Rotation in degrees around the node center; positive = clockwise (matches TikZ rotate=...)',
      ),
    text: TextBlockSchema.optional(),
    align: z
      .nativeEnum(NodeTextAlign)
      .optional()
      .describe(
        'Multi-line text alignment within the text block; `left` / `center` / `right`. Defaults to `center` (matches TikZ).',
      ),
    lineHeight: z
      .number()
      .positive()
      .optional()
      .describe(
        'Line height in user units; falls back to `font.size × 1.2` when omitted.',
      ),
    maxTextWidth: z
      .number()
      .finite()
      .positive()
      .optional()
      .describe(
        'Max line width before wrapping (user units). The text box shrinks to the actual longest line for short text — this is a wrap threshold, NOT a fixed paragraph width. Western text wraps on word boundaries, CJK per character. Omitted = no auto-wrap (only manual line breaks).',
      ),
    color: z
      .string()
      .optional()
      .describe(
        'Master color (TikZ `color=`). When set, stroke / fill / text default to it unless individually overridden, and it cascades to the inner text and edge labels. Individual fields (stroke / fill / textColor) always win over this within the same node.',
      ),
    fill: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Node background paint: any CSS color string (e.g. "lightblue", "#fafafa", "rgba(...)") or a PaintSpec (linear / radial gradient, pattern, or image).',
      ),
    fillOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Fill opacity 0..1; affects only the shape fill, leaves stroke / text alone.'),
    stroke: z
      .string()
      .optional()
      .describe(
        'Border color of the node shape; any CSS color. Defaults to currentColor when omitted',
      ),
    drawOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Stroke opacity 0..1 (TikZ `draw opacity`); affects only the border.'),
    strokeWidth: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe('Border width in user units; defaults to 1 when omitted'),
    dashed: z
      .boolean()
      .optional()
      .describe('Border style preset: dashed line (TikZ `dashed`); compiled to a default dash pattern. `dashArray` takes precedence.'),
    dotted: z
      .boolean()
      .optional()
      .describe('Border style preset: dotted line (TikZ `dotted`); compiled to a default dot pattern. `dashArray` and `dashed` take precedence.'),
    dashArray: z
      .array(z.number().finite().nonnegative())
      .min(1)
      .optional()
      .describe('Explicit stroke dash pattern lengths in user units (e.g. [4, 2]); overrides `dashed` / `dotted`.'),
    cornerRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Migration-period top-level corner radius in user units; only effective on `rectangle` shape. Prefer the shape params form `{ type: "rectangle", params: { cornerRadius } }`.',
      ),
    minimumWidth: z
      .number()
      .nonnegative()
      .optional()
      .describe('Minimum visual border width in user units; floors the bounding box width.'),
    minimumHeight: z
      .number()
      .nonnegative()
      .optional()
      .describe('Minimum visual border height in user units; floors the bounding box height.'),
    minimumSize: z
      .number()
      .nonnegative()
      .optional()
      .describe('Symmetric alias for `minimumWidth` + `minimumHeight`; axis-specific fields take precedence.'),
    scale: z
      .number()
      .positive()
      .optional()
      .describe('Uniform scale factor; multiplies all node dimensions (border, padding, text, fontSize) at layout time. Affects path attachment positions.'),
    xScale: z
      .number()
      .positive()
      .optional()
      .describe('Horizontal scale factor; overrides `scale` for the X axis.'),
    yScale: z
      .number()
      .positive()
      .optional()
      .describe('Vertical scale factor; overrides `scale` for the Y axis.'),
    textColor: z
      .string()
      .optional()
      .describe('Text label color; any CSS color. Defaults to `currentColor`.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Whole-node opacity 0..1; applies uniformly to shape and text.'),
    innerXSep: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Inner horizontal padding from text to border in user units. Falls back to `padding` then default.',
      ),
    innerYSep: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Inner vertical padding from text to border in user units. Falls back to `padding` then default.',
      ),
    outerSep: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Outer margin from border to path attachment point in user units; does NOT change the visible border. Falls back to `margin`.',
      ),
    padding: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Symmetric inner padding (alias for `innerXSep` + `innerYSep`); axis-specific fields take precedence.',
      ),
    margin: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Symmetric outer margin (alias for `outerSep`); axis-specific field takes precedence.',
      ),
    font: FontSchema.optional().describe(
      'Font spec for the inner text label (family / size / weight / style); all fields optional, all fall back to renderer defaults.',
    ),
    label: z
      .union([NodeLabelSchema, z.array(NodeLabelSchema)])
      .optional()
      .describe(
        'Extra label(s) attached around the node border (TikZ `[label=above:foo]`); single object or array form. Compiled into one TextPrim per label, positioned by `position` direction / angle and `distance`.',
      ),
    zIndex: z
      .number()
      .int()
      .finite()
      .optional()
      .describe(
        'Explicit stacking order among sibling IR children. Higher draws on top. Omitted = 0 = source order. Sorting is stable: same zIndex keeps source order. Scoped per group (a node inside a scope only restacks within that scope).',
      ),
  })
  .describe(
    'Node primitive: a positioned, optionally textual shape (rectangle / circle / ellipse / diamond)',
  );

/** 节点：可定位的形状容器（矩形/圆/椭圆/菱形）+ 可选文本标签 */
export type IRNode = z.infer<typeof NodeSchema>;
