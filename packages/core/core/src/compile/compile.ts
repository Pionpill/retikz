import { rect as rectOps } from '../geometry/rect';
import type { IR, IRAnimationTrack, IRChild, IRPath, IRPosition, IRScope } from '../ir';
import type { GroupPrim, Scene, ScenePrimitive, Transform } from '../primitive';
import { BUILTIN_SHAPES } from '../shapes';
import type { ShapeDefinition } from '../shapes';
import { BUILTIN_ARROWS } from '../arrows';
import type { ArrowDefinition } from '../arrows';
import { BUILTIN_PATTERNS } from '../patterns';
import type { PatternDefinition } from '../patterns';
import type { PathGeneratorDefinition } from '../pathGenerators';
import type { CompositeDefinition } from '../composites';
import {
  type CompileWarning,
  CompileWarningCode,
  formatCompileWarning,
} from './constant';
import { lowerComposites } from './composite';
import { type DuplicateRegisterInfo, NameStack } from './name-stack';
import { type NodeLayout, emitNodePrimitives, labelExtentPoints, layoutNode } from './node';
import { createPaintRegistry } from './paint';
import { createClipRegistry } from './clip';
import { emitPathPrimitive, refPointOfTarget } from './path';
import { resolvePosition } from './position';
import { DEFAULT_PRECISION, makeRound } from './precision';
import {
  applyTransformChain,
  computeScopeBoundingBox,
  lowerScopeTransforms,
  projectLayoutToGlobal,
  registerScopeAsLayout,
} from './scope';
import {
  type StyleFrame,
  buildStyleFrame,
  resolveEffectivePath,
  resolveLabelDefault,
  resolveNodeStyle,
} from './style';
import { type TextMeasurer, fallbackMeasurer } from './text-metrics';
import { computeLayout } from './layout';

export type { CompileWarning } from './constant';
export { CompileWarningCode } from './constant';

/**
 * 构造一个落在指定全局点的 0×0 rectangle NodeLayout
 * @description coordinate / scope.id 入场临时占位等"无形状只有位置"句柄共享此结构，
 *   让后续 path target / `at.of` / `offset.of` / `polar.origin` 引用时 boundaryPoint 命中中心。
 */
const zeroSizeRectAt = (
  id: string,
  [cx, cy]: IRPosition,
  shapes: Record<string, ShapeDefinition>,
): NodeLayout => ({
  id,
  shapeName: 'rectangle',
  shapeDef: shapes.rectangle,
  rect: { x: cx, y: cy, width: 0, height: 0, rotate: 0 },
  rotateDeg: 0,
  margin: 0,
  textWidth: 0,
  textHeight: 0,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
  shapes,
});

/**
 * 把 coordinate 注册成 0×0 NodeLayout
 * @description 让后续 path target / `at.of` 引用时 boundaryPoint 命中中心，符合"占位无形状边界"语义
 */
const coordinateAsLayout = (
  id: string,
  center: IRPosition,
  shapes: Record<string, ShapeDefinition>,
): NodeLayout => zeroSizeRectAt(id, center, shapes);

/**
 * scope.id 入场时的临时占位 NodeLayout
 * @description scope 子树尚未处理时先放 0×0 占位（落在 scope 局部原点经累积 chain 投到全局的位置），
 *   让 scope 子树内任何 lookup 不返回 undefined（占位语义自洽）。
 *   子树 Pass 1 处理完毕后由 `registerScopeAsLayout` 算出真 bbox layout 覆盖此占位（NameStack.replaceLayout 不发 duplicate warn）
 */
const scopePlaceholderLayout = (
  id: string,
  chain: ReadonlyArray<Transform>,
  shapes: Record<string, ShapeDefinition>,
): NodeLayout => {
  const globalOrigin: IRPosition =
    chain.length === 0 ? [0, 0] : applyTransformChain([0, 0], chain);
  return zeroSizeRectAt(id, globalOrigin, shapes);
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
  /**
   * 运行时注入的第三方 shape（不进 IR）
   * @description 有效 shape 表 = `{ ...BUILTIN_SHAPES, ...shapes }`——同名 key 覆盖内置，经 `onWarn` 发
   *   `SHAPE_OVERRIDES_BUILTIN`。IR 的 `node.shape` 仍是字符串；未注册名在编译期 throw。
   */
  shapes?: Record<string, ShapeDefinition>;
  /**
   * 运行时注入的第三方 arrow（不进 IR）
   * @description 有效 arrow 表 = `{ ...BUILTIN_ARROWS, ...arrows }`——同名 key 覆盖内置，经 `onWarn` 发
   *   `ARROW_OVERRIDES_BUILTIN`。IR 的 `arrowDetail.shape` 仍是字符串；未注册名在编译期 throw。
   */
  arrows?: Record<string, ArrowDefinition>;
  /**
   * 运行时注入的第三方 pattern motif（不进 IR）
   * @description 有效 pattern 表 = `{ ...BUILTIN_PATTERNS, ...patterns }`——同名 key 覆盖内置，经 `onWarn` 发
   *   `PATTERN_OVERRIDES_BUILTIN`。IR 的 `pattern.shape` 仍是字符串；未注册名在编译期 throw。
   *   compile 对 pattern 资源查本表 + 调 `PatternDefinition.emit` 产 tile，写进 `SceneResource.tile`。
   */
  patterns?: Record<string, PatternDefinition>;
  /**
   * 运行时注入的第三方 path generator（不进 IR）
   * @description generator step 编译时按 `name` 查本表；core 不内置任何曲线生成器，故无内置合并。
   *   解析时序：查表（未注册 throw，错误列出可用名）→ `paramsSchema.parse(params)` →
   *   对结果再跑 `JsonObjectSchema.parse` 二次确认 JSON-safe → `targetParams` 顶层 key 经 target lookup
   *   resolve 成世界坐标 → 调 `generate(ctx)` → splice 产出的 `PathCommand[]` 进命令流。IR 的
   *   `generator.name` 仍是字符串；generator 函数本身只在此运行时注入面、不进 IR。
   */
  pathGenerators?: Record<string, PathGeneratorDefinition>;
  /**
   * 运行时注入的 Tier 2 composite 展开逻辑（不进 IR）
   * @description compileToScene 第一步据各 def 的 schema 提取的 `${namespace}.${type}` 把 IR 里的 composite
   *   节点展开成 Tier 1；core 无内置。未注册 namespace/type → `onWarn(COMPOSITE_NOT_REGISTERED)` + 跳过该节点。
   */
  composites?: Array<CompositeDefinition>;
  /**
   * composite 嵌套展开的最大深度（防环 / 防失控递归）
   * @description 默认 32；composite 展开出 composite 时累加，超限或环 throw。
   */
  maxCompositeDepth?: number;
};

/**
 * 显式 viewBox → Scene.layout（finite 守卫 + round）
 * @description schema 的 `.finite().positive()` 只在 IR parse 守门；compileToScene 直接收手搓 / LLM IR 会绕过，
 *   故此处是唯一真实关口——非 finite / 非正尺寸会污染 Scene round-trip。非法即抛清晰错（不泄漏进 Scene）；
 *   四字段按 Scene precision round（与自动算 layout 同口径）。
 */
const viewBoxToLayout = (
  vb: { x: number; y: number; width: number; height: number },
  round: (n: number) => number,
): { x: number; y: number; width: number; height: number } => {
  // 先守 raw（直接 NaN/Infinity/退化的清晰错），再 round，再复检 round 后值——
  // 极端 precision（10**p 溢出 Infinity）/ 极值坐标（×10**p 溢出）/ 负 precision（round 成 0 宽）
  // 都可能让"合法 raw" round 后变脏；round 产物才是真正进 Scene 的值，故 round 后是最终关口。
  if (!Number.isFinite(vb.x) || !Number.isFinite(vb.y)) {
    throw new Error(`viewBox has a non-finite origin (x=${String(vb.x)}, y=${String(vb.y)}); both must be finite.`);
  }
  if (!Number.isFinite(vb.width) || vb.width <= 0) {
    throw new Error(`viewBox has an invalid width (${String(vb.width)}); it must be a finite number greater than 0.`);
  }
  if (!Number.isFinite(vb.height) || vb.height <= 0) {
    throw new Error(`viewBox has an invalid height (${String(vb.height)}); it must be a finite number greater than 0.`);
  }
  const x = round(vb.x);
  const y = round(vb.y);
  const width = round(vb.width);
  const height = round(vb.height);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error(
      `viewBox rounds to an invalid layout (x=${String(x)}, y=${String(y)}, width=${String(width)}, height=${String(height)}); check precision and coordinate magnitude.`,
    );
  }
  return { x, y, width, height };
};

/**
 * 自动算 layout 的 finite 守卫：四值非全 finite 即抛清晰错（LLM 可读），不泄漏进 Scene
 * @description computeLayout 由 `center ± halfWidth` 等运算聚合——极端 shape 几何（如 outerRadius:1e308
 *   半轴 finite 但 center+halfWidth 溢出 Infinity）会让运算结果脏。schema 的 `.finite()` 只守单字段输入，
 *   守不住聚合后的溢出；此处复用 viewBoxToLayout 同款 finite 关口，是自动 layout 进 Scene 前的唯一兜底。
 */
const assertFiniteLayout = (layout: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number; width: number; height: number } => {
  if (
    !Number.isFinite(layout.x) ||
    !Number.isFinite(layout.y) ||
    !Number.isFinite(layout.width) ||
    !Number.isFinite(layout.height)
  ) {
    throw new Error(
      `Node layout produced non-finite bounds (x=${String(layout.x)}, y=${String(layout.y)}, width=${String(layout.width)}, height=${String(layout.height)}); check shape geometry (e.g. extreme radius).`,
    );
  }
  return layout;
};

/**
 * 默认 warn dispatcher：dev 模式 console.warn、生产静默
 * @description 用户传 onWarn 时使用用户的；不传走此 fallback
 */
const defaultWarnDispatcher = (warning: CompileWarning): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  console.warn(formatCompileWarning(warning));
};

/**
 * 校验 animation tracks 的 viewBox⇔根 约束（schema 上下文无关、分不清元素 vs 根，故在此 compile 层做）
 * @description `viewBox`（镜头）只在 scene 根合法、元素级非法；scene 根只接受 `viewBox`。违例 track → `warn(ANIMATION_INVALID_PROPERTY)` + drop（不丢图、不影响其余 track）。全空返回 undefined（不 stamp 空数组）。
 */
const filterAnimations = (
  tracks: ReadonlyArray<IRAnimationTrack> | undefined,
  context: 'element' | 'root',
  onWarn: (warning: CompileWarning) => void,
  irPath: string,
): Array<IRAnimationTrack> | undefined => {
  if (tracks === undefined) return undefined;
  const kept = tracks.filter((track, index) => {
    const isViewBox = track.property === 'viewBox';
    const valid = context === 'root' ? isViewBox : !isViewBox;
    if (!valid) {
      onWarn({
        code: CompileWarningCode.AnimationInvalidProperty,
        message:
          context === 'root'
            ? `Scene-root animation must use the "viewBox" property (camera); got "${track.property}". Track dropped.`
            : `Animation property "viewBox" is camera-only (scene root), not valid on an element. Track dropped.`,
        path: `${irPath}.animations[${index}]`,
      });
      return false;
    }
    return true;
  });
  return kept.length > 0 ? kept : undefined;
};

/**
 * Pass 1 递归扫描时记录的 pending path
 * @description path 必须等所有 node / coordinate Pass 1 注册完才能解析端点（避免前向引用），但 lookup 必须在它所在的 frame 栈上下文中进行——scope localNamespace 内 path 引用同 frame id 需在 frame pop 前完成。compile 处理顺序：每个层级先把子 node / coordinate / 子 scope 处理完（pending path 全部收集），然后**在该层 popFrame 前**统一 resolve 本层 pending path；这样 path 端点 inside-out lookup 能正确看到本层 frame。
 *   `scopeChain` 字段记录该 path 所在 scope 的累积 transform 链，让 path step 内 polar/at/offset
 *   `to` 在 scope 局部度量后由 path 端点 lookup 端走 `applyTransformChain` 投回全局。
 */
/**
 * 编译期占位 primitive：Pass 1 的 path 分支先在 sink 占一个位记住声明位置，Pass 2 解析出真 primitive 后按引用 splice 替换。绝不进入最终 Scene 输出（compileToScene 返回前由 placeholderBalance 无条件校验兜底）。
 */
type PathPlaceholder = { type: 'path-placeholder' };

/** compile 内部 sink 元素类型：真 Scene primitive 或编译期占位；构造 GroupPrim / 返回 Scene 前收窄回 ScenePrimitive */
type InternalScenePrimitive = ScenePrimitive | PathPlaceholder;

const makePathPlaceholder = (): PathPlaceholder => ({ type: 'path-placeholder' });

/** 把内部 sink 收窄回公开 ScenePrimitive[]：占位已全部回填（compileToScene 末端 placeholderBalance 无条件校验兜底） */
const sealSink = (sink: Array<InternalScenePrimitive>): Array<ScenePrimitive> =>
  sink as Array<ScenePrimitive>;

/** dev 诊断：递归找出残留占位的 index 路径，供末端无条件校验报错时定位 */
const collectPlaceholderLocators = (
  prims: ReadonlyArray<InternalScenePrimitive>,
  prefix = 'primitives',
): Array<string> => {
  const locators: Array<string> = [];
  prims.forEach((prim, idx) => {
    if (prim.type === 'path-placeholder') {
      locators.push(`${prefix}[${idx}]`);
    } else if (prim.type === 'group') {
      locators.push(
        ...collectPlaceholderLocators(prim.children, `${prefix}[${idx}].children`),
      );
    }
  });
  return locators;
};

type PendingPath = {
  /** path IR 节点本体 */
  path: IRPath;
  /** path 在 IR 中的 jq-like locator（如 `children[2].scope.children[1].path`） */
  irPath: string;
  /** 该 path 所属 scope 的累积 transform 链；顶层 path = [] */
  scopeChain: ReadonlyArray<Transform>;
  /**
   * 回填目标：scopeChain 为空（顶层 / 无 transform scope）时占位——记下所在 sink 与占位 marker，
   * Pass 2 原位 splice 回填；scopeChain 非空（transformed scope）时缺省，path 走 hoist 到顶层 primitives。
   */
  slot?: { sink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
  /** 该 path 的显式 zIndex（raw child.zIndex）；缺省 = 0。回填 / hoist 时复制到 real primitive */
  zIndex?: number;
};

/** scope.transforms 解析失败时根据失败成因映射的 warn code */
const scopeTransformWarnCode = (
  scope: IRScope,
): CompileWarning['code'] => {
  // 取首个 translate 变体的 kind 决定 warn code（多个都失败时只报第一种成因）
  for (const t of scope.transforms ?? []) {
    if (t.kind === 'offset-translate') return CompileWarningCode.OffsetBaseUnresolved;
    if (t.kind === 'at-translate') return CompileWarningCode.AtTargetUnresolved;
    if (t.kind === 'polar-translate') return CompileWarningCode.PolarOriginUnresolved;
    if (t.kind === 'between-translate') return CompileWarningCode.UnresolvedNodeReference;
  }
  return CompileWarningCode.UnresolvedNodeReference;
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
    code: CompileWarningCode.DuplicateNodeId,
    message: `Duplicate id '${info.id}' registered in the same namespace frame (${frameNote}); first defined at ${firstLoc}, redefined at ${secondLoc}. The later definition overrides the earlier one (last-wins).`,
    path: secondLoc,
  };
};

/**
 * IR → Scene 纯函数转换，所有 adapter 共享
 * @description Pass 1 递归处理 node / coordinate / scope，把 scope 树下沉为嵌套 GroupPrim；scope.transforms 中的 5 种 translate 变体按 lowerScopeTransforms 展平为 Cartesian transform；node 在 Scene primitive 树里是局部坐标 + GroupPrim transform 链、在 NameStack 中存全局坐标供其他节点 / path 引用。NameStack 用栈式 frame 管理命名空间：默认全局扁平、`<Scope localNamespace>` 推入子 frame；scope.id 始终在父 frame 注册（外部句柄）；id lookup 从栈顶向栈底 inside-out 搜索；同 frame 重复 id 触发 DUPLICATE_NODE_ID warn + 后定义覆盖前定义。Pass 2 解析 path 端点写 d 字符串，path primitive 发到 Pass 1 记录的对应容器；末端按 precision 折算 layout
 */
export const compileToScene = (ir: IR, options: CompileOptions = {}): Scene => {
  const measureText = options.measureText ?? fallbackMeasurer;
  const layoutPadding = options.padding ?? 10;
  const round = makeRound(options.precision ?? DEFAULT_PRECISION);
  const nodeDistance = options.nodeDistance;
  const onWarn = options.onWarn ?? defaultWarnDispatcher;

  // Tier 2：第一步据注册表把 composite 节点展开成 Tier 1（未注册 warn + skip），后续 pass 只见 Tier 1
  const loweredIr = lowerComposites(ir, options.composites ?? [], {
    onWarn,
    maxDepth: options.maxCompositeDepth,
  });

  // 有效 shape 表：内置 + 注入（同名注入覆盖内置）；覆盖内置经 onWarn 发 SHAPE_OVERRIDES_BUILTIN
  const effectiveShapes: Record<string, ShapeDefinition> = options.shapes
    ? { ...BUILTIN_SHAPES, ...options.shapes }
    : BUILTIN_SHAPES;
  if (options.shapes) {
    for (const name of Object.keys(options.shapes)) {
      if (Object.prototype.hasOwnProperty.call(BUILTIN_SHAPES, name)) {
        onWarn({
          code: CompileWarningCode.ShapeOverridesBuiltin,
          message: `Injected shape '${name}' overrides the built-in shape of the same name.`,
          path: `options.shapes.${name}`,
        });
      }
    }
  }

  // 有效 path generator 表：core 无内置，注入即全部（未注册名编译期 throw）。
  // 解析逻辑（查表 / 双 parse / targetParams resolve / generate splice）由 path 层落地。
  const effectivePathGenerators: Record<string, PathGeneratorDefinition> =
    options.pathGenerators ?? {};

  // 有效 arrow 表：内置 + 注入（同名注入覆盖内置）；覆盖内置经 onWarn 发 ARROW_OVERRIDES_BUILTIN
  const effectiveArrows: Record<string, ArrowDefinition> = options.arrows
    ? { ...BUILTIN_ARROWS, ...options.arrows }
    : BUILTIN_ARROWS;
  if (options.arrows) {
    for (const name of Object.keys(options.arrows)) {
      if (Object.prototype.hasOwnProperty.call(BUILTIN_ARROWS, name)) {
        onWarn({
          code: CompileWarningCode.ArrowOverridesBuiltin,
          message: `Injected arrow '${name}' overrides the built-in arrow of the same name.`,
          path: `options.arrows.${name}`,
        });
      }
    }
  }

  // 有效 pattern 表：内置 + 注入（同名注入覆盖内置）；覆盖内置经 onWarn 发 PATTERN_OVERRIDES_BUILTIN
  const effectivePatterns: Record<string, PatternDefinition> = options.patterns
    ? { ...BUILTIN_PATTERNS, ...options.patterns }
    : BUILTIN_PATTERNS;
  if (options.patterns) {
    for (const name of Object.keys(options.patterns)) {
      if (Object.prototype.hasOwnProperty.call(BUILTIN_PATTERNS, name)) {
        onWarn({
          code: CompileWarningCode.PatternOverridesBuiltin,
          message: `Injected pattern '${name}' overrides the built-in pattern of the same name.`,
          path: `options.patterns.${name}`,
        });
      }
    }
  }

  const primitives: Array<InternalScenePrimitive> = [];
  /** 已 push 但未回填的占位计数；compileToScene 返回前必须归零（无条件守 Scene 公开契约） */
  let placeholderBalance = 0;
  /**
   * primitive → 显式 zIndex 旁路记录（缺省视为 0）；sealSink 后按它稳定排序，不写进 primitive 本体（保 Scene 输出纯净）。
   * key 只会是 real ScenePrimitive——占位 PathPlaceholder 永不进此 Map（占位即将被回填替换）。
   */
  const zIndexOf = new Map<ScenePrimitive, number>();
  /**
   * 按 zIndex 升序原地稳定排序：同 zIndex 保持原 IR 顺序（decorate-sort 带原始下标）。全 0 键 = 恒等。
   * 仅在 sealSink（占位已回填、类型已收窄回 ScenePrimitive）之后调用。
   */
  const stableSortByZIndex = (arr: Array<ScenePrimitive>): Array<ScenePrimitive> => {
    const decorated = arr.map((prim, index) => ({ prim, index, z: zIndexOf.get(prim) ?? 0 }));
    decorated.sort((a, b) => a.z - b.z || a.index - b.index);
    for (let i = 0; i < arr.length; i++) arr[i] = decorated[i].prim;
    return arr;
  };
  const nameStack = new NameStack({
    onDuplicate: info => onWarn(formatDuplicateWarning(info)),
  });
  const allPoints: Array<IRPosition> = [];
  // paint 登记表：node / path 的 PaintSpec fill 去重 + 派稳定 id → Scene.resources；
  // pattern 资源额外查 effectivePatterns + emit 产 tile（emit-in-compile），用同一 round 保几何一致
  const paint = createPaintRegistry(effectivePatterns, round);
  // clip 登记表：scope.clip 去重 + 派稳定 id（clip-N）→ Scene.resources（与 paint 同表，id 命名空间不撞）
  const clip = createClipRegistry(round);

  /**
   * 解析一批本层收集的 pending paths（lookup-only 阶段）
   * @description 两种落点：有 `slot`（scopeChain 为空）→ 原位 splice 回填该 path 在本层 sink 占的位（按引用定位免索引漂移），保住与同层 node 的 IR 声明序；无 `slot`（scopeChain 非空）→ hoist 到顶层 `primitives`，因端点已是全局坐标、进 transformed GroupPrim 会被 scope.transform 二次 apply。NameStack 切到 pass2 守门：path 解析中误调 register 抛 internal error；解析完切回 pass1 让上层 scope 子树继续 register 子节点。
   *   `item.scopeChain` 记录该 path 所属 scope 累积 transform 链——传给 emitPathPrimitive，
   *   让 step.to 内的 polar/at/offset 字面量按"当前 scope 局部度量 + 末端 apply chain"投影回全局。
   */
  const resolvePendingPaths = (pending: ReadonlyArray<PendingPath>): void => {
    if (pending.length === 0) return;
    nameStack.enterLookupPhase();
    try {
      for (const item of pending) {
        const result = emitPathPrimitive(item.path, nameStack, round, measureText, {
          onWarn,
          irPath: item.irPath,
          scopeChain: item.scopeChain,
          resolveFill: paint.resolve,
          effectiveArrows,
          effectivePathGenerators,
        });
        if (item.slot) {
          // 原位回填：按引用定位占位再 splice 替换为真 primitive（result 为 null 时替换成 0 个 = 删占位）
          const idx = item.slot.sink.indexOf(item.slot.placeholder);
          if (idx === -1) {
            throw new Error('internal: path placeholder missing from its sink');
          }
          const real = result?.primitives ?? [];
          item.slot.sink.splice(idx, 1, ...real);
          if (item.zIndex !== undefined) {
            for (const prim of real) zIndexOf.set(prim, item.zIndex);
          }
          placeholderBalance--;
        } else if (result) {
          // hoist：transformed scope 内 path 留在顶层 primitives（已知限制）
          for (const prim of result.primitives) {
            primitives.push(prim);
            if (item.zIndex !== undefined) zIndexOf.set(prim, item.zIndex);
          }
        }
        if (result) {
          for (const p of result.points) allPoints.push(p);
        }
      }
    } finally {
      nameStack.exitLookupPhase();
    }
  };

  /**
   * 递归处理一组 IR child，把 node / coordinate 发到 sink、把本层 path 收集到 pathsAccumulator、scope 下沉为 GroupPrim
   * @description **不**在内部 resolve pathsAccumulator——调用方负责在合适时机（scope 入口：bbox replaceLayout 之后 / popFrame 之前；顶层：所有处理结束后）调用 resolvePendingPaths。这样 scope.id 的 placeholder→real bbox 替换在本层 path 端点 lookup 之前完成，避免 "scope 内 path 自引用本 scope.id 拿到 placeholder" 的 latent bug，同时保留 ADR-02 的 "本层 path 在本层 frame 还在栈顶时 resolve" inside-out lookup 语义。
   * @param children 当前层级的 IR child 数组
   * @param chain 从根到当前层级累积的 Cartesian-only transform 链
   * @param sink 当前层级 Scene primitive 落点（顶层 = primitives，scope 内 = GroupPrim.children）
   * @param locatorPrefix IR locator 前缀（如 `''` 表示顶层、`children[2].scope.` 表示某 scope 内）
   * @param layoutsAccumulator 当前 scope 子树所有"实体"layout（node / coordinate / 嵌套 scope.id synthetic）累积——专给上层 scope.id bbox 计算用；顶层调用传一个共享数组（用得着就用，丢弃也不影响）
   * @param pathsAccumulator 当前层级收集的 pending paths——由调用方分配并在合适时机 resolve
   * @param styleStack 从根到当前层级累积的样式 frame 栈（scope 级联 graphic state + 四通道 every-X + resetStyle）；node / path 进入时按 inside-out per-field 解析 effective 样式
   */
  const processChildren = (
    children: ReadonlyArray<IRChild>,
    chain: ReadonlyArray<Transform>,
    sink: Array<InternalScenePrimitive>,
    locatorPrefix: string,
    layoutsAccumulator: Array<NodeLayout>,
    pathsAccumulator: Array<PendingPath>,
    styleStack: ReadonlyArray<StyleFrame>,
  ): void => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if ('namespace' in child) {
        // lowerComposites 已在 compileToScene 第一步展开 / 跳过所有 tier2 composite；走到这里说明管线被绕过
        throw new Error(
          `Unexpected composite node '${child.namespace}.${child.type}' reached compile; composites must be lowered via lowerComposites first.`,
        );
      }
      if (child.type === 'node') {
        const effectiveNode = resolveNodeStyle(child, styleStack);
        const layout = layoutNode(
          { ...effectiveNode, animations: filterAnimations(effectiveNode.animations, 'element', onWarn, `${locatorPrefix}children[${i}].node`) },
          measureText,
          nameStack,
          nodeDistance,
          chain,
          resolveLabelDefault(styleStack),
          effectiveShapes,
          // between 端点世界坐标解析器（refPointOfTarget 处理 NodeTarget anchor / Cartesian / Polar / Offset / 嵌套 between）
          refPointOfTarget,
        );
        const globalLayout = chain.length === 0 ? layout : projectLayoutToGlobal(layout, chain);
        if (child.id) {
          nameStack.register(child.id, globalLayout, `${locatorPrefix}children[${i}].node.id`);
        }
        for (const prim of emitNodePrimitives(layout, round, paint.resolve)) {
          sink.push(prim);
          if (child.zIndex !== undefined) zIndexOf.set(prim, child.zIndex);
        }
        // bbox 用全局坐标系下的 4 角点累积——scope 内 node 也参与顶层 layout 计算
        allPoints.push(
          rectOps.anchor(globalLayout.rect, 'north-west'),
          rectOps.anchor(globalLayout.rect, 'north-east'),
          rectOps.anchor(globalLayout.rect, 'south-west'),
          rectOps.anchor(globalLayout.rect, 'south-east'),
        );
        // label / pin 外接点也纳入 bbox——避免 label 超出 viewBox 被裁（与 step.label 进 bbox 一致）
        for (const p of labelExtentPoints(globalLayout)) allPoints.push(p);
        // 把 node layout 加进 layoutsAccumulator，供上层 scope.id bbox 计算
        layoutsAccumulator.push(globalLayout);
      } else if (child.type === 'coordinate') {
        const localCenter = resolvePosition(child.position, nameStack, nodeDistance, chain, refPointOfTarget);
        if (!localCenter) {
          onWarn({
            code: CompileWarningCode.PolarOriginUnresolved,
            message: `Cannot resolve position for coordinate '${child.id}'; polar.origin or at.of may reference an undefined node`,
            path: `${locatorPrefix}children[${i}].coordinate.position`,
          });
          throw new Error(
            `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
          );
        }
        const globalCenter = chain.length === 0 ? localCenter : applyTransformChain(localCenter, chain);
        const coordLayout = coordinateAsLayout(child.id, globalCenter, effectiveShapes);
        nameStack.register(
          child.id,
          coordLayout,
          `${locatorPrefix}children[${i}].coordinate.id`,
        );
        // coordinate 0×0 layout 也算上层 scope.id bbox 输入（参与父 scope 子树 AABB 累积）
        layoutsAccumulator.push(coordLayout);
      } else if (child.type === 'scope') {
        const rawTransforms = child.transforms ?? [];
        const loweredOwn = lowerScopeTransforms(rawTransforms, nameStack, nodeDistance, refPointOfTarget);
        if (loweredOwn === null) {
          onWarn({
            code: scopeTransformWarnCode(child),
            message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
            path: `${locatorPrefix}children[${i}].scope.transforms`,
          });
          // 失败时退化为不应用 transform，继续处理子树以收集尽可能多的产物
        }
        const ownTransforms: ReadonlyArray<Transform> = loweredOwn ?? [];
        const innerChain: ReadonlyArray<Transform> = [...chain, ...ownTransforms];
        // scope.id 必须先于子树处理在父 frame 注册（外部句柄，不受 localNamespace 影响）；
        // 此 register 是 register（走 duplicate 检测——与 node.id / coordinate.id / 兄弟 scope.id 冲突触发 warn）；
        // 后面子树完成后用 replaceLayout 覆盖 bbox 不再触发 warn（同一 scope.id 的 placeholder→real 接力不算冲突）
        const parentFrameDepth = nameStack.depth - 1;
        let placeholderLayout: NodeLayout | undefined;
        if (child.id) {
          placeholderLayout = scopePlaceholderLayout(child.id, innerChain, effectiveShapes);
          nameStack.register(
            child.id,
            placeholderLayout,
            `${locatorPrefix}children[${i}].scope.id`,
          );
        }
        // 进入 scope 子 frame：localNamespace=true 时隔离子树命名空间
        const pushedFrame = child.localNamespace === true;
        if (pushedFrame) nameStack.pushFrame();
        const innerSink: Array<InternalScenePrimitive> = [];
        /** 本 scope 子树的 layouts 累积器；子树结束后用于算 bbox */
        const innerLayouts: Array<NodeLayout> = [];
        /** 本 scope 子树收集的 pending paths——在 bbox replaceLayout 后 / popFrame 前 resolve，
         *  让 scope 内 path 自引用本 scope.id 端点取真 bbox 而非 placeholder */
        const innerPaths: Array<PendingPath> = [];
        try {
          processChildren(
            child.children,
            innerChain,
            innerSink,
            `${locatorPrefix}children[${i}].scope.`,
            innerLayouts,
            innerPaths,
            [...styleStack, buildStyleFrame(child)],
          );
          // 子树 register 完毕，先用真 bbox 覆盖 placeholder（仍在本 scope frame 上下文），再 resolve 本 scope 内 paths
          if (child.id) {
            const bbox = computeScopeBoundingBox(innerLayouts);
            const fallbackOrigin: IRPosition =
              innerChain.length === 0 ? [0, 0] : applyTransformChain([0, 0], innerChain);
            const bboxLayout = registerScopeAsLayout(child.id, bbox, fallbackOrigin, effectiveShapes);
            // 用 replaceLayout 覆盖不触发 duplicate warn（placeholder → real bbox 是预期升级）
            nameStack.replaceLayout(child.id, bboxLayout, parentFrameDepth, placeholderLayout);
            // 嵌套 scope.id：把本层 synthetic bbox layout 合并进外层 layoutsAccumulator，
            // 让外层 scope.id 的 bbox 包含本层 bbox（外层 bbox 透传包内层 bbox 区域）
            layoutsAccumulator.push(bboxLayout);
          } else {
            // 无 scope.id：把内层 layouts 直接透传给上层 accumulator（外层 scope.id 仍能包含跨这层的 node）
            for (const innerLayout of innerLayouts) layoutsAccumulator.push(innerLayout);
          }
          // bbox 已就位，现在 resolve 本 scope 内 paths（lookup 能命中真 bbox 的 scope.id）
          resolvePendingPaths(innerPaths);
        } finally {
          if (pushedFrame) nameStack.popFrame();
        }
        const hasOwnTransforms = ownTransforms.length > 0;
        const isPrunable =
          innerSink.length === 0 &&
          !hasOwnTransforms &&
          child.id === undefined &&
          child.clip === undefined;
        if (isPrunable) continue;
        const group: GroupPrim = {
          type: 'group',
          // sealSink 后对该层子序按 zIndex 稳定排序（占位已回填，类型已收窄）
          children: stableSortByZIndex(sealSink(innerSink)),
        };
        // 水合挂点：scope user id stamp 到其 GroupPrim（子图元不重复 stamp）
        if (child.id !== undefined) group.id = child.id;
        // meta provenance 与 id 同款：stamp 到 scope GroupPrim（不下传子元素；不进 prune 保留条件）
        if (child.meta !== undefined) group.meta = child.meta;
        // animations 与 meta 同款：stamp 到 scope GroupPrim（不下传子元素）；先过 viewBox⇔根 校验
        const scopeAnimations = filterAnimations(child.animations, 'element', onWarn, `${locatorPrefix}children[${i}].scope`);
        if (scopeAnimations !== undefined) group.animations = scopeAnimations;
        if (hasOwnTransforms) group.transforms = [...ownTransforms];
        // scope.clip → 去重派 clip 资源 id 挂 group.clipRef；裁剪区裁该 group 内全部子原语
        if (child.clip !== undefined) group.clipRef = clip.resolve(child.clip);
        sink.push(group);
        // scope 整体作一个 stacking 单位：把 group 在父层按 scope.zIndex 排序
        if (child.zIndex !== undefined) zIndexOf.set(group, child.zIndex);
      } else {
        // child.type === 'path'：累积到调用方提供的 pathsAccumulator，让调用方决定 resolve 时机
        // path 端点从 NameStack（全局坐标）查得，几何已是全局。chain 空时先在本层 sink 占一个位（Pass 2
        // 原位回填）保住与同层 node 的声明序；chain 非空时维持 hoist 到顶层 primitives，避免被 scope.transform 二次 apply。
        // `chain` 同时记录 path 所属 scope 累积 transform，让 step.to 内的 polar/at/offset 字面量
        // 按"当前 scope 局部度量 + 末端 apply chain"投影回全局
        const effectivePath = resolveEffectivePath(child, styleStack);
        const pending: PendingPath = {
          path: { ...effectivePath, animations: filterAnimations(effectivePath.animations, 'element', onWarn, `${locatorPrefix}children[${i}].path`) },
          irPath: `${locatorPrefix}children[${i}].path`,
          scopeChain: chain,
          zIndex: child.zIndex,
        };
        if (chain.length === 0) {
          const placeholder = makePathPlaceholder();
          sink.push(placeholder);
          pending.slot = { sink, placeholder };
          placeholderBalance++;
        }
        pathsAccumulator.push(pending);
      }
    }
  };

  // 递归处理整棵 IR child 树；顶层 paths 在所有 register 完成后统一 resolve
  // 顶层 layouts 累积无人消费——传一个临时数组即可（顶层无 scope.id 包裹）
  const rootPaths: Array<PendingPath> = [];
  processChildren(loweredIr.children, [], primitives, '', [], rootPaths, []);
  resolvePendingPaths(rootPaths);

  // 无条件校验：占位绝不能泄漏到 Scene 输出（守 compileToScene 返回 ScenePrimitive[] 的公开契约）
  if (placeholderBalance !== 0) {
    const detail =
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
        ? ` at ${collectPlaceholderLocators(primitives).join(', ')}`
        : '';
    throw new Error(
      `internal: ${placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`,
    );
  }

  // paint（gradient / pattern / image）+ clip 资源同表（kind 判别，id 命名空间各自不撞）
  const resources = [...paint.resources(), ...clip.resources()];
  // scene 根（镜头）动画：过 viewBox⇔根 校验（只算一次，避免重复 warn）
  const rootAnimations = filterAnimations(loweredIr.animations, 'root', onWarn, 'scene');
  return {
    // sealSink 后对顶层按 zIndex 稳定排序（占位已回填）
    primitives: stableSortByZIndex(sealSink(primitives)),
    // 显式 viewBox 覆盖自动算（忽略 padding）；无则回退 AABB + padding
    layout: loweredIr.viewBox !== undefined ? viewBoxToLayout(loweredIr.viewBox, round) : assertFiniteLayout(computeLayout(allPoints, layoutPadding, round)),
    // 渲染无关资源（paint / clip）；无则省略，保 Scene 输出纯净
    ...(resources.length > 0 ? { resources } : {}),
    // scene 根（镜头）动画 tracks（viewBox property）；无则省略
    ...(rootAnimations !== undefined ? { animations: rootAnimations } : {}),
  };
};
