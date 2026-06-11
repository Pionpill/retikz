import type { ClipShape, Scene, ScenePrimitive } from '@retikz/core';
import { DEG_TO_RAD, applyTransform, buildClipPath, buildPath, roundedRectPath } from './pathGeometry';

/** hitTest 命中点（Scene user units 坐标系） */
export type HitPoint = {
  /** Scene user units 横坐标 */
  x: number;
  /** Scene user units 纵坐标 */
  y: number;
};

/** hitTest 选项 */
export type HitTestOptions = {
  /**
   * 描边命中容差（user units）
   * @description fill='none' / 透明填充的图元只有描边线可命中；判定时按 strokeTolerance 加宽描边宽度。
   *   缺省按图元自身 strokeWidth/2。
   */
  strokeTolerance?: number;
  /**
   * hitTest 复用的 2D context（路径构建 + isPointInPath / isPointInStroke）
   * @description 即时模式无逐图元 DOM，命中靠把每个图元的几何重建进一个 2D context 后调原生点测。
   *   生产环境由挂载方（vanilla mountCanvas / react CanvasHost）传入已有 `<canvas>` 的 context；
   *   缺省时实现自建离屏 context（无 canvas 环境则无法点测）。
   */
  context2d?: CanvasRenderingContext2D;
};

/**
 * 解析 hitTest 用的 2D context：优先用调用方传入的 context2d，否则尝试自建离屏 canvas
 * @description 无传入且无 canvas 环境（如 SSR）时返回 null，hitTest 直接判定为无命中。
 */
const resolveContext = (options: HitTestOptions | undefined): CanvasRenderingContext2D | null => {
  if (options?.context2d !== undefined) return options.context2d;
  if (typeof document === 'undefined') return null;
  return document.createElement('canvas').getContext('2d');
};

/** 在当前 context 上构建图元自身的填充 / 点测路径（transform 已由调用方压栈）；text 无路径返回 false */
const buildPrimPath = (ctx: CanvasRenderingContext2D, prim: ScenePrimitive): boolean => {
  switch (prim.type) {
    case 'rect':
      roundedRectPath(ctx, prim.x, prim.y, prim.width, prim.height, prim.cornerRadius);
      return true;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(prim.cx, prim.cy, prim.rx, prim.ry, (prim.rotate ?? 0) * DEG_TO_RAD, 0, Math.PI * 2);
      return true;
    case 'path':
      buildPath(ctx, prim.commands);
      return true;
    case 'text':
    case 'group':
      return false;
  }
};

/** 该图元的填充是否可命中（fill 存在且非 'none'） */
const hasFill = (prim: ScenePrimitive): boolean => {
  if (prim.type === 'text' || prim.type === 'group') return false;
  const { fill } = prim;
  return fill !== undefined && fill !== 'none';
};

/**
 * 单图元点测：在当前 transform 栈下构建几何，先填充区（hasFill）再描边线判定
 * @description 描边半宽 = strokeTolerance ?? strokeWidth/2；context isPointInStroke 用 lineWidth/2 作半宽，故 lineWidth = 2×半宽。
 */
const hitPrim = (
  ctx: CanvasRenderingContext2D,
  prim: ScenePrimitive,
  point: HitPoint,
  strokeTolerance: number | undefined,
): boolean => {
  if (!buildPrimPath(ctx, prim)) return false;
  if (hasFill(prim) && ctx.isPointInPath(point.x, point.y)) return true;
  if (prim.type === 'text' || prim.type === 'group') return false;
  const hasStroke = prim.stroke !== undefined && prim.stroke !== 'none';
  if (!hasStroke) return false;
  const halfWidth = strokeTolerance ?? (prim.strokeWidth ?? 0) / 2;
  if (halfWidth <= 0) return false;
  ctx.lineWidth = 2 * halfWidth;
  return ctx.isPointInStroke(point.x, point.y);
};

/** 点是否落在 group 的裁剪区内（无裁剪 → 恒 true；裁剪资源缺失 → 按不裁处理） */
const insideClip = (
  ctx: CanvasRenderingContext2D,
  shape: ClipShape | undefined,
  point: HitPoint,
): boolean => {
  if (shape === undefined) return true;
  buildClipPath(ctx, shape);
  return ctx.isPointInPath(point.x, point.y);
};

/**
 * Canvas 命中测试：把 Scene 坐标点定位到最上层 id-bearing 图元
 * @description 逆 z-order（后画的在上）重走 Scene，复用 drawScene 几何 + 原生 isPointInPath（填充区）/
 *   isPointInStroke（描边线，按 strokeTolerance 加宽）判定；命中即返回该图元或其最近 id-bearing 祖先（group）
 *   的 id，空白处返回 null。函数不进 IR、纯 runtime 定位层。
 */
export const hitTest = (
  scene: Scene,
  point: HitPoint,
  options?: HitTestOptions,
): string | null => {
  const ctx = resolveContext(options);
  if (ctx === null) return null;
  const strokeTolerance = options?.strokeTolerance;
  const clipResources = new Map(
    (scene.resources ?? []).flatMap(r => (r.kind === 'clip' ? [[r.id, r.shape] as const] : [])),
  );

  // 逆 z-order：后画的在上，先测最后画的；命中即返回最近 id-bearing 祖先 id。
  const walk = (prim: ScenePrimitive, nearestId: string | undefined): string | null => {
    const selfId = prim.id ?? nearestId;
    if (prim.type === 'group') {
      ctx.save();
      for (const transform of prim.transforms ?? []) applyTransform(ctx, transform);
      const shape = prim.clipRef !== undefined ? clipResources.get(prim.clipRef) : undefined;
      if (!insideClip(ctx, shape, point)) {
        ctx.restore();
        return null;
      }
      let result: string | null = null;
      for (let i = prim.children.length - 1; i >= 0; i--) {
        result = walk(prim.children[i], selfId);
        if (result !== null) break;
      }
      ctx.restore();
      return result;
    }
    return hitPrim(ctx, prim, point, strokeTolerance) ? selfId ?? null : null;
  };

  for (let i = scene.primitives.length - 1; i >= 0; i--) {
    const result = walk(scene.primitives[i], undefined);
    if (result !== null) return result;
  }
  return null;
};
