import type { IRBoundary, IRJsonObject } from '../../schemas';
import type { Position } from '../../shared/geometry';
import type { Rect } from '../../shared/geometry';
import type { NodeLayout } from './types';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { CenterAnchor, isAnchor } from '../../shared';
import { DEG_TO_RAD } from '../../shared/geometry';
import { fallbackBoundaryAnchor, resolveBoundary } from '../boundary';

/** 无参 / 合成 layout 的 shape params 兜底（避免每次调用重建空对象） */
const EMPTY_SHAPE_PARAMS: IRJsonObject = {};

/** 把 Rect 各方向外扩 m（margin generic：所有 shape 都 w+2m, h+2m，由 boundaryPointOf 调用前膨胀） */
const inflateRect = (r: Rect, m: number): Rect =>
  m === 0 ? r : { x: r.x, y: r.y, width: r.width + 2 * m, height: r.height + 2 * m, rotate: r.rotate };

/**
 * 视觉 rect 外扩 outerSep（margin）得到外边界 AABB
 * @description = `inflateRect(layout.rect, layout.margin)`，中心不变、四向各 +margin。border 类
 *   anchor（标准方位 / 数字角度）解析与 bbox / viewBox / 布局占位都基于这层；视觉 emit / 裁剪 /
 *   形状专属 anchor / edgePoint / label 附着点仍读 `layout.rect`（不外扩）。单一派生量，不另存字段。
 *   （对齐 TikZ outer sep 语义。）
 */
export const outerRectOf = (layout: NodeLayout): Rect => inflateRect(layout.rect, layout.margin);

/**
 * 取节点 shape 在 toward 方向的附着点（path 端点贴边用）
 * @description 走连接面（boundary）对应的 def.boundaryPoint；margin > 0 时先膨胀外接 Rect，让 path 在 border 外停 margin。
 *   boundary 缺省 = 'shape'（视觉形状自身），与改前行为一致。
 */
export const boundaryPointOf = (
  layout: NodeLayout,
  toward: Position,
  boundary: IRBoundary | undefined = 'shape',
): Position => {
  const { def, rect, params } = resolveBoundary(
    boundary,
    layout.shapeDef,
    layout.rect,
    layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
    layout.shapes,
    layout.boundaries ?? resolveBoundaryRegistry(),
  );
  return def.boundaryPoint(inflateRect(rect, layout.margin), toward, params);
};

/**
 * 取节点 shape 命名 anchor（center / top / right / top-right）
 * @description 纯几何：在传入的 `layout.rect` 上求点，本体**不施加 outerSep（margin）**。outerSep 的
 *   「border 外推」由调用方决定——`anchor-cache.ts` 的标准方位解析先把 rect 外扩 margin（`outerRectOf`）
 *   再调本函数；`labelBorderPoint` 喂视觉 rect（label 附着点不含 margin）。这样 outer sep 只作用于
 *   path / position 的 anchor 引用，不波及 label。
 *   标准方位名：默认连接面先走视觉 shape 自身方位几何（ellipse/circle 落真实周长、polygon/rect 落 AABB，与 TikZ 一致），shape 未实现则回退 AABB 矩形；显式 boundary 按其解析。
 *   形状专属命名 anchor（tip-N / apex 等非标准方位名）恒走视觉形状自身，boundary 不影响。
 *   boundary 缺省 = 'shape'。
 */
export const anchorOf = (layout: NodeLayout, name: string, boundary: IRBoundary | undefined = 'shape'): Position => {
  if (isAnchor(name)) {
    if (name === CenterAnchor.Center) {
      const own = layout.shapeDef.anchor(
        layout.rect,
        CenterAnchor.Center,
        layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
      );
      return own ?? [layout.rect.x, layout.rect.y];
    }

    // 标准方位名：默认连接面（'shape'）先走视觉 shape 自身 anchor——ellipse/circle 落真实周长、
    // rectangle/polygon 落 AABB（与 TikZ 一致）；shape 未实现标准方位（star/sector/arc 返回 undefined）
    // 回退外接 AABB 矩形。显式 boundary 指定时按该连接面解析。
    if (boundary === 'shape') {
      const own = layout.shapeDef.anchor(layout.rect, name, layout.shapeParams ?? EMPTY_SHAPE_PARAMS);
      if (own !== undefined) return own;
      const fallback = resolveBoundary(
        'rectangle',
        layout.shapeDef,
        layout.rect,
        layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
        layout.shapes,
        layout.boundaries ?? resolveBoundaryRegistry(),
      );
      const p = fallback.def.anchor?.(fallback.rect, name, fallback.params);
      if (p === undefined) throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
      return p;
    }
    const { def, rect, params } = resolveBoundary(
      boundary,
      layout.shapeDef,
      layout.rect,
      layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
      layout.shapes,
      layout.boundaries ?? resolveBoundaryRegistry(),
    );
    const p = def.anchor?.(rect, name, params) ?? fallbackBoundaryAnchor(rect, name, params);
    if (p === undefined) throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
    return p;
  }
  // 形状专属命名 anchor（tip-N / outer-arc-mid / apex 等）：恒走视觉形状，boundary 不影响
  const p = layout.shapeDef.anchor(layout.rect, name, layout.shapeParams ?? EMPTY_SHAPE_PARAMS);
  if (p === undefined) {
    throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
  }
  return p;
};

/**
 * 取节点 shape 在指定角度方向的边界点
 * @description 角度是节点**局部坐标系**下的极角（度数：0°=局部 +x，90°=局部 +y）。layout.rect.rotate 把局部基绕中心旋转，得到世界系下的视觉方向；shape boundaryPoint 内部用 rotate-aware 投影，所以这里把局部 (cos, sin) 经 rect.rotate 旋转后加到中心当作世界系 toward 传入。本体**不施加 margin（同 anchorOf）**——outerSep 外推由 `anchor-cache.ts` 调用方喂 `outerRectOf` 实现；用于 `'A.30'` 落点。
 *   boundary 缺省 = 'shape'（视觉形状自身）。
 */
export const angleBoundaryOf = (
  layout: NodeLayout,
  angleDeg: number,
  boundary: IRBoundary | undefined = 'shape',
): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  const lx = Math.cos(rad);
  const ly = Math.sin(rad);
  const rot = layout.rect.rotate ?? 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  // 局部 (lx, ly) → 世界方向 (lx*cos - ly*sin, lx*sin + ly*cos)；toward 距离任意，boundaryPoint 只用方向
  const toward: Position = [layout.rect.x + lx * cosR - ly * sinR, layout.rect.y + lx * sinR + ly * cosR];
  const { def, rect, params } = resolveBoundary(
    boundary,
    layout.shapeDef,
    layout.rect,
    layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
    layout.shapes,
    layout.boundaries ?? resolveBoundaryRegistry(),
  );
  return def.boundaryPoint(rect, toward, params);
};
