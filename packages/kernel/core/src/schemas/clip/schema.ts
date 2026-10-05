import { JsonObjectSchema, NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { enum as zodEnum, intersection, lazy, literal, number, object, strictObject, union } from 'zod';

import { ClipFillRule } from './constants';
import type { IRClip } from './types';

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

const RESERVED_CLIP_KINDS = new Set(['rect']);

const CustomClipSchema = intersection(
  object({
    kind: NonBlankStringSchema.describe('Custom clip discriminator registered through CompileOptions.clips.'),
  }),
  JsonObjectSchema,
)
  .superRefine((value, ctx) => {
    if (RESERVED_CLIP_KINDS.has(value.kind)) {
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
