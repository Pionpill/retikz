import { z } from 'zod';
import type { ValueOf } from '../types';
import { FontSchema } from './font';
import { AT_DIRECTIONS, AtPositionSchema, OffsetPositionSchema, PolarPositionSchema, PositionSchema } from './position';
import { TextBlockSchema } from './text';

/**
 * 节点形状常量（用 const + ValueOf 派生，不用 TS enum）
 * @description rectangle 默认；circle/ellipse/diamond 几何语义：node 视觉边界包"text 矩形 + padding"；rectangle: 视觉=text；circle: r=√(innerHalfW²+innerHalfH²)；ellipse: rx=innerHalfW×√2,ry=innerHalfH×√2；diamond: halfA=2×innerHalfW,halfB=2×innerHalfH
 */
export const NODE_SHAPES = {
  rectangle: 'rectangle',
  circle: 'circle',
  ellipse: 'ellipse',
  diamond: 'diamond',
} as const;

/** 节点形状字面量类型 */
export type NodeShape = ValueOf<typeof NODE_SHAPES>;

/** 节点文本对齐（TikZ `align=` 同义） */
export const NODE_TEXT_ALIGNS = {
  left: 'left',
  center: 'center',
  right: 'right',
} as const;

export type NodeTextAlign = ValueOf<typeof NODE_TEXT_ALIGNS>;

/**
 * 节点附属标签 label（TikZ `[label=above:foo]` 同义）
 * @description 可挂多个；label 不参与 layout。position 支持 8 方向枚举或数字角度（polar 约定：0°=+x，90°=+y 屏幕下方）；默认 position='above'，distance=4
 */
export const NodeLabelSchema = z
  .object({
    text: z
      .string()
      .describe('Label text content; rendered as a single line.'),
    position: z
      .union([z.nativeEnum(AT_DIRECTIONS), z.number()])
      .optional()
      .describe(
        'Placement around the node border: 8-direction enum (above / right / above-left / ...) or numeric angle in degrees (`label=30:foo` for radial placement). Default `above`. Numeric uses the polar convention (0° = +x, 90° = +y, screen-down).',
      ),
    distance: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Gap between the node border and the label center, in user units. Default 4.',
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
      .nativeEnum(NODE_SHAPES)
      .optional()
      .describe(
        'Node visual shape; defaults to `rectangle`. The boundary fully contains text + padding (circumscribed for circle / ellipse / diamond).',
      ),
    position: z
      .union([PositionSchema, PolarPositionSchema, AtPositionSchema, OffsetPositionSchema])
      .describe(
        'Center point of the node content box; Cartesian [x, y], polar, relative-to-another-node (`at`-style with `direction` / `of` / `distance?`), or offset from a base point (`{ of, offset }` form mirroring TikZ `calc`). All non-Cartesian forms resolve at compile time.',
      ),
    rotate: z
      .number()
      .optional()
      .describe(
        'Rotation in degrees around the node center; positive = clockwise (matches TikZ rotate=...)',
      ),
    text: TextBlockSchema.optional(),
    align: z
      .nativeEnum(NODE_TEXT_ALIGNS)
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
    fill: z
      .string()
      .optional()
      .describe(
        'Background color of the node shape; any CSS color (e.g. "lightblue", "#fafafa", "rgba(...)")',
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
      .string()
      .optional()
      .describe('Explicit stroke dash pattern (e.g. "4 2"; same format as SVG/CSS `stroke-dasharray`); overrides `dashed` / `dotted`.'),
    roundedCorners: z
      .number()
      .nonnegative()
      .optional()
      .describe('Corner radius in user units; only effective on `rectangle` shape.'),
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
  })
  .describe(
    'Node primitive: a positioned, optionally textual shape (rectangle / circle / ellipse / diamond)',
  );

/** 节点：可定位的形状容器（矩形/圆/椭圆/菱形）+ 可选文本标签 */
export type IRNode = z.infer<typeof NodeSchema>;
