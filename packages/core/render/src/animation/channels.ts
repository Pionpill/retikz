/**
 * renderer 无关的动画通道工具：property 分类、transform 支点解析、描边判定
 * @description SVG（svg/animation）与 Canvas（canvas/drawScene）共用，避免两端通道语义漂移。
 */
import { AnimationProperty, type IRAnimationOrigin, type IRAnimationTrack, type ScenePrimitive } from '@retikz/core';

/** transform 类通道（落 transform，需支点 origin） */
const TRANSFORM_PROPERTIES = new Set<string>([
  AnimationProperty.TranslateX,
  AnimationProperty.TranslateY,
  AnimationProperty.Rotate,
  AnimationProperty.Scale,
  AnimationProperty.ScaleX,
  AnimationProperty.ScaleY,
]);

/** 通道分类：css 直属 / transform / pathDraw 揭示 / viewBox 镜头 / 自定义 */
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

/** rect/ellipse 的轴对齐包围盒（user units）；其余 prim 返回 undefined */
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
 * 解析 transform 支点为 user 坐标点（scale / scaleX / scaleY / rotate 用）
 * @description `[x,y]` 直用；命名 anchor 折算 rect/ellipse 的 bbox 点；origin 省略 → 几何中心（rect/ellipse）。
 *   prim 无可解析几何（text/path/group）或 anchor 不识别 → undefined（caller 退回各后端默认支点）。
 */
export const resolveTransformOrigin = (
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

/**
 * track 是否「自动播放」触发器（`load` / 缺省）
 * @description Canvas 后端按 trigger 过滤：rAF 共享时钟只施加 auto track；`visible` / `manual` / `{onEvent}`
 *   不被自动播（否则同元素的 manual track 会随 load track 一起跑，违 trigger 语义）。SVG 后端按元素 DOM
 *   逐 track 接 WAAPI / IO，不走本判定。Canvas 的 visible/manual/onEvent 通过 per-id 虚拟时钟激活。
 */
export const isAutoplayTrigger = (track: IRAnimationTrack): boolean =>
  track.trigger === undefined || track.trigger === 'load';
