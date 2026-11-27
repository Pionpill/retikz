import type { ValueOf } from '@retikz/foundation';
import {
  NonNegativeNumberSchema,
  PositiveNumberSchema,
  NonBlankStringSchema,
  JsonObjectSchema,
} from '@retikz/foundation';
import { strictObject, union, preprocess, NEVER, boolean, literal, array, number } from 'zod';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import { AnchorPositionSchema } from '../position/anchor';
import { AtPositionSchema } from '../position/at';
import { BetweenPositionSchema } from '../position/between';
import { OffsetPositionSchema } from '../position/offset';
import { PolarPositionSchema } from '../position/polar';
import { PositionSchema } from '../position/position';
import { AnimationTrackSchema } from '../scene/animation';
import {
  GraphicStrokeSchema,
  GraphicColorSchema,
  GraphicFillSchema,
  GraphicOpacitySchema,
  GraphicEffectsSchema,
} from '../style/graphic';
import { TextVisualSchema, TextLayoutSchema, TextBlockSchema } from '../text/text';
import { BoundarySchema } from './boundary';
import { NodeLabelSchema } from './label';
import { ShapeValueSchema } from './shape';

/** Node 文字颜色的宿主专用关键字 */
export const NodeTextColor = {
  /** 根据静态不透明 fill 自动选择黑色或白色 */
  Contrast: 'contrast',
} as const;

export type NodeTextColor = ValueOf<typeof NodeTextColor>;

/** 校验按边、轴或统一值指定的盒间距；具体边优先于轴，轴优先于统一值 */
export const BoxSpacingSchema = strictObject({
  default: NonNegativeNumberSchema.optional(),
  x: NonNegativeNumberSchema.optional(),
  y: NonNegativeNumberSchema.optional(),
  left: NonNegativeNumberSchema.optional(),
  right: NonNegativeNumberSchema.optional(),
  top: NonNegativeNumberSchema.optional(),
  bottom: NonNegativeNumberSchema.optional(),
}).describe('Each side uses its own value, then x (left/right) or y (top/bottom), then default.');

/** 接受统一间距或按方向设置的间距 */
export const BoxSpacingValueSchema = union([
  NonNegativeNumberSchema.describe('Applies the same spacing to all four sides.'),
  BoxSpacingSchema,
]);

/** 校验双轴缩放覆盖值；指定轴优先于统一倍率 */
export const AxisScaleSchema = strictObject({
  default: PositiveNumberSchema.optional(),
  x: PositiveNumberSchema.optional(),
  y: PositiveNumberSchema.optional(),
}).describe('Each axis uses its own scale factor, falling back to default.');

/** 校验宽高覆盖值；单独指定的宽或高优先于统一尺寸 */
export const BoxSizeSchema = strictObject({
  default: NonNegativeNumberSchema.optional(),
  width: NonNegativeNumberSchema.optional(),
  height: NonNegativeNumberSchema.optional(),
}).describe('Width and height each fall back to default when omitted.');

/** 校验节点可使用的坐标与相对定位方式 */
const SharedNodePositionSchema = union([
  PositionSchema,
  PolarPositionSchema,
  AtPositionSchema,
  OffsetPositionSchema,
  BetweenPositionSchema,
]);

/**
 * Node position 分支选择
 * @description 原始对象一旦带 `kind` 就只按 AnchorPosition 解析，避免宽松旧分支剥离 discriminator 后静默改写语义
 */
const NodePositionSchema = preprocess(
  (value, ctx) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value) || !('kind' in value)) return value;

    const result = AnchorPositionSchema.safeParse(value);
    if (result.success) return result.data;

    ctx.addIssue({
      code: 'custom',
      message: `Node position objects with 'kind' must match AnchorPositionSchema: ${result.error.issues[0]?.message ?? 'invalid anchor position'}`,
    });

    return NEVER;
  },
  union([SharedNodePositionSchema, AnchorPositionSchema]),
);

/** 校验节点描边及虚线快捷设置 */
export const NodeStrokeSchema = strictObject({
  ...GraphicStrokeSchema.shape,
  strokeWidth: GraphicStrokeSchema.shape.strokeWidth.describe(
    'Stroke width in user units. Defaults to 1 if no width is inherited.',
  ),
  dashPattern: GraphicStrokeSchema.shape.dashPattern.describe(
    'Dash lengths in user units. Overrides both presets; if both are enabled, dashed wins over dotted.',
  ),
  dashed: boolean().optional(),
  dotted: boolean().optional(),
}).describe('Node border stroke styles.');

/** 节点实例视觉覆盖 */
export const NodeStyleSchema = strictObject({
  ...GraphicColorSchema.shape,
  ...GraphicFillSchema.shape,
  ...NodeStrokeSchema.shape,
  ...GraphicOpacitySchema.shape,
  ...GraphicEffectsSchema.shape,
  ...TextVisualSchema.shape,
}).describe('Node visual overrides; fields independently override inherited defaults.');

/** 节点尺寸、间距与文本布局 */
export const NodeLayoutSchema = strictObject({
  ...TextLayoutSchema.shape,
  width: PositiveNumberSchema.optional().describe(
    'Exact unscaled visible border width in user units. Excludes margin and must not be smaller than the effective minimum width.',
  ),
  minimumSize: union([NonNegativeNumberSchema.describe('Sets the same minimum for width and height.'), BoxSizeSchema])
    .optional()
    .describe("Lower bound on the node's visible border size, in user units."),
  padding: BoxSpacingValueSchema.optional().describe('Inner spacing from content to border.'),
  margin: BoxSpacingValueSchema.optional().describe('Outer offset around the connection boundary.'),
});

/** 组合节点自身字段与共用样式，供最终节点校验复用 */
const NodeBaseSchema = strictObject({
  type: literal('node'),
  id: NonBlankStringSchema.optional().describe('Unique ID for referencing this node.'),
  aliasIds: array(NonBlankStringSchema)
    .optional()
    .describe('Aliases for the same node. They require id and must differ from it and from each other.'),
  shape: ShapeValueSchema.optional().describe('Defaults to rectangle.'),
  boundary: BoundarySchema.optional().describe(
    'Default connection surface; individual path endpoints can override it.',
  ),
  meta: JsonObjectSchema.optional().describe('Copied unchanged to Scene primitives; does not affect compilation.'),
  animations: array(AnimationTrackSchema)
    .optional()
    .describe('Carried into Scene primitives without affecting layout. Not inherited across scopes.'),
  position: NodePositionSchema.default([0, 0]).describe(
    'Position of the node center in the current local coordinate system.',
  ),
  rotate: number().optional().describe('Rotation in degrees around the node center; positive is visually clockwise.'),
  text: TextBlockSchema.optional().describe('Text inside the node.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Rectangle corner radius in user units. shape.params.cornerRadius takes precedence.',
  ),
  scale: union([PositiveNumberSchema.describe('Scales both axes equally.'), AxisScaleSchema])
    .optional()
    .describe('Scales the node and its path attachment positions.'),
  label: union([NodeLabelSchema, array(NodeLabelSchema)])
    .optional()
    .describe('Border annotations. Set text layout and styling on each label itself.'),
  zIndex: number().int().optional().describe('Higher values draw above siblings; ties keep source order.'),
  style: NodeStyleSchema.optional(),
  layout: NodeLayoutSchema.optional(),
});

/** 校验可定位的节点，并要求别名依附主标识且在节点内不重复 */
export const NodeSchema = NodeBaseSchema.superRefine((node, context) => {
  if (node.aliasIds === undefined) return;
  if (node.id === undefined) {
    context.addIssue({ code: 'custom', path: ['aliasIds'], message: 'Node aliases require a primary id.' });
    return;
  }

  const ids = new Set([node.id]);
  node.aliasIds.forEach((id, index) => {
    if (ids.has(id))
      context.addIssue({ code: 'custom', path: ['aliasIds', index], message: `Duplicate Node id '${id}'.` });
    ids.add(id);
  });
}).describe('A positioned shape with optional interior text; paths can connect to its boundary.');

/** CSS-like 四边 spacing 对象，供 Node padding / margin 复用 */
export type IRBoxSpacing = ZodInfer<typeof BoxSpacingSchema>;

/** 轴向缩放对象，供 Node scale 复用 */
export type IRAxisScale = ZodInfer<typeof AxisScaleSchema>;

/** 宽高尺寸对象，供 Node minimumSize 复用 */
export type IRBoxSize = ZodInfer<typeof BoxSizeSchema>;

/** 节点：可定位的形状容器（矩形/圆/椭圆/菱形）+ 可选文本标签 */
export type IRNode = Omit<ZodInput<typeof NodeSchema>, 'position'> & {
  /**
   * 节点中心位置；省略时在 Core 解析为当前局部坐标系的原点
   * @default [0, 0]
   */
  position?: ZodInfer<typeof NodeSchema>['position'];
};

export type IRNodeStyle = ZodInfer<typeof NodeStyleSchema>;

export type IRNodeStroke = ZodInfer<typeof NodeStrokeSchema>;

export type IRNodeLayout = ZodInfer<typeof NodeLayoutSchema>;
