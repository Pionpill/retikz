import type { ValueOf } from '@retikz/foundation';
import { NormalizedFractionSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { strictObject, union, enum as zodEnum, literal, boolean } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { Side } from '../../shared';
import { createLabelVisualStyleShape } from '../text/label';
import { TextBlockSchema } from '../text/text';

/** path-like 路径标签沿段的位置关键字 */
export const PathLabelPosition = {
  /** 段起点 */
  AtStart: 'at-start',
  /** 非常靠近段起点 */
  VeryNearStart: 'very-near-start',
  /** 靠近段起点 */
  NearStart: 'near-start',
  /** 段中点 */
  Midway: 'midway',
  /** 靠近段终点 */
  NearEnd: 'near-end',
  /** 非常靠近段终点 */
  VeryNearEnd: 'very-near-end',
  /** 段终点 */
  AtEnd: 'at-end',
} as const;

/** path-like 路径标签沿段的位置关键字取值 */
export type PathLabelPosition = ValueOf<typeof PathLabelPosition>;

/** 校验附着于路径类宿主、由中心线采样确定位置的文本标签 */
export const PathLabelSchema = strictObject({
  ...createLabelVisualStyleShape({
    textColor: 'Label text color; falls back to label defaults, path color, then currentColor.',
    opacity: 'Label-only opacity, multiplied with the owning path opacity.',
    font: 'Label font overrides. Missing fields inherit from scope label defaults.',
  }),
  text: TextBlockSchema.describe(
    'One text block for this path label. Arrays provide authored lines with optional per-line styles.',
  ),
  position: union([zodEnum(PathLabelPosition), NormalizedFractionSchema])
    .optional()
    .describe('Position along the step: keyword or normalized number. Parameter meaning follows the step kind.'),
  side: union([zodEnum(Side), literal('center')])
    .optional()
    .describe(
      'Side relative to the label anchor; center places text on the path independently of sloped. Omitted values use top, or center when sloped is true.',
    ),
  sloped: boolean()
    .optional()
    .describe('Rotate the label along the sampled tangent. An omitted `side` canonicalizes to `center`.'),
  interrupt: boolean()
    .optional()
    .describe('Whether this label requests a gap in a compatible host stroke. Omitted values use the host policy.'),
  gap: NonNegativeNumberSchema.optional().describe(
    'Extra clearance in user units on each side of an interrupted host stroke gap. Defaults to 4.',
  ),
  distance: NonNegativeNumberSchema.optional().describe(
    'Side offset distance in user units. Defaults to the same distance as Path step labels.',
  ),
}).describe(
  'Path label spec attached to a path-like host; compiled as one text block positioned from a centerline sample.',
);

/** 路径类几何共用的标签 IR 类型 */
export type IRPathLabel = ZodInfer<typeof PathLabelSchema>;
