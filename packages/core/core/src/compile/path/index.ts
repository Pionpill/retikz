import {
  arcBoundingPoints,
  arcEndPoint,
  ellipseArcBoundingPoints,
  ellipseArcPoint,
} from '../../geometry/arc';
import { bendControlPoints, outInControlPoints } from '../../geometry/bend';
import { rectOutline } from '../../geometry/rect';
import type { PaintResolver } from '../paint';
import {
  type SegmentSample,
  arcSegmentSample,
  circleSegmentSample,
  cubicSegmentSample,
  ellipseArcSegmentSample,
  ellipseSegmentSample,
  foldSegmentSample,
  lineSegmentSample,
  quadSegmentSample,
} from '../../geometry/segment';
import type {
  IRPath,
  IRPathScale,
  IRPosition,
  IRStep,
  IRTarget,
} from '../../ir';
import { JsonObjectSchema } from '../../ir';
import type {
  ArrowEndSpec,
  GroupPrim,
  PathCommand,
  ScenePrimitive,
  Transform,
} from '../../primitive';
import type { AssertEqual } from '../../types';
import type { PathGeneratorDefinition } from '../../pathGenerators';
import { CompileWarningCode } from '../constant';
import type { CompileWarning } from '../constant';
import type { NameStack } from '../name-stack';
import { type TextMeasurer, fallbackMeasurer } from '../text-metrics';
import { clipForTarget, cornerOf, isAutoBoundaryTarget, refPointOfTarget, samePoint } from './anchor';
import { emitLabelPrimitive, tForLabelPosition } from './label';
import { normalizeRelativeTargets } from './relative';
import { applyTransformChain } from '../scope';
import { type EffectiveArrows, applyArrowShrinks, endpointArrows, resolveMarkArrowSpec } from './shrink';
import { type PathBaseProps, splitSubPathsForEndpointArrows } from './split';
import { BUILTIN_ARROWS } from '../../arrows';

/**
 * 目标里的一个代表性节点 id——给 UNRESOLVED_NODE_REFERENCE 诊断用
 * @description 对象 NodeTarget（`{ id, ... }`）直接取 id；between 比例点递归挖端点里第一个节点引用
 *   （端点未解析时整 between 失败，需照样报 unresolved 而非静默）；其余形态返回 undefined。
 */
const nodeRefId = (t: IRTarget): string | undefined => {
  if (typeof t !== 'object' || Array.isArray(t)) return undefined;
  if ('id' in t) return t.id;
  if ('between' in t) return nodeRefId(t.between[0]) ?? nodeRefId(t.between[1]);
  return undefined;
};

/** 有限数 */
const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** 有限坐标点 `[number, number]` */
const isFinitePoint = (pt: unknown): boolean =>
  Array.isArray(pt) && pt.length >= 2 && isFiniteNum(pt[0]) && isFiniteNum(pt[1]);

/**
 * 校验 path generator 产出的单条命令合法（kind 已知 + 引用坐标 / 数值有限）
 * @description 第三方 / LLM 写的 generate 误产坏命令（NaN/Infinity 坐标、未知 kind、缺字段、字符串当命令）时
 *   抛含 generator 名的清晰错——守 Scene 100% finite / JSON 可序列化，不放任非 finite 静默入 Scene
 *   （JSON.stringify(NaN/Infinity)=null 会让 round-trip 失真）。
 */
const assertValidGeneratedCommand = (name: string, cmd: unknown): void => {
  const bad = (detail: string): never => {
    throw new Error(`path generator '${name}' produced a ${detail}.`);
  };
  if (cmd === null || typeof cmd !== 'object') {
    bad(`non-object command (expected an object with a 'kind')`);
    return;
  }
  const c = cmd as Record<string, unknown>;
  switch (c.kind) {
    case 'move':
    case 'line':
      if (!isFinitePoint(c.to)) bad(`non-finite coordinate in a '${String(c.kind)}' command`);
      break;
    case 'quad':
      if (!isFinitePoint(c.control) || !isFinitePoint(c.to)) bad(`non-finite coordinate in a 'quad' command`);
      break;
    case 'cubic':
      if (!isFinitePoint(c.control1) || !isFinitePoint(c.control2) || !isFinitePoint(c.to))
        bad(`non-finite coordinate in a 'cubic' command`);
      break;
    case 'arc':
      if (!isFinitePoint(c.center) || !isFiniteNum(c.radius) || !isFiniteNum(c.startAngle) || !isFiniteNum(c.endAngle))
        bad(`non-finite value in an 'arc' command`);
      break;
    case 'ellipseArc':
      if (
        !isFinitePoint(c.center) ||
        !isFiniteNum(c.radiusX) ||
        !isFiniteNum(c.radiusY) ||
        !isFiniteNum(c.startAngle) ||
        !isFiniteNum(c.endAngle)
      )
        bad(`non-finite value in an 'ellipseArc' command`);
      break;
    case 'close':
      break;
    default:
      bad(`command with unknown kind '${String(c.kind)}'`);
  }
};

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
  onWarn?: (warning: CompileWarning) => void;
  /** 当前 path 在 IR 中的 locator 前缀（如 `'children[3].path'`） */
  irPath?: string;
  /**
   * 该 path 所属 scope 的累积 Cartesian-only transform 链
   * @description step.to 内的 polar/at/offset 字面量按"当前 scope 局部度量 + 末端 apply chain"
   *   投影回全局；顶层 path / 无 scope chain 时为 `[]`（恒等，等价 v0.1 行为）
   */
  scopeChain?: ReadonlyArray<Transform>;
  /** fill 解析器（PaintSpec → resourceRef + 登记资源）；缺省时纯色透传、PaintSpec 退化为无填充 */
  resolveFill?: PaintResolver;
  /**
   * 有效 arrow 表（内置 8 + 注入）；缺省 = 仅内置 8
   * @description compileToScene 合并 `{ ...BUILTIN_ARROWS, ...options.arrows }` 传入；
   *   endpointArrows 据此查表算 shrink / 调 def.emit；未注册名编译期 throw
   */
  effectiveArrows?: EffectiveArrows;
  /**
   * 有效 path generator 表（注入即全部，core 无内置）；缺省 = 空表
   * @description compileToScene 传 `options.pathGenerators ?? {}`；generator step 据此查表（未注册名
   *   编译期 throw，错误列出可用名）→ 双 parse 护栏 → targetParams resolve → 调 generate splice 命令。
   *   解析逻辑由后续实现落地（此处仅声明 hook 入口）。
   */
  effectivePathGenerators?: Record<string, PathGeneratorDefinition>;
};

/** 一组点的 axis-aligned 包围盒中心 */
const bboxCenter = (pts: ReadonlyArray<IRPosition>): IRPosition => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
};

/**
 * path 整体 rotate / scale → 绕包围盒中心的 GroupPrim transforms
 * @description rotate 写成 `{ kind:'rotate', degrees, cx, cy }`（cx/cy = bbox center），等价包一个绕同中心旋转的 Scope；
 *   scale number → `{ kind:'scale', x }`（等比，y 省略），`{x,y}` → `{ kind:'scale', x, y }`。
 *   缩放支点同为 bbox center：用 translate(center) ∘ scale ∘ translate(-center) 三段表达。两者都缺时返回空数组。
 *   数组顺序与 GroupPrim 渲染一致（array[0] 最外层、最后 apply）：先 rotate 段再 scale 段（rotate 在外）。
 */
const buildPathTransforms = (
  rotate: number | undefined,
  scale: IRPathScale | undefined,
  center: IRPosition,
  round: (n: number) => number,
): Array<Transform> => {
  const out: Array<Transform> = [];
  if (rotate !== undefined) {
    out.push({ kind: 'rotate', degrees: rotate, cx: round(center[0]), cy: round(center[1]) });
  }
  if (scale !== undefined) {
    const sx = typeof scale === 'number' ? scale : scale.x;
    const sy = typeof scale === 'number' ? undefined : scale.y;
    // 绕 bbox center 缩放：translate(center) ∘ scale ∘ translate(-center)
    const scaleT: Transform = { kind: 'scale', x: sx };
    if (sy !== undefined) scaleT.y = sy;
    out.push(
      { kind: 'translate', x: round(center[0]), y: round(center[1]) },
      scaleT,
      { kind: 'translate', x: round(-center[0]), y: round(-center[1]) },
    );
  }
  return out;
};

/**
 * 把已物化的 arrow marker（局部 baseSize 坐标系，尖端 +x）按路径切线定向放到采样点
 * @description marker 局部系：viewBox `0 0 baseSize baseSize`，参考点 (refX, baseSize/2)，尖端朝 +x。
 *   GroupPrim transforms 数组语义 array[0] 最外层（最后 apply），故链 = translate(point) ∘ rotate(tangentDeg)
 *   ∘ scale(markerWidth/baseSize, markerHeight/baseSize) ∘ translate(-refX, -baseSize/2)：先把参考点移到原点、
 *   缩放到目标尺寸、绕切线角旋转、平移到采样点。marker 几何（`MarkerPrimitive[]`）是 ScenePrimitive 的结构子集，直接作 children。
 */
const buildMarkMarkerGroup = (
  spec: ArrowEndSpec,
  sample: SegmentSample,
  round: (n: number) => number,
): GroupPrim => {
  const angleDeg = (Math.atan2(sample.tangent[1], sample.tangent[0]) * 180) / Math.PI;
  const sx = spec.markerWidth / spec.baseSize;
  const sy = spec.markerHeight / spec.baseSize;
  const refY = spec.baseSize / 2;
  const transforms: Array<Transform> = [
    { kind: 'translate', x: round(sample.point[0]), y: round(sample.point[1]) },
    { kind: 'rotate', degrees: round(angleDeg) },
    { kind: 'scale', x: round(sx), y: round(sy) },
    { kind: 'translate', x: round(-spec.refX), y: round(-refY) },
  ];
  return { type: 'group', transforms, children: [...spec.marker] };
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
  // fill 解析：有 registry 走去重派 id；无（直调）时纯色透传、PaintSpec 退化无填充
  const resolveFill: PaintResolver =
    warnHook.resolveFill ?? (f => (typeof f === 'string' || f === undefined ? f : undefined));
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
  const collectLabel = (
    step: IRStep,
    sampleAt: (t: number) => SegmentSample,
  ): void => {
    segmentSamplers.push(sampleAt);
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

  // "无必有 to（不当普通 boundary clip 段处理）" 的 step kinds：
  // cycle / arc / circlePath / ellipsePath / rectangle / generator（generator 的 to 可选、由 generate 消费）
  type StepWithTo = Exclude<
    IRStep,
    | { kind: 'cycle' }
    | { kind: 'arc' }
    | { kind: 'circlePath' }
    | { kind: 'ellipsePath' }
    | { kind: 'rectangle' }
    | { kind: 'generator' }
  >;
  const hasTo = (s: IRStep): s is StepWithTo =>
    s.kind !== 'cycle' &&
    s.kind !== 'arc' &&
    s.kind !== 'circlePath' &&
    s.kind !== 'ellipsePath' &&
    s.kind !== 'rectangle' &&
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
    points.push(p);
    subPathStart = p;
    lastEnd = p;
  };
  const emitLine = (p: IRPosition, sourceAutoBoundary = false) => {
    noteEndpointSource(sourceAutoBoundary);
    const rp = roundPoint(p);
    commands.push({ kind: 'line', to: [rp[0], rp[1]] });
    points.push(p);
    lastEnd = p;
  };
  const emitClose = () => {
    commands.push({ kind: 'close' });
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
    // 曲线视觉范围不超过控制点+端点凸包
    points.push(control);
    points.push(p);
    lastEnd = p;
  };
  const emitCubic = (
    c1: IRPosition,
    c2: IRPosition,
    p: IRPosition,
    sourceAutoBoundary = false,
  ) => {
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
    noteEndpointSource(false);
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
    // 椭圆弧终点：未旋转椭圆 polar 投影
    const endPt: IRPosition = [
      center[0] + Math.cos((endAngle * Math.PI) / 180) * radiusX,
      center[1] + Math.sin((endAngle * Math.PI) / 180) * radiusY,
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
        'PARTIAL_ARC_CLOSED_INVALID',
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

    // move 自身不绘制；其 to 仅供下个绘制段的 findPrev 引用。
    // 显式 move 开启新游标，必须切断 arc/circle/ellipse/rectangle/generator 留给下一绘制段的 penOverride。
    if (step.kind === 'move') {
      penOverride = null;
      continue;
    }

    if (step.kind === 'generator') {
      const generators = warnHook.effectivePathGenerators ?? {};
      // hasOwnProperty 守门：避免 `'toString'` 等原型链 key 被 Record 索引误命中（开放 name 的边界安全）
      const def = Object.prototype.hasOwnProperty.call(generators, step.name)
        ? generators[step.name]
        : undefined;
      if (!def) {
        const available = Object.keys(generators).sort().join(', ') || '(none registered)';
        throw new Error(
          `Unknown path generator '${step.name}'; available: ${available}`,
        );
      }

      // 外部校验：generator 自带 paramsSchema 先 parse step.params
      const parsed = def.paramsSchema.parse(step.params);
      // 第二道护栏：即便 paramsSchema 宽松（z.any() 等），对 parse 结果再跑 JsonObjectSchema，
      // 拦下非 JSON 输出（function / undefined 等），守 IR 可序列化
      JsonObjectSchema.parse(parsed);
      const paramsObj = parsed as Record<string, unknown>;

      // targetParams（仅顶层 key）：取 params[key] 当 Target，resolve 成世界坐标喂 resolvedTargets；
      // 含 '.' 的嵌套路径不解析（仅顶层约定），resolvedTargets 不含该 key
      const resolvedTargets: Record<string, IRPosition> = {};
      for (const key of def.targetParams ?? []) {
        if (key.includes('.')) continue;
        const raw = paramsObj[key];
        if (raw === undefined) continue;
        // 值须是 Target 形态（node id 串 / [x,y] / target 对象）；number / boolean / null 等非 Target →
        // 清晰错（否则 refPointOfTarget 内的 `'id' in raw` 对原始值抛裸 TypeError，LLM 无从自修）
        if (raw === null || (typeof raw !== 'string' && typeof raw !== 'object')) {
          throw new Error(
            `path generator '${step.name}' targetParams key '${key}' must be a target (node id, coordinate, or target object); got ${raw === null ? 'null' : typeof raw}.`,
          );
        }
        const resolved = refPointOfTarget(raw as IRTarget, nameStack, scopeChain);
        if (resolved) resolvedTargets[key] = resolved;
      }

      // 起点：当前游标（前一绘制段终点 / arc 等留下的 penOverride）；首段时回退最近 hasTo step 的 anchor。
      // 经闭包 readCursor 读 lastEnd/penOverride（循环外声明的宽类型 let，不被分支位置 narrow 成 null）
      const prevGen = findPrev();
      const fromGen: IRPosition =
        readCursor() ?? (prevGen ? prevGen.anchor : [0, 0]);
      // 终点：step.to resolve 后的世界坐标（无 to 则 undefined）
      const resolvedTo =
        step.to !== undefined
          ? refPointOfTarget(step.to, nameStack, scopeChain)
          : null;
      const toGen = resolvedTo ?? undefined;

      let produced: unknown;
      try {
        produced = def.generate({
          from: fromGen,
          ...(toGen !== undefined ? { to: toGen } : {}),
          params: paramsObj,
          resolvedTargets,
          round,
        });
      } catch (e) {
        throw new Error(
          `path generator '${step.name}' threw: ${e instanceof Error ? e.message : String(e)}`,
          { cause: e },
        );
      }
      if (!Array.isArray(produced)) {
        throw new Error(
          `path generator '${step.name}' must return an array of path commands; got ${produced === null ? 'null' : typeof produced}.`,
        );
      }
      for (const cmd of produced) assertValidGeneratedCommand(step.name, cmd);
      const generated = produced as Array<PathCommand>;

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
            emitEllipseArc(
              cmd.center,
              cmd.radiusX,
              cmd.radiusY,
              cmd.startAngle,
              cmd.endAngle,
            );
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

      const fromClip =
        usedOverride ?? (prev ? clipForTarget(prev.step.to, moveAnchor, nameStack, scopeChain) : null);
      const toClip = clipForTarget(moveTo, fromClip ?? prev?.anchor ?? moveAnchor, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;

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
      // 后续 step 从矩形起点续
      if (rectStart) penOverride = rectStart;
      continue;
    }

    // 其他 step 都需 prev（找 cursor 起点/圆心）；currAnchor 仅有 to 的 step 才需
    const prev = findPrev();
    if (!prev) return null;

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

      if (step.radiusX !== undefined && step.radiusY !== undefined) {
        // 椭圆弧
        const rx = step.radiusX;
        const ry = step.radiusY;
        startSegment(ellipseArcPoint(center, rx, ry, step.startAngle));
        emitEllipseArc(center, rx, ry, step.startAngle, step.endAngle);
        for (const p of ellipseArcBoundingPoints(center, rx, ry, step.startAngle, step.endAngle)) {
          points.push(p);
        }
        collectLabel(step, t =>
          ellipseArcSegmentSample(center, rx, ry, step.startAngle, step.endAngle, t),
        );
        penOverride = ellipseArcPoint(center, rx, ry, step.endAngle);
        continue;
      }

      if (step.radius !== undefined) {
        // 正圆弧（输出与改造前一致，emitArc 不变）
        const r = step.radius;
        startSegment(arcEndPoint(center, r, step.startAngle));
        emitArc(center, r, step.startAngle, step.endAngle);
        for (const p of arcBoundingPoints(center, r, step.startAngle, step.endAngle)) {
          points.push(p);
        }
        collectLabel(step, t =>
          arcSegmentSample(center, r, step.startAngle, step.endAngle, t),
        );
        penOverride = arcEndPoint(center, r, step.endAngle);
        continue;
      }

      // 既无 radius 也无 radiusX/radiusY：malformed arc
      warn(
        CompileWarningCode.ArcMissingRadius,
        'Arc step requires radius (circular) or both radiusX and radiusY (elliptical); the entire path is skipped',
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
      const rx = step.radiusX;
      const ry = step.radiusY;

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
      collectLabel(step, t =>
        cubicSegmentSample(fromClip, step.control1, step.control2, toClip, t),
      );
      continue;
    }
    if (step.kind === 'bend') {
      // out/in 角（任一给定）优先于 bendDirection 对称弯；都缺则按 bendDirection 对称弯，仍缺则默认 left 弯
      const [c1, c2] =
        step.outAngle !== undefined || step.inAngle !== undefined
          ? outInControlPoints(
              prev.anchor,
              currAnchor,
              step.outAngle ?? 0,
              step.inAngle ?? 180,
              step.looseness,
            )
          : bendControlPoints(
              prev.anchor,
              currAnchor,
              step.bendDirection ?? 'left',
              step.bendAngle ?? 30,
            );
      // looseness × chord 可能把 finite 输入放大溢出成 Infinity；非 finite 控制点会污染 Scene + layout
      if (!isFinitePoint(c1) || !isFinitePoint(c2)) {
        throw new Error(
          'Bend produced a non-finite control point (looseness / angle too large); use smaller values.',
        );
      }
      const fromClip = usedOverride ?? clipForTarget(prev.step.to, c1, nameStack, scopeChain);
      const toClip = clipForTarget(step.to, c2, nameStack, scopeChain);
      if (!fromClip || !toClip) return null;
      startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(prev.step.to));
      emitCubic(c1, c2, toClip, isAutoBoundaryTarget(step.to));
      collectLabel(step, t => cubicSegmentSample(fromClip, c1, c2, toClip, t));
      continue;
    }

    // step.kind === 'step' (fold)
    const corner = cornerOf(prev.anchor, currAnchor, step.via);
    const fromClip = usedOverride ?? clipForTarget(prev.step.to, corner, nameStack, scopeChain);
    const toClip = clipForTarget(step.to, corner, nameStack, scopeChain);
    if (!fromClip || !toClip) return null;
    startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(prev.step.to));
    emitLine(corner);
    emitLine(toClip, isAutoBoundaryTarget(step.to));
    collectLabel(step, t => foldSegmentSample(fromClip, corner, toClip, t));
  }

  // strokeWidth 解析：显式 strokeWidth > thickness 档位 > 默认 1
  const strokeWidth =
    path.strokeWidth ?? (path.thickness ? THICKNESS_TO_WIDTH[path.thickness] : 1);
  const baseProps: PathBaseProps = {
    stroke: path.stroke ?? 'currentColor',
    strokeWidth,
    // path.fill 缺省 'none'（仅描边）；纯色 / PaintSpec gradient 经 resolveFill → PaintValue
    fill: resolveFill(path.fill) ?? 'none',
    fillRule: path.fillRule,
    dashPattern: path.dashPattern,
    strokeLinecap: path.lineCap,
    strokeLinejoin: path.lineJoin,
    // IR `drawOpacity` → primitive `strokeOpacity`（与 Node 命名一致）
    opacity: path.opacity,
    fillOpacity: path.fillOpacity,
    strokeOpacity: path.drawOpacity,
  };

  const effectiveArrows = warnHook.effectiveArrows ?? BUILTIN_ARROWS;
  const arrows = endpointArrows(path.arrow, path.arrowDetail, effectiveArrows, round);

  // 中段 marking：把整条 path 的 pos∈[0,1] 分摊到 N 个绘制段，取该处 { point, tangent }，
  // 产一个按 tangent 定向的 arrow marker（复用端点箭头同款 def.emit 几何）；point 计入 bbox（远端 mark 不被裁）。
  const markPrims: Array<ScenePrimitive> = [];
  if (path.marks && path.marks.length > 0 && segmentSamplers.length > 0) {
    const segCount = segmentSamplers.length;
    for (const { pos, mark } of path.marks) {
      // pos·N 落第 segIdx 段（pos=1 收口落末段尾），段内参数 = 余数
      const scaled = pos * segCount;
      const segIdx = Math.min(Math.floor(scaled), segCount - 1);
      const localT = scaled - segIdx;
      const sample = segmentSamplers[segIdx](pos === 1 ? 1 : localT);
      const spec = resolveMarkArrowSpec(mark, effectiveArrows, round);
      markPrims.push(buildMarkMarkerGroup(spec, sample, round));
      // marker 落点纳入 bbox（保守取采样点；marker 自身尺寸相对小，端点已足够避免被裁）
      points.push(sample.point);
    }
  }

  // shrink 在 compile 算（端点收缩与 emit 落点无关）：按 shape + 视觉输入把首/末段端点向内缩短，
  // 让 line 端点接在 hollow arrow 尾部外缘、不贯穿 back outline；shrink=0 的实心 shape 跳过
  const shrinkStart =
    arrows.shrinkStart +
    (endpointSource.firstAutoBoundary ? arrows.boundaryOuterInsetStart : 0);
  const shrinkEnd =
    arrows.shrinkEnd + (endpointSource.lastAutoBoundary ? arrows.boundaryOuterInsetEnd : 0);
  applyArrowShrinks(commands, shrinkStart, shrinkEnd, strokeWidth, round);

  // 只在端点有箭头时塞 key——避免给无箭头 path 注入 `arrowStart: undefined` / `arrowEnd: undefined`（保 Scene 输出纯净）
  const endpointSpecs: { arrowStart?: typeof arrows.arrowStart; arrowEnd?: typeof arrows.arrowEnd } = {};
  if (arrows.arrowStart) endpointSpecs.arrowStart = arrows.arrowStart;
  if (arrows.arrowEnd) endpointSpecs.arrowEnd = arrows.arrowEnd;
  const { primitive } = splitSubPathsForEndpointArrows(commands, baseProps, endpointSpecs);
  const bodyPrims: Array<ScenePrimitive> = [primitive, ...labelPrims, ...markPrims];

  // 路径整体变换：rotate / scale 给定时，以包围盒中心为支点把本 path 的 primitive 包进 GroupPrim 写 transforms。
  // 顺序硬契约：端点已在当前 scope resolve 到世界坐标、arrow shrink 已在未变换几何上完成（上方），
  // 这里才以 bbox center 为支点包 group（geometry 留原坐标、变换由外层 group 承担）；layout 外接框据变换后 bbox 计。
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
      const transformedPoints = points.map(p => applyTransformChain(p, transforms));
      // scale × 坐标可能把 finite 输入放大溢出成 Infinity；非 finite 会污染 layout（round-trip 失真）
      if (!transformedPoints.every(isFinitePoint)) {
        throw new Error(
          'Path rotate / scale produced a non-finite coordinate (scale too large); use a smaller scale.',
        );
      }
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

export { refPointOfTarget } from './anchor';
