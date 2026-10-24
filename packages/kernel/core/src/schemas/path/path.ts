import type { ValueOf } from '@retikz/foundation';
import {
  PositiveNumberSchema,
  NormalizedFractionSchema,
  NonNegativeNumberSchema,
  createOpenStringSchema,
  JsonObjectSchema,
} from '@retikz/foundation';
import { enum as zodEnum, strictObject, union, literal, number, array, unknown, never } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { DrawableInstanceSchema } from '../scene/drawable';
import {
  GraphicStrokeSchema,
  StrokeCapJoinSchema,
  GraphicColorSchema,
  GraphicFillSchema,
  GraphicOpacitySchema,
  GraphicEffectsSchema,
} from '../style/graphic';
import { ArrowStyleSchema } from './arrow';
import { PathLabelSchema } from './label';
import { StepSchema } from './step';

/** 路径填充规则关键字 */
export const PathFillRule = {
  /** 非零环绕规则：子路径方向决定嵌套区域是否抵消 */
  Nonzero: 'nonzero',
  /** 奇偶规则：每次穿过边界都会切换填充状态，适合孔洞和环形区域 */
  EvenOdd: 'evenodd',
} as const;

/** 路径编译 kind 关键字 */
export const BuiltinPath = {
  /** 标准描边路径 */
  Stroke: 'stroke',
} as const;

/** 路径填充规则关键字类型 */
export type PathFillRule = ValueOf<typeof PathFillRule>;

/** 路径编译 kind 关键字类型 */
export type BuiltinPath = ValueOf<typeof BuiltinPath>;

/** 校验路径内部区域的填充规则 */
export const PathFillRuleSchema = zodEnum(PathFillRule).describe('Path fill rule keyword.');
const PathAnisotropicScaleSchema = strictObject({
  x: PositiveNumberSchema.describe('Scale factor on the x axis.'),
  y: PositiveNumberSchema.describe('Scale factor on the y axis.'),
}).describe('Anisotropic scale with independent x / y factors.');

/** 校验围绕路径包围盒中心进行的统一或双轴缩放 */
export const PathScaleSchema = union([PositiveNumberSchema, PathAnisotropicScaleSchema]).describe(
  'Whole-path scale: a single number for uniform scaling, or an { x, y } object for anisotropic scaling. Applied around the path bounding-box center with rotate.',
);

/** 校验路径描边颜色、线宽、虚线、端点线帽与拐角样式 */
export const PathStrokeSchema = strictObject({
  ...GraphicStrokeSchema.shape,
  ...StrokeCapJoinSchema.shape,
}).describe('Path stroke fields combining shared stroke style with path endpoint and join options.');

/** 校验沿路径切线定向的箭头标记，shape 指定能力名称而非方向 */
export const ArrowMarkSchema = ArrowStyleSchema.extend({
  kind: literal('arrow').describe('Discriminator marking this mark as an arrow tip.'),
})
  .strict()
  .describe(
    'Arrow mark placed along the path. Direction follows the path tangent; `shape` is an arrow provider name, not a direction token.',
  );

/** 校验路径上的单个标记位置与端点重叠策略 */
export const PathMarkPlacementSchema = strictObject({
  pos: NormalizedFractionSchema.describe(
    'Normalized position along the path. Parameter meaning matches step labels: arc length for line-like steps and Bezier parameter for curve-like steps.',
  ),
  endpointOverlap: NormalizedFractionSchema.optional().describe(
    "Normalized interpolation from an endpoint arrow's default placement to final visual-back alignment with the logical endpoint. Only valid for the selected start or end arrow on a built-in Stroke path.",
  ),
  mark: ArrowMarkSchema.describe(
    'The mark to place at this position; currently an arrow tip oriented by the path tangent.',
  ),
}).describe('One mark placement along the path.');

/** 校验路径填充区域的环绕判定字段 */
export const PathFillSchema = strictObject({
  fillRule: PathFillRuleSchema.optional().describe(
    'How self-intersecting / nested sub-paths are filled. `nonzero` (default) winds-by-direction; `evenodd` toggles fill on each crossing — useful for ring / donut shapes.',
  ),
}).describe('Path fill fields controlling the fill winding rule.');

/** 校验整条路径的旋转与缩放 */
export const PathTransformSchema = strictObject({
  rotate: number()
    .optional()
    .describe(
      'Rotate the whole path around its bounding-box center. Endpoints resolve before rotation wraps the resulting geometry.',
    ),
  scale: PathScaleSchema.optional().describe(
    'Scale the whole path around its bounding-box center. Applied with rotate around the same center.',
  ),
}).describe('Whole-path rotation and scaling.');

/** 校验路径步骤、圆角与整条路径的几何变换字段 */
export const PathGeometrySchema = strictObject({
  ...PathTransformSchema.shape,
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Geometric corner radius applied to line-to-line joints. Distinct from `lineJoin`, which only styles stroke corners. Omitted fields keep sharp joints.',
  ),
  children: array(StepSchema)
    .min(2)
    .optional()
    .describe('Sequence of step actions defining the path; the first should usually be a `move`'),
}).describe('Path geometry fields describing transforms, corner treatment, and step children.');

/** 校验附着于路径宿主的标签与沿路径标记 */
export const PathDecorationSchema = strictObject({
  label: union([PathLabelSchema, array(PathLabelSchema).min(1)])
    .optional()
    .describe('Host label attached to this path-like relation.'),
  marks: array(PathMarkPlacementSchema)
    .optional()
    .describe('Marks placed along the path at normalized positions; direction follows the path tangent.'),
}).describe('Path decoration fields for host labels and along-path marks.');

/** 校验开放路径定义的判别字段和能力选项 */
export const PathStructureSchema = strictObject({
  type: literal('path').describe('Discriminator marking this child as a path.'),
  kind: createOpenStringSchema(BuiltinPath).optional().describe('Path provider name. Omitted means built-in `stroke`.'),
  kindOptions: JsonObjectSchema.optional().describe('JSON-safe option object consumed by the selected path provider.'),
}).describe('Path structure fields selecting an open path provider.');

/** 路径实例视觉覆盖 */
export const PathStyleSchema = strictObject({
  ...GraphicColorSchema.shape,
  ...GraphicFillSchema.shape,
  ...GraphicOpacitySchema.shape,
  ...GraphicEffectsSchema.shape,
  ...PathStrokeSchema.shape,
  ...PathFillSchema.shape,
}).describe('Path visual overrides; fields independently override inherited defaults.');

/** 校验路径的公共字段，具体种类继续细化结构约束 */
export const PathSchema = strictObject({
  ...PathStructureSchema.shape,
  ...DrawableInstanceSchema.shape,
  ...PathGeometrySchema.shape,
  ...PathDecorationSchema.shape,
  style: PathStyleSchema.optional().describe(
    'Path visual overrides; fields independently override inherited defaults.',
  ),
}).describe('Common path fields before kind-specific structural refinement.');

/** 校验内置描边路径的观察对象，包含完整宿主约束 */
export const StrokePathSchema = PathSchema.extend({
  kind: literal(BuiltinPath.Stroke).optional().describe('Built-in stroke path. May be omitted.'),
  /** 步骤数据留到编译时检查，由描边编译逻辑校验几何有效性并报告警告或错误 */
  children: array(unknown(), { error: 'Stroke paths require `children` steps.' }).describe(
    'Sequence of source step actions for the stroke path.',
  ),
  kindOptions: never({ error: '`kindOptions` is not valid for the built-in `stroke` path.' })
    .optional()
    .describe('Not accepted by the built-in stroke path.'),
})
  .transform(path => path as ZodInfer<typeof PathSchema>)
  .describe('Complete source subject schema for the built-in stroke path.');

/** 路径整条缩放类型：number（等比）或 {x,y}（非等比） */
export type IRPathScale = ZodInfer<typeof PathScaleSchema>;

/** 路径描边片段类型 */
export type IRPathStroke = ZodInfer<typeof PathStrokeSchema>;

/** 路径中段箭头标记类型 */
export type IRArrowMark = ZodInfer<typeof ArrowMarkSchema>;

/** Path schema 的原始输出类型：供 kind 派生与特殊形态使用 */
export type IRPathBase = ZodInfer<typeof PathSchema>;

/** 路径：由若干 step 动作（move/line/...）组成并携带 children */
export type IRPath = Omit<IRPathBase, 'children'> & {
  /** 按执行顺序排列的路径步骤 */
  children: Array<ZodInfer<typeof StepSchema>>;
};

export type IRPathStyle = ZodInfer<typeof PathStyleSchema>;
