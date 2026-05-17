import { rect as rectOps } from '../geometry/rect';
import type { IR, IRChild, IRPath, IRPosition, IRScope } from '../ir';
import type { GroupPrim, Scene, ScenePrimitive, Transform } from '../primitive';
import { type NodeLayout, emitNodePrimitives, layoutNode } from './node';
import { emitPathPrimitive } from './path/index';
import { resolvePosition } from './position';
import { DEFAULT_PRECISION, makeRound } from './precision';
import {
  applyTransformChain,
  lowerScopeTransforms,
  projectLayoutToGlobal,
} from './scope';
import { type TextMeasurer, fallbackMeasurer } from './text-metrics';
import { computeLayout } from './layout';

/**
 * 把 coordinate 注册成 0×0 NodeLayout
 * @description 让后续 path target / `at.of` 引用时 boundaryPoint 命中中心，符合"占位无形状边界"语义
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

/** 编译期警告：path / position 解析失败时通过 `CompileOptions.onWarn` 发出，不影响编译产物 */
export type CompileWarning = {
  /**
   * 警告类型代码（机器可读）
   * @description 用户可按 code 分支处理；未来 alpha 加新 code 不破坏调用方
   */
  code:
    | 'UNRESOLVED_NODE_REFERENCE'
    | 'PATH_TOO_SHORT'
    | 'ANCHOR_RESOLUTION_FAILED'
    | 'OFFSET_BASE_UNRESOLVED'
    | 'POLAR_ORIGIN_UNRESOLVED'
    | 'AT_TARGET_UNRESOLVED'
    | 'RELATIVE_INITIAL_NO_PREV_END'
    | 'BBOX_EXTREME_INPUT'
    | (string & {});
  /** 人类可读消息（英文） */
  message: string;
  /** IR locator 路径（jq-like，如 `'children[3].path.children[1].to'`） */
  path: string;
};

/** compileToScene 的可选参数 */
export type CompileOptions = {
  /** 注入文字度量函数；不传则用 fallback（不准但可跑） */
  measureText?: TextMeasurer;
  /** layout 周围的留白（user units），默认 10 */
  padding?: number;
  /**
   * 输出坐标的小数位精度；默认 2
   * @description 仅作用于 Scene primitive / path d / layout；内部几何计算保持完整 double 精度
   */
  precision?: number;
  /**
   * 相对定位的默认距离（对应 TikZ `node distance`，user units）
   * @description `Node.position` 为 `{ direction, of }` 且未自带 `distance` 时取此值；未配回退到 1
   */
  nodeDistance?: number;
  /**
   * 编译期警告收集器
   * @description path / position 解析失败时按 IR locator + code + message 同步触发；不传时 dev 模式（`process.env.NODE_ENV !== 'production'`）默认 `console.warn`、生产静默
   */
  onWarn?: (warning: CompileWarning) => void;
};

/**
 * 默认 warn dispatcher：dev 模式 console.warn、生产静默
 * @description 用户传 onWarn 时使用用户的；不传走此 fallback
 */
const defaultWarnDispatcher = (warning: CompileWarning): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  console.warn(`[retikz] ${warning.code} at ${warning.path}: ${warning.message}`);
};

/** Pass 1 递归扫描时记录的 pending path，Pass 2 解析后一律发到顶层 primitives */
type PendingPath = {
  /** path IR 节点本体 */
  path: IRPath;
  /** path 在 IR 中的 jq-like locator（如 `children[2].scope.children[1].path`） */
  irPath: string;
};

/** scope.transforms 解析失败时根据失败成因映射的 warn code */
const scopeTransformWarnCode = (
  scope: IRScope,
): CompileWarning['code'] => {
  // 取首个 translate 变体的 kind 决定 warn code（多个都失败时只报第一种成因）
  for (const t of scope.transforms ?? []) {
    if (t.kind === 'offset-translate') return 'OFFSET_BASE_UNRESOLVED';
    if (t.kind === 'at-translate') return 'AT_TARGET_UNRESOLVED';
    if (t.kind === 'polar-translate') return 'POLAR_ORIGIN_UNRESOLVED';
  }
  return 'UNRESOLVED_NODE_REFERENCE';
};

/**
 * IR → Scene 纯函数转换，所有 adapter 共享
 * @description Pass 1 递归处理 node / coordinate / scope，把 scope 树下沉为嵌套 GroupPrim；scope.transforms 中的 4 种 translate 变体按 lowerScopeTransforms 展平为 Cartesian transform；node 在 Scene primitive 树里是局部坐标 + GroupPrim transform 链、在 nodeIndex 中存全局坐标供其他节点 / path 引用。Pass 2 解析 path 端点写 d 字符串，path primitive 发到 Pass 1 记录的对应容器；末端按 precision 折算 layout
 */
export const compileToScene = (ir: IR, options: CompileOptions = {}): Scene => {
  const measureText = options.measureText ?? fallbackMeasurer;
  const layoutPadding = options.padding ?? 10;
  const round = makeRound(options.precision ?? DEFAULT_PRECISION);
  const nodeDistance = options.nodeDistance;
  const onWarn = options.onWarn ?? defaultWarnDispatcher;

  const primitives: Array<ScenePrimitive> = [];
  const nodeIndex = new Map<string, NodeLayout>();
  const allPoints: Array<IRPosition> = [];
  const pendingPaths: Array<PendingPath> = [];

  /**
   * 递归处理一组 IR child，把 node / coordinate 发到 sink、把 path 收集到 pendingPaths、scope 下沉为 GroupPrim
   * @param children 当前层级的 IR child 数组
   * @param chain 从根到当前层级累积的 Cartesian-only transform 链
   * @param sink 当前层级 Scene primitive 落点（顶层 = primitives，scope 内 = GroupPrim.children）
   * @param locatorPrefix IR locator 前缀（如 `''` 表示顶层、`children[2].scope.` 表示某 scope 内）
   */
  const processChildren = (
    children: ReadonlyArray<IRChild>,
    chain: ReadonlyArray<Transform>,
    sink: Array<ScenePrimitive>,
    locatorPrefix: string,
  ): void => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.type === 'node') {
        const layout = layoutNode(child, measureText, nodeIndex, nodeDistance);
        const globalLayout = chain.length === 0 ? layout : projectLayoutToGlobal(layout, chain);
        if (child.id) nodeIndex.set(child.id, globalLayout);
        for (const prim of emitNodePrimitives(layout, round)) {
          sink.push(prim);
        }
        // bbox 用全局坐标系下的 4 角点累积——scope 内 node 也参与顶层 layout 计算
        allPoints.push(
          rectOps.anchor(globalLayout.rect, 'north-west'),
          rectOps.anchor(globalLayout.rect, 'north-east'),
          rectOps.anchor(globalLayout.rect, 'south-west'),
          rectOps.anchor(globalLayout.rect, 'south-east'),
        );
      } else if (child.type === 'coordinate') {
        const localCenter = resolvePosition(child.position, nodeIndex, nodeDistance);
        if (!localCenter) {
          onWarn({
            code: 'POLAR_ORIGIN_UNRESOLVED',
            message: `Cannot resolve position for coordinate '${child.id}'; polar.origin or at.of may reference an undefined node`,
            path: `${locatorPrefix}children[${i}].coordinate.position`,
          });
          throw new Error(
            `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
          );
        }
        const globalCenter = chain.length === 0 ? localCenter : applyTransformChain(localCenter, chain);
        nodeIndex.set(child.id, coordinateAsLayout(child.id, globalCenter));
      } else if (child.type === 'scope') {
        const rawTransforms = child.transforms ?? [];
        const loweredOwn = lowerScopeTransforms(rawTransforms, nodeIndex, nodeDistance);
        if (loweredOwn === null) {
          onWarn({
            code: scopeTransformWarnCode(child),
            message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin) is undefined or defined later in the IR`,
            path: `${locatorPrefix}children[${i}].scope.transforms`,
          });
          // 失败时退化为不应用 transform，继续处理子树以收集尽可能多的产物
        }
        const ownTransforms: ReadonlyArray<Transform> = loweredOwn ?? [];
        const innerChain: ReadonlyArray<Transform> = [...chain, ...ownTransforms];
        const innerSink: Array<ScenePrimitive> = [];
        processChildren(
          child.children,
          innerChain,
          innerSink,
          `${locatorPrefix}children[${i}].scope.`,
        );
        // TODO: 当 scope.id 设值时注册 axis-aligned synthetic bbox layout，让外部 path 能 target 'scope-id.<anchor>'
        const hasOwnTransforms = ownTransforms.length > 0;
        const isPrunable =
          innerSink.length === 0 &&
          !hasOwnTransforms &&
          child.id === undefined;
        if (isPrunable) continue;
        const group: GroupPrim = {
          type: 'group',
          children: innerSink,
        };
        if (hasOwnTransforms) group.transforms = [...ownTransforms];
        sink.push(group);
      } else {
        // child.type === 'path'：Pass 2 才解析。
        // path 端点从 nodeIndex（全局坐标）查得，几何已是全局——不进 GroupPrim 避免被 scope.transform 重复 apply
        pendingPaths.push({
          path: child,
          irPath: `${locatorPrefix}children[${i}].path`,
        });
      }
    }
  };

  // Pass 1：递归处理整棵 IR child 树
  processChildren(ir.children, [], primitives, '');

  // Pass 2：解析所有 path（来自顶层 / 任意 scope 内）；端点取 nodeIndex 全局坐标，primitive 一律落顶层
  for (const pending of pendingPaths) {
    const result = emitPathPrimitive(pending.path, nodeIndex, round, measureText, {
      onWarn,
      irPath: pending.irPath,
    });
    if (result) {
      for (const prim of result.primitives) primitives.push(prim);
      for (const p of result.points) allPoints.push(p);
    }
  }

  return {
    primitives,
    layout: computeLayout(allPoints, layoutPadding, round),
  };
};
