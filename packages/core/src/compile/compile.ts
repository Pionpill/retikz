import { rect as rectOps } from '../geometry/rect';
import type { IR, IRPosition } from '../ir';
import type { Scene, ScenePrimitive } from '../primitive';
import { type NodeLayout, emitNodePrimitives, layoutNode } from './node';
import { emitPathPrimitive } from './path';
import { resolvePosition } from './position';
import { DEFAULT_PRECISION, makeRound } from './precision';
import { type TextMeasurer, fallbackMeasurer } from './text-metrics';
import { computeViewBox } from './view-box';

/**
 * 把 coordinate 注册成最小 NodeLayout——0×0 rectangle，用于
 * 后续 path target / `at.of` 引用时 boundaryPoint 命中（0×0 rect
 * 的 boundaryPoint 始终返回中心，符合"占位无形状边界"语义）。
 */
const coordinateAsLayout = (
  id: string,
  center: IRPosition,
): NodeLayout => ({
  id,
  shape: 'rectangle',
  rect: { x: center[0], y: center[1], width: 0, height: 0, rotate: 0 },
  rotateDeg: 0,
  margin: 0,
  textWidth: 0,
  textHeight: 0,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
});

/** compileToScene 的可选参数 */
export type CompileOptions = {
  /** 注入文字度量函数；不传则用 fallback（不准但可跑） */
  measureText?: TextMeasurer;
  /** viewBox 周围的留白（user units），默认 10 */
  padding?: number;
  /**
   * 输出坐标的小数位精度；默认 2（保留 2 位小数四舍五入）。
   * 仅在写入 Scene primitive / path d 字符串 / viewBox 时生效；
   * 内部几何计算保持完整 double 精度，避免误差累积。
   */
  precision?: number;
  /**
   * 相对定位（AtPosition）的默认距离，对应 TikZ `node distance`；user units。
   * 当 `Node.position` 是 `{ direction, of }` 形态且未自带 `distance` 时取此值；
   * 未配则回退到 1。
   */
  nodeDistance?: number;
};

/**
 * IR → Scene。纯函数。
 * 这是所有 adapter 共享的最深层共享代码。
 *
 * 流程：
 * 1. Pass 1：按 IR children 源码顺序处理 Node——计算 layout、注册 nodeIndex、发出 RectPrim/TextPrim、累积 bbox 角点
 * 2. Pass 2：处理 Path——解析每个 step 端点（节点 ref 走 boundaryPoint，其他走 resolvePosition），写 d 字符串
 * 3. 末端用 computeViewBox 折算最终 viewBox（按 precision 四舍五入）
 */
export const compileToScene = (ir: IR, options: CompileOptions = {}): Scene => {
  const measureText = options.measureText ?? fallbackMeasurer;
  const viewBoxPadding = options.padding ?? 10;
  const round = makeRound(options.precision ?? DEFAULT_PRECISION);
  const nodeDistance = options.nodeDistance;

  const primitives: Array<ScenePrimitive> = [];
  const nodeIndex = new Map<string, NodeLayout>();
  const allPoints: Array<IRPosition> = [];

  // Pass 1: 节点布局 → 注册到 nodeIndex 并发出节点 primitive
  // 按 IR children 源码顺序处理；polar.origin 引用其他节点 id 时，要求被引用节点先定义。
  // coordinate 与 node 在同一 pass 处理：coordinate 不发 primitive、不扩 bbox，
  // 但同样注册到 nodeIndex 让后续 path target 与 `at.of` 能引用。
  for (const child of ir.children) {
    if (child.type === 'node') {
      const layout = layoutNode(child, measureText, nodeIndex, nodeDistance);
      if (child.id) nodeIndex.set(child.id, layout);
      for (const prim of emitNodePrimitives(layout, round)) {
        primitives.push(prim);
      }
      // 用旋转感知的 4 角扩 bbox（保持完整精度，computeViewBox 末端再 round）
      allPoints.push(
        rectOps.anchor(layout.rect, 'north-west'),
        rectOps.anchor(layout.rect, 'north-east'),
        rectOps.anchor(layout.rect, 'south-west'),
        rectOps.anchor(layout.rect, 'south-east'),
      );
    } else if (child.type === 'coordinate') {
      const center = resolvePosition(child.position, nodeIndex, nodeDistance);
      if (!center) {
        throw new Error(
          `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
        );
      }
      nodeIndex.set(child.id, coordinateAsLayout(child.id, center));
    }
  }

  // Pass 2: 路径解析 → 发出 path primitive（可能附带边标注 TextPrim）
  for (const child of ir.children) {
    if (child.type === 'path') {
      const result = emitPathPrimitive(child, nodeIndex, round, measureText);
      if (result) {
        for (const prim of result.primitives) primitives.push(prim);
        for (const p of result.points) allPoints.push(p);
      }
    }
  }

  return {
    primitives,
    viewBox: computeViewBox(allPoints, viewBoxPadding, round),
  };
};
