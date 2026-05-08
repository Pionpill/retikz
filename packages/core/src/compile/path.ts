import { rect as rectOps } from '../geometry/rect';
import type { IRPath, IRPosition, IRStep, IRTarget } from '../ir';
import type { PathPrim, ScenePrimitive } from '../primitive';
import { type NodeLayout, attachRectOf } from './node';
import { resolvePosition } from './position';

/**
 * IR 的 path-level `arrow` 字段映射到 PathPrim 的 arrowStart / arrowEnd。
 * `'->'` → 终点箭头；`'<-'` → 起点；`'<->'` → 两端；省略或 `'none'` → 无。
 */
const arrowMarkers = (
  arrow?: 'none' | '->' | '<-' | '<->',
): { arrowStart?: 'normal'; arrowEnd?: 'normal' } => {
  switch (arrow) {
    case '->':
      return { arrowEnd: 'normal' };
    case '<-':
      return { arrowStart: 'normal' };
    case '<->':
      return { arrowStart: 'normal', arrowEnd: 'normal' };
    default:
      return {};
  }
};

/**
 * 求一个 step.to 的"参考点"（节点中心 / 直接坐标 / 极坐标解算后）。
 * 给段内 boundary clip 算方向用——只走中心，从不引入上次的 clip 点。
 * 解析失败返回 null（如引用未定义节点）。
 */
const refPointOfTarget = (
  target: IRTarget,
  nodeIndex: Map<string, NodeLayout>,
): IRPosition | null => resolvePosition(target, nodeIndex);

/**
 * 折角中间点：基于"参考点"（节点中心或直接坐标）算直角拐点。
 * `-|` corner = (curr.x, prev.y)；`|-` corner = (prev.x, curr.y)。
 */
const cornerOf = (
  prev: IRPosition,
  curr: IRPosition,
  via: '-|' | '|-',
): IRPosition =>
  via === '-|' ? [curr[0], prev[1]] : [prev[0], curr[1]];

/**
 * 把 step.to 在给定方向 `toward` 上算出"实际绘制端点"：
 * - 节点 ref：取 attachRect 边界与 (节点中心 → toward) 射线的交点
 * - 直接坐标 / 极坐标：解析后直接返回（不做 clip）
 * 解析失败返回 null。
 */
const clipForTarget = (
  target: IRTarget,
  toward: IRPosition,
  nodeIndex: Map<string, NodeLayout>,
): IRPosition | null => {
  if (typeof target === 'string') {
    const node = nodeIndex.get(target);
    if (!node) return null;
    return rectOps.boundaryPoint(attachRectOf(node), toward);
  }
  return resolvePosition(target, nodeIndex);
};

/** 浅相等：两个 IRPosition 的两个分量都精确相等（未 round） */
const samePoint = (a: IRPosition | null, b: IRPosition | null): boolean =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1];

/**
 * 把 IR Path 翻译为单个 PathPrim。
 *
 * 关键算法（v0.1.0-alpha.1）：每个绘制段（line / fold）**独立**地用节点中心
 * 算两端 boundary clip——一个节点在路径中段时，"入边"和"出边" boundary 点
 * 通常不同，路径会在该节点处可见地"断开"。这与 TikZ 原生语义一致：
 *
 *   `\draw (A) -- (B) -- (C);`
 *   段 1：A.center → B.center 决定 A 出口、B 入口的 boundary 交点
 *   段 2：B.center → C.center 决定 B 出口、C 入口的 boundary 交点
 *   B 在两段里 clip 出来的点不同——视觉上看到两条独立线段。
 *
 * 实现上仍只产一个 PathPrim：d 字符串里以多组 `M ... L ...` 表达多个 sub-path。
 * 当某段起点恰好等于上一段终点（例如直接坐标连续，或未触发 clip 差异）时，
 * 复用 cursor，省掉冗余 M。
 *
 * cycle 段：闭回最近一次 move 起点。若 cycle 起点 == lastEnd 且终点 == subPathStart，
 * 输出 `Z`（最优雅）；否则显式画一段 line（与"段独立 clip"一致）。
 *
 * 引用未定义节点 / 解析失败时返回 null（path 整体跳过）。
 */
export const emitPathPrimitive = (
  path: IRPath,
  nodeIndex: Map<string, NodeLayout>,
  round: (n: number) => number,
): { primitive: ScenePrimitive; points: Array<IRPosition> } | null => {
  const steps = path.children;
  if (steps.length < 2) return null;

  // 每个 step 的几何参考点（节点中心 / 直接坐标）。cycle 没有 to。
  const anchors: Array<IRPosition | null> = steps.map(s =>
    s.kind === 'cycle' ? null : refPointOfTarget(s.to, nodeIndex),
  );

  /** 找 i 之前最近的"有 to 字段的 step"（跳过 cycle） + 它的 anchor */
  const findPrev = (
    i: number,
  ): { step: Exclude<IRStep, { kind: 'cycle' }>; anchor: IRPosition } | null => {
    for (let j = i - 1; j >= 0; j--) {
      const s = steps[j];
      if (s.kind === 'cycle') continue;
      const a = anchors[j];
      if (!a) return null;
      return { step: s, anchor: a };
    }
    return null;
  };

  /** 找 i 之前最近的 move 的 to——cycle 闭合的目标 */
  const findRecentMoveTo = (i: number): IRTarget | null => {
    for (let j = i - 1; j >= 0; j--) {
      if (steps[j].kind === 'move') {
        return (steps[j] as Exclude<IRStep, { kind: 'cycle' }>).to;
      }
    }
    return null;
  };

  const tokens: Array<string> = [];
  const points: Array<IRPosition> = [];
  let lastEnd: IRPosition | null = null;
  let subPathStart: IRPosition | null = null;

  const fmt = (p: IRPosition): string => `${round(p[0])} ${round(p[1])}`;
  const emitM = (p: IRPosition) => {
    tokens.push(`M ${fmt(p)}`);
    points.push(p);
    subPathStart = p;
    lastEnd = p;
  };
  const emitL = (p: IRPosition) => {
    tokens.push(`L ${fmt(p)}`);
    points.push(p);
    lastEnd = p;
  };
  const emitZ = () => {
    tokens.push('Z');
    lastEnd = subPathStart;
  };
  /** 段起点：与 lastEnd 相同就复用 cursor（省掉冗余 M），否则发 M */
  const startSegment = (p: IRPosition) => {
    if (samePoint(p, lastEnd)) return;
    emitM(p);
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // move 自身不绘制；它的 to 仅在下个绘制段被 findPrev 引用
    if (step.kind === 'move') continue;

    if (step.kind === 'cycle') {
      const moveTo = findRecentMoveTo(i);
      const prev = findPrev(i);
      if (!moveTo || !prev) continue; // 没有 move / prev 则 cycle 无意义，跳过
      const moveAnchor = refPointOfTarget(moveTo, nodeIndex);
      if (!moveAnchor) return null;

      const fromClip = clipForTarget(prev.step.to, moveAnchor, nodeIndex);
      const toClip = clipForTarget(moveTo, prev.anchor, nodeIndex);
      if (!fromClip || !toClip) return null;

      // 起点恰好是 lastEnd，终点恰好是 subPathStart → 用 Z 收尾最干净
      if (samePoint(fromClip, lastEnd) && samePoint(toClip, subPathStart)) {
        emitZ();
        continue;
      }
      // 否则段独立：可能要重新 M 起点，再 L 到终点（不再用 Z，避免回到错误的 subPathStart）
      startSegment(fromClip);
      emitL(toClip);
      continue;
    }

    // line / step（fold）：先找 prev，再独立 clip 两端
    const prev = findPrev(i);
    if (!prev) return null;
    const currAnchor = anchors[i];
    if (!currAnchor) return null;

    if (step.kind === 'line') {
      const fromClip = clipForTarget(prev.step.to, currAnchor, nodeIndex);
      const toClip = clipForTarget(step.to, prev.anchor, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitL(toClip);
      continue;
    }

    // step.kind === 'step'（fold）
    const corner = cornerOf(prev.anchor, currAnchor, step.via);
    const fromClip = clipForTarget(prev.step.to, corner, nodeIndex);
    const toClip = clipForTarget(step.to, corner, nodeIndex);
    if (!fromClip || !toClip) return null;
    startSegment(fromClip);
    emitL(corner);
    emitL(toClip);
  }

  const baseProps = {
    stroke: path.stroke ?? 'currentColor',
    strokeWidth: path.strokeWidth ?? 1,
    fill: 'none' as const,
    strokeDasharray: path.strokeDasharray,
  };

  const markers = arrowMarkers(path.arrow);
  const hasArrows = !!markers.arrowStart || !!markers.arrowEnd;

  // 找出每个 sub-path 的起始 token 索引（每个 'M ...' 都是新 sub-path）
  const subPathStarts: Array<number> = [];
  tokens.forEach((tok, idx) => {
    if (tok.startsWith('M ')) subPathStarts.push(idx);
  });

  // 单 sub-path 或无箭头 → 一个 PathPrim 搞定
  if (!hasArrows || subPathStarts.length <= 1) {
    const primitive: PathPrim = {
      type: 'path',
      d: tokens.join(' '),
      ...baseProps,
      ...markers,
    };
    return { primitive, points };
  }

  // 多 sub-path + 有箭头：split 成多个 PathPrim 分别只挂"首段 marker-start / 末段 marker-end"，
  // 用 GroupPrim 包起来。否则 SVG marker 会按每个 sub-path 单独贴在中间节点上，视觉错乱。
  const subPathSlices: Array<Array<string>> = [];
  for (let s = 0; s < subPathStarts.length; s++) {
    const start = subPathStarts[s];
    const end = s + 1 < subPathStarts.length ? subPathStarts[s + 1] : tokens.length;
    subPathSlices.push(tokens.slice(start, end));
  }
  const subPathPrims: Array<PathPrim> = subPathSlices.map((sub, i) => {
    const isFirst = i === 0;
    const isLast = i === subPathSlices.length - 1;
    return {
      type: 'path',
      d: sub.join(' '),
      ...baseProps,
      ...(isFirst && markers.arrowStart ? { arrowStart: markers.arrowStart } : {}),
      ...(isLast && markers.arrowEnd ? { arrowEnd: markers.arrowEnd } : {}),
    };
  });

  const primitive: ScenePrimitive = {
    type: 'group',
    children: subPathPrims,
  };
  return { primitive, points };
};
