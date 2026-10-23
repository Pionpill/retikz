import type { ValueOf, JsonObject } from '@retikz/foundation';
import { NonNegativeNumberSchema, NonBlankStringSchema, JsonObjectSchema } from '@retikz/foundation';
import { enum as zodEnum, strictObject, literal, number, intersection, object, lazy, union } from 'zod';
import type { ZodType, infer as ZodInfer } from 'zod';

/** 裁切路径填充规则 */
export const ClipFillRule = {
  /** 非零环绕数规则 */
  NonZero: 'nonzero',
  /** 奇偶填充规则 */
  EvenOdd: 'evenodd',
} as const;

/** 裁切路径填充规则取值 */
export type ClipFillRule = ValueOf<typeof ClipFillRule>;

/** 校验路径裁剪区域采用的填充判定规则 */
export const ClipFillRuleSchema = zodEnum(ClipFillRule).describe('Fill rule used by path-like clip regions.');

/** 校验作用域局部坐标中的矩形裁剪区域；零宽或零高表示空区域 */
export const RectClipSchema = strictObject({
  kind: literal('rect').describe('Discriminator for rectangular clip regions.'),
  x: number().describe('Rect left-top x in scope-local coords.'),
  y: number().describe('Rect left-top y in scope-local coords.'),
  width: NonNegativeNumberSchema.describe('Rect width in user units; zero produces an empty clip region.'),
  height: NonNegativeNumberSchema.describe('Rect height in user units; zero produces an empty clip region.'),
}).describe('Rectangular clip region.');

/** 校验自定义裁剪数据，内置矩形须使用矩形 schema */
const CustomClipSchema = intersection(
  object({
    kind: NonBlankStringSchema.describe('Custom clip discriminator registered through CompileOptions.clips.'),
  }),
  JsonObjectSchema,
)
  .superRefine((value, ctx) => {
    if (value.kind === 'rect') {
      ctx.addIssue({
        code: 'custom',
        message: `Builtin clip kind '${value.kind}' must match its builtin schema.`,
        path: ['kind'],
      });
    }
  })
  .describe('Custom clip spec. Its kind must be registered through CompileOptions.clips.');

/** 校验内置矩形或按 kind 注册的自定义裁剪描述 */
export const ClipSchema: ZodType<IRClip> = lazy(() => union([RectClipSchema, CustomClipSchema])).describe(
  'Clip region for `Scope.clip`: built-in rect or a JSON-safe custom object registered by kind.',
);

/** 矩形裁切 IR 类型 */
export type IRRectClip = ZodInfer<typeof RectClipSchema>;

/** 自定义裁切 IR 类型：`kind` 对应 compile options 中注册的 clip provider */
export type IRCustomClip = JsonObject & {
  /** 选择编译选项中注册的裁剪 provider */
  kind: string;
};

/** 裁切 IR 类型：Core 仅提供基础分支，其余 kind 通过 provider 扩展 */
export type IRClip = IRRectClip | IRCustomClip;
