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
  default: NonNegativeNumberSchema.optional().describe('Fallback spacing for all sides.'),
  x: NonNegativeNumberSchema.optional().describe('Horizontal spacing for left and right sides.'),
  y: NonNegativeNumberSchema.optional().describe('Vertical spacing for top and bottom sides.'),
  left: NonNegativeNumberSchema.optional().describe('Left-side spacing.'),
  right: NonNegativeNumberSchema.optional().describe('Right-side spacing.'),
  top: NonNegativeNumberSchema.optional().describe('Top-side spacing.'),
  bottom: NonNegativeNumberSchema.optional().describe('Bottom-side spacing.'),
}).describe('CSS-like box spacing overrides. Side fields override axis fields, then default.');

/** 接受统一间距或按方向设置的间距 */
const BoxSpacingValueSchema = union([NonNegativeNumberSchema, BoxSpacingSchema]);

/** 校验双轴缩放覆盖值；指定轴优先于统一倍率 */
export const AxisScaleSchema = strictObject({
  default: PositiveNumberSchema.optional().describe('Fallback scale factor for both axes.'),
  x: PositiveNumberSchema.optional().describe('Horizontal scale factor.'),
  y: PositiveNumberSchema.optional().describe('Vertical scale factor.'),
}).describe('Axis-specific scale overrides. Axis fields override default.');

/** 校验宽高覆盖值；单独指定的宽或高优先于统一尺寸 */
export const BoxSizeSchema = strictObject({
  default: NonNegativeNumberSchema.optional().describe('Fallback size for width and height.'),
  width: NonNegativeNumberSchema.optional().describe('Width size.'),
  height: NonNegativeNumberSchema.optional().describe('Height size.'),
}).describe('Box size overrides. Width and height override default.');

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
  dashed: boolean().optional().describe('Dashed border preset. `dashPattern` takes precedence.'),
  dotted: boolean().optional().describe('Dotted border preset. `dashPattern` and `dashed` take precedence.'),
}).describe(
  'Node stroke overrides. dashPattern takes precedence over dashed, then dotted. Omitted width defaults to 1 when no width is inherited.',
);

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
  minimumSize: union([NonNegativeNumberSchema, BoxSizeSchema])
    .optional()
    .describe(
      'Minimum visual border size in user units. Number applies to width and height; object width / height override default.',
    ),
  padding: BoxSpacingValueSchema.optional().describe(
    'Inner spacing from content to border. Number applies to all sides; object fields resolve as side > axis > default.',
  ),
  margin: BoxSpacingValueSchema.optional().describe(
    'Outer offset around the connection boundary. Number applies to all sides; object fields resolve as side > axis > default.',
  ),
}).describe('Node size, spacing, and text layout overrides.');

/** 组合节点自身字段与共用样式，供最终节点校验复用 */
const NodeBaseSchema = strictObject({
  type: literal('node').describe('Discriminator marking this child as a node'),
  id: NonBlankStringSchema.optional().describe(
    'Optional unique id; required if any path needs to reference this node by string',
  ),
  aliasIds: array(NonBlankStringSchema)
    .optional()
    .describe('Additional ids for the same node geometry; requires id and excludes duplicate or primary ids.'),
  shape: ShapeValueSchema.optional().describe(
    'Node visual shape: bare shape name or `{ type, params }`. Built-ins and registered shapes are allowed; unregistered names fail at compile time. Omitted fields use rectangle.',
  ),
  boundary: BoundarySchema.optional().describe(
    'Default connection surface for edges meeting this node. Per-edge endpoints may override it.',
  ),
  meta: JsonObjectSchema.optional().describe(
    'Opaque JSON metadata carried by this node. Preserved into emitted Scene primitives and ignored by the compiler.',
  ),
  animations: array(AnimationTrackSchema)
    .optional()
    .describe(
      'Declarative animation tracks for this node. Tracks are carried into emitted Scene primitives, do not affect layout, and are not inherited across scopes.',
    ),
  position: NodePositionSchema.default([0, 0]).describe(
    'Node placement: Cartesian [x, y], polar, relative-to-node, offset, between two endpoints, or anchor-to-anchor alignment. Defaults to [0, 0] in the current local coordinate system. Non-Cartesian forms resolve at compile time.',
  ),
  rotate: number().optional().describe('Rotation in degrees around the node center; positive is visually clockwise.'),
  text: TextBlockSchema.optional().describe(
    'Optional node text content. Accepts a string, an array of lines, styled line objects, or mixed text/math segments. Newlines are hard line breaks; math sugar requires lowerTex.',
  ),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Top-level corner radius in user units. Only effective on `rectangle` shape.',
  ),
  scale: union([PositiveNumberSchema, AxisScaleSchema])
    .optional()
    .describe(
      'Node scale factor. Number applies to both axes; object x / y override default. Affects path attachment positions.',
    ),
  label: union([NodeLabelSchema, array(NodeLabelSchema)])
    .optional()
    .describe(
      'Extra label or labels attached around the node border. Each label is positioned by `position` and `distance`.',
    ),
  zIndex: number()
    .int()
    .optional()
    .describe(
      'Stacking order among sibling IR children. Higher draws on top; equal values keep source order within the same parent group.',
    ),
  style: NodeStyleSchema.optional().describe(
    'Node visual overrides; fields independently override inherited defaults.',
  ),
  layout: NodeLayoutSchema.optional().describe('Node size, spacing, and text layout overrides.'),
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
}).describe('Node primitive: a positioned, optionally textual shape');

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
