import type { z } from 'zod';
import type { AnimationTrackSchema, KeyframeSchema, OriginSchema, TriggerSchema } from './schema';

/** 时间轴动画 track（renderer 无关、JSON 可序列化、无函数；keyframe 给绝对展示值、末帧 = 元素 base 终态） */
export type IRAnimationTrack = z.infer<typeof AnimationTrackSchema>;

/** 单个动画关键帧 */
export type IRKeyframe = z.infer<typeof KeyframeSchema>;

/** transform 支点（命名 anchor ∪ 局部坐标点；scale / scaleX / scaleY / rotate 用，缺省几何中心） */
export type IRAnimationOrigin = z.infer<typeof OriginSchema>;

/** 动画播放触发器（load / visible / manual / { onEvent }） */
export type IRAnimationTrigger = z.infer<typeof TriggerSchema>;
