import { bendControlPoints } from '../geometry/bend';
import type { ArrowShape, IRPath, IRPosition, IRStep, IRTarget } from '../ir';
import type { PathPrim, ScenePrimitive } from '../primitive';
import { type NodeLayout, anchorOf, angleBoundaryOf, boundaryPointOf } from './node';
import { parseNodeRef } from './parseTarget';
import { resolvePosition } from './position';

/**
 * IR 的 path-level `arrow` + `arrowShape` 映射到 PathPrim 的
 * arrowStart / arrowEnd（值就是 shape 名）。`arrowShape` 省略时默认 'normal'。
 */
const arrowMarkers = (
  arrow: 'none' | '->' | '<-' | '<->' | undefined,
  shape: ArrowShape = 'normal',
): { arrowStart?: ArrowShape; arrowEnd?: ArrowShape } => {
  switch (arrow) {
    case '->':
      return { arrowEnd: shape };
    case '<-':
      return { arrowStart: shape };
    case '<->':
      return { arrowStart: shape, arrowEnd: shape };
    default:
      return {};
  }
};

/**
 * 按 arrow shape 决定线段需要从端点向内"缩短"多少（单位：strokeWidth 倍）。
 *
 * 用途：避免 hollow shape（如 `open` / `openDiamond` / `openCircle`）的
 * 空心内部被 path 描边穿过——把线末端退到形状背面位置，marker 的 apex
 * 才能正好落在原始端点上。
 *
 * 这个值与 marker 几何配套，必须与 react/render/arrowMarkers.tsx 里
 * 各 shape 的 refX / 形状定义保持一致：
 *   shrink = (apexX - refX) × markerWidth / viewBoxWidth
 *   open:        apexX=9,    refX=1, scale=6/10 → 8  × 0.6 = 4.8
 *   openDiamond: apexX=9,    refX=1, scale=6/10 → 8  × 0.6 = 4.8
 *   openCircle:  apexX=10,   refX=0, scale=6/10 → 10 × 0.6 = 6
 * 实心 shape（normal / stealth / diamond / circle）apex / 边缘已贴 refX=10，
 * line 被 fill 覆盖看不见，shrink=0。
 */
const SHRINK_FOR_SHAPE: Record<ArrowShape, number> = {
  normal: 0,
  open: 4.8,
  stealth: 0,
  diamond: 0,
  openDiamond: 4.8,
  circle: 0,
  openCircle: 6,
};

/** 把点 p 朝 target 方向移动 dist 个 path 单位 */
const shiftToward = (p: IRPosition, target: IRPosition, dist: number): IRPosition => {
  const dx = target[0] - p[0];
  const dy = target[1] - p[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0 || dist === 0) return p;
  return [p[0] + (dx / len) * dist, p[1] + (dy / len) * dist];
};

/**
 * 求一个 step.to 的"参考点"——给段内 boundary clip 算方向 / 折角 corner 用。
 *
 * 三态字符串语法（ADR-0004）：
 * - `'A'`（auto）：节点中心；邻居端点 clip 时按"A 中心 → toward"射线求边界
 * - `'A.<anchor>'`：命名 anchor 位置（位置即 endpoint，refPoint 也是它）
 * - `'A.<deg>'`：节点 deg 方向上的视觉边界点（位置即 endpoint）
 *
 * 后两种"显式锚点"模式下 refPoint = endpoint（位置不随邻居变），auto 模式
 * 下 refPoint 仍是中心。直接坐标 / 极坐标：解析后的笛卡尔。
 */
const refPointOfTarget = (
  target: IRTarget,
  nodeIndex: Map<string, NodeLayout>,
): IRPosition | null => {
  if (typeof target === 'string') {
    const ref = parseNodeRef(target);
    const node = nodeIndex.get(ref.id);
    if (!node) return null;
    switch (ref.kind) {
      case 'node':
        return [node.rect.x, node.rect.y];
      case 'anchor':
        return anchorOf(node, ref.anchor);
      case 'angle':
        return angleBoundaryOf(node, ref.angle);
    }
  }
  return resolvePosition(target, nodeIndex);
};

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
 * - 节点 ref auto（`'A'`）：按 shape 多态走 boundaryPointOf——外扩 margin 后
 *   求边界与"中心→toward"射线交点
 * - 节点 ref 命名 anchor（`'A.north'`）/ 角度（`'A.30'`）：位置已被解析定死，
 *   直接返回，**不再受 toward 影响**
 * - 直接坐标 / 极坐标：解析后直接返回（不做 clip）
 * 解析失败返回 null。
 */
const clipForTarget = (
  target: IRTarget,
  toward: IRPosition,
  nodeIndex: Map<string, NodeLayout>,
): IRPosition | null => {
  if (typeof target === 'string') {
    const ref = parseNodeRef(target);
    const node = nodeIndex.get(ref.id);
    if (!node) return null;
    switch (ref.kind) {
      case 'node':
        return boundaryPointOf(node, toward);
      case 'anchor':
        return anchorOf(node, ref.anchor);
      case 'angle':
        return angleBoundaryOf(node, ref.angle);
    }
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

  /** 单个 path 操作；shrink 阶段需要按 cmd 找到首/末有 point 的项 */
  type PathOp =
    | { cmd: 'M' | 'L'; point: IRPosition }
    | { cmd: 'Q'; control: IRPosition; point: IRPosition }
    | { cmd: 'C'; control1: IRPosition; control2: IRPosition; point: IRPosition }
    | { cmd: 'Z' };

  const ops: Array<PathOp> = [];
  const points: Array<IRPosition> = [];
  let lastEnd: IRPosition | null = null;
  let subPathStart: IRPosition | null = null;

  const emitM = (p: IRPosition) => {
    ops.push({ cmd: 'M', point: p });
    points.push(p);
    subPathStart = p;
    lastEnd = p;
  };
  const emitL = (p: IRPosition) => {
    ops.push({ cmd: 'L', point: p });
    points.push(p);
    lastEnd = p;
  };
  const emitZ = () => {
    ops.push({ cmd: 'Z' });
    lastEnd = subPathStart;
  };
  const emitQ = (control: IRPosition, p: IRPosition) => {
    ops.push({ cmd: 'Q', control, point: p });
    // 控制点纳入 viewBox bbox：曲线视觉范围一定不超过控制点 + 端点的凸包
    points.push(control);
    points.push(p);
    lastEnd = p;
  };
  const emitC = (c1: IRPosition, c2: IRPosition, p: IRPosition) => {
    ops.push({ cmd: 'C', control1: c1, control2: c2, point: p });
    // 控制点纳入 viewBox bbox（保守，实际 bezier 曲线包络小于凸包）
    points.push(c1);
    points.push(c2);
    points.push(p);
    lastEnd = p;
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

    if (step.kind === 'curve') {
      const fromClip = clipForTarget(prev.step.to, step.control, nodeIndex);
      const toClip = clipForTarget(step.to, step.control, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitQ(step.control, toClip);
      continue;
    }
    if (step.kind === 'cubic') {
      const fromClip = clipForTarget(prev.step.to, step.control1, nodeIndex);
      const toClip = clipForTarget(step.to, step.control2, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitC(step.control1, step.control2, toClip);
      continue;
    }
    if (step.kind === 'bend') {
      const angle = step.bendAngle ?? 30;
      const [c1, c2] = bendControlPoints(prev.anchor, currAnchor, step.bendDirection, angle);
      const fromClip = clipForTarget(prev.step.to, c1, nodeIndex);
      const toClip = clipForTarget(step.to, c2, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitC(c1, c2, toClip);
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

  const strokeWidth = path.strokeWidth ?? 1;
  const baseProps = {
    stroke: path.stroke ?? 'currentColor',
    strokeWidth,
    // path.fill 缺省 = 'none'（仅描边）；用户传具体颜色即填充。配合 cycle 闭合可画填充形状
    fill: path.fill ?? 'none',
    fillRule: path.fillRule,
    strokeDasharray: path.strokeDasharray,
  };

  const markers = arrowMarkers(path.arrow, path.arrowShape);
  const hasArrows = !!markers.arrowStart || !!markers.arrowEnd;

  // 按 shape 把首段起点 / 末段终点向内"缩短"——避免 hollow 形状（如 open）
  // 的空心被 path 描边穿过。shrink=0 的 shape（实心三角等）跳过。
  const shrinkStart = markers.arrowStart ? SHRINK_FOR_SHAPE[markers.arrowStart] : 0;
  const shrinkEnd = markers.arrowEnd ? SHRINK_FOR_SHAPE[markers.arrowEnd] : 0;

  if (shrinkStart > 0) {
    // 找首个 M（首段起点）和它后面第一个有坐标的 op（用来定方向）
    const firstIdx = ops.findIndex(o => o.cmd === 'M');
    if (firstIdx >= 0) {
      const cur = ops[firstIdx];
      const next = ops.slice(firstIdx + 1).find(o => o.cmd !== 'Z');
      if (cur.cmd !== 'Z' && next) {
        cur.point = shiftToward(cur.point, next.point, shrinkStart * strokeWidth);
      }
    }
  }
  if (shrinkEnd > 0) {
    // 找末尾最后一个有坐标的 op（跳过 Z）和它前面最近一个有坐标的 op
    let lastIdx = -1;
    for (let i = ops.length - 1; i >= 0; i--) {
      if (ops[i].cmd !== 'Z') {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx > 0) {
      let prevIdx = lastIdx - 1;
      while (prevIdx >= 0 && ops[prevIdx].cmd === 'Z') prevIdx--;
      if (prevIdx >= 0) {
        const cur = ops[lastIdx];
        const prev = ops[prevIdx];
        if (cur.cmd !== 'Z' && prev.cmd !== 'Z') {
          cur.point = shiftToward(cur.point, prev.point, shrinkEnd * strokeWidth);
        }
      }
    }
  }

  // ops → token strings（按精度 round）
  const tokens = ops.map(op => {
    if (op.cmd === 'Z') return 'Z';
    if (op.cmd === 'Q') {
      return `Q ${round(op.control[0])} ${round(op.control[1])} ${round(op.point[0])} ${round(op.point[1])}`;
    }
    if (op.cmd === 'C') {
      return `C ${round(op.control1[0])} ${round(op.control1[1])} ${round(op.control2[0])} ${round(op.control2[1])} ${round(op.point[0])} ${round(op.point[1])}`;
    }
    return `${op.cmd} ${round(op.point[0])} ${round(op.point[1])}`;
  });

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
