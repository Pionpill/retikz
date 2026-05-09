import { z } from 'zod';
import type { ValueOf } from '../types';
import { PolarPositionSchema, PositionSchema } from './position';

/**
 * 节点形状常量。值是 IR 中 `shape` 字段的字面字符串；
 * 用 const + ValueOf 派生（不用 TS enum）。
 *
 * - `rectangle`：矩形（默认；UML 类、流程图常规节点）
 * - `circle`：圆形（流程图起止、状态机）
 * - `ellipse`：椭圆（状态机、集合图）
 * - `diamond`：菱形（流程图判定）
 *
 * 每个 shape 的几何语义：node 的视觉边界包住"text 矩形 + padding"——
 * - rectangle: 视觉 rect = text rect
 * - circle:    外接圆，r = √(innerHalfW² + innerHalfH²)
 * - ellipse:   外接椭圆，rx = innerHalfW×√2、ry = innerHalfH×√2
 * - diamond:   外接菱形，halfA = 2×innerHalfW、halfB = 2×innerHalfH
 */
export const NODE_SHAPES = {
  rectangle: 'rectangle',
  circle: 'circle',
  ellipse: 'ellipse',
  diamond: 'diamond',
} as const;

/** 节点形状字面量类型，由 `NODE_SHAPES` 派生 */
export type NodeShape = ValueOf<typeof NODE_SHAPES>;

/**
 * 节点字体规格——family / size / weight / style 全部可选；
 * 单字段透传到 SVG `<text>` 的 `font-*` 属性 / `font-size`。
 *
 * 取代 alpha.1 的标量 `fontSize` 字段（已删）。
 */
export const FontSchema = z
  .object({
    family: z
      .string()
      .optional()
      .describe(
        'CSS font-family string, e.g. "serif", "monospace", "Inter, sans-serif"',
      ),
    size: z
      .number()
      .positive()
      .optional()
      .describe('Font size in user units; falls back to the renderer default when omitted'),
    weight: z
      .union([z.enum(['normal', 'bold']), z.number()])
      .optional()
      .describe('CSS font-weight: keyword `normal` / `bold` or numeric 100..900'),
    style: z
      .enum(['normal', 'italic', 'oblique'])
      .optional()
      .describe('CSS font-style'),
  })
  .describe(
    'Font properties for the node text label; all fields optional, nested object form (replaces the alpha.1 `fontSize` scalar).',
  );

/** 节点字体规格（IR 层）——所有字段可选，编译期解析默认值 */
export type IRFont = z.infer<typeof FontSchema>;

/**
 * 单行文本规格——纯字符串走块级默认样式；对象形式可对该行覆盖 fill / opacity / font。
 *
 * 行级覆盖只生效于本行的 `<tspan>`：
 * - `fill`：仅这一行颜色
 * - `opacity`：仅这一行 0~1 透明度
 * - `font`：family / size / weight / style 任意子集；未填字段继承块级 font
 *
 * 块级 `align` / `lineHeight` 不可被行覆盖（多行块整体属性）。
 */
export const LineSpecSchema = z
  .union([
    z.string(),
    z.object({
      text: z.string().describe('Line content'),
      fill: z
        .string()
        .optional()
        .describe('Per-line text color; overrides block default'),
      opacity: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Per-line opacity 0..1'),
      font: FontSchema.optional().describe(
        'Per-line font overrides; missing fields inherit from block-level `font`',
      ),
    }),
  ])
  .describe(
    'Single line of text: bare string for default styling, or an object with per-line `fill` / `opacity` / `font` overrides.',
  );

/** 行规格 IR 类型（string 或对象） */
export type IRLineSpec = z.infer<typeof LineSpecSchema>;

/**
 * 节点文本——单行字符串或非空多行数组（每元素一个 LineSpec）：
 * - `'Hello'` 等价于 `[{ text: 'Hello' }]`，按一行渲染
 * - `['Line 1', 'Line 2']` 两行无样式覆盖
 * - `[{ text: 'Heading', fill: 'red', font: { weight: 'bold' } }, 'body']` 混排
 *
 * 选 `Array<LineSpec>` 而非 `'\n'` 字符串：JSON 友好（无 escape）；行级覆盖天然落字段。
 */
export const NodeTextSchema = z
  .union([z.string(), z.array(LineSpecSchema).min(1)])
  .describe(
    'Text label rendered inside the node: a single string for one line, or a non-empty array of line specs (string for default, object for per-line overrides).',
  );

/** 节点文本对齐（多行内文本对齐）——TikZ `align=` 同义词 */
export const NODE_TEXT_ALIGNS = {
  left: 'left',
  center: 'center',
  right: 'right',
} as const;

/** 多行文本对齐字面量类型 */
export type NodeTextAlign = ValueOf<typeof NODE_TEXT_ALIGNS>;

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
      .union([PositionSchema, PolarPositionSchema])
      .describe(
        'Center point of the node content box; Cartesian [x, y] or polar (resolved at compile time)',
      ),
    rotate: z
      .number()
      .optional()
      .describe(
        'Rotation in degrees around the node center; positive = clockwise (matches TikZ rotate=...)',
      ),
    text: NodeTextSchema.optional(),
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
      .describe('Explicit SVG stroke-dasharray value (e.g. "4 2"); overrides `dashed` / `dotted`.'),
    roundedCorners: z
      .number()
      .nonnegative()
      .optional()
      .describe('Corner radius in user units; only effective on `rectangle` shape (rx / ry on `<rect>`).'),
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
  })
  .describe(
    'Node primitive: a positioned, optionally textual shape (rectangle / circle / ellipse / diamond)',
  );

/** 节点：可定位的形状容器（矩形 / 圆 / 椭圆 / 菱形）+ 可选文本标签 */
export type IRNode = z.infer<typeof NodeSchema>;
