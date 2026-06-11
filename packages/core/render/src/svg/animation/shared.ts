/**
 * SVG 动画播放共享映射（纯函数）：property 分类、value→SVG、origin 支点解析、easing→CSS、prim 几何
 * @description CSS @keyframes（keyframes.ts）与 WAAPI 描述（waapi.ts）共用本模块，避免两端映射漂移。
 */
import { AnimationProperty, type IRAnimationTrack, type ScenePrimitive } from '@retikz/core';
import type { CubicBezier, EasingRegistry } from '../../animation/types';
import { sampleColorOklch } from '../../animation/oklch';
import { classifyProperty, primHasStroke, resolveTransformOrigin } from '../../animation/channels';

/** CSS 直属通道 → SVG/CSS 属性名（opacity / fill / stroke / stroke-width） */
export const cssPropertyName = (property: string): string =>
  property === AnimationProperty.StrokeWidth ? 'stroke-width' : property;

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

const CSS_NAMED_EASINGS = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']);

/**
 * easing → CSS timing-function 串
 * @description 内置具名 / cubic-bezier 四元组直转；自定义注册名查 registry（bezier 形式可进 CSS，函数形式
 *   进不了 CSS → warn + linear）；未注册名 → warn + linear。
 */
export const easingToCss = (
  easing: string | CubicBezier | undefined,
  registry: EasingRegistry | undefined,
  onWarn: (message: string) => void,
): string => {
  if (easing === undefined) return 'linear';
  if (Array.isArray(easing)) return `cubic-bezier(${easing.join(', ')})`;
  if (CSS_NAMED_EASINGS.has(easing)) return easing;
  const custom = registry?.[easing];
  if (Array.isArray(custom)) return `cubic-bezier(${custom.join(', ')})`;
  if (typeof custom === 'function') {
    onWarn(`SVG animation: custom easing "${easing}" is a function and cannot be expressed in CSS; falling back to linear.`);
    return 'linear';
  }
  onWarn(`SVG animation: unknown easing "${easing}"; falling back to linear.`);
  return 'linear';
};

/** iterations → CSS animation-iteration-count 串（'infinite' 原样，数值转串，缺省 1） */
export const iterationsToCss = (iterations: number | 'infinite' | undefined): string =>
  iterations === undefined ? '1' : iterations === 'infinite' ? 'infinite' : String(iterations);

/** oklch 颜色预采样段数（每个 keyframe 段内插出的中间帧数） */
const COLOR_SAMPLES = 8;

/** 单帧归一化形态：offset∈[0,1] + 该通道 CSS 值（+ 可选段内 easing） */
export type ExpandedFrame = { offset: number; value: string; easing?: string };

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
export type ExpandSkip = { skip: string };

const asNumber = (value: unknown): number => (typeof value === 'number' ? value : Number(value));
const asColor = (value: unknown): string => (typeof value === 'string' ? value : String(value));

/**
 * 把一条 track 展开成 SVG 可消费的归一化帧（CSS @keyframes / WAAPI 共用）
 * @description 内置通道按类型映射：css 直属（opacity/fill/stroke/stroke-width）/ transform（合成串 + 支点）/
 *   pathDraw（stroke-dashoffset 1→0 + pathLength/dasharray setup）；fill/stroke 在 oklch 空间预采样成多帧。
 *   返回 `{ skip }` 表示该 track 无法在 SVG 表达（自定义无映射 / pathDraw 无描边），caller warn + 跳过。
 */
export const expandTrack = (
  track: IRAnimationTrack,
  prim: ScenePrimitive,
): ExpandedTrack | ExpandSkip => {
  const cls = classifyProperty(track.property);
  if (cls === 'custom') return { skip: `custom property "${track.property}" has no built-in SVG mapping` };
  if (cls === 'pathDraw' && !primHasStroke(prim)) return { skip: 'pathDraw requires a stroked element' };

  if (cls === 'css') {
    const cssProperty = cssPropertyName(track.property);
    const isColor = track.property === AnimationProperty.Fill || track.property === AnimationProperty.Stroke;
    if (!isColor) {
      return { cssProperty, frames: track.keyframes.map(kf => ({ offset: kf.at, value: String(asNumber(kf.value)) })) };
    }
    // 颜色：相邻 keyframe 段在 oklch 预采样成多帧
    const frames: Array<ExpandedFrame> = [];
    track.keyframes.forEach((kf, index) => {
      if (index === 0) {
        frames.push({ offset: kf.at, value: asColor(kf.value) });
        return;
      }
      const prev = track.keyframes[index - 1];
      const samples = sampleColorOklch(asColor(prev.value), asColor(kf.value), COLOR_SAMPLES);
      for (let s = 1; s <= COLOR_SAMPLES; s++) {
        frames.push({ offset: prev.at + ((kf.at - prev.at) * s) / COLOR_SAMPLES, value: samples[s], easing: 'linear' });
      }
    });
    return { cssProperty, frames };
  }

  if (cls === 'transform') {
    const origin = resolveTransformOrigin(prim, track.origin);
    return {
      cssProperty: 'transform',
      frames: track.keyframes.map(kf => ({ offset: kf.at, value: transformValue(track.property, asNumber(kf.value)) })),
      ...(origin ? { transformOrigin: `${origin[0]}px ${origin[1]}px` } : {}),
    };
  }

  if (cls === 'pathDraw') {
    // stroke-dashoffset 1→0 揭示（value 0..1 → offset 1-value），pathLength=1 归一化弧长
    return {
      cssProperty: 'stroke-dashoffset',
      frames: track.keyframes.map(kf => ({ offset: kf.at, value: String(1 - asNumber(kf.value)) })),
      setupAttrs: { pathLength: 1, 'stroke-dasharray': 1 },
    };
  }

  // viewBox（镜头）只在 scene 根合法，由 document 的 camera 通路处理、不经元素级 expand
  return { skip: `property "${track.property}" cannot be expanded at element level` };
};
