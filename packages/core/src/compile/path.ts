import { arcBoundingPoints, arcEndPoint, arcSvgFlags } from '../geometry/arc';
import { bendControlPoints } from '../geometry/bend';
import {
  type SegmentSample,
  arcSegmentSample,
  circleSegmentSample,
  cubicSegmentSample,
  ellipseSegmentSample,
  foldSegmentSample,
  lineSegmentSample,
  quadSegmentSample,
} from '../geometry/segment';
import type {
  ArrowShape,
  IRPath,
  IRPosition,
  IRStep,
  IRStepLabel,
  IRTarget,
} from '../ir';
import type { PathPrim, ScenePrimitive, TextPrim } from '../primitive';
import { type NodeLayout, anchorOf, angleBoundaryOf, boundaryPointOf } from './node';
import { parseNodeRef } from './parseTarget';
import { resolvePosition } from './position';
import { type TextMeasurer, fallbackMeasurer } from './text-metrics';

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
  // ADR-0003 Task 2: rel / relAccumulate 已在 emitPathPrimitive 入口被
  // normalizeRelativeTargets 解析成绝对 [x, y]，到这里不应再出现。防御性
  // 守卫给 TS narrowing 用——resolvePosition 签名只收 string | [x,y] | Polar。
  if (typeof target === 'object' && !Array.isArray(target) && ('rel' in target || 'relAccumulate' in target)) {
    return null;
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
  // ADR-0003 Task 2: rel / relAccumulate 已被 normalizeRelativeTargets 预解析。
  // 防御性守卫给 TS narrowing 用。
  if (typeof target === 'object' && !Array.isArray(target) && ('rel' in target || 'relAccumulate' in target)) {
    return null;
  }
  return resolvePosition(target, nodeIndex);
};

/** 浅相等：两个 IRPosition 的两个分量都精确相等（未 round） */
const samePoint = (a: IRPosition | null, b: IRPosition | null): boolean =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1];

/**
 * 语义 stroke 档位 → 数值映射（user units）。
 *
 * 对齐 TikZ 比例（thin = 默认 0.4pt，retikz 默认 strokeWidth = 1，所以 thin → 1）：
 *   ultra thin  0.1pt → 0.25
 *   very thin   0.2pt → 0.5
 *   thin        0.4pt → 1     （= 默认 strokeWidth）
 *   semithick   0.6pt → 1.5
 *   thick       0.8pt → 2
 *   very thick  1.2pt → 3
 *   ultra thick 1.6pt → 4
 *
 * 显式 `strokeWidth` 始终覆盖 `thickness`——thickness 仅在 strokeWidth 缺省时生效。
 */
const THICKNESS_TO_WIDTH: Record<NonNullable<IRPath['thickness']>, number> = {
  ultraThin: 0.25,
  veryThin: 0.5,
  thin: 1,
  semithick: 1.5,
  thick: 2,
  veryThick: 3,
  ultraThick: 4,
};

/** ADR-0004：边标注的默认字号 / 偏移量（user units） */
const LABEL_FONT_SIZE = 14;
const LABEL_LINE_HEIGHT_FACTOR = 1.2;
const LABEL_SIDE_OFFSET = 4;
const RAD_TO_DEG = 180 / Math.PI;

/** label.position → 段参数 t */
const tForLabelPosition = (pos: IRStepLabel['position']): number =>
  pos === 'near-start' ? 0.25 : pos === 'near-end' ? 0.75 : 0.5;

/**
 * 把 step.label + 段采样结果翻成 TextPrim（sloped 时再裹一层 group 旋转）。
 *
 * 几何（默认 side='above'，position='midway'）：
 * - 'above': 锚点 (x, y - LABEL_SIDE_OFFSET)，align=middle, baseline=bottom
 * - 'below': 锚点 (x, y + LABEL_SIDE_OFFSET)，align=middle, baseline=top
 * - 'left' : 锚点 (x - LABEL_SIDE_OFFSET, y)，align=end,    baseline=middle
 * - 'right': 锚点 (x + LABEL_SIDE_OFFSET, y)，align=start,  baseline=middle
 * - 'sloped': 锚点 (x, y) 不偏移，align=middle baseline=bottom，外裹 group
 *   `transform="rotate(angle x y)"`，angle 由切线 atan2 算出（SVG y-down，CW 正向）
 *
 * 文本宽高交给 measureText；fallbackMeasurer 时只是估算，但不影响渲染坐标。
 * 返回 primitive + 用于 viewBox 的若干外接点（sloped 时按"近似最大半径"四角扩张）。
 */
const emitLabelPrimitive = (
  label: IRStepLabel,
  sample: SegmentSample,
  measureText: TextMeasurer,
  round: (n: number) => number,
): { primitive: ScenePrimitive; points: Array<IRPosition> } => {
  const fontSize = LABEL_FONT_SIZE;
  const lineHeight = fontSize * LABEL_LINE_HEIGHT_FACTOR;
  const m = measureText(label.text, { size: fontSize });
  const measuredWidth = m.width;
  const measuredHeight = m.height || lineHeight;
  const side = label.side ?? 'above';

  let x = sample.point[0];
  let y = sample.point[1];
  let align: 'start' | 'middle' | 'end' = 'middle';
  let baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' = 'middle';

  if (side === 'above') {
    y -= LABEL_SIDE_OFFSET;
    baseline = 'bottom';
  } else if (side === 'below') {
    y += LABEL_SIDE_OFFSET;
    baseline = 'top';
  } else if (side === 'left') {
    x -= LABEL_SIDE_OFFSET;
    align = 'end';
  } else if (side === 'right') {
    x += LABEL_SIDE_OFFSET;
    align = 'start';
  } else {
    // sloped：锚点不偏移；标签贴段，baseline 取 bottom（视觉上"在线上方"）
    baseline = 'bottom';
  }

  const text: TextPrim = {
    type: 'text',
    x: round(x),
    y: round(y),
    lines: [{ text: label.text }],
    fontSize,
    align,
    baseline,
    lineHeight: round(lineHeight),
    measuredWidth: round(measuredWidth),
    measuredHeight: round(measuredHeight),
    fill: 'currentColor',
  };

  if (side === 'sloped') {
    const angleDeg = Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG;
    const groupPrim: ScenePrimitive = {
      type: 'group',
      transform: `rotate(${round(angleDeg)} ${round(x)} ${round(y)})`,
      children: [text],
    };
    // viewBox bbox：sloped 旋转后用半径外接近似——四角点
    const r = Math.max(measuredWidth / 2, measuredHeight / 2);
    return {
      primitive: groupPrim,
      points: [
        [x - r, y - r],
        [x + r, y - r],
        [x - r, y + r],
        [x + r, y + r],
      ],
    };
  }

  // 非 sloped：把锚点 + 文本块四角加进 bbox 候选（保守，避免 viewBox 把标签裁掉）
  const halfW = measuredWidth / 2;
  const halfH = measuredHeight / 2;
  return {
    primitive: text,
    points: [
      [x - halfW, y - halfH],
      [x + halfW, y - halfH],
      [x - halfW, y + halfH],
      [x + halfW, y + halfH],
    ],
  };
};

/**
 * 把 rel / relAccumulate 目标解析为绝对 Position，产出 step kind 不变但
 * `to` 字段全为绝对坐标的步序列。
 *
 * 决策（ADR-0003 §影响 与 §背景 文本有矛盾）：
 *   两者都相对 prevEnd 解析，区别仅在是否更新 prevEnd——
 *   rel 不更新（保持 TikZ `+` 语义），relAccumulate 更新（TikZ `++` 累积）。
 *   选这个语义因为：(1) 与 TikZ `+`/`++` 一致；(2) 与字段名"Accumulate"
 *   语义匹配；(3) 与 ADR 背景段一致；§影响 段写"pathStart + offset"是 typo。
 *
 * 跨 step kind 的 prevEnd 推进：
 * - 有 to 的 kind（move/line/step/curve/cubic/bend）：prevEnd = refPointOfTarget(to)
 * - arc：prevEnd = arcEndPoint(prevEnd, radius, endAngle)
 * - circlePath / ellipsePath：prevEnd 不变（画完留圆心，即 prevEnd 本身）
 * - cycle：prevEnd 不变（不重置到 pathStart，保持简单；后续如有需要再扩）
 *
 * prevEnd 为 null（首步是 rel）时回退到 [0, 0] 当锚点；解析失败保持原 step。
 */
const normalizeRelativeTargets = (
  steps: ReadonlyArray<IRStep>,
  nodeIndex: Map<string, NodeLayout>,
): Array<IRStep> => {
  let prevEnd: IRPosition | null = null;
  const out: Array<IRStep> = [];

  for (const step of steps) {
    if (step.kind === 'cycle') {
      out.push(step);
      // prevEnd 不变（不重置到 pathStart）
      continue;
    }
    if (step.kind === 'circlePath' || step.kind === 'ellipsePath') {
      out.push(step);
      // prevEnd 不变（画完笔位回到圆心，即 prevEnd 本身）
      continue;
    }
    if (step.kind === 'arc') {
      out.push(step);
      if (prevEnd) {
        prevEnd = arcEndPoint(prevEnd, step.radius, step.endAngle);
      }
      continue;
    }

    // step 有 to 字段（move / line / step(fold) / curve / cubic / bend）
    const original = step.to;
    let resolvedTo: IRTarget = original;
    let updatePrevEnd = true;

    if (
      typeof original === 'object' &&
      !Array.isArray(original) &&
      'rel' in original
    ) {
      const ref = prevEnd ?? [0, 0];
      resolvedTo = [ref[0] + original.rel[0], ref[1] + original.rel[1]];
      updatePrevEnd = false;
    } else if (
      typeof original === 'object' &&
      !Array.isArray(original) &&
      'relAccumulate' in original
    ) {
      const ref = prevEnd ?? [0, 0];
      resolvedTo = [
        ref[0] + original.relAccumulate[0],
        ref[1] + original.relAccumulate[1],
      ];
      // updatePrevEnd 保持 true
    }

    out.push({ ...step, to: resolvedTo });

    if (updatePrevEnd) {
      const pos = refPointOfTarget(resolvedTo, nodeIndex);
      if (pos) prevEnd = pos;
    }
  }

  return out;
};

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
  measureText: TextMeasurer = fallbackMeasurer,
): { primitives: Array<ScenePrimitive>; points: Array<IRPosition> } | null => {
  // ADR-0003 Task 2：先把所有 rel / relAccumulate 目标解析为绝对坐标，
  // 后续算法对 step.to 的处理就和绝对坐标完全一致。
  const steps = normalizeRelativeTargets(path.children, nodeIndex);
  if (steps.length < 2) return null;

  /** ADR-0004：每段 step.label 翻译出的 TextPrim（或裹 sloped 旋转的 group），
   *  与 path 主体 primitive 同级返回；调用方 push 进 scene.primitives */
  const labelPrims: Array<ScenePrimitive> = [];

  /** 为当前 step 收 label：算 sample 后调用 emitLabelPrimitive，结果累积到 labelPrims / points */
  const collectLabel = (
    step: IRStep,
    sampleAt: (t: number) => SegmentSample,
  ): void => {
    if (
      step.kind === 'move' ||
      step.kind === 'cycle' ||
      !('label' in step) ||
      !step.label
    ) {
      return;
    }
    const t = tForLabelPosition(step.label.position);
    const sample = sampleAt(t);
    const r = emitLabelPrimitive(step.label, sample, measureText, round);
    labelPrims.push(r.primitive);
    for (const p of r.points) points.push(p);
  };

  // "无 to" 的 step kinds：cycle / arc / circlePath / ellipsePath
  // （后三者由 ADR-0002 引入，task 1 仅占位、task 3 才实现真正的几何）
  type StepWithTo = Exclude<
    IRStep,
    { kind: 'cycle' } | { kind: 'arc' } | { kind: 'circlePath' } | { kind: 'ellipsePath' }
  >;
  const hasTo = (s: IRStep): s is StepWithTo =>
    s.kind !== 'cycle' &&
    s.kind !== 'arc' &&
    s.kind !== 'circlePath' &&
    s.kind !== 'ellipsePath';

  // 每个 step 的几何参考点（节点中心 / 直接坐标）。无 to 的 step kind 给 null。
  const anchors: Array<IRPosition | null> = steps.map(s =>
    hasTo(s) ? refPointOfTarget(s.to, nodeIndex) : null,
  );

  /** 找 i 之前最近的"有 to 字段的 step" + 它的 anchor */
  const findPrev = (
    i: number,
  ): { step: StepWithTo; anchor: IRPosition } | null => {
    for (let j = i - 1; j >= 0; j--) {
      const s = steps[j];
      if (!hasTo(s)) continue;
      const a = anchors[j];
      if (!a) return null;
      return { step: s, anchor: a };
    }
    return null;
  };

  /** 找 i 之前最近的 move 的 to——cycle 闭合的目标 */
  const findRecentMoveTo = (i: number): IRTarget | null => {
    for (let j = i - 1; j >= 0; j--) {
      const s = steps[j];
      if (s.kind === 'move') {
        return s.to;
      }
    }
    return null;
  };

  /** 单个 path 操作；shrink 阶段需要按 cmd 找到首/末有 point 的项 */
  type PathOp =
    | { cmd: 'M' | 'L'; point: IRPosition }
    | { cmd: 'Q'; control: IRPosition; point: IRPosition }
    | { cmd: 'C'; control1: IRPosition; control2: IRPosition; point: IRPosition }
    | { cmd: 'A'; rx: number; ry: number; largeArc: 0 | 1; sweep: 0 | 1; point: IRPosition }
    | { cmd: 'Z' };

  const ops: Array<PathOp> = [];
  const points: Array<IRPosition> = [];
  let lastEnd: IRPosition | null = null;
  let subPathStart: IRPosition | null = null;
  /**
   * "笔位覆盖"——arc / circlePath / ellipsePath 这种没有 `to` 字段的 step
   * 不能通过 `prev.step.to` 重算下一段的起点。它们设置 penOverride，下一个
   * 绘制段（line/curve/cubic/bend/step）直接用这个点当 fromClip，之后清空。
   *
   *   - arc：endpoint（弧终点）—— 与 SVG 实际 cursor 一致
   *   - circlePath/ellipsePath：center（圆心）—— ADR-0002 决策"画完留在圆心"，
   *     注意 SVG 实际 cursor 在弧端点而不在 center，必须靠 startSegment 发 M
   *     teleport 回中心
   */
  let penOverride: IRPosition | null = null;

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
  const emitA = (
    rx: number,
    ry: number,
    largeArc: 0 | 1,
    sweep: 0 | 1,
    p: IRPosition,
  ) => {
    ops.push({ cmd: 'A', rx, ry, largeArc, sweep, point: p });
    // 弧端点纳入 bbox；弧形 bbox 极值候选（90°·k 轴向点）由各 compile 分支
    // 单独 push 进 points（仅 arc 才需要——circle / ellipse 已显式 push 四点）
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

    // line / step（fold）/ curve / cubic / bend / arc / circlePath / ellipsePath：
    // 都需要 prev（找 cursor 起点 / 圆心）。currAnchor 仅 line / step / bend 等
    // 有 `to` 字段的 step 才需要——arc / circlePath / ellipsePath 没有 to。
    const prev = findPrev(i);
    if (!prev) return null;

    if (step.kind === 'arc') {
      // 圆心 = 上一 step 的 anchor（refPoint）
      const center = prev.anchor;
      const startPt = arcEndPoint(center, step.radius, step.startAngle);
      const endPt = arcEndPoint(center, step.radius, step.endAngle);
      const flags = arcSvgFlags(step.startAngle, step.endAngle);

      startSegment(startPt);
      emitA(step.radius, step.radius, flags.largeArc, flags.sweep, endPt);

      // viewBox bbox：把弧的极值点（90°·k 候选）也算进来
      for (const p of arcBoundingPoints(center, step.radius, step.startAngle, step.endAngle)) {
        points.push(p);
      }
      collectLabel(step, t =>
        arcSegmentSample(center, step.radius, step.startAngle, step.endAngle, t),
      );
      // 后续段从弧终点继续（lastEnd 已经在 emitA 设为 endPt，与 SVG cursor 一致）
      penOverride = endPt;
      continue;
    }

    if (step.kind === 'circlePath') {
      // 圆心 = 上一 step 的 anchor；起点取圆周右侧（角度 0°）
      const center = prev.anchor;
      const r = step.radius;
      const right: IRPosition = [center[0] + r, center[1]];
      const left: IRPosition = [center[0] - r, center[1]];

      startSegment(right);
      // 第 1 段：右半圆，sweep=1（按当前 polar 约定 = 顺时针视觉，从右上到左）
      emitA(r, r, 0, 1, left);
      // 第 2 段：左半圆，sweep=1，闭回起点
      emitA(r, r, 0, 1, right);

      // viewBox bbox：整圆顶/底/左/右四点
      points.push([center[0] + r, center[1]]);
      points.push([center[0] - r, center[1]]);
      points.push([center[0], center[1] + r]);
      points.push([center[0], center[1] - r]);

      collectLabel(step, t => circleSegmentSample(center, r, t));

      // ADR-0002 决策：画完圆 / 椭圆笔位回到 center。lastEnd 保留 SVG 实际
      // cursor（= right），下一段用 penOverride=center 触发 startSegment 发 M。
      penOverride = center;
      continue;
    }

    if (step.kind === 'ellipsePath') {
      const center = prev.anchor;
      const rx = step.radiusX;
      const ry = step.radiusY;
      const right: IRPosition = [center[0] + rx, center[1]];
      const left: IRPosition = [center[0] - rx, center[1]];

      startSegment(right);
      emitA(rx, ry, 0, 1, left);
      emitA(rx, ry, 0, 1, right);

      points.push([center[0] + rx, center[1]]);
      points.push([center[0] - rx, center[1]]);
      points.push([center[0], center[1] + ry]);
      points.push([center[0], center[1] - ry]);

      collectLabel(step, t => ellipseSegmentSample(center, rx, ry, t));

      penOverride = center;
      continue;
    }

    const currAnchor = anchors[i];
    if (!currAnchor) return null;

    // arc / circlePath / ellipsePath 之后，penOverride 决定下一段起点（弧终点 / 圆心）。
    // 普通段则继续用"对 prev.step.to 做 boundary clip"——节点 ref 时段独立 clip。
    // 用完即清空，避免污染后续 step。
    const usedOverride = penOverride;
    penOverride = null;

    if (step.kind === 'line') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, currAnchor, nodeIndex);
      const toClip = clipForTarget(step.to, prev.anchor, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitL(toClip);
      collectLabel(step, t => lineSegmentSample(fromClip, toClip, t));
      continue;
    }

    if (step.kind === 'curve') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, step.control, nodeIndex);
      const toClip = clipForTarget(step.to, step.control, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitQ(step.control, toClip);
      collectLabel(step, t => quadSegmentSample(fromClip, step.control, toClip, t));
      continue;
    }
    if (step.kind === 'cubic') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, step.control1, nodeIndex);
      const toClip = clipForTarget(step.to, step.control2, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitC(step.control1, step.control2, toClip);
      collectLabel(step, t =>
        cubicSegmentSample(fromClip, step.control1, step.control2, toClip, t),
      );
      continue;
    }
    if (step.kind === 'bend') {
      const angle = step.bendAngle ?? 30;
      const [c1, c2] = bendControlPoints(prev.anchor, currAnchor, step.bendDirection, angle);
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, c1, nodeIndex);
      const toClip = clipForTarget(step.to, c2, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitC(c1, c2, toClip);
      collectLabel(step, t => cubicSegmentSample(fromClip, c1, c2, toClip, t));
      continue;
    }

    // step.kind === 'step'（fold）
    const corner = cornerOf(prev.anchor, currAnchor, step.via);
    const fromClip = usedOverride ?? clipForTarget(prev.step.to, corner, nodeIndex);
    const toClip = clipForTarget(step.to, corner, nodeIndex);
    if (!fromClip || !toClip) return null;
    startSegment(fromClip);
    emitL(corner);
    emitL(toClip);
    collectLabel(step, t => foldSegmentSample(fromClip, corner, toClip, t));
  }

  // strokeWidth 解析顺序：显式 strokeWidth > 语义 thickness 档位 > 默认 1
  // thickness 映射沿 TikZ 比例：thin=1（与默认一致）、ultra* 两端对称外推
  const strokeWidth =
    path.strokeWidth ?? (path.thickness ? THICKNESS_TO_WIDTH[path.thickness] : 1);
  const baseProps = {
    stroke: path.stroke ?? 'currentColor',
    strokeWidth,
    // path.fill 缺省 = 'none'（仅描边）；用户传具体颜色即填充。配合 cycle 闭合可画填充形状
    fill: path.fill ?? 'none',
    fillRule: path.fillRule,
    strokeDasharray: path.strokeDasharray,
    strokeLinecap: path.lineCap,
    strokeLinejoin: path.lineJoin,
    // path 级 opacity（IR `drawOpacity` → primitive `strokeOpacity`，与 Node 命名约定一致）
    opacity: path.opacity,
    fillOpacity: path.fillOpacity,
    strokeOpacity: path.drawOpacity,
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
    if (op.cmd === 'A') {
      // 中间的 '0' 是 x-axis-rotation；alpha.3 不暴露椭圆 tilt
      return `A ${round(op.rx)} ${round(op.ry)} 0 ${op.largeArc} ${op.sweep} ${round(op.point[0])} ${round(op.point[1])}`;
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
    return { primitives: [primitive, ...labelPrims], points };
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

  const groupPrim: ScenePrimitive = {
    type: 'group',
    children: subPathPrims,
  };
  return { primitives: [groupPrim, ...labelPrims], points };
};
