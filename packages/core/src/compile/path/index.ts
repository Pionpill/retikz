import { arcBoundingPoints, arcEndPoint } from '../../geometry/arc';
import { bendControlPoints } from '../../geometry/bend';
import {
  type SegmentSample,
  arcSegmentSample,
  circleSegmentSample,
  cubicSegmentSample,
  ellipseSegmentSample,
  foldSegmentSample,
  lineSegmentSample,
  quadSegmentSample,
} from '../../geometry/segment';
import type {
  IRPath,
  IRPosition,
  IRStep,
  IRTarget,
} from '../../ir';
import type {
  PathCommand,
  ScenePrimitive,
  Transform,
} from '../../primitive';
import type { AssertEqual } from '../../types';
import type { NameStack } from '../name-stack';
import { type TextMeasurer, fallbackMeasurer } from '../text-metrics';
import { clipForTarget, cornerOf, refPointOfTarget, samePoint } from './anchor';
import { emitLabelPrimitive, tForLabelPosition } from './label';
import { normalizeRelativeTargets } from './relative';
import { applyArrowShrinks, computeShrink, endpointArrows } from './shrink';
import { type PathBaseProps, splitSubPathsForEndpointArrows } from './split';

/**
 * 语义 stroke 档位 → 数值（user units）
 * @description 对齐 TikZ 比例（thin=0.4pt→1=默认 strokeWidth）：ultraThin 0.25、veryThin 0.5、thin 1、semithick 1.5、thick 2、veryThick 3、ultraThick 4。显式 strokeWidth 覆盖 thickness。
 * `as const satisfies` + `AssertEqual` 双约束：加 IRPath['thickness'] 档位时漏写 TS 报错（字段表互锁，同 ADR-06 主题）
 */
const THICKNESS_TO_WIDTH = {
  ultraThin: 0.25,
  veryThin: 0.5,
  thin: 1,
  semithick: 1.5,
  thick: 2,
  veryThick: 3,
  ultraThick: 4,
} as const satisfies Record<NonNullable<IRPath['thickness']>, number>;

/** 类型互锁完备性：THICKNESS_TO_WIDTH 的 key 集合必须与 IRPath['thickness'] 完全等价；漏键 / 多键 / 类型错位 → AssertEqual = false → 下方常量赋值 TS 编译期报错 */
type _ThicknessCheck = AssertEqual<
  keyof typeof THICKNESS_TO_WIDTH,
  NonNullable<IRPath['thickness']>
>;
const _assertThicknessCheck: _ThicknessCheck = true;
void _assertThicknessCheck;

/** emitPathPrimitive 可选 warn 钩子 */
export type EmitPathWarnHook = {
  /** 警告收集器（由 compileToScene 传入） */
  onWarn?: (warning: {
    code: string;
    message: string;
    path: string;
  }) => void;
  /** 当前 path 在 IR 中的 locator 前缀（如 `'children[3].path'`） */
  irPath?: string;
  /**
   * 该 path 所属 scope 的累积 Cartesian-only transform 链
   * @description step.to 内的 polar/at/offset 字面量按"当前 scope 局部度量 + 末端 apply chain"
   *   投影回全局；顶层 path / 无 scope chain 时为 `[]`（恒等，等价 v0.1 行为）
   */
  scopeChain?: ReadonlyArray<Transform>;
};

/**
 * IR Path → PathPrim
 * @description 每个绘制段独立用节点中心算两端 boundary clip——中段节点的入/出 boundary 点通常不同，path 在该节点可见"断开"（与 TikZ `\draw (A)--(B)--(C);` 段独立 clip 一致）。仍产一个 PathPrim：commands 用多组 move/line 表达 sub-path；段起点等于上段终点时复用 cursor 省 move。cycle 段闭回最近 move 起点，起点==lastEnd && 终点==subPathStart 时输出 close，否则显式画段 line。引用未定义节点/解析失败返回 null，并通过 `warnHook.onWarn` 同步触发 warning
 */
export const emitPathPrimitive = (
  path: IRPath,
  nameStack: NameStack,
  round: (n: number) => number,
  measureText: TextMeasurer = fallbackMeasurer,
  warnHook: EmitPathWarnHook = {},
): { primitives: Array<ScenePrimitive>; points: Array<IRPosition> } | null => {
  const irPath = warnHook.irPath ?? 'path';
  const warn = (code: string, message: string, subPath = ''): void => {
    warnHook.onWarn?.({ code, message, path: subPath ? `${irPath}.${subPath}` : irPath });
  };
  const scopeChain = warnHook.scopeChain ?? [];
  // 先把 relative/relativeAccumulate 解析为绝对坐标，后续算法可统一按绝对坐标处理
  const steps = normalizeRelativeTargets(path.children, nameStack, scopeChain);
  if (steps.length < 2) {
    warn(
      'PATH_TOO_SHORT',
      `Path requires at least 2 steps (got ${steps.length}); the entire path is skipped`,
      'children',
    );
    return null;
  }

  /** 每段 step.label 翻译出的 TextPrim（或 sloped 旋转的 group），与 path 主体同级返回 */
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
    const r = emitLabelPrimitive(step.label, sample, measureText, round, path.opacity);
    labelPrims.push(r.primitive);
    for (const p of r.points) points.push(p);
  };

  // "无 to" 的 step kinds：cycle / arc / circlePath / ellipsePath
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
  const anchors: Array<IRPosition | null> = steps.map((s, idx) => {
    if (!hasTo(s)) return null;
    const ref = refPointOfTarget(s.to, nameStack, scopeChain);
    if (!ref && typeof s.to === 'string') {
      warn(
        'UNRESOLVED_NODE_REFERENCE',
        `Step.to references undefined node id '${s.to}'; the entire path is skipped`,
        `children[${idx}].to`,
      );
    }
    return ref;
  });

  /**
   * 单调指针：最近一个 hasTo step 的索引；主循环开头根据上一 step 推进；O(1) 读
   * @description 旧实现 findPrev(i) 反向扫 anchors 数组每步 O(i)、整 path O(n²)；改为只在 step `i-1` 是 hasTo 时推进。anchor 失效"中毒"判断保留：lastHasToIdx 指向的 anchor 为 null 时 findPrev 返回 null，与旧"扫到第一个 hasTo 步若 anchor=null 返回 null"语义等价
   */
  let lastHasToIdx = -1;
  /** 同步维护：最近一个 move 步的 `to`，给 cycle 闭合用；旧 findRecentMoveTo 反向扫 → O(1) */
  let lastMoveTo: IRTarget | null = null;

  /** 找最近一个"有 to 字段的 step" 及其 anchor；O(1) 读 lastHasToIdx */
  const findPrev = (): { step: StepWithTo; anchor: IRPosition } | null => {
    if (lastHasToIdx === -1) return null;
    const s = steps[lastHasToIdx];
    if (!hasTo(s)) return null; // defensive：lastHasToIdx 只在 hasTo 时被推进
    const a = anchors[lastHasToIdx];
    if (!a) return null;
    return { step: s, anchor: a };
  };

  const commands: Array<PathCommand> = [];
  const points: Array<IRPosition> = [];
  let lastEnd: IRPosition | null = null;
  let subPathStart: IRPosition | null = null;
  /**
   * 笔位覆盖：arc/circlePath/ellipsePath 无 `to` 字段不能用 prev.step.to 重算起点
   * @description 设置 penOverride 让下个绘制段直接用此点当 fromClip 后清空。arc=弧终点；circlePath/ellipsePath=center（"画完留在圆心"）
   */
  let penOverride: IRPosition | null = null;

  const roundPoint = (p: IRPosition): IRPosition => [round(p[0]), round(p[1])];

  const emitMove = (p: IRPosition) => {
    const rp = roundPoint(p);
    commands.push({ kind: 'move', to: [rp[0], rp[1]] });
    points.push(p);
    subPathStart = p;
    lastEnd = p;
  };
  const emitLine = (p: IRPosition) => {
    const rp = roundPoint(p);
    commands.push({ kind: 'line', to: [rp[0], rp[1]] });
    points.push(p);
    lastEnd = p;
  };
  const emitClose = () => {
    commands.push({ kind: 'close' });
    lastEnd = subPathStart;
  };
  const emitQuad = (control: IRPosition, p: IRPosition) => {
    const rc = roundPoint(control);
    const rp = roundPoint(p);
    commands.push({
      kind: 'quad',
      control: [rc[0], rc[1]],
      to: [rp[0], rp[1]],
    });
    // 曲线视觉范围不超过控制点+端点凸包
    points.push(control);
    points.push(p);
    lastEnd = p;
  };
  const emitCubic = (c1: IRPosition, c2: IRPosition, p: IRPosition) => {
    const rc1 = roundPoint(c1);
    const rc2 = roundPoint(c2);
    const rp = roundPoint(p);
    commands.push({
      kind: 'cubic',
      control1: [rc1[0], rc1[1]],
      control2: [rc2[0], rc2[1]],
      to: [rp[0], rp[1]],
    });
    // 控制点纳入 bbox（保守，实际 bezier 包络小于凸包）
    points.push(c1);
    points.push(c2);
    points.push(p);
    lastEnd = p;
  };
  const emitArc = (
    center: IRPosition,
    radius: number,
    startAngle: number,
    endAngle: number,
  ) => {
    const rc = roundPoint(center);
    commands.push({
      kind: 'arc',
      center: [rc[0], rc[1]],
      radius: round(radius),
      startAngle,
      endAngle,
    });
    // 弧端点入 bbox；arc 极值候选（90°·k 轴向点）由各 compile 分支单独 push
    points.push(arcEndPoint(center, radius, endAngle));
    lastEnd = arcEndPoint(center, radius, endAngle);
  };
  const emitEllipseArc = (
    center: IRPosition,
    radiusX: number,
    radiusY: number,
    startAngle: number,
    endAngle: number,
  ) => {
    const rc = roundPoint(center);
    commands.push({
      kind: 'ellipseArc',
      center: [rc[0], rc[1]],
      radiusX: round(radiusX),
      radiusY: round(radiusY),
      startAngle,
      endAngle,
    });
    // 椭圆弧终点：未旋转椭圆 polar 投影
    const endPt: IRPosition = [
      center[0] + Math.cos((endAngle * Math.PI) / 180) * radiusX,
      center[1] + Math.sin((endAngle * Math.PI) / 180) * radiusY,
    ];
    points.push(endPt);
    lastEnd = endPt;
  };
  /** 段起点：与 lastEnd 相同则复用 cursor（省 move），否则发 move */
  const startSegment = (p: IRPosition) => {
    if (samePoint(p, lastEnd)) return;
    emitMove(p);
  };

  for (let i = 0; i < steps.length; i++) {
    // 单调推进：上一 step 若 hasTo，则它成为新的 lastHasToIdx；move 也是 hasTo（其 to 仍可作为下个段的 prev）
    if (i > 0) {
      const prevStep = steps[i - 1];
      if (hasTo(prevStep)) lastHasToIdx = i - 1;
      if (prevStep.kind === 'move') lastMoveTo = prevStep.to;
    }

    const step = steps[i];

    // move 自身不绘制；其 to 仅供下个绘制段的 findPrev 引用
    if (step.kind === 'move') continue;

    if (step.kind === 'cycle') {
      const moveTo = lastMoveTo;
      const prev = findPrev();
      if (!moveTo || !prev) continue; // 没 move/prev cycle 无意义
      const moveAnchor = refPointOfTarget(moveTo, nameStack, scopeChain);
      if (!moveAnchor) return null;

      const fromClip = clipForTarget(prev.step.to, moveAnchor, nameStack, scopeChain);
      const toClip = clipForTarget(moveTo, prev.anchor, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;

      // 起点 == lastEnd 且终点 == subPathStart → close 收尾最干净
      if (samePoint(fromClip, lastEnd) && samePoint(toClip, subPathStart)) {
        emitClose();
        continue;
      }
      // 否则段独立：重新 move 起点再 line 到终点（不再用 close，避免回到错误的 subPathStart）
      startSegment(fromClip);
      emitLine(toClip);
      continue;
    }

    // 其他 step 都需 prev（找 cursor 起点/圆心）；currAnchor 仅有 to 的 step 才需
    const prev = findPrev();
    if (!prev) return null;

    if (step.kind === 'arc') {
      // 圆心 = 上一 step anchor (refPoint)
      const center = prev.anchor;
      const startPt = arcEndPoint(center, step.radius, step.startAngle);
      const endPt = arcEndPoint(center, step.radius, step.endAngle);

      startSegment(startPt);
      emitArc(center, step.radius, step.startAngle, step.endAngle);

      // 弧的极值点（90°·k 候选）算进 bbox
      for (const p of arcBoundingPoints(center, step.radius, step.startAngle, step.endAngle)) {
        points.push(p);
      }
      collectLabel(step, t =>
        arcSegmentSample(center, step.radius, step.startAngle, step.endAngle, t),
      );
      // 后续段从弧终点继续（emitArc 已把 lastEnd 设为 endPt）
      penOverride = endPt;
      continue;
    }

    if (step.kind === 'circlePath') {
      // 圆心 = 上一 step anchor；以 ellipseArc 全 sweep 表达整圆
      const center = prev.anchor;
      const r = step.radius;
      const right: IRPosition = [center[0] + r, center[1]];

      startSegment(right);
      emitEllipseArc(center, r, r, 0, 360);

      // 整圆顶/底/左/右四点
      points.push([center[0] + r, center[1]]);
      points.push([center[0] - r, center[1]]);
      points.push([center[0], center[1] + r]);
      points.push([center[0], center[1] - r]);

      collectLabel(step, t => circleSegmentSample(center, r, t));

      // 画完笔位回 center；下段用 penOverride=center 触发 startSegment 发 move
      penOverride = center;
      continue;
    }

    if (step.kind === 'ellipsePath') {
      const center = prev.anchor;
      const rx = step.radiusX;
      const ry = step.radiusY;
      const right: IRPosition = [center[0] + rx, center[1]];

      startSegment(right);
      emitEllipseArc(center, rx, ry, 0, 360);

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
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, currAnchor, nameStack, scopeChain);
      const toClip = clipForTarget(step.to, prev.anchor, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitLine(toClip);
      collectLabel(step, t => lineSegmentSample(fromClip, toClip, t));
      continue;
    }

    if (step.kind === 'curve') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, step.control, nameStack, scopeChain);
      const toClip = clipForTarget(step.to, step.control, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitQuad(step.control, toClip);
      collectLabel(step, t => quadSegmentSample(fromClip, step.control, toClip, t));
      continue;
    }
    if (step.kind === 'cubic') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, step.control1, nameStack, scopeChain);
      const toClip = clipForTarget(step.to, step.control2, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitCubic(step.control1, step.control2, toClip);
      collectLabel(step, t =>
        cubicSegmentSample(fromClip, step.control1, step.control2, toClip, t),
      );
      continue;
    }
    if (step.kind === 'bend') {
      const angle = step.bendAngle ?? 30;
      const [c1, c2] = bendControlPoints(prev.anchor, currAnchor, step.bendDirection, angle);
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, c1, nameStack, scopeChain);
      const toClip = clipForTarget(step.to, c2, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitCubic(c1, c2, toClip);
      collectLabel(step, t => cubicSegmentSample(fromClip, c1, c2, toClip, t));
      continue;
    }

    // step.kind === 'step' (fold)
    const corner = cornerOf(prev.anchor, currAnchor, step.via);
    const fromClip = usedOverride ?? clipForTarget(prev.step.to, corner, nameStack, scopeChain);
    const toClip = clipForTarget(step.to, corner, nameStack, scopeChain);
    if (!fromClip || !toClip) return null;
    startSegment(fromClip);
    emitLine(corner);
    emitLine(toClip);
    collectLabel(step, t => foldSegmentSample(fromClip, corner, toClip, t));
  }

  // strokeWidth 解析：显式 strokeWidth > thickness 档位 > 默认 1
  const strokeWidth =
    path.strokeWidth ?? (path.thickness ? THICKNESS_TO_WIDTH[path.thickness] : 1);
  const baseProps: PathBaseProps = {
    stroke: path.stroke ?? 'currentColor',
    strokeWidth,
    // path.fill 缺省 'none'（仅描边）；传颜色即填充，可配 cycle 闭合画填充形状
    fill: path.fill ?? 'none',
    fillRule: path.fillRule,
    dashPattern: path.dashPattern,
    strokeLinecap: path.lineCap,
    strokeLinejoin: path.lineJoin,
    // IR `drawOpacity` → primitive `strokeOpacity`（与 Node 命名一致）
    opacity: path.opacity,
    fillOpacity: path.fillOpacity,
    strokeOpacity: path.drawOpacity,
  };

  const arrows = endpointArrows(path.arrow, path.arrowDetail);

  // 按 shape + spec（length / scale / lineWidth）把首/末段端点向内缩短，让 line 端点接在 hollow arrow 尾部外缘，不贯穿 back outline；shrink=0 的实心 shape 跳过
  const shrinkStart = arrows.arrowStart ? computeShrink(arrows.arrowStart) : 0;
  const shrinkEnd = arrows.arrowEnd ? computeShrink(arrows.arrowEnd) : 0;
  applyArrowShrinks(commands, shrinkStart, shrinkEnd, strokeWidth, round);

  const { primitive } = splitSubPathsForEndpointArrows(commands, baseProps, arrows);
  return { primitives: [primitive, ...labelPrims], points };
};
