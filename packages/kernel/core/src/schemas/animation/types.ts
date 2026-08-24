import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type {
  AnimationDirection,
  AnimationEasing,
  AnimationFill,
  AnimationProperty,
  AnimationTrigger,
} from './constants';
import type { AnimationTrackSchema, KeyframeSchema, OriginSchema, TriggerSchema } from './schema';

/** 时间轴动画 track（renderer 无关、JSON 可序列化、无函数；keyframe 给绝对展示值、末帧 = 元素 base 终态） */
export type IRAnimationTrack = ZodInfer<typeof AnimationTrackSchema>;

/** 单个动画关键帧 */
export type IRKeyframe = ZodInfer<typeof KeyframeSchema>;

/** transform 支点（命名 anchor ∪ 局部坐标点；scale / scaleX / scaleY / rotate 用，缺省几何中心） */
export type IRAnimationOrigin = ZodInfer<typeof OriginSchema>;

/** 动画播放触发器（load / visible / manual / { onEvent }） */
export type IRAnimationTrigger = ZodInfer<typeof TriggerSchema>;

/** 内置可动画属性通道名联合 */
export type AnimationPropertyValue = ValueOf<typeof AnimationProperty>;

export type BuiltinAnimationProperty = AnimationPropertyValue;

/** 属性名：内置 ∪ 任意自定义字符串（`& {}` 保内置自动补全，同 NodeShape 范式）；自定义通道由后续 renderer 注册的插值器解释 */
export type AnimationPropertyRef = BuiltinAnimationProperty | (string & {});

/** 缓动预设名联合 */
export type AnimationEasingValue = ValueOf<typeof AnimationEasing>;

/** 播放方向名联合 */
export type AnimationDirectionValue = ValueOf<typeof AnimationDirection>;

/** 填充模式名联合 */
export type AnimationFillValue = ValueOf<typeof AnimationFill>;

/** 触发器关键字联合（不含 { onEvent } 对象形态） */
export type AnimationTriggerValue = ValueOf<typeof AnimationTrigger>;
