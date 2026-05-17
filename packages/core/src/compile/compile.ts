import { rect as rectOps } from '../geometry/rect';
import type { IR, IRChild, IRPath, IRPosition, IRScope } from '../ir';
import type { GroupPrim, Scene, ScenePrimitive, Transform } from '../primitive';
import { type DuplicateRegisterInfo, NameStack } from './name-stack';
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

/**
 * 把 scope.id 注册成最简占位 NodeLayout（0×0 rect 落在 scope 在当前累积 chain 下的局部原点）
 * @description scope.id 作为外部句柄进入父 frame；bbox 真正按子树范围计算的版本由后续 ADR 接手——此处先放占位，让 lookup 不返回 undefined、保证跨 scope 引用 scope.id 在编译期可解析
 */
const scopePlaceholderLayout = (
  id: string,
  chain: ReadonlyArray<Transform>,
): NodeLayout => {
  const [gx, gy] = chain.length === 0 ? [0, 0] : applyTransformChain([0, 0], chain);
  return {
    id,
    shape: 'rectangle',
    rect: { x: gx, y: gy, width: 0, height: 0, rotate: 0 },
    rotateDeg: 0,
    margin: 0,
    textWidth: 0,
    textHeight: 0,
    align: 'middle',
    lineHeight: 0,
    fontSize: 0,
  };
};

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
    | 'DUPLICATE_NODE_ID'
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

/**
 * Pass 1 递归扫描时记录的 pending path
 * @description path 必须等所有 node / coordinate Pass 1 注册完才能解析端点（避免前向引用），但 lookup 必须在它所在的 frame 栈上下文中进行——scope localNamespace 内 path 引用同 frame id 需在 frame pop 前完成。compile 处理顺序：每个层级先把子 node / coordinate / 子 scope 处理完（pending path 全部收集），然后**在该层 popFrame 前**统一 resolve 本层 pending path；这样 path 端点 inside-out lookup 能正确看到本层 frame
 */
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

/** 把 DuplicateRegisterInfo 翻成 CompileWarning（含可读 message + 双 IR locator） */
const formatDuplicateWarning = (info: DuplicateRegisterInfo): CompileWarning => {
  const frameNote =
    info.frameDepth === 0
      ? 'frame depth: 0 (root namespace)'
      : `frame depth: ${info.frameDepth} (under <Scope localNamespace>)`;
  const firstLoc = info.firstIrPath ?? '(unknown earlier location)';
  const secondLoc = info.secondIrPath ?? '(unknown current location)';
  return {
    code: 'DUPLICATE_NODE_ID',
    message: `Duplicate id '${info.id}' registered in the same namespace frame (${frameNote}); first defined at ${firstLoc}, redefined at ${secondLoc}. The later definition overrides the earlier one (last-wins).`,
    path: secondLoc,
  };
};

/**
 * IR → Scene 纯函数转换，所有 adapter 共享
 * @description Pass 1 递归处理 node / coordinate / scope，把 scope 树下沉为嵌套 GroupPrim；scope.transforms 中的 4 种 translate 变体按 lowerScopeTransforms 展平为 Cartesian transform；node 在 Scene primitive 树里是局部坐标 + GroupPrim transform 链、在 NameStack 中存全局坐标供其他节点 / path 引用。NameStack 用栈式 frame 管理命名空间：默认全局扁平、`<Scope localNamespace>` 推入子 frame；scope.id 始终在父 frame 注册（外部句柄）；id lookup 从栈顶向栈底 inside-out 搜索；同 frame 重复 id 触发 DUPLICATE_NODE_ID warn + 后定义覆盖前定义。Pass 2 解析 path 端点写 d 字符串，path primitive 发到 Pass 1 记录的对应容器；末端按 precision 折算 layout
 */
export const compileToScene = (ir: IR, options: CompileOptions = {}): Scene => {
  const measureText = options.measureText ?? fallbackMeasurer;
  const layoutPadding = options.padding ?? 10;
  const round = makeRound(options.precision ?? DEFAULT_PRECISION);
  const nodeDistance = options.nodeDistance;
  const onWarn = options.onWarn ?? defaultWarnDispatcher;

  const primitives: Array<ScenePrimitive> = [];
  const nameStack = new NameStack({
    onDuplicate: info => onWarn(formatDuplicateWarning(info)),
  });
  const allPoints: Array<IRPosition> = [];

  /**
   * 解析一批本层收集的 pending paths（lookup-only 阶段）
   * @description path primitive 一律 push 到顶层 `primitives` —— 端点已是全局坐标，不能进 GroupPrim 否则被 scope.transform 二次 apply。NameStack 切到 pass2 守门：path 解析中误调 register 抛 internal error；解析完切回 pass1 让上层 scope 子树继续 register 子节点
   */
  const resolvePendingPaths = (pending: ReadonlyArray<PendingPath>): void => {
    if (pending.length === 0) return;
    nameStack.enterLookupPhase();
    try {
      for (const item of pending) {
        const result = emitPathPrimitive(item.path, nameStack, round, measureText, {
          onWarn,
          irPath: item.irPath,
        });
        if (result) {
          for (const prim of result.primitives) primitives.push(prim);
          for (const p of result.points) allPoints.push(p);
        }
      }
    } finally {
      nameStack.exitLookupPhase();
    }
  };

  /**
   * 递归处理一组 IR child，把 node / coordinate 发到 sink、把本层 path 收集到 ownPaths、scope 下沉为 GroupPrim
   * @description 子节点处理完后**在本层 popFrame 前**统一 resolve ownPaths，确保 scope localNamespace 内 path 端点 lookup 能看到内层 frame；path 端点全局坐标 emit 到顶层 primitives 不进当前层 sink（GroupPrim 会对子 primitive 再 apply 一次 chain）
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
    /** 当前层级收集的 pending paths（在本层 popFrame 前 resolve） */
    const ownPaths: Array<PendingPath> = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.type === 'node') {
        const layout = layoutNode(child, measureText, nameStack, nodeDistance);
        const globalLayout = chain.length === 0 ? layout : projectLayoutToGlobal(layout, chain);
        if (child.id) {
          nameStack.register(child.id, globalLayout, `${locatorPrefix}children[${i}].node.id`);
        }
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
        const localCenter = resolvePosition(child.position, nameStack, nodeDistance);
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
        nameStack.register(
          child.id,
          coordinateAsLayout(child.id, globalCenter),
          `${locatorPrefix}children[${i}].coordinate.id`,
        );
      } else if (child.type === 'scope') {
        const rawTransforms = child.transforms ?? [];
        const loweredOwn = lowerScopeTransforms(rawTransforms, nameStack, nodeDistance);
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
        // scope.id 必须先于子树处理在父 frame 注册（外部句柄，不受 localNamespace 影响）
        if (child.id) {
          nameStack.register(
            child.id,
            scopePlaceholderLayout(child.id, innerChain),
            `${locatorPrefix}children[${i}].scope.id`,
          );
        }
        // 进入 scope 子 frame：localNamespace=true 时隔离子树命名空间
        const pushedFrame = child.localNamespace === true;
        if (pushedFrame) nameStack.pushFrame();
        const innerSink: Array<ScenePrimitive> = [];
        try {
          processChildren(
            child.children,
            innerChain,
            innerSink,
            `${locatorPrefix}children[${i}].scope.`,
          );
        } finally {
          if (pushedFrame) nameStack.popFrame();
        }
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
        // child.type === 'path'：本层 node / coordinate / 子 scope 处理完后统一 resolve（仍在本层 frame 上下文）
        // path 端点从 NameStack（全局坐标）查得，几何已是全局——primitive 在 resolvePendingPaths 中一律 push 顶层 primitives 避免被 scope.transform 重复 apply
        ownPaths.push({
          path: child,
          irPath: `${locatorPrefix}children[${i}].path`,
        });
      }
    }
    // 本层 children 处理完毕：在当前 frame 还活着时 resolve 本层 path（让 scope 内 path 引用 inside-out lookup 看到内层 id）
    resolvePendingPaths(ownPaths);
  };

  // 递归处理整棵 IR child 树；每层 children 末尾自行 resolve 本层 path
  processChildren(ir.children, [], primitives, '');

  return {
    primitives,
    layout: computeLayout(allPoints, layoutPadding, round),
  };
};
