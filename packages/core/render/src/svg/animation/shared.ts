/**
 * SVG 动画播放共享映射（纯函数）：property 分类、value→SVG、origin 支点解析、easing→CSS、prim 几何
 * @description CSS @keyframes（keyframes.ts）与 WAAPI 描述（waapi.ts）共用本模块，避免两端映射漂移。
 */
import { AnimationProperty, type IRAnimationOrigin, type IRAnimationTrack, type ScenePrimitive } from '@retikz/core';
import type { CubicBezier, EasingRegistry } from '../../animation/types';
import { sampleColorOklch } from '../../animation/oklch';

/** transform 类通道（落 SVG `transform`，需 wrapper `<g>` + transform-origin 支点） */
const TRANSFORM_PROPERTIES = new Set<string>([
  AnimationProperty.TranslateX,
  AnimationProperty.TranslateY,
  AnimationProperty.Rotate,
  AnimationProperty.Scale,
  AnimationProperty.ScaleX,
  AnimationProperty.ScaleY,
]);

/** 通道分类：决定走 CSS 直属属性 / wrapper transform / pathDraw 描边揭示 / viewBox 镜头 / 自定义 */
export type PropertyClass = 'css' | 'transform' | 'pathDraw' | 'viewBox' | 'custom';

/** 把 property 名归类 */
export const classifyProperty = (property: string): PropertyClass => {
  if (TRANSFORM_PROPERTIES.has(property)) return 'transform';
  if (property === AnimationProperty.PathDraw) return 'pathDraw';
  if (property === AnimationProperty.ViewBox) return 'viewBox';
  if (
    property === AnimationProperty.Opacity ||
    property === AnimationProperty.Fill ||
    property === AnimationProperty.Stroke ||
    property === AnimationProperty.StrokeWidth
  ) {
    return 'css';
  }
  return 'custom';
};

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

/** rect/ellipse 的轴对齐包围盒（user units）；其余 prim 返回 undefined（origin 无法按 anchor 解析） */
const primBBox = (prim: ScenePrimitive): { x: number; y: number; w: number; h: number } | undefined => {
  if (prim.type === 'rect') return { x: prim.x, y: prim.y, w: prim.width, h: prim.height };
  if (prim.type === 'ellipse') return { x: prim.cx - prim.rx, y: prim.cy - prim.ry, w: 2 * prim.rx, h: 2 * prim.ry };
  return undefined;
};

/** 9 命名 anchor（复用 node 词汇）→ bbox 上的点 */
const anchorOnBBox = (
  name: string,
  bbox: { x: number; y: number; w: number; h: number },
): [number, number] | undefined => {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  const left = bbox.x;
  const right = bbox.x + bbox.w;
  const top = bbox.y;
  const bottom = bbox.y + bbox.h;
  switch (name) {
    case 'center': return [cx, cy];
    case 'north': return [cx, top];
    case 'south': return [cx, bottom];
    case 'east': return [right, cy];
    case 'west': return [left, cy];
    case 'north-east': return [right, top];
    case 'north-west': return [left, top];
    case 'south-east': return [right, bottom];
    case 'south-west': return [left, bottom];
    default: return undefined;
  }
};

/**
 * 解析 transform 支点为 user 坐标点
 * @description `[x,y]` 直用；命名 anchor 折算 rect/ellipse 的 bbox 点；origin 省略 → 几何中心（rect/ellipse）。
 *   prim 无可解析几何（text/path/group）或 anchor 不识别 → 返回 undefined（caller 退回 CSS 默认支点）。
 */
export const resolveOrigin = (
  prim: ScenePrimitive,
  origin: IRAnimationOrigin | undefined,
): [number, number] | undefined => {
  if (Array.isArray(origin)) return [origin[0], origin[1]];
  const bbox = primBBox(prim);
  if (!bbox) return undefined;
  if (origin === undefined) return [bbox.x + bbox.w / 2, bbox.y + bbox.h / 2];
  return anchorOnBBox(origin, bbox);
};

/** prim 是否带描边（pathDraw 揭示需描边） */
export const primHasStroke = (prim: ScenePrimitive): boolean =>
  'stroke' in prim && prim.stroke !== undefined && prim.stroke !== 'none';

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
    const origin = resolveOrigin(prim, track.origin);
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
