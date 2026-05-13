import { arcBoundingPoints, arcEndPoint } from '../geometry/arc';
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
import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  HOLLOW_ARROW_SHAPES,
} from '../ir';
import type {
  IRArrowDetail,
  IRArrowEndDetail,
  IRPath,
  IRPosition,
  IRStep,
  IRStepLabel,
  IRTarget,
} from '../ir';
import type {
  ArrowEndSpec,
  PathCommand,
  PathPrim,
  ScenePrimitive,
  TextPrim,
} from '../primitive';
import { type NodeLayout, anchorOf, angleBoundaryOf, boundaryPointOf } from './node';
import { parseNodeRef } from './parseTarget';
import { resolvePosition } from './position';
import { type TextMeasurer, fallbackMeasurer } from './text-metrics';

/**
 * 端点级 spec：顶层默认 ⊕ end-side override（逐字段 merge）
 * @description 缺省字段继承顶层（不是"完全替换"）；空心 shape 上 fill 字段被丢（silent no-op）
 */
const resolveArrowEndSpec = (
  topLevel: IRArrowDetail,
  endSide: IRArrowEndDetail | undefined,
): ArrowEndSpec => {
  // ArrowDetail 的顶层字段含 start / end —— 提取 end-end 候选字段集（不含 start/end 自身）
  const baseShape = endSide?.shape ?? topLevel.shape ?? 'normal';
  const out: ArrowEndSpec = { shape: baseShape };
  const scale = endSide?.scale ?? topLevel.scale;
  if (scale !== undefined) out.scale = scale;
  const length = endSide?.length ?? topLevel.length;
  if (length !== undefined) out.length = length;
  const width = endSide?.width ?? topLevel.width;
  if (width !== undefined) out.width = width;
  const color = endSide?.color ?? topLevel.color;
  if (color !== undefined) out.color = color;
  const opacity = endSide?.opacity ?? topLevel.opacity;
  if (opacity !== undefined) out.opacity = opacity;
  const lineWidth = endSide?.lineWidth ?? topLevel.lineWidth;
  if (lineWidth !== undefined) out.lineWidth = lineWidth;
  // fill 仅实心 shape 保留；空心 shape silent no-op
  if (!HOLLOW_ARROW_SHAPES.has(baseShape)) {
    const fill = endSide?.fill ?? topLevel.fill;
    if (fill !== undefined) out.fill = fill;
  }
  return out;
};

/** IR path-level `arrow` + `arrowDetail` → PathPrim 起末视觉规格 */
const arrowMarkers = (
  arrow: 'none' | '->' | '<-' | '<->' | undefined,
  detail: IRArrowDetail | undefined,
): { arrowStart?: ArrowEndSpec; arrowEnd?: ArrowEndSpec } => {
  if (!arrow || arrow === 'none') return {};
  const top: IRArrowDetail = detail ?? {};
  const startSpec = resolveArrowEndSpec(top, top.start);
  const endSpec = resolveArrowEndSpec(top, top.end);
  switch (arrow) {
    case '->':
      return { arrowEnd: endSpec };
    case '<-':
      return { arrowStart: startSpec };
    case '<->':
      return { arrowStart: startSpec, arrowEnd: endSpec };
  }
};

/**
 * 端点级 shrink（strokeWidth 倍）：line 末端朝起点缩这么多，让 marker apex 落回原 target
 * @description 不分实心/空心：所有 shape 都让 line 端点接在箭头尾部、apex 顶端仍贴原 target。低 opacity 下不会再透出 line。viewBox=10，shrink = (apex.x - refX) × length × scale / 10（strokeWidth 倍）。
 *
 * 几何对齐（必须与 react/render/arrowMarkers.tsx 中 renderInner 的 refX 一致）：
 * - `normal` / `diamond` / `circle`：apex 在 viewBox x=10、back 外缘 x=0 → refX=0，shrink = length × scale
 * - `stealth`：apex x=10、V tip x=3（line 嵌进 V 凹口）→ refX=3，shrink = 0.7 × length × scale
 * - `open` / `openDiamond`：apex x=9、back stroke 外缘 x = 1 - lineWidth/2 → refX = 1 - lineWidth/2，shrink = (8 + lineWidth/2) × length × scale / 10
 * - `openCircle`：apex 外缘右 x ≈ 10、back 外缘左 x = 0.75 - lineWidth/2 → refX = 0.75 - lineWidth/2，shrink ≈ length × scale
 */
const computeShrink = (spec: ArrowEndSpec): number => {
  const length = (spec.length ?? ARROW_MARKER_DEFAULT_SIZE) * (spec.scale ?? 1);
  if (HOLLOW_ARROW_SHAPES.has(spec.shape)) {
    if (spec.shape === 'openCircle') return length;
    // open / openDiamond：apex 在 viewBox x=9（path d 留半 stroke 余量）
    const lineWidth = spec.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH;
    return ((8 + lineWidth / 2) * length) / 10;
  }
  // 实心：apex 在 viewBox x=10
  if (spec.shape === 'stealth') return (7 * length) / 10;
  return length;
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
 * @description 三态：`'A'`(auto) 节点中心；`'A.<anchor>'`/`'A.<deg>'` 显式锚点 refPoint=endpoint 位置不随邻居变。直接坐标/极坐标解析为笛卡尔
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
  // relative/relativeAccumulate 已被 normalizeRelativeTargets 预解析；防御性守卫给 TS narrowing 用
  if (typeof target === 'object' && !Array.isArray(target) && ('relative' in target || 'relativeAccumulate' in target)) {
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
  // relative/relativeAccumulate 已被预解析；防御性守卫给 TS narrowing 用
  if (typeof target === 'object' && !Array.isArray(target) && ('relative' in target || 'relativeAccumulate' in target)) {
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

/** 边标注默认字号 / 偏移量 */
const LABEL_FONT_SIZE = 14;
const LABEL_LINE_HEIGHT_FACTOR = 1.2;
const LABEL_SIDE_OFFSET = 4;
const RAD_TO_DEG = 180 / Math.PI;

/** keyword → t 数值映射；含旧 3 keyword（midway/near-start/near-end）+ 新 4 keyword */
const KEYWORD_TO_T: Record<string, number> = {
  'at-start': 0,
  'very-near-start': 0.125,
  'near-start': 0.25,
  midway: 0.5,
  'near-end': 0.75,
  'very-near-end': 0.875,
  'at-end': 1,
};

/**
 * label.position → 段参数 t∈[0,1]
 * @description 数值原样返回（schema 已 clamp 0..1）；keyword 走 KEYWORD_TO_T 映射；undefined 退默认 midway (0.5)
 */
const tForLabelPosition = (pos: IRStepLabel['position']): number => {
  if (typeof pos === 'number') return pos;
  if (typeof pos === 'string' && pos in KEYWORD_TO_T) return KEYWORD_TO_T[pos];
  return 0.5;
};

/**
 * step.label + 段采样 → TextPrim（sloped 时裹一层 group 旋转）
 * @description 默认 side='above'/position='midway'：above/below 锚点 y±offset、align=middle、baseline=bottom/top；left/right x±offset、align=end/start、baseline=middle；sloped 不偏移裹 group rotate(angle, cx, cy) 由切线 atan2 算（SVG y-down CW 正）。返回 primitive + viewBox 外接点
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
      transforms: [
        { kind: 'rotate', degrees: round(angleDeg), cx: round(x), cy: round(y) },
      ],
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
 * relative/relativeAccumulate 目标解析为绝对 Position（step kind 不变，to 全为绝对坐标）
 * @description relative 不更新 prevEnd（TikZ `+`），relativeAccumulate 更新（TikZ `++`）。prevEnd 推进：有 to 的 kind 用 refPointOfTarget(to)；arc 用 arcEndPoint；circlePath/ellipsePath/cycle 不变。首步 relative 时 prevEnd 回退 [0,0]；解析失败保持原 step
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
      'relative' in original
    ) {
      const ref = prevEnd ?? [0, 0];
      resolvedTo = [ref[0] + original.relative[0], ref[1] + original.relative[1]];
      updatePrevEnd = false;
    } else if (
      typeof original === 'object' &&
      !Array.isArray(original) &&
      'relativeAccumulate' in original
    ) {
      const ref = prevEnd ?? [0, 0];
      resolvedTo = [
        ref[0] + original.relativeAccumulate[0],
        ref[1] + original.relativeAccumulate[1],
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
};

/**
 * IR Path → PathPrim
 * @description 每个绘制段独立用节点中心算两端 boundary clip——中段节点的入/出 boundary 点通常不同，path 在该节点可见"断开"（与 TikZ `\draw (A)--(B)--(C);` 段独立 clip 一致）。仍产一个 PathPrim：commands 用多组 move/line 表达 sub-path；段起点等于上段终点时复用 cursor 省 move。cycle 段闭回最近 move 起点，起点==lastEnd && 终点==subPathStart 时输出 close，否则显式画段 line。引用未定义节点/解析失败返回 null，并通过 `warnHook.onWarn` 同步触发 warning
 */
export const emitPathPrimitive = (
  path: IRPath,
  nodeIndex: Map<string, NodeLayout>,
  round: (n: number) => number,
  measureText: TextMeasurer = fallbackMeasurer,
  warnHook: EmitPathWarnHook = {},
): { primitives: Array<ScenePrimitive>; points: Array<IRPosition> } | null => {
  const irPath = warnHook.irPath ?? 'path';
  const warn = (code: string, message: string, subPath = ''): void => {
    warnHook.onWarn?.({ code, message, path: subPath ? `${irPath}.${subPath}` : irPath });
  };
  // 先把 relative/relativeAccumulate 解析为绝对坐标，后续算法可统一按绝对坐标处理
  const steps = normalizeRelativeTargets(path.children, nodeIndex);
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
    const r = emitLabelPrimitive(step.label, sample, measureText, round);
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
    const ref = refPointOfTarget(s.to, nodeIndex);
    if (!ref && typeof s.to === 'string') {
      warn(
        'UNRESOLVED_NODE_REFERENCE',
        `Step.to references undefined node id '${s.to}'; the entire path is skipped`,
        `children[${idx}].to`,
      );
    }
    return ref;
  });

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
    const prev = findPrev(i);
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
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, currAnchor, nodeIndex);
      const toClip = clipForTarget(step.to, prev.anchor, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitLine(toClip);
      collectLabel(step, t => lineSegmentSample(fromClip, toClip, t));
      continue;
    }

    if (step.kind === 'curve') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, step.control, nodeIndex);
      const toClip = clipForTarget(step.to, step.control, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitQuad(step.control, toClip);
      collectLabel(step, t => quadSegmentSample(fromClip, step.control, toClip, t));
      continue;
    }
    if (step.kind === 'cubic') {
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, step.control1, nodeIndex);
      const toClip = clipForTarget(step.to, step.control2, nodeIndex);
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
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, c1, nodeIndex);
      const toClip = clipForTarget(step.to, c2, nodeIndex);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip);
      emitCubic(c1, c2, toClip);
      collectLabel(step, t => cubicSegmentSample(fromClip, c1, c2, toClip, t));
      continue;
    }

    // step.kind === 'step' (fold)
    const corner = cornerOf(prev.anchor, currAnchor, step.via);
    const fromClip = usedOverride ?? clipForTarget(prev.step.to, corner, nodeIndex);
    const toClip = clipForTarget(step.to, corner, nodeIndex);
    if (!fromClip || !toClip) return null;
    startSegment(fromClip);
    emitLine(corner);
    emitLine(toClip);
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

  const markers = arrowMarkers(path.arrow, path.arrowDetail);
  const hasArrows = !!markers.arrowStart || !!markers.arrowEnd;

  // 按 shape + spec（length / scale / lineWidth）把首/末段端点向内缩短，让 line 端点接在 hollow arrow 尾部外缘，不贯穿 back outline；shrink=0 的实心 shape 跳过
  const shrinkStart = markers.arrowStart ? computeShrink(markers.arrowStart) : 0;
  const shrinkEnd = markers.arrowEnd ? computeShrink(markers.arrowEnd) : 0;

  /** 取一个 PathCommand 末端 endpoint（move/line/quad/cubic → to；arc/ellipseArc → polar(end)；close 无端点） */
  const endpointOf = (cmd: PathCommand): IRPosition | null => {
    switch (cmd.kind) {
      case 'move':
      case 'line':
      case 'quad':
      case 'cubic':
        return [cmd.to[0], cmd.to[1]];
      case 'arc': {
        const rad = (cmd.endAngle * Math.PI) / 180;
        return [
          cmd.center[0] + Math.cos(rad) * cmd.radius,
          cmd.center[1] + Math.sin(rad) * cmd.radius,
        ];
      }
      case 'ellipseArc': {
        const rad = (cmd.endAngle * Math.PI) / 180;
        return [
          cmd.center[0] + Math.cos(rad) * cmd.radiusX,
          cmd.center[1] + Math.sin(rad) * cmd.radiusY,
        ];
      }
      case 'close':
        return null;
    }
  };

  /** 改写一个 PathCommand 的 endpoint（用于 shrink） */
  const setEndpoint = (idx: number, newPt: IRPosition) => {
    const cmd = commands[idx];
    if (cmd.kind === 'close') return;
    const rp: [number, number] = [round(newPt[0]), round(newPt[1])];
    if (cmd.kind === 'move' || cmd.kind === 'line') {
      commands[idx] = { ...cmd, to: rp };
    } else if (cmd.kind === 'quad') {
      commands[idx] = { ...cmd, to: rp };
    } else if (cmd.kind === 'cubic') {
      commands[idx] = { ...cmd, to: rp };
    }
    // arc / ellipseArc 不参与 shrink——首末段都是 line/cubic（path-arrow 的 path 形态）
  };

  if (shrinkStart > 0) {
    // 找首个 move 与其后第一个有 endpoint 的命令
    const firstIdx = commands.findIndex(o => o.kind === 'move');
    if (firstIdx >= 0) {
      const cur = commands[firstIdx];
      const nextIdx = commands.findIndex(
        (o, idx) => idx > firstIdx && o.kind !== 'close',
      );
      if (cur.kind === 'move' && nextIdx >= 0) {
        const nextPt = endpointOf(commands[nextIdx]);
        if (nextPt) {
          const shifted = shiftToward(
            [cur.to[0], cur.to[1]],
            nextPt,
            shrinkStart * strokeWidth,
          );
          setEndpoint(firstIdx, shifted);
        }
      }
    }
  }
  if (shrinkEnd > 0) {
    // 末尾最后一个有 endpoint 的命令与其前最近的一个
    let lastIdx = -1;
    for (let i = commands.length - 1; i >= 0; i--) {
      if (commands[i].kind !== 'close') {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx > 0) {
      let prevIdx = lastIdx - 1;
      while (prevIdx >= 0 && commands[prevIdx].kind === 'close') prevIdx--;
      if (prevIdx >= 0) {
        const curPt = endpointOf(commands[lastIdx]);
        const prevPt = endpointOf(commands[prevIdx]);
        if (curPt && prevPt) {
          const shifted = shiftToward(curPt, prevPt, shrinkEnd * strokeWidth);
          setEndpoint(lastIdx, shifted);
        }
      }
    }
  }

  // 每个 sub-path 起始命令索引（每个 move 都是新 sub-path）
  const subPathStarts: Array<number> = [];
  commands.forEach((cmd, idx) => {
    if (cmd.kind === 'move') subPathStarts.push(idx);
  });

  // 单 sub-path 或无箭头 → 一个 PathPrim
  if (!hasArrows || subPathStarts.length <= 1) {
    const primitive: PathPrim = {
      type: 'path',
      commands,
      ...baseProps,
      ...markers,
    };
    return { primitives: [primitive, ...labelPrims], points };
  }

  // 多 sub-path + 有箭头：split 成多个 PathPrim 各挂"首段 marker-start/末段 marker-end"用 GroupPrim 包；
  // 否则 SVG marker 会按每个 sub-path 单独贴在中间节点视觉错乱
  const subPathSlices: Array<Array<PathCommand>> = [];
  for (let s = 0; s < subPathStarts.length; s++) {
    const start = subPathStarts[s];
    const end = s + 1 < subPathStarts.length ? subPathStarts[s + 1] : commands.length;
    subPathSlices.push(commands.slice(start, end));
  }
  const subPathPrims: Array<PathPrim> = subPathSlices.map((sub, i) => {
    const isFirst = i === 0;
    const isLast = i === subPathSlices.length - 1;
    return {
      type: 'path',
      commands: sub,
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
