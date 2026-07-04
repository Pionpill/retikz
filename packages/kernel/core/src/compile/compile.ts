import type {
  ArrowDefinition,
  BoundaryDefinition,
  ClipDefinition,
  CompositeDefinition,
  PathGeneratorDefinition,
  PathKindDefinition,
  PatternDefinition,
  RibbonWidthProfileDefinition,
  Scene,
  ShapeDefinition,
} from '../contract';
import type { IRScene } from '../schemas';
import type { CompileWarning } from './constant';
import type { LowerTex, TextMeasurer } from './text';

import { filterAnimations } from './animation';
import { compileChildrenToPrimitives, createCompileContext } from './orchestration';
import { assertFiniteLayout, computeLayout, viewBoxToLayout } from './scene';

export type { CompileWarning } from './constant';
export { CompileWarningCode } from './constant';

/** 宿主环境注入的 compile 能力。 */
export type CompileHostOptions = {
  /**
   * 注入文字度量函数。
   * @default fallbackMeasurer
   */
  measureText?: TextMeasurer;
  /**
   * 运行时注入的公式渲染能力。
   * @description 带 tex 内容但未注入或解析失败时会 warning 并降级。
   * @default undefined
   */
  lowerTex?: LowerTex;
  /**
   * 编译期警告收集器
   * @description path / position 解析失败时按 IR locator + code + message 同步触发。
   * @default defaultWarnDispatcher
   */
  onWarn?: (warning: CompileWarning) => void;
};

/** 自动布局与 Scene 输出口径。 */
export type CompileLayoutOptions = {
  /**
   * layout 周围的留白。
   * @default DEFAULT_LAYOUT_PADDING (10)
   */
  padding?: number;
  /**
   * 输出坐标的小数位精度。
   * @description 仅作用于 Scene 输出；内部几何保持 double 精度。
   * @default DEFAULT_PRECISION (2)
   */
  precision?: number;
  /**
   * 相对定位距离。
   * @description `Node.position` 为 `{ direction, of }` 且未自带 `distance` 时取此值。
   * @default DEFAULT_NODE_DISTANCE (24)
   */
  nodeDistance?: number;
};

/** 运行时注入的 provider 注册表。 */
export type CompileProviderOptions = {
  /**
   * 运行时注入的 shape 定义。
   * @description 未注册名称会在编译期报错。
   * @default 仅 BUILTIN_SHAPES
   */
  shapes?: ReadonlyArray<ShapeDefinition>;
  /**
   * 运行时注入的 connection surface 定义。
   * @description `boundary` 先查本注册表，再兜底查 shape 注册表。
   * @default 仅 BUILTIN_BOUNDARIES
   */
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  /**
   * 运行时注入的 clip providers。
   * @default 仅 BUILTIN_CLIPS
   */
  clips?: ReadonlyArray<ClipDefinition>;
  /**
   * 运行时注入的 arrow 定义。
   * @description 未注册名称会在编译期报错。
   * @default 仅 BUILTIN_ARROWS
   */
  arrows?: ReadonlyArray<ArrowDefinition>;
  /**
   * 运行时注入的 pattern motif 定义。
   * @description 未注册名称会在编译期报错。
   * @default 仅 BUILTIN_PATTERNS
   */
  patterns?: ReadonlyArray<PatternDefinition>;
  /**
   * 运行时注入的 path generator 定义。
   * @description 未注册名称会在编译期报错。
   * @default 仅 BUILTIN_PATH_GENERATORS
   */
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
  /**
   * 运行时注入的 path kind providers。
   * @default 仅 BUILTIN_PATH_KINDS
   */
  pathKinds?: ReadonlyArray<PathKindDefinition>;
  /**
   * 运行时注入的 ribbon 宽度 profile。
   * @description profile 函数从这里注入，永不进入 IR。
   * @default 仅 BUILTIN_RIBBON_WIDTH_PROFILES
   */
  ribbonWidthProfiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
};

/** Tier 2 composite 展开选项。 */
export type CompileCompositeOptions = {
  /**
   * 运行时注入的 Tier 2 composite 展开逻辑。
   * @description 未注册的 namespace/type 会触发 warning，并跳过该 composite 节点。
   * @default 空注册表
   */
  composites?: ReadonlyArray<CompositeDefinition>;
  /**
   * composite 嵌套展开的最大深度。
   * @description 超限或环会 throw。
   * @default DEFAULT_MAX_COMPOSITE_DEPTH (32)
   */
  maxCompositeDepth?: number;
};

/** compileToScene 的可选参数 */
export type CompileOptions = CompileHostOptions &
  CompileLayoutOptions &
  CompileProviderOptions &
  CompileCompositeOptions;

/**
 * IR → Scene 纯函数转换，所有 adapter 共享。
 * @description 解析节点、scope、path、资源和动画，并输出 renderer-agnostic 的 Scene。
 */
export const compileToScene = (ir: IRScene, options?: CompileOptions): Scene => {
  const context = createCompileContext(ir, options ?? {});
  const { loweredIr, layoutPadding, round, onWarn, paint, clip } = context;
  const { primitives, boundsPoints } = compileChildrenToPrimitives(loweredIr.children, context);

  // paint 与 clip 资源同表。
  const resources = [...paint.resources(), ...clip.resources()];
  // scene 根动画先做 camera 约束校验。
  const rootAnimations = filterAnimations(loweredIr.animations, 'root', onWarn, 'scene');
  return {
    primitives,
    // 显式 viewBox 覆盖自动 layout。
    layout:
      loweredIr.viewBox !== undefined
        ? viewBoxToLayout(loweredIr.viewBox, round)
        : assertFiniteLayout(computeLayout(boundsPoints, layoutPadding, round)),
    // 无资源时省略字段。
    ...(resources.length > 0 ? { resources } : {}),
    // 无根动画时省略字段。
    ...(rootAnimations !== undefined ? { animations: rootAnimations } : {}),
  };
};
