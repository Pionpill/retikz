import type { ArrowDefinition } from '../contract';
import type { BoundaryDefinition } from '../contract';
import type { ClipDefinition } from '../contract';
import type { CompositeDefinition } from '../contract';
import type { PathGeneratorDefinition, PathKindDefinition } from '../contract';
import type { PatternDefinition } from '../contract';
import type { RibbonWidthProfileDefinition } from '../contract';
import type { Scene } from '../contract';
import type { ShapeDefinition } from '../contract';
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
   * 注入文字度量函数；不传则用默认估算器（不准但可跑）
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
   * @description path / position 解析失败时按 IR locator + code + message 同步触发；不传时开发模式（`process.env.NODE_ENV !== 'production'`）默认 `console.warn`、生产静默
   * @default `defaultWarnDispatcher`
   */
  onWarn?: (warning: CompileWarning) => void;
  /**
   * 运行时注入的 shape 定义。
   * @description `node.shape` 仍只保存 shape 名称和 params；未注册名称会在编译期报错。
   * @default 仅 `BUILTIN_SHAPES`
   */
  shapes?: ReadonlyArray<ShapeDefinition>;
  /**
   * 运行时注入的 connection surface 定义。
   * @description `boundary` 先查本注册表，再兜底查 shape 注册表；`shape` 保留为节点自身视觉 shape。
   * @default 仅 `BUILTIN_BOUNDARIES`
   */
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  /**
   * 运行时注入的 clip providers；按 `Scope.clip.kind` 查找，自定义 kind 在编译期解析为 JSON spec。
   * @default 仅 `BUILTIN_CLIPS`
   */
  clips?: ReadonlyArray<ClipDefinition>;
  /**
   * 运行时注入的 arrow 定义。
   * @description `arrowDetail.shape` 仍只保存 arrow 名称；未注册名称会在编译期报错。
   * @default 仅 `BUILTIN_ARROWS`
   */
  arrows?: ReadonlyArray<ArrowDefinition>;
  /**
   * 运行时注入的 pattern motif 定义。
   * @description `pattern.shape` 仍只保存 pattern 名称；未注册名称会在编译期报错。
   * @default 仅 `BUILTIN_PATTERNS`
   */
  patterns?: ReadonlyArray<PatternDefinition>;
  /**
   * 运行时注入的 path generator 定义。
   * @description `generator.name` 仍只保存 generator 名称；未注册名称会在编译期报错。
   * @default 空注册表
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
   * @default 空注册表
   */
  ribbonWidthProfiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
  /**
   * 运行时注入的 Tier 2 composite 展开逻辑。
   * @description 未注册的 namespace/type 会触发 warning，并跳过该 composite 节点。
   * @default 空注册表
   */
  composites?: ReadonlyArray<CompositeDefinition>;
  /**
   * composite 嵌套展开的最大深度（防环 / 防失控递归）
   * @description 默认 32；composite 展开出 composite 时累加，超限或环 throw。
   * @default `DEFAULT_MAX_COMPOSITE_DEPTH` (32)
   */
  maxCompositeDepth?: number;
  /**
   * 运行时注入的公式渲染能力。
   * @description 带 tex 内容但未注入或解析失败时会 warning 并降级。
   * @default undefined；禁用 TeX 降级能力
   */
  lowerTex?: LowerTex;
};

/**
 * IR → Scene 纯函数转换，所有 adapter 共享。
 * @description 解析节点、scope、path、资源和动画，并输出 renderer-agnostic 的 Scene。
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
