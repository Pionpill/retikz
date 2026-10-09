import {
  createOpenStringSchema,
  JsonObjectSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';
import { array, enum as zodEnum, literal, object, strictObject, union, unknown } from 'zod';

import { DrawableInstanceSchema, DrawableStyleSchema } from '../../drawable';
import { AngleDegreesSchema } from '../../scalar';
import { StrokeCapJoinSchema, StrokeStyleSchema } from '../../stroke';
import { ArrowEndDetailSchema } from '../arrow';
import { GeometryLabelSchema, StepSchema } from '../step';
import { PathFillRule, BuiltinPathKind } from './constants';

/** 校验路径内部区域的填充规则 */
export const PathFillRuleSchema = zodEnum(PathFillRule).describe('Path fill rule keyword.');

const PathKindSchema = createOpenStringSchema(BuiltinPathKind);

/** 校验 x 与 y 轴独立指定的路径缩放倍率 */
export const PathAnisotropicScaleSchema = object({
  x: PositiveNumberSchema.describe('Scale factor on the x axis.'),
  y: PositiveNumberSchema.describe('Scale factor on the y axis.'),
})
  .strict()
  .describe('Anisotropic scale with independent x / y factors.');

/** 校验围绕路径包围盒中心进行的统一或双轴缩放 */
export const PathScaleSchema = union([PositiveNumberSchema, PathAnisotropicScaleSchema]).describe(
  'Whole-path scale: a single number for uniform scaling, or an { x, y } object for anisotropic scaling. Applied around the path bounding-box center with rotate.',
);

/** 校验路径共用的线宽、虚线、端点线帽与拐角样式 */
export const PathStrokeSchema = strictObject({
  ...StrokeStyleSchema.shape,
  ...StrokeCapJoinSchema.shape,
}).describe('Path stroke fields combining shared stroke style with path endpoint and join options.');

/** 校验沿路径切线定向的箭头标记，shape 指定能力名称而非方向 */
export const ArrowMarkSchema = ArrowEndDetailSchema.extend({
  kind: literal('arrow').describe('Discriminator marking this mark as an arrow tip.'),
})
  .strict()
  .describe(
    'Arrow mark placed along the path. Direction follows the path tangent; `shape` is an arrow provider name, not a direction token.',
  );

/** 校验路径上的单个标记位置与端点重叠策略 */
export const PathMarkPlacementSchema = object({
  pos: NormalizedFractionSchema.describe(
    'Normalized position along the path. Parameter meaning matches step labels: arc length for line-like steps and Bezier parameter for curve-like steps.',
  ),
  endpointOverlap: NormalizedFractionSchema.optional().describe(
    "Normalized interpolation from an endpoint arrow's default placement to final visual-back alignment with the logical endpoint. Only valid for the selected start or end arrow on a built-in Stroke path.",
  ),
  mark: ArrowMarkSchema.describe(
    'The mark to place at this position; currently an arrow tip oriented by the path tangent.',
  ),
})
  .strict()
  .describe('One mark placement along the path.');

/** 校验路径填充区域的环绕判定字段 */
export const PathFillSchema = strictObject({
  fillRule: PathFillRuleSchema.optional().describe(
    'How self-intersecting / nested sub-paths are filled. `nonzero` (default) winds-by-direction; `evenodd` toggles fill on each crossing — useful for ring / donut shapes.',
  ),
}).describe('Path fill fields controlling the fill winding rule.');

/** 校验整条路径的旋转、缩放与几何圆角处理 */
export const PathTransformSchema = strictObject({
  roundedCorners: NonNegativeNumberSchema.optional().describe(
    'Geometric corner radius applied to line-to-line joints. Distinct from `lineJoin`, which only styles stroke corners. Omitted fields keep sharp joints.',
  ),
  rotate: AngleDegreesSchema.optional().describe(
    'Rotate the whole path around its bounding-box center. Endpoints resolve before rotation wraps the resulting geometry.',
  ),
  scale: PathScaleSchema.optional().describe(
    'Scale the whole path around its bounding-box center. Applied with rotate around the same center.',
  ),
}).describe('Whole-path transforms and geometric corner treatment.');

/** 校验路径步骤与整条路径的几何变换字段 */
export const PathGeometrySchema = strictObject({
  ...PathTransformSchema.shape,
  children: array(StepSchema)
    .min(2)
    .optional()
    .describe('Sequence of step actions defining the path; the first should usually be a `move`'),
}).describe('Path geometry fields describing transforms, corner treatment, and step children.');

/** 校验附着于路径宿主的标签与沿路径标记 */
export const PathDecorationSchema = strictObject({
  label: union([GeometryLabelSchema, array(GeometryLabelSchema).min(1)])
    .optional()
    .describe('Host label attached to this path-like relation.'),
  marks: array(PathMarkPlacementSchema)
    .optional()
    .describe('Marks placed along the path at normalized positions; direction follows the path tangent.'),
}).describe('Path decoration fields for host labels and along-path marks.');

/** 校验开放路径种类的判别字段和能力选项 */
export const PathStructureSchema = strictObject({
  type: literal('path').describe('Discriminator marking this child as a path.'),
  kind: PathKindSchema.optional().describe('Path kind provider name. Omitted means built-in `stroke`.'),
  kindOptions: JsonObjectSchema.optional().describe(
    'JSON-safe option object consumed by the selected path kind provider.',
  ),
}).describe('Path structure fields selecting an open path kind provider.');

/** 路径实例视觉覆盖 */
export const PathStyleSchema = strictObject({
  ...DrawableStyleSchema.shape,
  ...PathStrokeSchema.shape,
  ...PathFillSchema.shape,
}).describe('Path visual overrides; fields independently override inherited defaults.');

/** 校验路径类关系的基础字段，具体种类继续细化结构约束 */
export const PathBaseSchema = strictObject({
  ...PathStructureSchema.shape,
  ...DrawableInstanceSchema.shape,
  ...PathGeometrySchema.shape,
  ...PathDecorationSchema.shape,
  style: PathStyleSchema.optional().describe(
    'Path visual overrides; fields independently override inherited defaults.',
  ),
}).describe('Base fields for a path-like relation before kind-specific structural refinement.');

/** 校验由有序动作步骤组成的绘制路径 */
export const PathSchema = PathBaseSchema.describe(
  'A drawn path composed of a sequence of step actions (move / line / ...).',
);

/** 校验内置描边路径的观察对象，包含完整宿主约束 */
export const StrokePathSchema = PathBaseSchema.extend({
  // Keep malformed step payloads on the compile-time diagnostic path. The stroke
  // emitter owns geometric validity and emits the established warning/error.
  children: array(unknown()).optional().describe('Sequence of source step actions for the stroke path.'),
})
  .superRefine((path, ctx) => {
    const kind = path.kind ?? BuiltinPathKind.Stroke;
    if (kind !== BuiltinPathKind.Stroke) {
      ctx.addIssue({
        code: 'custom',
        path: ['kind'],
        message: 'Stroke path schema requires kind `stroke` or an omitted kind.',
      });
      return;
    }

    if (path.children === undefined) {
      ctx.addIssue({ code: 'custom', path: ['children'], message: 'Stroke paths require `children` steps.' });
    }

    if (path.kindOptions !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['kindOptions'],
        message: '`kindOptions` is not valid for the built-in `stroke` path kind.',
      });
    }
  })
  .transform(path => path as ZodInfer<typeof PathBaseSchema>)
  .describe('Complete source subject schema for the built-in stroke path kind.');
