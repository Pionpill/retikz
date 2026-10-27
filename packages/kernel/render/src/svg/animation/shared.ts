/**
 * SVG 动画播放共享映射（纯函数）：property 分类、value→SVG、origin 支点解析、easing→CSS、prim 几何
 * @description CSS @keyframes（keyframes.ts）与 WAAPI 描述（waapi.ts）共用本模块，避免两端映射漂移
 */
import type { IRAnimationTrack, ScenePrimitive } from '@retikz/core';
import { AnimationProperty } from '@retikz/core';

import { classifyProperty, animationSkipReason, resolveTransformOrigin, sampleAnimationTrack } from '../../animation';

/** CSS 直属通道 → SVG/CSS 属性名（opacity / fill / stroke / stroke-width） */
const cssPropertyName = (property: IRAnimationTrack['property']): string => {
  switch (property) {
    case 'strokeWidth':
      return 'stroke-width';
    case 'fillOpacity':
      return 'fill-opacity';
    case 'strokeOpacity':
      return 'stroke-opacity';
    case 'dashOffset':
      return 'stroke-dashoffset';
    default:
      return property;
  }
};

/** transform 通道单值 → SVG transform 函数串（绕 transform-origin 支点，故不在此带支点坐标） */
export const transformValue = (property: string, value: number): string => {
  switch (property) {
    case AnimationProperty.TranslateX:
      return `translate(${value}px, 0)`;
    case AnimationProperty.TranslateY:
      return `translate(0, ${value}px)`;
    case AnimationProperty.Rotate:
      return `rotate(${value}deg)`;
    case AnimationProperty.Scale:
      return `scale(${value})`;
    case AnimationProperty.ScaleX:
      return `scale(${value}, 1)`;
    case AnimationProperty.ScaleY:
      return `scale(1, ${value})`;
    default:
      return 'none';
  }
};

/** 将缓动预设或贝塞尔控制点转换为 CSS timing-function */
const easingToCss = (easing: IRAnimationTrack['easing']): string =>
  Array.isArray(easing) ? `cubic-bezier(${easing.join(', ')})` : (easing ?? 'linear');

/** iterations → CSS animation-iteration-count 串（'infinite' 原样，数值转串，缺省 1） */
export const iterationsToCss = (iterations: number | 'infinite' | undefined): string =>
  iterations === undefined ? '1' : iterations === 'infinite' ? 'infinite' : String(iterations);

/** 单帧归一化形态：offset∈[0,1] + 该通道 CSS 值（+ 可选段内 easing） */
type ExpandedFrame = {
  /** 展开帧在单次轨道周期内的归一化位置 */
  offset: number;
  /** 当前 CSS 属性在此帧的序列化值 */
  value: string;
  /** 从此帧到下一帧的 CSS 缓动表达式 */
  easing?: string;
};

/** track 展开结果：CSS 属性名 + 帧列表 + 可选 transform 支点 / 一次性 setup 属性 */
export type ExpandedTrack = {
  /** 落点 CSS 属性（opacity / fill / stroke / stroke-width / transform / stroke-dashoffset） */
  cssProperty: string;
  /** 归一化帧（升序 offset） */
  frames: Array<ExpandedFrame>;
  /** transform 通道的支点（`transform-origin` 值，user 坐标 px），无法解析时省略 */
  transformOrigin?: string;
  /** 一次性需写到元素上的静态属性（pathDraw 的 pathLength / stroke-dasharray） */
  setupAttrs?: Record<string, string | number>;
};

/** 跳过原因（caller 据此 warn 并降级到 base） */
type ExpandSkip = {
  /** 当前轨道无法展开为 CSS 动画时的诊断原因 */
  skip: string;
};

const asNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value));

/**
 * 把一条 track 展开成 SVG 可消费的归一化帧（CSS @keyframes / WAAPI 共用）
 * @description 内置通道按类型映射：css 直属（opacity/fill/stroke/stroke-width）/ transform（合成串 + 支点）/
 *   pathDraw（stroke-dashoffset 1→0 + pathLength/dasharray setup）；fill/stroke 在 oklch 空间预采样成多帧。
 *   返回 `{ skip }` 表示该 track 不适用于当前元素（如 pathDraw 无描边），caller warn + 跳过
 */
export const expandTrack = (track: IRAnimationTrack, prim: ScenePrimitive): ExpandedTrack | ExpandSkip => {
  const cls = classifyProperty(track.property);
  const reason = animationSkipReason(prim, track);
  if (reason !== undefined) return { skip: reason };

  // 变换通道把有效缓动交给每个关键帧区间；采样通道已应用缓动，只在线性区间内播放
  const ease = (kf: IRAnimationTrack['keyframes'][number]): { easing?: string } => ({
    easing: easingToCss(kf.easing ?? track.easing),
  });

  if (cls === 'css') {
    return {
      cssProperty: cssPropertyName(track.property),
      frames: sampleAnimationTrack(track).map(frame => ({
        offset: frame.offset,
        value: String(frame.value),
        easing: 'linear',
      })),
    };
  }

  if (cls === 'transform') {
    const origin = resolveTransformOrigin(prim, track.origin);
    return {
      cssProperty: 'transform',
      frames: track.keyframes.map(kf => ({
        offset: kf.at,
        value: transformValue(track.property, asNumber(kf.value)),
        ...ease(kf),
      })),
      ...(origin ? { transformOrigin: `${origin[0]}px ${origin[1]}px` } : {}),
    };
  }

  if (cls === 'pathDraw') {
    // stroke-dashoffset 1→0 揭示（value 0..1 → offset 1-value），pathLength=1 归一化弧长
    return {
      cssProperty: 'stroke-dashoffset',
      frames: sampleAnimationTrack(track).map(frame => ({
        offset: frame.offset,
        value: String(1 - Number(frame.value)),
        easing: 'linear',
      })),
      setupAttrs: { pathLength: 1, 'stroke-dasharray': 1 },
    };
  }

  // viewBox（镜头）只在 scene 根合法，由 document 的 camera 通路处理、不经元素级 expand
  return { skip: `property "${track.property}" cannot be expanded at element level` };
};
