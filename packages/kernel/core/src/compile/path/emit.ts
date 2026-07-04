import { arcBoundingPoints, arcEndPoint, curve, ellipseArcBoundingPoints, ellipseArcPoint } from '@retikz/math';

import type {
  GroupPrim,
  PathCommand,
  ResolvedArrowEndSpec,
  ScenePrimitive,
} from '../../contract';
import type { IRPath, IRPathBase, IRPosition, IRStep, IRTarget } from '../../schemas';
import type { AssertEqual } from '../../shared';
import type { SegmentSample } from '../../shared/geometry';
import type { NameStack } from '../name-stack';
import type { PaintResolver } from '../resource';
import type { TextMeasurer } from '../text';
import type { PathBaseProps } from './split';
import type { EmitPathWarnHook } from './types';

import { resolveArrowRegistry } from '../../providers/arrow';
import {
  arcSegmentSample,
  bendControlPoints,
  circleSegmentSample,
  cubicSegmentSample,
  DEG_TO_RAD,
  ellipseArcSegmentSample,
  ellipseSegmentSample,
  foldSegmentSample,
  lineSegmentSample,
  outInControlPoints,
  quadSegmentSample,
  rectOutline,
  rectPerimeterSample,
} from '../../shared/geometry';
import { CompileWarningCode } from '../constant';
import { resolveShadow } from '../style';
import { fallbackMeasurer } from '../text';
import { clipForTarget, cornerOf, isAutoBoundaryTarget, refPointOfTarget, samePoint } from './anchor';
import { resolveGeneratorCommands } from './generator';
import { emitLabelPrimitive, tForLabelPosition } from './label';
import { assertArrowCanInheritStroke, buildMarkMarkerGroup, markerContextStroke } from './marks';
import { normalizeRelativeTargets } from './relative';
import { applyRoundedCorners, sampleRoundedCommands } from './rounded-corners';
import { applyArrowShrinks, resolveEndpointArrowMark, resolveMarkArrowSpec } from './shrink';
import { splitSubPathsForEndpointArrows } from './split';
import { bboxCenter, buildPathTransforms, projectPathTransformPoints } from './transform';

/**
 * referent（offset.of / polar.origin 的并集形态：节点 id 字符串 / `[x, y]` 字面量 / 嵌套 PolarPosition）里挖节点 id
 * @description 裸字符串即节点 id（offset.of / polar.origin 的 string 分支语义）；其余交回 nodeRefId 递归。
 */
const referentNodeId = (ref: unknown): string | undefined =>
  typeof ref === 'string' ? ref : nodeRefId(ref as IRTarget);

/** 从目标里提取一个代表性节点 id，用于 unresolved 诊断。 */
const nodeRefId = (t: IRTarget): string | undefined => {
  if (typeof t !== 'object' || Array.isArray(t)) return undefined;
  if ('id' in t) return t.id;
  if ('between' in t) return nodeRefId(t.between[0]) ?? nodeRefId(t.between[1]);
  if ('of' in t) return referentNodeId((t as { of: unknown }).of);
  if ('origin' in t) return referentNodeId((t as { origin?: unknown }).origin);
  return undefined;
};

/** 有限坐标点 `[number, number]` */
const isFinitePoint = (pt: unknown): boolean =>
  Array.isArray(pt) &&
  pt.length >= 2 &&
  typeof pt[0] === 'number' &&
  Number.isFinite(pt[0]) &&
  typeof pt[1] === 'number' &&
  Number.isFinite(pt[1]);

/**
 * 语义 stroke 档位 → 数值（user units）
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

/** 类型互锁：语义 stroke 档位必须全部映射到数值宽度。 */
type _ThicknessCheck = AssertEqual<keyof typeof THICKNESS_TO_WIDTH, NonNullable<IRPath['thickness']>>;
const _assertThicknessCheck: _ThicknessCheck = true;
void _assertThicknessCheck;

/**
 * IR Path → PathPrim
 * @description 解析失败返回 null，并通过 `warnHook.onWarn` 报告 warning。
 */
export const emitPathPrimitive = (
  path: IRPathBase,
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
  // paint 解析：有 registry 走去重派 id；无（直调）时纯色透传、PaintSpec 退化为 undefined
  const resolvePaint: PaintResolver =
    warnHook.resolvePaint ?? (p => (typeof p === 'string' || p === undefined ? p : undefined));
  if (path.children === undefined) {
    throw new Error('Stroke path requires `children` steps.');
  }
  // 先把 relative/relativeAccumulate 解析为绝对坐标，后续算法可统一按绝对坐标处理
  const steps = normalizeRelativeTargets(path.children, nameStack, scopeChain);
  // 自包含 shape step（rectangle 自带 from/to 两对角、不依赖游标）单独成 path 合法；
  // 其余 step 需"起点 + 至少一段绘制"故最少 2 段
  const soloSelfContained = steps.length === 1 && steps[0].kind === 'rectangle';
  if (steps.length < 2 && !soloSelfContained) {
    warn(
      CompileWarningCode.PathTooShort,
      `Path requires at least 2 steps (got ${steps.length}); the entire path is skipped`,
      'children',
    );
    return null;
  }

  /** 每段 step.label 翻译出的 TextPrim（或 sloped 旋转的 group），与 path 主体同级返回 */
  const labelPrims: Array<ScenePrimitive> = [];

  /**
   * 每个绘制段的几何采样器（按声明序）；中段 marking 用——把整条 path 的 pos∈[0,1] 分摊到 N 段
   * @description 与 step label 同款便宜模型：N 段等分 pos 区间，pos 落在第 ⌊pos·N⌋ 段、段内参数 = 余数；
   *   段内 t 的几何含义随段类型（line/step 弧长、curve/cubic/bend Bezier 参数、arc 角度），由各 `*SegmentSample` 决定。
   */
  const segmentSamplers: Array<(t: number) => SegmentSample> = [];

  /** 算 sample 后 emitLabelPrimitive，结果累积到 labelPrims/points；同时登记本段采样器供 marks 用 */
  const collectLabel = (step: IRStep, sampleAt: (t: number) => SegmentSample): void => {
    segmentSamplers.push(sampleAt);
    if (step.kind === 'move' || step.kind === 'cycle' || !('label' in step) || !step.label) {
      return;
    }
    const t = tForLabelPosition(step.label.position);
    const sample = sampleAt(t);
    const r = emitLabelPrimitive(step.label, sample, measureText, round, path.opacity, {
      lowerTex: warnHook.lowerTex,
      gatingOn: warnHook.lowerTex !== undefined,
      warn: (code, message) => warn(code, message, 'label'),
    });
    labelPrims.push(r.primitive);
    for (const p of r.points) points.push(p);
  };

  // "无必有 to（不当普通 boundary clip 段处理）" 的 step kinds：
  // cycle / arc / circlePath / ellipsePath / rectangle / generator（generator 的 to 可选、由 generate 消费）
  type StepWithTo = Exclude<
    IRStep,
    | { kind: 'cycle' }
    | { kind: 'arc' }
    | { kind: 'circlePath' }
    | { kind: 'ellipsePath' }
    | { kind: 'rectangle' }
    | { kind: 'smooth' }
    | { kind: 'generator' }
  >;
  const hasTo = (s: IRStep): s is StepWithTo =>
    s.kind !== 'cycle' &&
    s.kind !== 'arc' &&
    s.kind !== 'circlePath' &&
    s.kind !== 'ellipsePath' &&
    s.kind !== 'rectangle' &&
    s.kind !== 'smooth' &&
    s.kind !== 'generator';

  // 每个 step 的几何参考点（节点中心/直接坐标）；无 to 的 step kind 给 null
  const anchors: Array<IRPosition | null> = steps.map((s, idx) => {
    if (!hasTo(s)) return null;
    const ref = refPointOfTarget(s.to, nameStack, scopeChain);
    const toId = nodeRefId(s.to);
    if (!ref && toId !== undefined) {
      warn(
        CompileWarningCode.UnresolvedNodeReference,
        `Step.to references undefined node id '${toId}'; the entire path is skipped`,
        `children[${idx}].to`,
      );
    }
    return ref;
  });

  /** 最近一个 hasTo step 的索引，供主循环 O(1) 读取。 */
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
  /**
   * 与 commands 一一对应的来源 step kind（roundedCorners 倒角用：判定接缝两侧是否均为 line step）
   * @description 由 emit* 闭包按当前 `currentStepKind` 同步 push；fold 产两条 line 但记 'fold'（接缝保持尖），
   *   cycle 的 close 记 'cycle'，rectangle / generator 等记各自 kind。
   */
  const provenance: Array<string> = [];
  /** 主循环每轮置为当前 step.kind，emit* 据此打 provenance 标 */
  let currentStepKind = '';
  const points: Array<IRPosition> = [];
  let lastEnd: IRPosition | null = null;
  let subPathStart: IRPosition | null = null;
  /**
   * 笔位覆盖：arc/circlePath/ellipsePath 无 `to` 字段不能用 prev.step.to 重算起点
   * @description 设置 penOverride 让下个绘制段直接用此点当 fromClip 后清空。arc=弧终点；circlePath/ellipsePath=center（"画完留在圆心"）
   */
  let penOverride: IRPosition | null = null;

  /**
   * 读当前游标（生成器分支用）
   * @description 经函数边界读 `lastEnd`，让 TS 用其声明类型（`IRPosition | null`）而非按分支位置 narrow
   *   成字面 `null`——generator 分支在源码上位于 lastEnd 各赋值点之前，直接读会被误判恒 null
   */
  const readCursor = (): IRPosition | null => lastEnd;

  const roundPoint = (p: IRPosition): IRPosition => [round(p[0]), round(p[1])];

  const endpointSource = {
    firstAutoBoundary: false,
    lastAutoBoundary: false,
  };
  const noteEndpointSource = (sourceAutoBoundary: boolean): void => {
    if (commands.length === 0) endpointSource.firstAutoBoundary = sourceAutoBoundary;
    endpointSource.lastAutoBoundary = sourceAutoBoundary;
  };

  const emitMove = (p: IRPosition, sourceAutoBoundary = false) => {
    noteEndpointSource(sourceAutoBoundary);
    const rp = roundPoint(p);
    commands.push({ kind: 'move', to: [rp[0], rp[1]] });
    provenance.push(currentStepKind);
    points.push(p);
    subPathStart = p;
    lastEnd = p;
  };
  const emitLine = (p: IRPosition, sourceAutoBoundary = false) => {
    noteEndpointSource(sourceAutoBoundary);
    const rp = roundPoint(p);
    commands.push({ kind: 'line', to: [rp[0], rp[1]] });
    provenance.push(currentStepKind);
    points.push(p);
    lastEnd = p;
  };
  const emitClose = () => {
    commands.push({ kind: 'close' });
    provenance.push(currentStepKind);
    lastEnd = subPathStart;
  };
  const emitQuad = (control: IRPosition, p: IRPosition, sourceAutoBoundary = false) => {
    noteEndpointSource(sourceAutoBoundary);
    const rc = roundPoint(control);
    const rp = roundPoint(p);
    commands.push({
      kind: 'quad',
      control: [rc[0], rc[1]],
      to: [rp[0], rp[1]],
    });
    provenance.push(currentStepKind);
    // 曲线视觉范围不超过控制点+端点凸包
    points.push(control);
    points.push(p);
    lastEnd = p;
  };
  const emitCubic = (c1: IRPosition, c2: IRPosition, p: IRPosition, sourceAutoBoundary = false) => {
    noteEndpointSource(sourceAutoBoundary);
    const rc1 = roundPoint(c1);
    const rc2 = roundPoint(c2);
    const rp = roundPoint(p);
    commands.push({
      kind: 'cubic',
      control1: [rc1[0], rc1[1]],
      control2: [rc2[0], rc2[1]],
      to: [rp[0], rp[1]],
    });
    provenance.push(currentStepKind);
    // 控制点纳入 bbox（保守，实际 bezier 包络小于凸包）
    points.push(c1);
    points.push(c2);
    points.push(p);
    lastEnd = p;
  };
  const emitArc = (center: IRPosition, radius: number, startAngle: number, endAngle: number) => {
    noteEndpointSource(false);
    const rc = roundPoint(center);
    commands.push({
      kind: 'arc',
      center: [rc[0], rc[1]],
      radius: round(radius),
      startAngle,
      endAngle,
    });
    provenance.push(currentStepKind);
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
    noteEndpointSource(false);
    const rc = roundPoint(center);
    commands.push({
      kind: 'ellipseArc',
      center: [rc[0], rc[1]],
      radiusX: round(radiusX),
      radiusY: round(radiusY),
      startAngle,
      endAngle,
    });
    provenance.push(currentStepKind);
    // 椭圆弧终点：未旋转椭圆 polar 投影
    const endPt: IRPosition = [
      center[0] + Math.cos(endAngle * DEG_TO_RAD) * radiusX,
      center[1] + Math.sin(endAngle * DEG_TO_RAD) * radiusY,
    ];
    points.push(endPt);
    lastEnd = endPt;
  };
  /** 段起点：与 lastEnd 相同则复用 cursor（省 move），否则发 move */
  const startSegment = (p: IRPosition, sourceAutoBoundary = false) => {
    if (samePoint(p, lastEnd)) return;
    emitMove(p, sourceAutoBoundary);
  };

  /** 部分圆/椭圆的闭合模式：'open' 直接返回；'sector' 连回中心；缺省 / 误给 'closed' 回退 'chord' */
  const resolvePartialClosed = (
    closed: 'closed' | 'chord' | 'open' | 'sector' | undefined,
    idx: number,
  ): 'chord' | 'open' | 'sector' => {
    if (closed === 'open') return 'open';
    if (closed === 'sector') return 'sector';
    if (closed === 'closed') {
      warn(
        CompileWarningCode.PartialArcClosedInvalid,
        "Partial circle/ellipse (with angles) cannot use closed:'closed'; falling back to 'chord'",
        `children[${idx}]`,
      );
    }
    return 'chord';
  };

  for (let i = 0; i < steps.length; i++) {
    // 单调推进：上一 step 若 hasTo，则它成为新的 lastHasToIdx；move 也是 hasTo（其 to 仍可作为下个段的 prev）
    if (i > 0) {
      const prevStep = steps[i - 1];
      if (hasTo(prevStep)) lastHasToIdx = i - 1;
      if (prevStep.kind === 'move') lastMoveTo = prevStep.to;
    }

    const step = steps[i];
    currentStepKind = step.kind;

    // move 自身不绘制；其 to 仅供下个绘制段的 findPrev 引用。
    // 显式 move 开启新游标，必须切断 arc/circle/ellipse/rectangle/generator 留给下一绘制段的 penOverride。
    if (step.kind === 'move') {
      penOverride = null;
      continue;
    }

    if (step.kind === 'generator') {
      // 起点：当前游标（前一绘制段终点 / arc 等留下的 penOverride）；首段时回退最近 hasTo step 的 anchor。
      // 经闭包 readCursor 读 lastEnd/penOverride（循环外声明的宽类型 let，不被分支位置 narrow 成 null）
      const prevGen = findPrev();
      const fromGen: IRPosition = readCursor() ?? (prevGen ? prevGen.anchor : [0, 0]);
      // 终点：step.to resolve 后的世界坐标（无 to 则 undefined）
      const resolvedTo = step.to !== undefined ? refPointOfTarget(step.to, nameStack, scopeChain) : null;
      const toGen = resolvedTo ?? undefined;
      const generated = resolveGeneratorCommands({
        step,
        generators: warnHook.effectivePathGenerators,
        from: fromGen,
        ...(toGen !== undefined ? { to: toGen } : {}),
        round,
        resolveTargetParam: value => refPointOfTarget(value as IRTarget, nameStack, scopeChain) ?? undefined,
      });

      // 段起点：generator 首命令非 move 时补一个 move（与 lastEnd 相同则复用游标）
      startSegment(fromGen);
      for (const cmd of generated) {
        switch (cmd.kind) {
          case 'move':
            startSegment(cmd.to);
            break;
          case 'line':
            emitLine(cmd.to);
            break;
          case 'quad':
            emitQuad(cmd.control, cmd.to);
            break;
          case 'cubic':
            emitCubic(cmd.control1, cmd.control2, cmd.to);
            break;
          case 'arc':
            emitArc(cmd.center, cmd.radius, cmd.startAngle, cmd.endAngle);
            break;
          case 'ellipseArc':
            emitEllipseArc(cmd.center, cmd.radiusX, cmd.radiusY, cmd.startAngle, cmd.endAngle);
            break;
          case 'close':
            emitClose();
            break;
        }
      }

      // label 沿生成段定位：用段起点→末端的直线近似采样（midway 取中点）
      const genEnd = readCursor() ?? fromGen;
      collectLabel(step, t => lineSegmentSample(fromGen, genEnd, t));

      // 游标推进：后续段从生成段末端续接（penOverride 让下个 hasTo 段复用此点、不重发 move）
      penOverride = readCursor();
      continue;
    }

    if (step.kind === 'cycle') {
      const usedOverride = penOverride;
      penOverride = null;
      const moveTo = lastMoveTo;
      const prev = findPrev();
      if (!moveTo || (!prev && !usedOverride)) continue; // 没 move/cursor cycle 无意义
      const moveAnchor = refPointOfTarget(moveTo, nameStack, scopeChain);
      if (!moveAnchor) return null;

      const fromClip = usedOverride ?? (prev ? clipForTarget(prev.step.to, moveAnchor, nameStack, scopeChain) : null);
      const toClip = clipForTarget(moveTo, fromClip ?? prev?.anchor ?? moveAnchor, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;

      // 闭合段是 fromClip→toClip 的直线（无论走 close 还是 move+line）；登记采样器供中段 marks（cycle 无 label）
      segmentSamplers.push(t => lineSegmentSample(fromClip, toClip, t));

      // 起点 == lastEnd 且终点 == subPathStart → close 收尾最干净
      if (samePoint(fromClip, lastEnd) && samePoint(toClip, subPathStart)) {
        emitClose();
        continue;
      }
      // 否则段独立：重新 move 起点再 line 到终点（不再用 close，避免回到错误的 subPathStart）
      startSegment(fromClip, usedOverride === null && prev !== null && isAutoBoundaryTarget(prev.step.to));
      emitLine(toClip, isAutoBoundaryTarget(moveTo));
      continue;
    }

    if (step.kind === 'rectangle') {
      // 自包含：from/to 自带对角，不依赖 prev / 游标
      const fromPt = refPointOfTarget(step.from, nameStack, scopeChain);
      const toPt = refPointOfTarget(step.to, nameStack, scopeChain);
      if (!fromPt || !toPt) {
        const fromId = nodeRefId(step.from);
        const rectToId = nodeRefId(step.to);
        if (!fromPt && fromId !== undefined) {
          warn(
            CompileWarningCode.UnresolvedNodeReference,
            `Rectangle from references undefined node id '${fromId}'; the entire path is skipped`,
            `children[${i}].from`,
          );
        }
        if (!toPt && rectToId !== undefined) {
          warn(
            CompileWarningCode.UnresolvedNodeReference,
            `Rectangle to references undefined node id '${rectToId}'; the entire path is skipped`,
            `children[${i}].to`,
          );
        }
        return null;
      }
      let rectStart: IRPosition | null = null;
      for (const op of rectOutline(fromPt, toPt, step.cornerRadius)) {
        if (op.kind === 'move') {
          // 闭合形状必须起新子路径（不用 startSegment——pen 恰在起点时它会跳过 move，
          // 导致 close 闭回上一个 subPathStart 而非矩形自身起点）
          emitMove(op.to);
          rectStart = op.to;
        } else if (op.kind === 'line') {
          emitLine(op.to);
        } else if (op.kind === 'arc') {
          emitArc(op.center, op.radius, op.startAngle, op.endAngle);
        } else {
          emitClose();
        }
      }
      // bbox：外接矩形四角（直角与圆角同界——各边都触及包围线）
      const rx0 = Math.min(fromPt[0], toPt[0]);
      const rx1 = Math.max(fromPt[0], toPt[0]);
      const ry0 = Math.min(fromPt[1], toPt[1]);
      const ry1 = Math.max(fromPt[1], toPt[1]);
      points.push([rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]);
      // 周长采样器供中段 marks（沿矩形四边均分；忽略 cornerRadius）
      segmentSamplers.push(t => rectPerimeterSample(fromPt, toPt, t));
      // 后续 step 从矩形起点续
      if (rectStart) penOverride = rectStart;
      continue;
    }

    // 其他 step 都需 prev（找 cursor 起点/圆心）；currAnchor 仅有 to 的 step 才需
    const prev = findPrev();
    if (!prev) {
      warn(
        CompileWarningCode.PathTooShort,
        `Step '${step.kind}' requires a previous position; the entire path is skipped`,
        `children[${i}]`,
      );
      return null;
    }

    if (step.kind === 'arc') {
      // 圆心：显式 center 优先，否则游标（上一 step anchor，向后兼容）
      let center: IRPosition;
      if (step.center !== undefined) {
        const c = refPointOfTarget(step.center, nameStack, scopeChain);
        if (!c) {
          const centerId = nodeRefId(step.center);
          if (centerId !== undefined) {
            warn(
              CompileWarningCode.UnresolvedNodeReference,
              `Arc step center references undefined node id '${centerId}'; the entire path is skipped`,
              `children[${i}].center`,
            );
          }
          return null;
        }
        center = c;
      } else {
        center = prev.anchor;
      }

      if (typeof step.radius === 'object') {
        // 椭圆弧
        const rx = step.radius.x;
        const ry = step.radius.y;
        startSegment(ellipseArcPoint(center, rx, ry, step.startAngle));
        emitEllipseArc(center, rx, ry, step.startAngle, step.endAngle);
        for (const p of ellipseArcBoundingPoints(center, rx, ry, step.startAngle, step.endAngle)) {
          points.push(p);
        }
        collectLabel(step, t => ellipseArcSegmentSample(center, rx, ry, step.startAngle, step.endAngle, t));
        penOverride = ellipseArcPoint(center, rx, ry, step.endAngle);
        continue;
      }

      if (typeof step.radius === 'number') {
        // 正圆弧（输出与改造前一致，emitArc 不变）
        const r = step.radius;
        startSegment(arcEndPoint(center, r, step.startAngle));
        emitArc(center, r, step.startAngle, step.endAngle);
        for (const p of arcBoundingPoints(center, r, step.startAngle, step.endAngle)) {
          points.push(p);
        }
        collectLabel(step, t => arcSegmentSample(center, r, step.startAngle, step.endAngle, t));
        penOverride = arcEndPoint(center, r, step.endAngle);
        continue;
      }

      // 理论上 schema 已保证 radius 必填；这里保留编译期防御。
      warn(
        CompileWarningCode.ArcMissingRadius,
        'Arc step requires radius; the entire path is skipped',
        `children[${i}]`,
      );
      return null;
    }

    if (step.kind === 'circlePath') {
      // 圆心 = 上一 step anchor
      const center = prev.anchor;
      const r = step.radius;

      if (step.startAngle !== undefined && step.endAngle !== undefined) {
        // 部分圆
        const startA = step.startAngle;
        const endA = step.endAngle;
        startSegment(ellipseArcPoint(center, r, r, startA));
        emitEllipseArc(center, r, r, startA, endA);
        for (const p of ellipseArcBoundingPoints(center, r, r, startA, endA)) points.push(p);
        collectLabel(step, t => ellipseArcSegmentSample(center, r, r, startA, endA, t));
        const closing = resolvePartialClosed(step.closed, i);
        if (closing === 'chord') {
          emitClose(); // 弦：arcEnd → startPt + 收口
          penOverride = ellipseArcPoint(center, r, r, startA);
        } else if (closing === 'sector') {
          emitLine(center);
          emitClose();
          penOverride = center;
        } else {
          penOverride = ellipseArcPoint(center, r, r, endA); // open：停弧终点
        }
        continue;
      }

      // 整圆（无角度）：全 sweep，画完回 center（原行为）
      if (step.startAngle !== undefined || step.endAngle !== undefined) {
        warn(
          CompileWarningCode.PartialArcNeedsBothAngles,
          'circlePath needs both startAngle and endAngle for a partial circle; treated as a full circle',
          `children[${i}]`,
        );
      }
      startSegment([center[0] + r, center[1]]);
      emitEllipseArc(center, r, r, 0, 360);
      points.push([center[0] + r, center[1]]);
      points.push([center[0] - r, center[1]]);
      points.push([center[0], center[1] + r]);
      points.push([center[0], center[1] - r]);
      collectLabel(step, t => circleSegmentSample(center, r, t));
      penOverride = center;
      continue;
    }

    if (step.kind === 'ellipsePath') {
      const center = prev.anchor;
      const rx = step.radius.x;
      const ry = step.radius.y;

      if (step.startAngle !== undefined && step.endAngle !== undefined) {
        // 部分椭圆
        const startA = step.startAngle;
        const endA = step.endAngle;
        startSegment(ellipseArcPoint(center, rx, ry, startA));
        emitEllipseArc(center, rx, ry, startA, endA);
        for (const p of ellipseArcBoundingPoints(center, rx, ry, startA, endA)) points.push(p);
        collectLabel(step, t => ellipseArcSegmentSample(center, rx, ry, startA, endA, t));
        const closing = resolvePartialClosed(step.closed, i);
        if (closing === 'chord') {
          emitClose();
          penOverride = ellipseArcPoint(center, rx, ry, startA);
        } else if (closing === 'sector') {
          emitLine(center);
          emitClose();
          penOverride = center;
        } else {
          penOverride = ellipseArcPoint(center, rx, ry, endA);
        }
        continue;
      }

      // 整椭圆（无角度）：原行为
      if (step.startAngle !== undefined || step.endAngle !== undefined) {
        warn(
          CompileWarningCode.PartialArcNeedsBothAngles,
          'ellipsePath needs both startAngle and endAngle for a partial ellipse; treated as a full ellipse',
          `children[${i}]`,
        );
      }
      startSegment([center[0] + rx, center[1]]);
      emitEllipseArc(center, rx, ry, 0, 360);
      points.push([center[0] + rx, center[1]]);
      points.push([center[0] - rx, center[1]]);
      points.push([center[0], center[1] + ry]);
      points.push([center[0], center[1] - ry]);
      collectLabel(step, t => ellipseSegmentSample(center, rx, ry, t));
      penOverride = center;
      continue;
    }

    if (step.kind === 'smooth') {
      // arc/circle/ellipse 留下的 penOverride 决定起点；普通 prev 用 boundary clip 朝首个 through-point 收口
      const usedOverride = penOverride;

      // 各 through-point resolve 成世界坐标（relative/relativeAccumulate 已被 normalizeRelativeTargets 预解析为局部 tuple）
      const resolved: Array<IRPosition> = [];
      let resolveFailed = false;
      for (let k = 0; k < step.points.length; k++) {
        const pt = step.points[k];
        const r = refPointOfTarget(pt, nameStack, scopeChain);
        if (!r) {
          const ptId = nodeRefId(pt);
          if (ptId !== undefined) {
            warn(
              CompileWarningCode.UnresolvedNodeReference,
              `Smooth step point references undefined node id '${ptId}'; the entire path is skipped`,
              `children[${i}].points[${k}]`,
            );
          }
          resolveFailed = true;
          break;
        }
        resolved.push(r);
      }
      if (resolveFailed) return null;

      // 首 knot = 当前游标：penOverride 优先，否则 prev.step.to 朝首个 through-point boundary clip
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, resolved[0], nameStack, scopeChain);
      if (!fromClip) return null;

      // knots = [游标, ...through-points]；centripetal Catmull-Rom 转 cubic 段链
      const knots: Array<IRPosition> = [fromClip, ...resolved];
      const segs = curve.catmullRomToCubic(knots, step.tension ?? 1);

      startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(prev.step.to));
      for (const seg of segs) emitCubic(seg.control1, seg.control2, seg.to);

      // label 沿生成 cubic 链按贝塞尔参数定位：把 t∈[0,1] 分摊到 N 段，落第 ⌊t·N⌋ 段、段内 = 余数（与中段 marks 同款便宜模型）
      collectLabel(step, t => {
        const segCount = segs.length;
        const scaled = t * segCount;
        const segIdx = Math.min(Math.floor(scaled), segCount - 1);
        const localT = t === 1 ? 1 : scaled - segIdx;
        const from = segIdx === 0 ? fromClip : segs[segIdx - 1].to;
        const seg = segs[segIdx];
        return cubicSegmentSample(from, seg.control1, seg.control2, seg.to, localT);
      });

      // 游标推进到末点；后续 hasTo 段从此续接
      penOverride = readCursor();
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
      // toClip 的 toward = 本段实际起点：自包含前驱（arc/smooth/rectangle…）留下 penOverride 时取游标，
      // 否则取 prev.anchor（node→node 的中心向语义，等价、不变）。修：smooth/arc 后接 line→node 朝错方向裁剪。
      const toClip = clipForTarget(step.to, usedOverride ?? prev.anchor, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(prev.step.to));
      emitLine(toClip, isAutoBoundaryTarget(step.to));
      collectLabel(step, t => lineSegmentSample(fromClip, toClip, t));
      continue;
    }

    if (step.kind === 'curve') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, step.control, nameStack, scopeChain);
      const toClip = clipForTarget(step.to, step.control, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(prev.step.to));
      emitQuad(step.control, toClip, isAutoBoundaryTarget(step.to));
      collectLabel(step, t => quadSegmentSample(fromClip, step.control, toClip, t));
      continue;
    }
    if (step.kind === 'cubic') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, step.control1, nameStack, scopeChain);
      const toClip = clipForTarget(step.to, step.control2, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(prev.step.to));
      emitCubic(step.control1, step.control2, toClip, isAutoBoundaryTarget(step.to));
      collectLabel(step, t => cubicSegmentSample(fromClip, step.control1, step.control2, toClip, t));
      continue;
    }
    if (step.kind === 'bend') {
      // 起点参考：自包含前驱留 penOverride 时取游标，否则 prev.anchor（node→node 中心向，不变）
      const fromRef = usedOverride ?? prev.anchor;
      // out/in 角优先于 bendDirection 对称弯。
      const [c1, c2] =
        step.outAngle !== undefined || step.inAngle !== undefined
          ? outInControlPoints(fromRef, currAnchor, step.outAngle ?? 0, step.inAngle ?? 180, step.looseness)
          : bendControlPoints(fromRef, currAnchor, step.bendDirection ?? 'left', step.bendAngle ?? 30);
      // looseness × chord 可能把 finite 输入放大溢出成 Infinity；非 finite 控制点会污染 Scene + layout
      if (!isFinitePoint(c1) || !isFinitePoint(c2)) {
        throw new Error('Bend produced a non-finite control point (looseness / angle too large); use smaller values.');
      }
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, c1, nameStack, scopeChain);
      const toClip = clipForTarget(step.to, c2, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(prev.step.to));
      emitCubic(c1, c2, toClip, isAutoBoundaryTarget(step.to));
      collectLabel(step, t => cubicSegmentSample(fromClip, c1, c2, toClip, t));
      continue;
    }

    // fold：经一个直角中间点拆成两段 line。起点参考同 line/bend：penOverride 优先（自包含前驱后），否则 prev.anchor
    const corner = cornerOf(usedOverride ?? prev.anchor, currAnchor, step.via);
    const fromClip = usedOverride ?? clipForTarget(prev.step.to, corner, nameStack, scopeChain);
    const toClip = clipForTarget(step.to, corner, nameStack, scopeChain);
    if (!fromClip || !toClip) return null;
    startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(prev.step.to));
    emitLine(corner);
    emitLine(toClip, isAutoBoundaryTarget(step.to));
    collectLabel(step, t => foldSegmentSample(fromClip, corner, toClip, t));
  }

  // 折线几何圆角：编译期对 line step ↔ line step 内接缝插切圆弧。
  // 在 shrink / split / marks 之前作用于已 emit 的 commands（在未变换几何上）——故 marks 弧长、arrow shrink、
  // rotate/scale 外层 group 都自动落在倒角后几何上（顺序硬契约）。缺省 / 0 → commands 逐字不变。
  let roundedCommands = false;
  if (path.roundedCorners !== undefined && path.roundedCorners > 0) {
    const before = commands.length;
    const next = applyRoundedCorners(commands, provenance, path.roundedCorners, round);
    // 原地替换 commands 内容（下游 applyArrowShrinks / split 直接消费此数组）
    if (next.length !== before || next.some((c, k) => c !== commands[k])) {
      commands.length = 0;
      commands.push(...next);
      roundedCommands = true;
    }
  }

  // strokeWidth 解析。
  const strokeWidth = path.strokeWidth ?? (path.thickness ? THICKNESS_TO_WIDTH[path.thickness] : 1);
  const baseProps: PathBaseProps = {
    stroke: resolvePaint(path.stroke) ?? 'currentColor',
    strokeWidth,
    // path.fill 缺省 'none'（仅描边）；纯色 / PaintSpec gradient 经 resolvePaint → PaintValue
    fill: resolvePaint(path.fill) ?? 'none',
    fillRule: path.fillRule,
    dashPattern: path.dashPattern,
    dashOffset: path.dashOffset,
    strokeLinecap: path.lineCap,
    strokeLinejoin: path.lineJoin,
    // IR `drawOpacity` → primitive `strokeOpacity`（与 Node 命名一致）
    opacity: path.opacity,
    fillOpacity: path.fillOpacity,
    strokeOpacity: path.drawOpacity,
    shadow: resolveShadow(path.shadow),
    blendMode: path.blendMode,
  };

  const resolvedArrows = warnHook.resolvedArrows ?? resolveArrowRegistry();
  const arrows: {
    arrowStart?: ResolvedArrowEndSpec;
    arrowEnd?: ResolvedArrowEndSpec;
    shrinkStart: number;
    shrinkEnd: number;
    boundaryOuterInsetStart: number;
    boundaryOuterInsetEnd: number;
  } = {
    shrinkStart: 0,
    shrinkEnd: 0,
    boundaryOuterInsetStart: 0,
    boundaryOuterInsetEnd: 0,
  };
  const inlineMarks: NonNullable<IRPathBase['marks']> = [];
  for (const item of path.marks ?? []) {
    if (item.pos === 0 && arrows.arrowStart === undefined) {
      const resolved = resolveEndpointArrowMark(item.mark, resolvedArrows, round);
      arrows.arrowStart = resolved.spec;
      arrows.shrinkStart = resolved.shrink;
      arrows.boundaryOuterInsetStart = resolved.boundaryOuterInset;
      continue;
    }
    if (item.pos === 1 && arrows.arrowEnd === undefined) {
      const resolved = resolveEndpointArrowMark(item.mark, resolvedArrows, round);
      arrows.arrowEnd = resolved.spec;
      arrows.shrinkEnd = resolved.shrink;
      arrows.boundaryOuterInsetEnd = resolved.boundaryOuterInset;
      continue;
    }
    inlineMarks.push(item);
  }
  assertArrowCanInheritStroke(baseProps.stroke, arrows);

  // 中段 marking：把整条 path 的 pos∈[0,1] 分摊到 N 个绘制段，取该处 { point, tangent }，
  // 产一个按 tangent 定向的 arrow marker（复用端点箭头同款 def.emit 几何）；point 计入 bbox（远端 mark 不被裁）。
  const markPrims: Array<ScenePrimitive> = [];
  if (inlineMarks.length > 0 && segmentSamplers.length > 0) {
    const segCount = segmentSamplers.length;
    for (const { pos, mark } of inlineMarks) {
      // 倒角后：沿倒角后 commands 按总弧长重定位（接缝几何 + 总弧长已变 → 落点 / 切线与尖角不同）。
      // 未倒角：保持原便宜模型——pos·N 落第 segIdx 段（pos=1 收口落末段尾），段内参数 = 余数。
      const sample = roundedCommands
        ? sampleRoundedCommands(commands, pos)
        : (() => {
            const scaled = pos * segCount;
            const segIdx = Math.min(Math.floor(scaled), segCount - 1);
            const localT = scaled - segIdx;
            return segmentSamplers[segIdx](pos === 1 ? 1 : localT);
      })();
      const spec = resolveMarkArrowSpec(mark, resolvedArrows, round);
      markPrims.push(buildMarkMarkerGroup(spec, sample, strokeWidth, round, markerContextStroke(baseProps.stroke)));
      // marker 落点纳入 bbox（保守取采样点；marker 自身尺寸相对小，端点已足够避免被裁）
      points.push(sample.point);
    }
  }

  // shrink 在 compile 算（端点收缩与 emit 落点无关）：按 shape + 视觉输入把首/末段端点向内缩短，
  // 让 line 端点接在 hollow arrow 尾部外缘、不贯穿 back outline；shrink=0 的实心 shape 跳过
  const shrinkStart = arrows.shrinkStart + (endpointSource.firstAutoBoundary ? arrows.boundaryOuterInsetStart : 0);
  const shrinkEnd = arrows.shrinkEnd + (endpointSource.lastAutoBoundary ? arrows.boundaryOuterInsetEnd : 0);
  applyArrowShrinks(commands, shrinkStart, shrinkEnd, strokeWidth, round);

  // 只在端点有箭头时塞 key——避免给无箭头 path 注入 `arrowStart: undefined` / `arrowEnd: undefined`（保 Scene 输出纯净）
  const endpointSpecs: { arrowStart?: typeof arrows.arrowStart; arrowEnd?: typeof arrows.arrowEnd } = {};
  if (arrows.arrowStart) endpointSpecs.arrowStart = arrows.arrowStart;
  if (arrows.arrowEnd) endpointSpecs.arrowEnd = arrows.arrowEnd;
  const { primitive } = splitSubPathsForEndpointArrows(commands, baseProps, endpointSpecs);
  const bodyPrims: Array<ScenePrimitive> = [primitive, ...labelPrims, ...markPrims];

  // 路径整体变换：rotate / scale 给定时，以包围盒中心为支点把本 path 的 primitive 包进 GroupPrim 写 transforms。
  // 顺序硬契约：端点已在当前 scope resolve 到世界坐标、arrow shrink 已在未变换几何上完成（上方），
  // 这里才以 bbox center 为支点包 group（几何留原坐标、变换由外层 group 承担）；layout 外接框据变换后 bbox 计。
  if ((path.rotate !== undefined || path.scale !== undefined) && points.length > 0) {
    const center = bboxCenter(points);
    const transforms = buildPathTransforms(path.rotate, path.scale, center, round);
    if (transforms.length > 0) {
      const group: GroupPrim = { type: 'group', transforms, children: bodyPrims };
      // 水合挂点：rotate / scale 包裹时 user id 落到最外层 GroupPrim（唯一 top-level emit 图元），
      // 内层主体 primitive 不再 stamp。无 user id 时保持 undefined。
      if (path.id !== undefined) group.id = path.id;
      // meta provenance 与 id 同款落点：落最外层 GroupPrim，内层不重复
      if (path.meta !== undefined) group.meta = path.meta;
      // animations 与 meta 同款落点：落最外层 GroupPrim
      if (path.animations !== undefined) group.animations = path.animations;
      // layout 据变换后 bbox：把当前 points 经同一变换链投影后回收（应用顺序与 GroupPrim 渲染一致）
      const transformedPoints = projectPathTransformPoints(points, transforms);
      return { primitives: [group], points: transformedPoints };
    }
  }
  // 水合挂点：无 rotate / scale 包裹时把 user id stamp 到 path 主体 primitive（PathPrim，或多 sub-path
  // 箭头时的 GroupPrim）；label / mark primitive 不重复 stamp。无 user id 时保持 undefined。
  if (path.id !== undefined) primitive.id = path.id;
  // meta provenance 与 id 同款落点：落 path 主体 primitive，label / mark 不重复
  if (path.meta !== undefined) primitive.meta = path.meta;
  // animations 与 meta 同款落点：落 path 主体 primitive
  if (path.animations !== undefined) primitive.animations = path.animations;
  return { primitives: bodyPrims, points };
};
