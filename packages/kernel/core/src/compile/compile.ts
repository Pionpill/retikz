import type { ArrowDefinition } from '../contract/arrow';
import type { BoundaryDefinition } from '../contract/boundary';
import type { ClipDefinition } from '../contract/clip';
import type { CompositeDefinition } from '../contract/composite';
import type { PathGeneratorDefinition, PathKindDefinition } from '../contract/path';
import type { PatternDefinition } from '../contract/pattern';
import type { RibbonWidthProfileDefinition } from '../contract/ribbon';
import type { Scene } from '../contract/scene';
import type { ShapeDefinition } from '../contract/shape';
import type { IR } from '../schemas';
import type { CompileWarning } from './constant';
import type { LowerTex } from './lower-tex';
import type { TextMeasurer } from './text-metrics';

import { filterAnimations } from './animation';
import { createCompileContext } from './context';
import { computeLayout } from './layout';
import { assertFiniteLayout, viewBoxToLayout } from './scene-layout';
import { compileChildrenToPrimitives } from './traversal';

export type { CompileWarning } from './constant';
export { CompileWarningCode } from './constant';

/** compileToScene 的可选参数 */
export type CompileOptions = {
  /**
   * 注入文字度量函数；不传则用 fallback（不准但可跑）
   * @default `fallbackMeasurer`
   */
  measureText?: TextMeasurer;
  /**
   * layout 周围的留白（user units），默认 10
   * @default 10
   */
  padding?: number;
  /**
   * 输出坐标的小数位精度；默认 2
   * @description 仅作用于 Scene primitive / path d / layout；内部几何计算保持完整 double 精度
   * @default `DEFAULT_PRECISION` (2)
   */
  precision?: number;
  /**
   * 相对定位的默认距离（对应 TikZ `node distance`，user units）
   * @description `Node.position` 为 `{ direction, of }` 且未自带 `distance` 时取此值；未配回退到 1
   * @default `DEFAULT_NODE_DISTANCE` (1)
   */
  nodeDistance?: number;
  /**
   * 编译期警告收集器
   * @description path / position 解析失败时按 IR locator + code + message 同步触发；不传时 dev 模式（`process.env.NODE_ENV !== 'production'`）默认 `console.warn`、生产静默
   * @default `defaultWarnDispatcher`
   */
  onWarn?: (warning: CompileWarning) => void;
  /**
   * 运行时注入的第三方 shape（不进 IR）
   * @description 有效 shape 表 = `{ ...BUILTIN_SHAPES, ...shapes }`——同名 key 覆盖内置，经 `onWarn` 发
   *   Duplicate names fail at registration time. IR 的 `node.shape` 仍是字符串；未注册名在编译期 throw。
   * @default 仅 `BUILTIN_SHAPES`
   */
  shapes?: ReadonlyArray<ShapeDefinition>;
  /**
   * 运行时注入的第三方 connection surface（不进 IR）
   * @description `boundary` 先查本 registry，再 fallback 到 shape registry；`shape` 保留为节点自身视觉 shape。
   * @default 仅 `BUILTIN_BOUNDARIES`
   */
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  /**
   * 运行时注入的 clip providers；按 `Scope.clip.kind` 查找，自定义 kind 在编译期解析为 JSON spec。
   * @default 仅 `BUILTIN_CLIPS`
   */
  clips?: ReadonlyArray<ClipDefinition>;
  /**
   * 运行时注入的第三方 arrow（不进 IR）
   * @description 有效 arrow 表 = `{ ...BUILTIN_ARROWS, ...arrows }`——同名 key 覆盖内置，经 `onWarn` 发
   *   Duplicate names fail at registration time. IR 的 `arrowDetail.shape` 仍是字符串；未注册名在编译期 throw。
   * @default 仅 `BUILTIN_ARROWS`
   */
  arrows?: ReadonlyArray<ArrowDefinition>;
  /**
   * 运行时注入的第三方 pattern motif（不进 IR）
   * @description 有效 pattern 表 = `{ ...BUILTIN_PATTERNS, ...patterns }`——同名 key 覆盖内置，经 `onWarn` 发
   *   Duplicate names fail at registration time. IR 的 `pattern.shape` 仍是字符串；未注册名在编译期 throw。
   *   compile 对 pattern 资源查本表 + 调 `PatternDefinition.emit` 产 tile，写进 `SceneResource.tile`。
   * @default 仅 `BUILTIN_PATTERNS`
   */
  patterns?: ReadonlyArray<PatternDefinition>;
  /**
   * 运行时注入的第三方 path generator（不进 IR）
   * @description generator step 编译时按 `name` 查本表；core 不内置任何曲线生成器，故无内置合并。
   *   解析时序：查表（未注册 throw，错误列出可用名）→ `paramsSchema.parse(params)` →
   *   对结果再跑 `JsonObjectSchema.parse` 二次确认 JSON-safe → `targetParams` 顶层 key 经 target lookup
   *   resolve 成世界坐标 → 调 `generate(ctx)` → splice 产出的 `PathCommand[]` 进命令流。IR 的
   *   `generator.name` 仍是字符串；generator 函数本身只在此运行时注入面、不进 IR。
   * @default 空 registry
   */
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
  /**
   * 运行时注入的 path kind providers；内置 kind 为 `stroke` / `ribbon`，自定义 kind 按 Path.kind 查找。
   * @default 仅 `BUILTIN_PATH_KINDS`
   */
  pathKinds?: ReadonlyArray<PathKindDefinition>;
  /**
   * 运行时注入的 ribbon 宽度 profile。
   * @description IR 只保存 `{ kind:"profile", name, params }`；profile 函数从这里注入，永不进入 IR。
   * @default 空 registry
   */
  ribbonWidthProfiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
  /**
   * 运行时注入的 Tier 2 composite 展开逻辑（不进 IR）
   * @description compileToScene 第一步据各 def 的 schema 提取的 `${namespace}.${type}` 把 IR 里的 composite
   *   节点展开成 Tier 1；core 无内置。未注册 namespace/type → `onWarn(COMPOSITE_NOT_REGISTERED)` + 跳过该节点。
   * @default 空 registry
   */
  composites?: ReadonlyArray<CompositeDefinition>;
  /**
   * composite 嵌套展开的最大深度（防环 / 防失控递归）
   * @description 默认 32；composite 展开出 composite 时累加，超限或环 throw。
   * @default `DEFAULT_MAX_COMPOSITE_DEPTH` (32)
   */
  maxCompositeDepth?: number;
  /**
   * 运行时注入的公式渲染能力（不进 IR；由 `@retikz/tex` 提供）
   * @description node `tex` 内容编译时调本函数把 LaTeX → 字形路径 + bbox。core 不依赖
   *   MathJax，仅声明注入类型。带 tex 内容但未注入 → `onWarn(TEX_LOWERER_MISSING)` + 降级；返回 null
   *   （非法 tex）→ `onWarn(TEX_INVALID)` + 降级。均不抛、不丢节点。
   * @default undefined；禁用 TeX 降级能力
   */
  lowerTex?: LowerTex;
};

/**
 * IR → Scene 纯函数转换，所有 adapter 共享
 * @description Pass 1 递归处理 node / coordinate / scope，把 scope 树下沉为嵌套 GroupPrim；scope.transforms 中的 5 种 translate 变体按 lowerScopeTransforms 展平为 Cartesian transform；node 在 Scene primitive 树里是局部坐标 + GroupPrim transform 链、在 NameStack 中存全局坐标供其他节点 / path 引用。NameStack 用栈式 frame 管理命名空间：默认全局扁平、`<Scope localNamespace>` 推入子 frame；scope.id 始终在父 frame 注册（外部句柄）；id lookup 从栈顶向栈底 inside-out 搜索；同 frame 重复 id 触发 DUPLICATE_NODE_ID warn + 后定义覆盖前定义。Pass 2 解析 path 端点写 d 字符串，path primitive 发到 Pass 1 记录的对应容器；末端按 precision 折算 layout
 */
export const compileToScene = (ir: IR, options: CompileOptions = {}): Scene => {
  const context = createCompileContext(ir, options);
  const { loweredIr, layoutPadding, round, onWarn, paint, clip } = context;
  const { primitives, allPoints } = compileChildrenToPrimitives(loweredIr.children, context);

  // paint（gradient / pattern / image）+ clip 资源同表（kind 判别，id 命名空间各自不撞）
  const resources = [...paint.resources(), ...clip.resources()];
  // scene 根（镜头）动画：过 viewBox⇔根 校验（只算一次，避免重复 warn）
  const rootAnimations = filterAnimations(loweredIr.animations, 'root', onWarn, 'scene');
  return {
    primitives,
    // 显式 viewBox 覆盖自动算（忽略 padding）；无则回退 AABB + padding
    layout:
      loweredIr.viewBox !== undefined
        ? viewBoxToLayout(loweredIr.viewBox, round)
        : assertFiniteLayout(computeLayout(allPoints, layoutPadding, round)),
    // 渲染无关资源（paint / clip）；无则省略，保 Scene 输出纯净
    ...(resources.length > 0 ? { resources } : {}),
    // scene 根（镜头）动画 tracks（viewBox property）；无则省略
    ...(rootAnimations !== undefined ? { animations: rootAnimations } : {}),
  };
};
