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
    text: z
      .string()
      .optional()
      .describe('Text label rendered inside the node; omit for an empty node'),
    fill: z
      .string()
      .optional()
      .describe(
        'Background color of the node shape; any CSS color (e.g. "lightblue", "#fafafa", "rgba(...)")',
      ),
    stroke: z
      .string()
      .optional()
      .describe(
        'Border color of the node shape; any CSS color. Defaults to currentColor when omitted',
      ),
    strokeWidth: z
      .number()
      .optional()
      .describe('Border width in user units; defaults to 1 when omitted'),
    padding: z
      .number()
      .optional()
      .describe(
        'Inner padding in user units between the text content and the node border',
      ),
    margin: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Outer margin in user units: distance between the visual border and where paths attach. Lines stop this far from the border. Defaults to 0.',
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
