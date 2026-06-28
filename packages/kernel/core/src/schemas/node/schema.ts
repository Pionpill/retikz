import { z } from 'zod';
import { AnimationTrackSchema } from '../animation';
import { BoundarySchema } from '../boundary';
import { BlendMode, DropShadowSchema, ShadowPreset } from '../effects';
import { FontSchema } from '../font';
import { JsonObjectSchema } from '../json';
import { PaintSpecSchema } from '../paint';
import { AtPositionSchema, BetweenPositionSchema, OffsetPositionSchema, PolarPositionSchema, PositionSchema } from '../position';
import { ShapeRefSchema } from '../shape';
import { MixedLineSchema, TextBlockSchema } from '../text';
import { NodeLabelBoundarySide, NodeLabelPlacement, NodeLabelPosition, NodeTextAlign } from './constants';

export const NodeLabelBoundaryPositionSchema = z
  .object({
    boundary: z
      .enum(NodeLabelBoundarySide)
      .describe('Box-like node boundary side used as the label attachment line.'),
    t: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Normalized position along the selected boundary. Defaults to 0.5.'),
  })
  .strict()
  .describe('Label position on a box-like node boundary.');

/**
 * 节点附属标签 label（TikZ `[label=above:foo]` 同义）
 * @description 可挂多个；label 不参与 layout。position 支持 8 方向枚举或数字角度（polar 约定：0°=+x，90°=+y 屏幕下方）；默认 position='above'，distance=12
 */
export const NodeLabelSchema = z
  .object({
    text: z
      .union([z.string(), MixedLineSchema])
      .describe(
        'Label text content: a string (with `$...$` / `$$...$$` math sugar) or a `{ runs }` mixed text+math line. Rendered as a single line.',
      ),
    position: z
      .union([z.enum(NodeLabelPosition), z.number(), NodeLabelBoundaryPositionSchema])
      .optional()
      .describe(
        'Placement around the node border: 8-direction enum (above / right / above-left / ...), `center`, numeric angle in degrees, or `{ boundary, t }` on a box-like boundary. Default `above`. `center` draws the label at the node center. Numeric uses the polar convention (0° = +x, 90° = +y, screen-down).',
      ),
    placement: z
      .enum(NodeLabelPlacement)
      .optional()
      .describe(
        'Whether the label is offset outside or inside the selected attachment point. Default `outside`.',
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
          strokeWidth: z.number().positive().optional().describe('Leader line width (user units); default 1'),
          dashPattern: z.array(z.number()).optional().describe('Leader dash pattern (e.g. [2, 2])'),
        }),
      ])
      .optional()
      .describe(
        'Draw a leader line from the node border to the label (TikZ `pin`). `true` = default thin solid line; an object = leader with style overrides (`stroke` / `strokeWidth` / `dashPattern`); omitted / `false` = no leader. Label placement is unchanged either way.',
      ),
  })
  .superRefine((label, ctx) => {
    if (label.placement === NodeLabelPlacement.Inside && label.pin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pin'],
        message: 'Node label pin is only supported for outside placement.',
      });
    }
  })
  .describe(
    'Extra text attached around a node border. Multiple labels supported via array form on `Node.label`.',
  );

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

      .optional()
      .describe(
        'Rotation in degrees around the node center; positive = clockwise (matches TikZ rotate=...)',
      ),
    text: TextBlockSchema.optional().describe(
      'Optional node text content; accepts a string, an array of lines, or styled text line objects. A literal newline ("\\n") inside any string is a hard line break, so one string with newlines renders as multiple lines. Strings may carry inline math via `$...$` (inline) and `$$...$$` (display) when a lowerTex capability is injected (from @retikz/tex); a node whose entire content is one `$$...$$` formula is sized by the glyph bbox. When omitted the node emits only its shape primitive.',
    ),
    align: z
      .enum(NodeTextAlign)
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
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Border paint of the node shape; any CSS color string or a PaintSpec (linear / radial gradient, pattern, or image). Defaults to currentColor when omitted.',
      ),
    drawOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Stroke opacity 0..1 (TikZ `draw opacity`); affects only the border.'),
    strokeWidth: z
      .number()

      .nonnegative()
      .optional()
      .describe('Border width in user units; defaults to 1 when omitted'),
    dashed: z
      .boolean()
      .optional()
      .describe('Border style preset: dashed line (TikZ `dashed`); compiled to a default dash pattern. `dashPattern` takes precedence.'),
    dotted: z
      .boolean()
      .optional()
      .describe('Border style preset: dotted line (TikZ `dotted`); compiled to a default dot pattern. `dashPattern` and `dashed` take precedence.'),
    dashPattern: z
      .array(z.number().nonnegative())
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
    shadow: z
      .union([z.enum(ShadowPreset), DropShadowSchema])
      .optional()
      .describe(
        'Drop shadow on the node’s primary shape geometry only (not its text / label / pin). A preset keyword (`sm`/`md`/`lg`/`xl`/`2xl`/`none`), or an object `{ preset?, offsetX?, offsetY?, blur?, color?, opacity? }` where explicit fields override the preset. Renderer-agnostic (feDropShadow / ctx.shadow*).',
      ),
    blendMode: z
      .enum(BlendMode)
      .optional()
      .describe(
        'How the node’s primary shape geometry blends with the content already drawn beneath it (W3C separable blend modes); maps to CSS mix-blend-mode (SVG) and ctx.globalCompositeOperation (Canvas). Omitted / `normal` = ordinary source-over. Does not affect the node text / label / pin.',
      ),
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
        'Uniform outer offset (TikZ `outer sep`) around the node connection boundary, in user units. Applies to ALL border references — automatic edge endpoints AND explicit compass/angle anchors (e.g. `A.north`, `A.30`) — and is included in the node layout footprint / viewBox. Does NOT change the visible shape; center, shape-specific anchors, edge points, and label attachment stay on the visual shape. Default 0. Falls back to `margin`.',
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
        'Symmetric outer offset, alias for `outerSep` (TikZ `outer sep`); the axis-specific `outerSep` field takes precedence.',
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

      .optional()
      .describe(
        'Explicit stacking order among sibling IR children. Higher draws on top. Omitted = 0 = source order. Sorting is stable: same zIndex keeps source order. Scoped per group (a node inside a scope only restacks within that scope).',
      ),
  })
  .strict()
  .describe(
    'Node primitive: a positioned, optionally textual shape (rectangle / circle / ellipse / diamond)',
  );
