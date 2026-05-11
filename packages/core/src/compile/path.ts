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

/** IR path-level `arrow` + `arrowShape` → PathPrim 的 arrowStart/arrowEnd；arrowShape 默认 'normal' */
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
 * 按 arrow shape 决定线段从端点向内缩短多少（strokeWidth 倍）
 * @description 避免 hollow shape（open/openDiamond/openCircle）空心被 path 描边穿过：把线末端退到形状背面让 marker apex 正好落在原始端点。必须与 react/render/arrowMarkers.tsx 中 refX/形状一致：shrink = (apexX - refX) × markerWidth / viewBoxWidth。实心 shape apex/refX=10，line 被 fill 覆盖，shrink=0
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

/** 把 p 朝 target 方向移动 dist */
const shiftToward = (p: IRPosition, target: IRPosition, dist: number): IRPosition => {
  const dx = target[0] - p[0];
  const dy = target[1] - p[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0 || dist === 0) return p;
  return [p[0] + (dx / len) * dist, p[1] + (dy / len) * dist];
};

/**
 * 求 step.to 的参考点（给 boundary clip 算方向 / 折角 corner 用）
 * @description ADR-0004 三态：`'A'`(auto) 节点中心；`'A.<anchor>'`/`'A.<deg>'` 显式锚点 refPoint=endpoint 位置不随邻居变。直接坐标/极坐标解析为笛卡尔
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
  // rel/relAccumulate 已被 normalizeRelativeTargets 预解析；防御性守卫给 TS narrowing 用
  if (typeof target === 'object' && !Array.isArray(target) && ('rel' in target || 'relAccumulate' in target)) {
    return null;
  }
  return resolvePosition(target, nodeIndex);
};

/** 折角中间点：`-|` → (curr.x, prev.y)；`|-` → (prev.x, curr.y) */
const cornerOf = (
  prev: IRPosition,
  curr: IRPosition,
  via: '-|' | '|-',
): IRPosition =>
  via === '-|' ? [curr[0], prev[1]] : [prev[0], curr[1]];

/**
 * 在 toward 方向算 step.to 的实际绘制端点
 * @description 节点 auto `'A'`：按 shape 走 boundaryPointOf 求中心→toward 射线交点；命名 anchor/角度：位置已定不受 toward 影响；直接坐标/极坐标：解析后返回；失败返回 null
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
  // rel/relAccumulate 已被预解析；防御性守卫给 TS narrowing 用
  if (typeof target === 'object' && !Array.isArray(target) && ('rel' in target || 'relAccumulate' in target)) {
    return null;
  }
  return resolvePosition(target, nodeIndex);
};

/** 两个 IRPosition 两分量精确相等（未 round） */
const samePoint = (a: IRPosition | null, b: IRPosition | null): boolean =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1];

/**
 * 语义 stroke 档位 → 数值（user units）
 * @description 对齐 TikZ 比例（thin=0.4pt→1=默认 strokeWidth）：ultraThin 0.25、veryThin 0.5、thin 1、semithick 1.5、thick 2、veryThick 3、ultraThick 4。显式 strokeWidth 覆盖 thickness
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

/** 边标注默认字号 / 偏移量（ADR-0004） */
const LABEL_FONT_SIZE = 14;
const LABEL_LINE_HEIGHT_FACTOR = 1.2;
const LABEL_SIDE_OFFSET = 4;
const RAD_TO_DEG = 180 / Math.PI;

/** label.position → 段参数 t */
const tForLabelPosition = (pos: IRStepLabel['position']): number =>
  pos === 'near-start' ? 0.25 : pos === 'near-end' ? 0.75 : 0.5;

/**
 * step.label + 段采样 → TextPrim（sloped 时裹一层 group 旋转）
 * @description 默认 side='above'/position='midway'：above/below 锚点 y±offset、align=middle、baseline=bottom/top；left/right x±offset、align=end/start、baseline=middle；sloped 不偏移裹 group `rotate(angle x y)` 由切线 atan2 算（SVG y-down CW 正）。返回 primitive + viewBox 外接点
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
    // sloped：锚点不偏移；baseline=bottom 视觉上"在线上方"
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
    // sloped 旋转后用半径外接近似四角点
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

  // 非 sloped：锚点 + 文本块四角加进 bbox 候选（保守，避免裁掉）
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
 * rel/relAccumulate 目标解析为绝对 Position（step kind 不变，to 全为绝对坐标）
 * @description rel 不更新 prevEnd（TikZ `+`），relAccumulate 更新（TikZ `++`）。prevEnd 推进：有 to 的 kind 用 refPointOfTarget(to)；arc 用 arcEndPoint；circlePath/ellipsePath/cycle 不变。首步 rel 时 prevEnd 回退 [0,0]；解析失败保持原 step
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
      // prevEnd 不变
      continue;
    }
    if (step.kind === 'circlePath' || step.kind === 'ellipsePath') {
      out.push(step);
      // prevEnd 不变（笔位回圆心 = prevEnd 本身）
      continue;
    }
    if (step.kind === 'arc') {
      out.push(step);
      if (prevEnd) {
        prevEnd = arcEndPoint(prevEnd, step.radius, step.endAngle);
      }
      continue;
    }

    // 有 to 字段的 step：move/line/step(fold)/curve/cubic/bend
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
 * IR Path → PathPrim
 * @description 每个绘制段独立用节点中心算两端 boundary clip——中段节点的入/出 boundary 点通常不同，path 在该节点可见"断开"（与 TikZ `\draw (A)--(B)--(C);` 段独立 clip 一致）。仍产一个 PathPrim：d 用多组 `M..L..` 表达 sub-path；段起点等于上段终点时复用 cursor 省 M。cycle 段闭回最近 move 起点，起点==lastEnd && 终点==subPathStart 时输出 `Z`，否则显式画段 line。引用未定义节点/解析失败返回 null
 */
export const emitPathPrimitive = (
  path: IRPath,
  nodeIndex: Map<string, NodeLayout>,
  round: (n: number) => number,
  measureText: TextMeasurer = fallbackMeasurer,
): { primitives: Array<ScenePrimitive>; points: Array<IRPosition> } | null => {
  // 先把 rel/relAccumulate 解析为绝对坐标，后续算法可统一按绝对坐标处理
  const steps = normalizeRelativeTargets(path.children, nodeIndex);
  if (steps.length < 2) return null;

  /** 每段 step.label 翻译出的 TextPrim（或 sloped 旋转的 group），与 path 主体同级返回（ADR-0004） */
  const labelPrims: Array<ScenePrimitive> = [];

  /** 算 sample 后 emitLabelPrimitive，结果累积到 labelPrims/points */
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

  // "无 to" 的 step kinds：cycle / arc / circlePath / ellipsePath（ADR-0002）
  type StepWithTo = Exclude<
    IRStep,
    { kind: 'cycle' } | { kind: 'arc' } | { kind: 'circlePath' } | { kind: 'ellipsePath' }
  >;
  const hasTo = (s: IRStep): s is StepWithTo =>
    s.kind !== 'cycle' &&
    s.kind !== 'arc' &&
    s.kind !== 'circlePath' &&
    s.kind !== 'ellipsePath';

  // 每个 step 的几何参考点（节点中心/直接坐标）；无 to 的 step kind 给 null
  const anchors: Array<IRPosition | null> = steps.map(s =>
    hasTo(s) ? refPointOfTarget(s.to, nodeIndex) : null,
  );

  /** 找 i 之前最近的"有 to 字段的 step" 及其 anchor */
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

  /** 找 i 之前最近的 move 的 to，cycle 闭合的目标 */
  const findRecentMoveTo = (i: number): IRTarget | null => {
    for (let j = i - 1; j >= 0; j--) {
      const s = steps[j];
      if (s.kind === 'move') {
        return s.to;
      }
    }
    return null;
  };

  /** 单个 path 操作；shrink 阶段按 cmd 找首/末有 point 的项 */
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
   * 笔位覆盖：arc/circlePath/ellipsePath 无 `to` 字段不能用 prev.step.to 重算起点
   * @description 设置 penOverride 让下个绘制段直接用此点当 fromClip 后清空。arc=弧终点（同 SVG cursor）；circlePath/ellipsePath=center（ADR-0002 "画完留在圆心"，需靠 startSegment 发 M teleport 回中心）
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
    // 曲线视觉范围不超过控制点+端点凸包
    points.push(control);
    points.push(p);
    lastEnd = p;
  };
  const emitC = (c1: IRPosition, c2: IRPosition, p: IRPosition) => {
    ops.push({ cmd: 'C', control1: c1, control2: c2, point: p });
    // 控制点纳入 bbox（保守，实际 bezier 包络小于凸包）
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
    // 弧端点入 bbox；arc 极值候选（90°·k 轴向点）由各 compile 分支单独 push（circle/ellipse 已显式 push 四点）
    points.push(p);
    lastEnd = p;
  };
  /** 段起点：与 lastEnd 相同则复用 cursor（省 M），否则发 M */
  const startSegment = (p: IRPosition) => {
    if (samePoint(p, lastEnd)) return;
    emitM(p);
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // move 自身不绘制；其 to 仅供下个绘制段的 findPrev 引用
    if (step.kind === 'move') continue;

    if (step.kind === 'cycle') {
      const moveTo = findRecentMoveTo(i);
      const prev = findPrev(i);
      if (!moveTo || !prev) continue; // 没 move/prev cycle 无意义
      const moveAnchor = refPointOfTarget(moveTo, nodeIndex);
      if (!moveAnchor) return null;

      const fromClip = clipForTarget(prev.step.to, moveAnchor, nodeIndex);
      const toClip = clipForTarget(moveTo, prev.anchor, nodeIndex);
      if (!fromClip || !toClip) return null;

      // 起点 == lastEnd 且终点 == subPathStart → Z 收尾最干净
      if (samePoint(fromClip, lastEnd) && samePoint(toClip, subPathStart)) {
        emitZ();
        continue;
      }
      // 否则段独立：重新 M 起点再 L 到终点（不再用 Z，避免回到错误的 subPathStart）
      startSegment(fromClip);
      emitL(toClip);
      continue;
    }

    // 其他 step 都需 prev（找 cursor 起点/圆心）；currAnchor 仅有 to 的 step 才需
    const prev = findPrev(i);
    if (!prev) return null;

    if (step.kind === 'arc') {
      // 圆心 = 上一 step anchor (refPoint)
      const center = prev.anchor;
      const startPt = arcEndPoint(center, step.radius, step.startAngle);
      const endPt = arcEndPoint(center, step.radius, step.endAngle);
      const flags = arcSvgFlags(step.startAngle, step.endAngle);

      startSegment(startPt);
      emitA(step.radius, step.radius, flags.largeArc, flags.sweep, endPt);

      // 弧的极值点（90°·k 候选）算进 bbox
      for (const p of arcBoundingPoints(center, step.radius, step.startAngle, step.endAngle)) {
        points.push(p);
      }
      collectLabel(step, t =>
        arcSegmentSample(center, step.radius, step.startAngle, step.endAngle, t),
      );
      // 后续段从弧终点继续（emitA 已把 lastEnd 设为 endPt）
      penOverride = endPt;
      continue;
    }

    if (step.kind === 'circlePath') {
      // 圆心 = 上一 step anchor；起点取圆周右侧（0°）
      const center = prev.anchor;
      const r = step.radius;
      const right: IRPosition = [center[0] + r, center[1]];
      const left: IRPosition = [center[0] - r, center[1]];

      startSegment(right);
      // 第 1 段右半圆 sweep=1（polar 约定下顺时针视觉，从右上到左）
      emitA(r, r, 0, 1, left);
      // 第 2 段左半圆 sweep=1 闭回起点
      emitA(r, r, 0, 1, right);

      // 整圆顶/底/左/右四点
      points.push([center[0] + r, center[1]]);
      points.push([center[0] - r, center[1]]);
      points.push([center[0], center[1] + r]);
      points.push([center[0], center[1] - r]);

      collectLabel(step, t => circleSegmentSample(center, r, t));

      // 画完笔位回 center（ADR-0002）；lastEnd 保留 SVG 实际 cursor（= right），下段用 penOverride=center 触发 startSegment 发 M
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

    // arc/circlePath/ellipsePath 后 penOverride 决定下段起点（弧终点/圆心）；
    // 普通段继续对 prev.step.to 做 boundary clip（节点 ref 段独立 clip）。用完即清空
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

    // step.kind === 'step' (fold)
    const corner = cornerOf(prev.anchor, currAnchor, step.via);
    const fromClip = usedOverride ?? clipForTarget(prev.step.to, corner, nodeIndex);
    const toClip = clipForTarget(step.to, corner, nodeIndex);
    if (!fromClip || !toClip) return null;
    startSegment(fromClip);
    emitL(corner);
    emitL(toClip);
    collectLabel(step, t => foldSegmentSample(fromClip, corner, toClip, t));
  }

  // strokeWidth 解析：显式 strokeWidth > thickness 档位 > 默认 1
  const strokeWidth =
    path.strokeWidth ?? (path.thickness ? THICKNESS_TO_WIDTH[path.thickness] : 1);
  const baseProps = {
    stroke: path.stroke ?? 'currentColor',
    strokeWidth,
    // path.fill 缺省 'none'（仅描边）；传颜色即填充，可配 cycle 闭合画填充形状
    fill: path.fill ?? 'none',
    fillRule: path.fillRule,
    strokeDasharray: path.strokeDasharray,
    strokeLinecap: path.lineCap,
    strokeLinejoin: path.lineJoin,
    // IR `drawOpacity` → primitive `strokeOpacity`（与 Node 命名一致）
    opacity: path.opacity,
    fillOpacity: path.fillOpacity,
    strokeOpacity: path.drawOpacity,
  };

  const markers = arrowMarkers(path.arrow, path.arrowShape);
  const hasArrows = !!markers.arrowStart || !!markers.arrowEnd;

  // 按 shape 把首/末段端点向内缩短，避免 hollow 形状（如 open）空心被描边穿过；shrink=0 的实心 shape 跳过
  const shrinkStart = markers.arrowStart ? SHRINK_FOR_SHAPE[markers.arrowStart] : 0;
  const shrinkEnd = markers.arrowEnd ? SHRINK_FOR_SHAPE[markers.arrowEnd] : 0;

  if (shrinkStart > 0) {
    // 找首个 M 与其后第一个有坐标的 op（定方向）
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
    // 末尾最后一个有坐标的 op（跳过 Z）与其前最近一个有坐标的 op
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
      // 中间 '0' 是 x-axis-rotation（不暴露椭圆 tilt）
      return `A ${round(op.rx)} ${round(op.ry)} 0 ${op.largeArc} ${op.sweep} ${round(op.point[0])} ${round(op.point[1])}`;
    }
    return `${op.cmd} ${round(op.point[0])} ${round(op.point[1])}`;
  });

  // 每个 sub-path 起始 token 索引（每个 'M ...' 是新 sub-path）
  const subPathStarts: Array<number> = [];
  tokens.forEach((tok, idx) => {
    if (tok.startsWith('M ')) subPathStarts.push(idx);
  });

  // 单 sub-path 或无箭头 → 一个 PathPrim
  if (!hasArrows || subPathStarts.length <= 1) {
    const primitive: PathPrim = {
      type: 'path',
      d: tokens.join(' '),
      ...baseProps,
      ...markers,
    };
    return { primitives: [primitive, ...labelPrims], points };
  }

  // 多 sub-path + 有箭头：split 成多个 PathPrim 各挂"首段 marker-start/末段 marker-end"用 GroupPrim 包；
  // 否则 SVG marker 会按每个 sub-path 单独贴在中间节点视觉错乱
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
