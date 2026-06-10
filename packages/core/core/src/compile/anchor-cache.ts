/**
 * Anchor 解析统一入口 + per-layout WeakMap 缓存
 * @description
 *   `'A.<keyword>'`（north / east / north-east / top-left 等标准方位 anchor）与 `'A.<deg>'`（'30' / '-45' / '180.5' 等数字角度）
 *   两类 anchor 解析在 path / position 多处会反复触发同一 (layout, name) 组合。本模块把对各 shape 的
 *   `anchor()` / 数字角度 `boundaryPoint(toward=旋转后单位向量)` 调用统一收编到 `resolveAnchor(layout, name, boundary?)`，
 *   并按 `WeakMap<NodeLayout, Map<string, IRPosition>>` 缓存结果——
 *   单次 compile 内 layout 不可变 → cache 命中保证返回**严格相等**（`===`）的 IRPosition 引用。
 *   compile 结束 layout 引用释放，WeakMap entry 随 GC 一并回收。
 */

import type { Side } from '../geometry/edge';
import type { Position } from '../geometry/point';
import type { IRBoundary, IRPosition } from '../ir';
import { anchorOf, angleBoundaryOf } from './node';
import type { NodeLayout } from './node';
import { boundaryKey } from './boundary';

/**
 * (layout, anchorName) → IRPosition 缓存
 * @description WeakMap 让 NodeLayout 引用一旦失效（compile 结束、NameStack 回收），对应 Map 自动 GC，无需手动 invalidate
 */
const cache = new WeakMap<NodeLayout, Map<string, IRPosition>>();

/** 角度字符串识别：可选负号 + 数字 + 可选小数；与 parseTarget.ts 的 ANGLE_RE 同语义 */
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/**
 * 把 anchorName 解析到对应 shape 的 anchor / boundaryPoint 上
 * @description 数字字符串走 angleBoundaryOf；其余按标准方位 / shape-specific anchor 走 anchorOf；boundary 透传给两者
 */
const computeAnchor = (
  layout: NodeLayout,
  anchorName: string,
  boundary: IRBoundary | undefined,
): IRPosition => {
  if (ANGLE_RE.test(anchorName)) {
    const angle = Number(anchorName);
    return positionToIR(angleBoundaryOf(layout, angle, boundary));
  }
  // anchorOf 走 layout.shapeDef.anchor(rect, name)；shape 不认识的名字返回 undefined → anchorOf 抛 Unknown anchor。
  // 调用方（parseNodeRef）通常已先按标准方位 anchor 集合校验内置 anchor 名合法性
  return positionToIR(anchorOf(layout, anchorName, boundary));
};

/** geometry Position（含 readonly 形态）转 IRPosition 元组（IRPosition === [number, number]） */
const positionToIR = (p: Position): IRPosition => [p[0], p[1]];

/**
 * 取节点 anchor 的全局坐标，带 per-layout 缓存
 * @description name 接受方位 anchor 关键字（如 `'north'` / `'south-west'` / `'top-left'`）或数字角度字符串（如 `'30'` / `'-45'`）；
 *   boundary 指定连接面（默认 `'shape'`，即节点自身视觉轮廓）；不同 boundary 产生独立缓存条目，互不串扰；
 *   同一 (layout, name, boundary) 组合第二次起返回首调用结果的**同一引用**——上游可用 `===` 判定 cache 命中
 * @param layout 已 Pass 1 完成的 NodeLayout（rect 已是全局坐标）
 * @param anchorName 关键字或数字角度字符串
 * @param boundary 连接面，缺省为 `'shape'`（视觉轮廓）
 * @returns 全局坐标系下的 IRPosition `[x, y]`
 */
export const resolveAnchor = (
  layout: NodeLayout,
  anchorName: string,
  boundary: IRBoundary | undefined = 'shape',
): IRPosition => {
  let layoutCache = cache.get(layout);
  if (!layoutCache) {
    layoutCache = new Map<string, IRPosition>();
    cache.set(layout, layoutCache);
  }
  const key = `${boundaryKey(boundary)} ${anchorName}`;
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;
  const result = computeAnchor(layout, anchorName, boundary);
  layoutCache.set(key, result);
  return result;
};

/**
 * 取节点边上比例点 `{ side, t }` 的全局坐标，带 per-layout 缓存
 * @description 走 `layout.shapeDef.edgePoint`——shape 未实现（如自定义 shape）抛"does not support side anchors"；
 *   零尺寸 layout（Coordinate）抛错（边上比例点对一个点无意义，报错比退化中心更可诊断）。
 *   缓存 key = `${side}:${t}`，与命名 anchor（`'north'` / `'30'`）共用 layout 的 Map——key 含 `:` 故命名空间不冲突。
 * @param layout 已 Pass 1 完成的 NodeLayout（rect 已是全局坐标）
 * @returns 全局坐标系下的 IRPosition `[x, y]`
 */
export const resolveEdgePoint = (
  layout: NodeLayout,
  side: Side,
  t: number,
): IRPosition => {
  const { edgePoint } = layout.shapeDef;
  if (!edgePoint) {
    throw new Error(
      `shape '${layout.shapeName}' does not support side anchors ({ side, t })`,
    );
  }
  if (layout.rect.width === 0 && layout.rect.height === 0) {
    throw new Error(
      `{ side, t } is not meaningful on a zero-size Coordinate (shape '${layout.shapeName}')`,
    );
  }
  let layoutCache = cache.get(layout);
  if (!layoutCache) {
    layoutCache = new Map<string, IRPosition>();
    cache.set(layout, layoutCache);
  }
  const key = `${side}:${t}`;
  const cached = layoutCache.get(key);
  if (cached !== undefined) return cached;
  const result = positionToIR(edgePoint(layout.rect, side, t, layout.shapeParams ?? {}));
  layoutCache.set(key, result);
  return result;
};
