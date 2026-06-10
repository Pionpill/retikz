import { z } from 'zod';
import type { ValueOf } from '../types';
import { JsonValueSchema } from './json';

/**
 * 可动画属性通道（renderer 无关；DrawWay 风格 const + 派生类型，裸字面量 'opacity' 仍第一形态）
 * @description `viewBox` 仅在 scene 根合法（镜头），元素级 viewBox track 由 compile / render 拒；
 *   `pathDraw` 是 0..1 路径画出进度；`scaleX` / `scaleY` 是非均匀缩放（柱状图从基线长出等），`scale` 是均匀缩放；
 *   transform 通道（scale / scaleX / scaleY / rotate）的支点见 track 级 `origin`，缺省几何中心。
 *   各后端按通道翻译：SVG WAAPI/CSS、Canvas rAF 几何 lerp。
 */
export const AnimationProperty = {
  Opacity: 'opacity',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  TranslateX: 'translateX',
  TranslateY: 'translateY',
  Rotate: 'rotate',
  Scale: 'scale',
  ScaleX: 'scaleX',
  ScaleY: 'scaleY',
  PathDraw: 'pathDraw',
  ViewBox: 'viewBox',
} as const;
/** 内置可动画属性通道名联合 */
export type AnimationPropertyValue = ValueOf<typeof AnimationProperty>;
export type BuiltinAnimationProperty = AnimationPropertyValue;
/** 属性名：内置 ∪ 任意自定义字符串（`& {}` 保内置自动补全，同 NodeShape 范式）；自定义通道由后续 renderer 注册的插值器解释 */
export type AnimationPropertyRef = BuiltinAnimationProperty | (string & {});

/** 缓动具名预设（与 CSS 同名）；track / keyframe 亦可改用 cubic-bezier 四元组 */
export const AnimationEasing = {
  Linear: 'linear',
  Ease: 'ease',
  EaseIn: 'ease-in',
  EaseOut: 'ease-out',
  EaseInOut: 'ease-in-out',
} as const;
/** 缓动预设名联合 */
export type AnimationEasingValue = ValueOf<typeof AnimationEasing>;

/** 每次迭代的播放方向（抄 WAAPI / CSS animation-direction） */
export const AnimationDirection = {
  Normal: 'normal',
  Reverse: 'reverse',
  Alternate: 'alternate',
  AlternateReverse: 'alternate-reverse',
} as const;
/** 播放方向名联合 */
export type AnimationDirectionValue = ValueOf<typeof AnimationDirection>;

/** 活动区间外取值（抄 WAAPI / CSS animation-fill-mode） */
export const AnimationFill = {
  None: 'none',
  Forwards: 'forwards',
  Backwards: 'backwards',
  Both: 'both',
} as const;
/** 填充模式名联合 */
export type AnimationFillValue = ValueOf<typeof AnimationFill>;

export const EasingSchema = z
  .union([
    z.string().min(1),
    z.tuple([z.number().finite(), z.number().finite(), z.number().finite(), z.number().finite()]),
  ])
  .describe(
    'Easing: a named preset (built-in linear / ease / ease-in / ease-out / ease-in-out, or a custom name resolved by a renderer-registered easing) or a cubic-bezier control-point tuple [x1, y1, x2, y2]. Defaults to linear when omitted.',
  );

export const KeyframeSchema = z
  .object({
    at: z
      .number()
      .min(0)
      .max(1)
      .describe(
        'Normalized keyframe time in [0, 1] (WAAPI offset, decoupled from duration). Keyframes within a track must be sorted ascending by `at`.',
      ),
    value: JsonValueSchema.describe(
      'Keyframe value (any JSON value). For built-in properties it is narrowed by the track-level refinement: a finite number (opacity / scale / rotate / translateX|Y / strokeWidth / pathDraw 0..1), a color string (fill / stroke, interpolated in oklch), or a 4-number array [x, y, w, h] (viewBox). Custom (non-built-in) properties accept any JSON value, interpreted by a renderer-registered interpolator.',
    ),
    easing: EasingSchema.optional().describe(
      'Per-segment easing from this keyframe to the next; overrides the track-level easing.',
    ),
  })
  .describe('A single animation keyframe: a value at a normalized time, with optional per-segment easing.');

/** 播放触发器关键字（runtime 落地；DrawWay 风格 const + 派生类型，与其它 Animation 枚举单一真源一致） */
export const AnimationTrigger = { Load: 'load', Visible: 'visible', Manual: 'manual' } as const;
/** 触发器关键字联合（不含 { onEvent } 对象形态） */
export type AnimationTriggerValue = ValueOf<typeof AnimationTrigger>;

export const TriggerSchema = z
  .union([
    z.nativeEnum(AnimationTrigger),
    z.object({
      onEvent: z
        .string()
        .min(1)
        .describe('Event name (e.g. "click") the runtime binds to start playback; the handler function never enters the IR.'),
    }),
  ])
  .describe(
    'When playback starts: "load" (on render, SSR-friendly) / "visible" (runtime IntersectionObserver) / "manual" (runtime API) / { onEvent } (bridge to hydration; only the event name is stored, never a callback). Defaults to "load".',
  );

export const OriginSchema = z
  .union([
    z
      .string()
      .min(1)
      .describe(
        'Named transform pivot reusing the node anchor vocabulary (center / north / south / east / west / north-east / ... / south-west), resolved against the element boundary by the renderer.',
      ),
    z
      .tuple([z.number().finite(), z.number().finite()])
      .describe('Explicit pivot in the element local coordinate space [x, y].'),
  ])
  .describe(
    'Transform pivot for scale / scaleX / scaleY / rotate channels: a named anchor or an explicit local-space point. Ignored by non-transform channels. Defaults to the element geometric center.',
  );

export const AnimationTrackSchema = z
  .object({
    property: z
      .string()
      .min(1)
      .describe(
        'Renderer-agnostic animated channel. Built-in: opacity / fill / stroke / strokeWidth / translateX / translateY / rotate / scale (uniform) / scaleX / scaleY (non-uniform) / pathDraw (0..1 reveal) / viewBox (scene-root camera only). Any other string is a custom channel that passes through to a renderer-registered interpolator. `viewBox` is valid only at the scene root (enforced at compile).',
      ),
    keyframes: z
      .array(KeyframeSchema)
      .min(1)
      .refine(frames => frames.every((frame, index) => index === 0 || frame.at >= frames[index - 1].at), {
        message: 'keyframes must be sorted ascending by `at`',
      })
      .describe(
        'Ordered keyframes (at least one), sorted ascending by `at` within [0, 1]. Each keyframe gives the absolute display value at that time (NOT a delta on top of the base). By convention the final keyframe equals the element base (settled) state, so ignoring the animation renders the complete base figure.',
      ),
    duration: z
      .number()
      .finite()
      .positive()
      .describe('One-iteration duration in milliseconds (> 0).'),
    delay: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe('Delay before the first iteration, in milliseconds (>= 0). Group-level stagger is compiled by sugar into per-track delays.'),
    easing: EasingSchema.optional().describe(
      'Track-level easing applied to each segment that lacks its own keyframe easing. Defaults to linear.',
    ),
    iterations: z
      .union([z.number().finite().positive(), z.literal('infinite')])
      .optional()
      .describe('Total play count (WAAPI iterations): a positive number (may be fractional) or "infinite". Omitted = 1 = play once.'),
    direction: z
      .nativeEnum(AnimationDirection)
      .optional()
      .describe('Per-iteration playback direction (WAAPI / CSS animation-direction). Defaults to "normal".'),
    fill: z
      .nativeEnum(AnimationFill)
      .optional()
      .describe(
        'Value held outside the active interval (WAAPI / CSS fill-mode). Defaults to "forwards" so the element settles at its base (end) state, matching the static-settled invariant.',
      ),
    trigger: TriggerSchema.optional().describe('Playback trigger; defaults to "load".'),
    origin: OriginSchema.optional().describe(
      'Transform pivot for scale / scaleX / scaleY / rotate channels; ignored by other channels. Defaults to the element geometric center.',
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
          ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: 'viewBox keyframe value must be a 4-number array [x, y, w, h]' });
        }
      } else if (track.property === AnimationProperty.Fill || track.property === AnimationProperty.Stroke) {
        if (typeof value !== 'string') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `${track.property} keyframe value must be a color string` });
        }
      } else if (numeric.has(track.property)) {
        if (typeof value !== 'number') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `${track.property} keyframe value must be a number` });
        }
      }
    });
  })
  .describe(
    'A declarative timeline animation track on a single renderer-agnostic property: keyframes over normalized time plus WAAPI-style timing options. The `property` is open (built-in channels or a custom name resolved by a renderer-registered interpolator). Fully JSON-serializable (no functions); playback control and callbacks live in the runtime, not the IR. Renderers that cannot animate render the static settled state and emit a diagnosable warning.',
  );

/** 时间轴动画 track（renderer 无关、JSON 可序列化、无函数；keyframe 给绝对展示值、末帧 = 元素 base 终态） */
export type IRAnimationTrack = z.infer<typeof AnimationTrackSchema>;
/** 单个动画关键帧 */
export type IRKeyframe = z.infer<typeof KeyframeSchema>;
/** transform 支点（命名 anchor ∪ 局部坐标点；scale / scaleX / scaleY / rotate 用，缺省几何中心） */
export type IRAnimationOrigin = z.infer<typeof OriginSchema>;
/** 动画播放触发器（load / visible / manual / { onEvent }） */
export type IRAnimationTrigger = z.infer<typeof TriggerSchema>;
