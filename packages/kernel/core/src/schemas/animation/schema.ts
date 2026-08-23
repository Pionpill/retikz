import {
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { z } from 'zod';

import { Anchor, CenterAnchor } from '../../shared';
import { JsonValueSchema } from '../json';
import { AnimationDirection, AnimationFill, AnimationProperty, AnimationTrigger } from './constants';

export const EasingSchema = z
  .union([NonBlankStringSchema, z.tuple([z.number(), z.number(), z.number(), z.number()])])
  .describe(
    'Easing curve: built-in easing name, custom easing name, or cubic-bezier tuple [x1, y1, x2, y2]. Omitted fields use linear easing.',
  );

export const KeyframeSchema = z
  .object({
    at: NormalizedFractionSchema.describe(
      'Normalized keyframe time. Keyframes in one track must be sorted by this field.',
    ),
    value: JsonValueSchema.describe(
      'Absolute property value at this keyframe. Built-in properties are refined by track property; custom properties accept any JSON value.',
    ),
    easing: EasingSchema.optional().describe(
      'Easing from this keyframe to the next. Overrides track-level easing for that segment.',
    ),
  })
  .describe('One animation keyframe: normalized time, absolute value, and optional segment easing.');

export const EventTriggerSchema = z
  .object({
    onEvent: NonBlankStringSchema.describe(
      'Runtime event name that starts playback. Only the event name enters the IR.',
    ),
  })
  .describe('Runtime event trigger descriptor.');

export const TriggerSchema = z
  .union([z.enum(AnimationTrigger), EventTriggerSchema])
  .describe('Playback trigger: load, visible, manual, or a named runtime event. Omitted fields use load.');

export const OriginSchema = z
  .union([
    z
      .enum({ ...CenterAnchor, ...Anchor })
      .describe(
        'Named transform pivot using the canonical node anchor vocabulary, resolved against the animated element.',
      ),
    z.tuple([z.number(), z.number()]).describe('Explicit transform pivot in element-local coordinates [x, y].'),
  ])
  .describe(
    'Transform pivot for scale, scaleX, scaleY, and rotate. Non-transform properties ignore it; omitted fields use the element center.',
  );

export const AnimationTrackSchema = z
  .object({
    property: NonBlankStringSchema.describe(
      'Animated property name. Built-ins have refined value types; custom names accept JSON values. viewBox is scene-root only.',
    ),
    keyframes: z
      .array(KeyframeSchema)
      .min(1)
      .refine(frames => frames.every((frame, index) => index === 0 || frame.at >= frames[index - 1].at), {
        message: 'keyframes must be sorted ascending by `at`',
      })
      .describe(
        'Keyframes sorted by `at`. Each value is absolute, not a delta. The final keyframe should represent the settled value.',
      ),
    duration: PositiveNumberSchema.describe('Duration of one animation iteration in milliseconds.'),
    delay: NonNegativeNumberSchema.optional().describe('Delay before playback starts, in milliseconds.'),
    easing: EasingSchema.optional().describe(
      'Default easing for keyframe segments without keyframe-level easing. Omitted fields use linear easing.',
    ),
    iterations: z
      .union([PositiveNumberSchema, z.literal('infinite')])
      .optional()
      .describe('Iteration count. Use "infinite" for endless playback. Omitted fields play once.'),
    direction: z
      .enum(AnimationDirection)
      .optional()
      .describe('Playback direction for each iteration. Omitted fields use normal.'),
    fill: z
      .enum(AnimationFill)
      .optional()
      .describe(
        'Value mode outside the active interval. Omitted fields use forwards so static rendering matches the settled value.',
      ),
    trigger: TriggerSchema.optional().describe('Playback trigger. Omitted fields use load.'),
    origin: OriginSchema.optional().describe(
      'Transform pivot for scale, scaleX, scaleY, and rotate. Other properties ignore it.',
    ),
  })
  // 内置 property 的 keyframe value 类型校验；自定义 property（非内置名）value 宽松（任意 JSON），交 renderer 注册的插值器
  .superRefine((track, ctx) => {
    const numeric = new Set<string>([
      AnimationProperty.Opacity,
      AnimationProperty.StrokeWidth,
      AnimationProperty.TranslateX,
      AnimationProperty.TranslateY,
      AnimationProperty.Rotate,
      AnimationProperty.Scale,
      AnimationProperty.ScaleX,
      AnimationProperty.ScaleY,
      AnimationProperty.PathDraw,
    ]);
    track.keyframes.forEach((frame, index) => {
      const value = frame.value;
      const path: Array<string | number> = ['keyframes', index, 'value'];
      if (track.property === AnimationProperty.ViewBox) {
        if (!Array.isArray(value) || value.length !== 4) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: 'viewBox keyframe value must be a 4-number array [x, y, w, h]',
          });
        }
      } else if (track.property === AnimationProperty.Fill || track.property === AnimationProperty.Stroke) {
        if (typeof value !== 'string') {
          ctx.addIssue({ code: 'custom', path, message: `${track.property} keyframe value must be a color string` });
        }
      } else if (numeric.has(track.property)) {
        if (typeof value !== 'number') {
          ctx.addIssue({ code: 'custom', path, message: `${track.property} keyframe value must be a number` });
        }
      }
    });
  })
  .describe(
    'Declarative animation track for one property. Stores JSON-safe keyframes and timing options only; callbacks and playback state stay outside the IR.',
  );
