import {
  AxisScaleSchema,
  BlendMode,
  BoundarySchema,
  BoxSpacingSchema,
  CssColorSchema,
  DropShadowSchema,
  FontSchema,
  NodeTextAlign,
  OpacitySchema,
  PaintSchema,
  ShadowPreset,
  StrokeDashPatternSchema,
} from '@retikz/core';
import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { boolean, enum as zodEnum, number, strictObject, union } from 'zod';
import type { infer as ZodInfer } from 'zod';

const MarkPaintStyleSchema = union([CssColorSchema, PaintSchema]);

/** 校验图元填充的固定 CSS 颜色或结构化 Paint */
export const MarkFillStyleSchema = MarkPaintStyleSchema.describe('Fixed mark fill: CSS color or structured paint');

/** 校验图元共享主色的固定 CSS 颜色 */
export const MarkColorStyleSchema = CssColorSchema.describe('Fixed mark color value');

/** 校验图元描边的固定 CSS 颜色或结构化 Paint */
export const MarkStrokeStyleSchema = MarkPaintStyleSchema.describe('Fixed mark stroke: CSS color or structured paint');

/** 校验数值样式的有限常量 */
export const MarkNumberStyleSchema = number().describe('Fixed numeric mark style value');

/** 校验非负数值样式的常量 */
export const MarkNonnegativeNumberStyleSchema = NonNegativeNumberSchema.describe('Fixed nonnegative mark style value');

/** 校验单个透明度因子的 0 到 1 常量 */
export const MarkOpacityFactorStyleSchema = OpacitySchema.describe('Fixed opacity factor from zero to one');

/** 校验堆叠次序的整数常量 */
export const MarkZIndexStyleSchema = number().int().describe('Fixed integer mark stacking order');

/** 校验节点和路径共享的固定虚线长度序列 */
export const MarkDashPatternStyleSchema = StrokeDashPatternSchema.describe(
  'Fixed dash pattern shared by node and path marks',
);

/** 校验图元阴影的固定预设或结构化配置 */
export const MarkShadowStyleSchema = union([zodEnum(ShadowPreset), DropShadowSchema]).describe(
  'Fixed mark shadow preset or configuration',
);

/** 校验混合模式的固定关键字 */
export const MarkBlendModeStyleSchema = zodEnum(BlendMode).describe('Fixed mark blend mode');

/** 校验整体、填充与描边各自的固定透明度 */
export const MarkOpacityStyleSchema = strictObject({
  overall: MarkOpacityFactorStyleSchema.optional().describe(
    'Overall opacity factor, multiplied by fill and stroke factors',
  ),
  fill: MarkOpacityFactorStyleSchema.optional().describe('Fixed fill opacity factor'),
  stroke: MarkOpacityFactorStyleSchema.optional().describe('Fixed stroke opacity factor'),
}).describe('Optional fixed overall, fill and stroke opacity factors');

/** 校验节点正数样式的常量 */
export const NodePositiveNumberStyleSchema = PositiveNumberSchema.describe('node positive numeric style value');

/** 校验节点文本对齐的固定关键字 */
export const NodeTextAlignStyleSchema = zodEnum(NodeTextAlign).describe('node text align style value');

/** 校验节点布尔样式的常量 */
export const NodeBooleanStyleSchema = boolean().describe('node boolean style value');

/** 校验节点字体的固定字体对象 */
export const NodeFontStyleSchema = FontSchema.describe('node font style value');

/** 校验节点连接面的固定连接面引用 */
export const NodeBoundaryStyleSchema = BoundarySchema.describe('node boundary style value');

/** 校验节点盒间距的固定数值与四边覆盖 */
export const NodeBoxSpacingStyleSchema = union([NonNegativeNumberSchema, BoxSpacingSchema]).describe(
  'node box spacing style value',
);

/** 校验节点缩放的固定统一与双轴倍率 */
export const NodeAxisScaleStyleSchema = union([PositiveNumberSchema, AxisScaleSchema]).describe(
  'node scale style value',
);

/** 节点宿主复用的固定样式字段 */
export const nodeStyleFields = {
  align: NodeTextAlignStyleSchema.optional().describe('Core Node text alignment: fixed start / middle / end'),
  lineHeight: NodePositiveNumberStyleSchema.optional().describe('Core Node lineHeight: fixed positive value'),
  maxTextWidth: NodePositiveNumberStyleSchema.optional().describe('Core Node maxTextWidth: fixed positive value'),
  cornerRadius: MarkNonnegativeNumberStyleSchema.optional().describe(
    'Core Node cornerRadius: fixed non-negative value',
  ),
  scale: NodeAxisScaleStyleSchema.optional().describe('Core Node scale: fixed number / {default,x,y}'),
  padding: NodeBoxSpacingStyleSchema.optional().describe('Core Node padding: fixed box spacing'),
  margin: NodeBoxSpacingStyleSchema.optional().describe('Core Node margin: fixed box spacing'),
  dashed: NodeBooleanStyleSchema.optional().describe('Core Node dashed: fixed boolean'),
  dotted: NodeBooleanStyleSchema.optional().describe('Core Node dotted: fixed boolean'),
  dashPattern: MarkDashPatternStyleSchema.optional().describe('Core Node dashPattern: fixed number array'),
  font: NodeFontStyleSchema.optional().describe('Core Node font: fixed font object'),
  boundary: NodeBoundaryStyleSchema.optional().describe('Core Node boundary: fixed boundary value'),
  shadow: MarkShadowStyleSchema.optional().describe('Core Node shadow: fixed preset / object'),
  blendMode: MarkBlendModeStyleSchema.optional().describe('Core Node blendMode: fixed blend mode'),
};

/** 图元整体、填充与描边的固定透明度配置 */
export type IRPlotMarkOpacityStyle = ZodInfer<typeof MarkOpacityStyleSchema>;
