import { rect as rectOps } from '../geometry/rect';
import type { IR, IRPosition } from '../ir';
import type { Scene, ScenePrimitive } from '../primitive';
import { type NodeLayout, emitNodePrimitives, layoutNode } from './node';
import { emitPathPrimitive } from './path';
import { DEFAULT_PRECISION, makeRound } from './precision';
import { type TextMeasurer, fallbackMeasurer } from './text-metrics';
import { computeViewBox } from './view-box';

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

  const primitives: Array<ScenePrimitive> = [];
  const nodeIndex = new Map<string, NodeLayout>();
  const allPoints: Array<IRPosition> = [];

  // Pass 1: 节点布局 → 注册到 nodeIndex 并发出节点 primitive
  // 按 IR children 源码顺序处理；polar.origin 引用其他节点 id 时，要求被引用节点先定义。
  for (const child of ir.children) {
    if (child.type === 'node') {
      const layout = layoutNode(child, measureText, nodeIndex);
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
    }
  }

  // Pass 2: 路径解析 → 发出 path primitive
  for (const child of ir.children) {
    if (child.type === 'path') {
      const result = emitPathPrimitive(child, nodeIndex, round);
      if (result) {
        primitives.push(result.primitive);
        for (const p of result.points) allPoints.push(p);
      }
    }
  }

  return {
    primitives,
    viewBox: computeViewBox(allPoints, viewBoxPadding, round),
  };
};
