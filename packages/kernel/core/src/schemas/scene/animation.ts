import type { ValueOf } from '@retikz/foundation';
import {
  NormalizedFractionSchema,
  NonBlankStringSchema,
  PositiveNumberSchema,
  NonNegativeNumberSchema,
} from '@retikz/foundation';
import { union, tuple, number, strictObject, discriminatedUnion, enum as zodEnum, array, literal } from 'zod';
import type { infer as ZodInfer, ZodType } from 'zod';

import { CenterAnchor, Anchor } from '../../shared';
import { OpacitySchema, StrokeWidthSchema, CssColorSchema, StrokeDashOffsetSchema } from '../style/graphic';

/**
 * 可动画属性通道（renderer 无关；DrawWay 风格 const + 派生类型，裸字面量 'opacity' 仍第一形态）
 * @description `viewBox` 仅在 scene 根合法（镜头），元素级 viewBox track 由 compile / render 拒；
 *   `pathDraw` 是 0..1 路径画出进度；`scaleX` / `scaleY` 是非均匀缩放（柱状图从基线长出等），`scale` 是均匀缩放；
 *   transform 通道（scale / scaleX / scaleY / rotate）的支点见 track 级 `origin`，缺省几何中心。
 *   各后端按通道翻译：SVG WAAPI/CSS、Canvas rAF 几何 lerp
 */
export const AnimationProperty = {
  Opacity: 'opacity',
  FillOpacity: 'fillOpacity',
  StrokeOpacity: 'strokeOpacity',
  DashOffset: 'dashOffset',
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

/** 缓动具名预设（与 CSS 同名）；track / keyframe 亦可改用 cubic-bezier 四元组 */
export const AnimationEasing = {
  Linear: 'linear',
  Ease: 'ease',
  EaseIn: 'ease-in',
  EaseOut: 'ease-out',
  EaseInOut: 'ease-in-out',
} as const;

/** 每次迭代的播放方向（抄 WAAPI / CSS animation-direction） */
export const AnimationDirection = {
  Normal: 'normal',
  Reverse: 'reverse',
  Alternate: 'alternate',
  AlternateReverse: 'alternate-reverse',
} as const;

/** 活动区间外取值（抄 WAAPI / CSS animation-fill-mode） */
export const AnimationFill = {
  None: 'none',
  Forwards: 'forwards',
  Backwards: 'backwards',
  Both: 'both',
} as const;

/** 播放触发器关键字（runtime 落地；DrawWay 风格 const + 派生类型，与其它 Animation 枚举单一真源一致） */
export const AnimationTrigger = { Load: 'load', Visible: 'visible', Manual: 'manual' } as const;

/** 内置可动画属性通道名联合 */
export type AnimationProperty = ValueOf<typeof AnimationProperty>;

/** 缓动预设名联合 */
export type AnimationEasing = ValueOf<typeof AnimationEasing>;

/** 播放方向名联合 */
export type AnimationDirection = ValueOf<typeof AnimationDirection>;

/** 填充模式名联合 */
export type AnimationFill = ValueOf<typeof AnimationFill>;

/** 触发器关键字联合（不含 { onEvent } 对象形态） */
export type AnimationTrigger = ValueOf<typeof AnimationTrigger>;

/** 校验缓动曲线名称或三次贝塞尔控制点四元组 */
export const EasingSchema = union([
  zodEnum(AnimationEasing),
  tuple([NormalizedFractionSchema, number(), NormalizedFractionSchema, number()]),
]).describe(
  'Easing curve: built-in easing name or cubic-bezier tuple [x1, y1, x2, y2]. Omitted fields use linear easing.',
);

/** 校验镜头位置与正数宽高 */
const animationViewBoxSchema = tuple([number(), number(), PositiveNumberSchema, PositiveNumberSchema]);

/** 校验归一化时间点上的绝对属性值及到下一帧的可选缓动 */
export const KeyframeSchema = strictObject({
  at: NormalizedFractionSchema.describe(
    'Normalized keyframe time. Keyframes in one track must be sorted by this field.',
  ),
  value: union([number(), CssColorSchema, animationViewBoxSchema]).describe(
    'Absolute property value at this keyframe. Value types are refined by the animation property.',
  ),
  easing: EasingSchema.optional().describe(
    'Easing from this keyframe to the next. Overrides track-level easing for that segment.',
  ),
}).describe('One animation keyframe: normalized time, absolute value, and optional segment easing.');

/** 校验通过运行时事件名称启动播放的触发描述 */
export const EventTriggerSchema = strictObject({
  onEvent: NonBlankStringSchema.describe('Runtime event name that starts playback. Only the event name enters the IR.'),
}).describe('Runtime event trigger descriptor.');

/** 校验加载、可见、手动或命名事件触发方式 */
export const TriggerSchema = union([zodEnum(AnimationTrigger), EventTriggerSchema]).describe(
  'Playback trigger: load, visible, manual, or a named runtime event. Omitted fields use load.',
);

/** 校验变换动画使用的命名锚点或元素局部坐标原点 */
export const OriginSchema = union([
  zodEnum({ ...CenterAnchor, ...Anchor }).describe(
    'Named transform pivot using the canonical node anchor vocabulary, resolved against the animated element.',
  ),
  tuple([number(), number()]).describe('Explicit transform pivot in element-local coordinates [x, y].'),
]).describe(
  'Transform pivot for scale, scaleX, scaleY, and rotate. Non-transform properties ignore it; omitted fields use the element center.',
);

/** 动画轨道共享的时序与触发配置 */
const animationTimingSchema = strictObject({
  duration: PositiveNumberSchema.describe('Duration of one animation iteration in milliseconds.'),
  delay: NonNegativeNumberSchema.optional().describe('Delay before playback starts, in milliseconds.'),
  easing: EasingSchema.optional().describe(
    'Default easing for keyframe segments without keyframe-level easing. Omitted fields use linear easing.',
  ),
  iterations: union([PositiveNumberSchema, literal('infinite')])
    .optional()
    .describe('Iteration count. Use "infinite" for endless playback. Omitted fields play once.'),
  direction: zodEnum(AnimationDirection)
    .optional()
    .describe('Playback direction for each iteration. Omitted fields use normal.'),
  fill: zodEnum(AnimationFill)
    .optional()
    .describe(
      'Value mode outside the active interval. Omitted fields use forwards so static rendering matches the settled value.',
    ),
  trigger: TriggerSchema.optional().describe('Playback trigger. Omitted fields use load.'),
  origin: OriginSchema.optional().describe(
    'Transform pivot for scale, scaleX, scaleY, and rotate. Other properties ignore it.',
  ),
});

/** 组合属性和值约束，保留属性与关键帧的类型关联 */
const createAnimationTrackSchema = <TProperty extends ZodType, TValue extends ZodType>(
  property: TProperty,
  value: TValue,
) =>
  strictObject({
    ...animationTimingSchema.shape,
    property: property.describe('Animation property that determines the keyframe value type and range.'),
    keyframes: array(KeyframeSchema.extend({ value }))
      .min(1)
      .refine(frames => frames.every((frame, index) => index === 0 || frame.at >= frames[index - 1].at), {
        message: 'keyframes must be sorted ascending by `at`',
      })
      .describe('Ordered keyframes with absolute values matching the animation property.'),
  });

/** 校验属性对应的关键帧值及轨道时序 */
export const AnimationTrackSchema = discriminatedUnion('property', [
  createAnimationTrackSchema(
    zodEnum([
      AnimationProperty.Opacity,
      AnimationProperty.FillOpacity,
      AnimationProperty.StrokeOpacity,
      AnimationProperty.PathDraw,
    ]),
    OpacitySchema,
  ),
  createAnimationTrackSchema(literal(AnimationProperty.StrokeWidth), StrokeWidthSchema),
  createAnimationTrackSchema(literal(AnimationProperty.DashOffset), StrokeDashOffsetSchema),
  createAnimationTrackSchema(zodEnum([AnimationProperty.Fill, AnimationProperty.Stroke]), CssColorSchema),
  createAnimationTrackSchema(
    zodEnum([
      AnimationProperty.TranslateX,
      AnimationProperty.TranslateY,
      AnimationProperty.Rotate,
      AnimationProperty.Scale,
      AnimationProperty.ScaleX,
      AnimationProperty.ScaleY,
    ]),
    number(),
  ),
  createAnimationTrackSchema(literal(AnimationProperty.ViewBox), animationViewBoxSchema),
]).describe('Declarative animation track with property-specific keyframe values and shared timing.');

/** 时间轴动画 track（renderer 无关、JSON 可序列化、无函数；keyframe 给绝对展示值、末帧 = 元素 base 终态） */
export type IRAnimationTrack = ZodInfer<typeof AnimationTrackSchema>;

/** 单个动画关键帧 */
export type IRKeyframe = ZodInfer<typeof KeyframeSchema>;

/** transform 支点（命名 anchor ∪ 局部坐标点；scale / scaleX / scaleY / rotate 用，缺省几何中心） */
export type IRAnimationOrigin = ZodInfer<typeof OriginSchema>;
