/**
 * 交互触发 track → WAAPI descriptor（runtime 消费的纯 JSON 数据）
 * @description `visible` / `manual` / `{onEvent}` 的 track 在 SSR 字符串里不自播；descriptor 挂到元素
 *   `data-retikz-anim`，runtime 读它调 `element.animate(keyframes, timing)` 并按 trigger 接驱动
 */
import type { IRAnimationTrack } from '@retikz/core';

import type { EasingRegistry } from '../../animation';
import type { ExpandedTrack } from './shared';
import { easingToCss } from './shared';

/** WAAPI keyframe：offset + 该 CSS 属性值（camelCase 键，直接喂 element.animate）+ 可选段 easing */
export type WaapiKeyframe = {
  /** 关键帧在单次动画周期内的归一化位置 */
  offset: number;
  /** 从当前帧到下一帧使用的 CSS 缓动表达式 */
  easing?: string;
} & Record<string, string | number>;

/** WAAPI timing options（直接喂 element.animate 第二参；iterations 'infinite' 由 runtime 转 Infinity） */
export type WaapiTiming = {
  /** 单次动画周期时长，单位为毫秒 */
  duration: number;
  /** 播放前等待时间，单位为毫秒 */
  delay?: number;
  /** 轨道级 CSS 缓动表达式 */
  easing: string;
  /** 播放次数；infinite 在宿主执行前转换为 Infinity */
  iterations: number | 'infinite';
  /** 每个动画周期的正向、反向或交替播放方式 */
  direction?: string;
  /** 动画活动区间之外的样式保留方式 */
  fill: string;
};

/** runtime 消费的交互动画描述（一条 track 一个） */
export type WaapiDescriptor = {
  /** 原始 IR property（诊断用） */
  property: string;
  /** WAAPI keyframes（element.animate 第一参） */
  keyframes: Array<WaapiKeyframe>;
  /** WAAPI timing（element.animate 第二参） */
  timing: WaapiTiming;
  /** 触发器：visible / manual / { onEvent } */
  trigger:
    | 'visible'
    | 'manual'
    | {
        /** 由宿主监听、用于启动本轨道的事件名称 */
        onEvent: string;
      };
  /** transform 通道支点（runtime 写 element.style.transformOrigin + transformBox） */
  transformOrigin?: string;
};

/** kebab CSS 属性名 → WAAPI camelCase（stroke-width→strokeWidth、stroke-dashoffset→strokeDashoffset） */
const toCamel = (cssProperty: string): string => cssProperty.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** track.trigger（非 load）→ descriptor trigger 形态 */
const toDescriptorTrigger = (trigger: IRAnimationTrack['trigger']): WaapiDescriptor['trigger'] => {
  if (trigger === 'visible' || trigger === 'manual') return trigger;
  if (trigger && typeof trigger === 'object') return { onEvent: trigger.onEvent };
  return 'manual';
};

/** 展开后的交互 track → WAAPI descriptor */
export const buildWaapiDescriptor = (
  expanded: ExpandedTrack,
  track: IRAnimationTrack,
  registry: EasingRegistry | undefined,
  onWarn: (message: string) => void,
): WaapiDescriptor => {
  const key = toCamel(expanded.cssProperty);
  const keyframes: Array<WaapiKeyframe> = expanded.frames.map(frame => ({
    offset: frame.offset,
    [key]: frame.value,
    ...(frame.easing ? { easing: frame.easing } : {}),
  }));

  return {
    property: track.property,
    keyframes,
    timing: {
      duration: track.duration,
      ...(track.delay !== undefined ? { delay: track.delay } : {}),
      easing: easingToCss(track.easing, registry, onWarn),
      iterations: track.iterations ?? 1,
      ...(track.direction !== undefined ? { direction: track.direction } : {}),
      fill: track.fill ?? 'forwards',
    },
    trigger: toDescriptorTrigger(track.trigger),
    ...(expanded.transformOrigin ? { transformOrigin: expanded.transformOrigin } : {}),
  };
};
