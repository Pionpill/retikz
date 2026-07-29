import type { CompileArtifact, CompileOptions, IRScene, Scene } from '@retikz/core';
import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { RetainedRendererFactory } from '@retikz/render/runtime';
import type { RuntimeDiagnostic, RuntimeUpdateStrategyValue } from '@retikz/runtime';

import type { AnyVanillaTier2Adapter, VanillaFigureSpec, VanillaRuntimeMeta } from '../spec';
import type { VanillaViewMode } from './constants';

/** mount / renderToSvgString 的入参：已编译 `Scene`、待编译 `IRScene` 或 Vanilla plain spec */
export type RenderInput = Scene | IRScene | VanillaFigureSpec;

/** 可进入 retained Runtime session 的未编译输入 */
export type RetainedRenderInput = IRScene | VanillaFigureSpec;

/** 输出资源与显示尺寸选项 */
export type VanillaOutputOptions = {
  /** SVG 资源 id 前缀；SSR 与客户端挂载应使用同一值 */
  idPrefix?: string;
  /** 根 SVG / Canvas 的显示宽度；缺省由 viewBox 或容器决定 */
  width?: number;
  /** 根 SVG / Canvas 的显示高度；缺省由 viewBox 或容器决定 */
  height?: number;
};

/** 动画渲染选项 */
export type VanillaAnimationOptions = {
  /**
   * 是否播放动画；未传时跟随系统减少动态效果偏好，显式 `true` / `false` 强制开关
   * @description `false` 渲染 base 静态图（不 emit CSS/WAAPI、Canvas 不起 rAF）；显式 `true` 会覆盖
   *   `prefers-reduced-motion`
   */
  enabled?: boolean;
  /**
   * 静态截帧时刻（毫秒）；给定时渲染「定格在该时刻」的静态图（不播放、不 emit 动画），SSR 海报帧 / 缩略图用
   * @description SVG 后端把各 track 在该时刻的值烘焙成静态属性 / transform（复用 `evaluateTrack`）；覆盖 `enabled`
   */
  snapshotAt?: number;
  /** 自定义 easing 注册表（透传 renderer / runtime） */
  easings?: EasingRegistry;
};

/** Canvas 专属 runtime 选项 */
export type VanillaCanvasOptions = {
  /** 设备像素比；缺省读 `globalThis.devicePixelRatio`、再回退 1（镜像 react CanvasHost） */
  devicePixelRatio?: number;
  /** 自定义 property 插值器注册表（透传 drawScene；自定义动画通道用） */
  animationProperties?: AnimationPropertyRegistry;
};

/** Retained view update 可变的 Canvas 配置；DPR 固定在 mount 生命周期 */
export type RetainedVanillaCanvasUpdateOptions = Omit<VanillaCanvasOptions, 'devicePixelRatio'>;

/** Retained view 单次 update 共用的动画配置 */
type RetainedAnimationUpdateOptions = Readonly<{
  /** 下一 revision 的动画配置 */
  animation?: VanillaAnimationOptions;
}>;

/** Retained SVG view 单次 update 可原子提交的 renderer 配置 */
export type RetainedSvgUpdateOptions = RetainedAnimationUpdateOptions &
  Readonly<{
    /** 显式禁止结构赋值 Canvas-only 配置 */
    canvas?: never;
  }>;

/** Retained Canvas view 单次 update 可原子提交的 renderer 配置 */
export type RetainedCanvasUpdateOptions = RetainedAnimationUpdateOptions &
  Readonly<{
    /** 下一 revision 的可变 Canvas 配置 */
    canvas?: RetainedVanillaCanvasUpdateOptions;
  }>;

/** 所有 Vanilla retained view 可接受的 update 配置 */
export type RetainedVanillaUpdateOptions = RetainedSvgUpdateOptions | RetainedCanvasUpdateOptions;

/** Vanilla retained Runtime session 配置 */
export type VanillaRetainedRuntimeOptions = Readonly<{
  /**
   * 创建保留式 Runtime Session
   * @default VanillaViewMode.Retained
   */
  mode?: typeof VanillaViewMode.Retained;
  /**
   * Program 更新策略
   * @default RuntimeUpdateStrategy.Auto
   */
  updateStrategy?: RuntimeUpdateStrategyValue;
  /** 可选第三方 retained renderer factory；缺省使用内置实现 */
  rendererFactory?: RetainedRendererFactory;
}>;

/** Vanilla raw-input static 配置 */
export type VanillaStaticRuntimeOptions = Readonly<{
  /** 不创建 Runtime Session，直接完整编译与物化 */
  mode: typeof VanillaViewMode.Static;
  /** static 不支持 Program 更新策略 */
  updateStrategy?: never;
  /** static 不支持 retained renderer factory */
  rendererFactory?: never;
}>;

/** Vanilla raw-input mount 的判别 Runtime 配置 */
export type VanillaRuntimeOptions = VanillaRetainedRuntimeOptions | VanillaStaticRuntimeOptions;

/**
 * render 与 mount 入口共享的选项
 * @description `output` 管输出资源和显示尺寸；`compile` 只在输入是 IR / plain spec 时传给
 *   `compileToScene`；`animation` 控制 SVG / Canvas runtime 动画；`adapters` 只参与 plain spec normalization
 */
export type CommonOptions = {
  /** 输出资源与显示尺寸选项 */
  output?: VanillaOutputOptions;
  /** core compile 选项；输入已是 Scene 时忽略 */
  compile?: CompileOptions;
  /** runtime 动画选项 */
  animation?: VanillaAnimationOptions;
  /** 可嵌入 Tier2 adapter 列表，仅 plain spec normalization 使用 */
  adapters?: ReadonlyArray<AnyVanillaTier2Adapter>;
};

/** SSR / build-time SVG string options；显式禁止 mount-only runtime 配置 */
export type RenderToStringOptions = CommonOptions & Readonly<{ runtime?: never }>;

/** 预编译 Scene 的 static DOM mount options；显式禁止 retained-only runtime 配置 */
export type StaticMountOptions = CommonOptions & Readonly<{ runtime?: never }>;

/** IR / plain spec retained DOM mount options；可注入 renderer factory */
export type RetainedMountOptions = CommonOptions & {
  /** retained Runtime session 配置；仅 IR / plain spec mount 使用 */
  runtime?: VanillaRetainedRuntimeOptions;
};

/** IR / plain spec static DOM mount options */
export type RawStaticMountOptions = CommonOptions & {
  /** static 完整编译与物化配置 */
  runtime: VanillaStaticRuntimeOptions;
};

/** IR / plain spec DOM mount options */
export type MountOptions = RetainedMountOptions | RawStaticMountOptions;

/** SVG / Canvas view 共享的 lifecycle 与 committed metadata */
export type VanillaViewState<TRoot extends SVGSVGElement | HTMLCanvasElement> = Readonly<{
  /** 挂载出的稳定宿主 root */
  root: TRoot;
  /** 卸载：解绑水合并移除 `root`；retained cleanup 失败时重复调用只重试 pending 项，成功后 no-op */
  dispose: () => void;
  /**
   * 绑定 handler 到本 view 的 `<svg>`（locateSvg 定位）；handler 收 `(event, context)` 富上下文
   * @description context 由本 view 的 Scene 构造（meta / geometry / per-id 动画控制），读 live `currentScene`——
   *   `update` 后 context 自动反映新图（无需重 hydrate）。`HydrateOptions.scene` 在 view.hydrate 下忽略
   */
  hydrate: (options: HydrateOptions) => HydrationHandle;
  /** 动画播放控制句柄（scene 含动画且未降级时存在）：play / pause / seek；manual trigger 经此驱动 */
  animation?: AnimationControls;
  /** 当前 plain spec normalization metadata；IR / Scene 输入时为空 metadata */
  readonly runtimeMeta: VanillaRuntimeMeta;
  /** 当前输入同次 compile 产出的 immutable artifacts；Scene 输入固定为空数组 */
  readonly artifacts: ReadonlyArray<CompileArtifact>;
}>;

/** IR / plain spec SVG retained view */
export type RetainedSvgView = VanillaViewState<SVGSVGElement> &
  Readonly<{
    /** view 执行模式 */
    mode: typeof VanillaViewMode.Retained;
    /** 原子提交下一份未编译输入与可变 renderer config */
    update: (next: RetainedRenderInput, options?: RetainedSvgUpdateOptions) => void;
    /** 返回并清空 Runtime session diagnostics */
    diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  }>;

/** 预编译 Scene SVG static view */
export type StaticSvgView = VanillaViewState<SVGSVGElement> &
  Readonly<{
    /** view 执行模式 */
    mode: typeof VanillaViewMode.Static;
    /** 完整重绘下一份预编译 Scene */
    update: (next: Scene) => void;
  }>;

/** IR / plain spec SVG static view */
export type StaticRawSvgView = VanillaViewState<SVGSVGElement> &
  Readonly<{
    /** view 执行模式 */
    mode: typeof VanillaViewMode.Static;
    /** 完整归一化、编译并重绘下一份 IR 或 plain spec */
    update: (next: RetainedRenderInput) => void;
  }>;

/** `mountSvg` 返回的可判别 view */
export type VanillaView = RetainedSvgView | StaticSvgView | StaticRawSvgView;

/** `hydrate` / `view.hydrate` 返回的解绑句柄 */
export type HydrationHandle = {
  /** 解绑本次水合的全部 listener，之后事件不再触发 */
  dispose: () => void;
};

/**
 * 水合入参：按 id 提供的 handler 注册表（事件名 → handler）+ 可选 Scene（standalone SVG 富 context 来源）
 * @description `view.hydrate`（mountSvg / mountCanvas）忽略 `scene`、用自身 Scene 构造富 context；standalone
 *   `hydrate(svg, options)` 只水合 SSR / 已有 SVG，传 `scene` → 富 context（meta / geometry / 动画），
 *   不传 → 最小 context（id + element + root + point，`meta` / `geometry` / `scene` undefined、`animation` no-op）
 */
export type HydrateOptions = {
  /** id → 事件名 → handler 的注册表（透传给 `@retikz/render/hydration` 控制器） */
  handlers: HydrationHandlers;
  /** 富 context 来源 Scene（仅 standalone `hydrate` 用；不传则最小 context）；可经 `compileToScene(ir).scene` 得到 */
  scene?: Scene;
};

/** Scene user units 坐标点（hitTest 入参 / 坐标映射出参） */
export type ScenePoint = {
  /** Scene user units 横坐标 */
  x: number;
  /** Scene user units 纵坐标 */
  y: number;
};

/**
 * `mountCanvas` 返回的句柄：在 `VanillaView` 基础上加 canvas 侧水合 + 坐标映射
 * @description `root` 是挂出的 `<canvas>`（非 svg），与 `mountSvg` 的 `<svg>` 对应；`hydrate` 用 `hitTest` +
 *   client→Scene 坐标映射做定位；`clientToScene` 把指针的 client 像素逆 meet-fit 映射回 Scene user units（供 hitTest）
 */
export type CanvasViewState = VanillaViewState<HTMLCanvasElement> &
  Readonly<{
    /**
     * 把指针的 client 像素坐标逆 meet-fit 映射成 Scene user units（命中映射用）
     * @description 始终返回逆 fit 后的 Scene 点；落在 letterbox 黑边外的点会得到 layout 区域外坐标，
     *   交给 `hitTest` 自然判为无命中（无需在此截断），故无 `null` 返回
     */
    clientToScene: (clientX: number, clientY: number) => ScenePoint;
  }>;

/** IR / plain spec Canvas retained view */
export type RetainedCanvasView = CanvasViewState &
  Readonly<{
    /** view 执行模式 */
    mode: typeof VanillaViewMode.Retained;
    /** 原子提交下一份未编译输入与可变 renderer config */
    update: (next: RetainedRenderInput, options?: RetainedCanvasUpdateOptions) => void;
    /** 返回并清空 Runtime session diagnostics */
    diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  }>;

/** 预编译 Scene Canvas static view */
export type StaticCanvasView = CanvasViewState &
  Readonly<{
    /** view 执行模式 */
    mode: typeof VanillaViewMode.Static;
    /** 完整重绘下一份预编译 Scene */
    update: (next: Scene) => void;
  }>;

/** IR / plain spec Canvas static view */
export type StaticRawCanvasView = CanvasViewState &
  Readonly<{
    /** view 执行模式 */
    mode: typeof VanillaViewMode.Static;
    /** 完整归一化、编译并重绘下一份 IR 或 plain spec */
    update: (next: RetainedRenderInput) => void;
  }>;

/** `mountCanvas` 返回的可判别 view */
export type CanvasView = RetainedCanvasView | StaticCanvasView | StaticRawCanvasView;

/** 所有 retained Vanilla view */
export type RetainedVanillaView = RetainedSvgView | RetainedCanvasView;

/** 所有 static Vanilla view */
export type StaticVanillaView = StaticSvgView | StaticCanvasView | StaticRawSvgView | StaticRawCanvasView;

/** IR / plain spec retained Canvas mount 选项 */
export type RetainedMountCanvasOptions = RetainedMountOptions & {
  /** Canvas 专属 runtime 选项 */
  canvas?: VanillaCanvasOptions;
};

/** IR / plain spec static Canvas mount 选项 */
export type RawStaticMountCanvasOptions = RawStaticMountOptions & {
  /** Canvas 专属显示、dpr 与动画插值选项 */
  canvas?: VanillaCanvasOptions;
};

/** IR / plain spec Canvas mount 选项 */
export type MountCanvasOptions = RetainedMountCanvasOptions | RawStaticMountCanvasOptions;

/** 预编译 Scene static Canvas mount 选项 */
export type StaticMountCanvasOptions = StaticMountOptions & {
  /** Canvas 专属显示、dpr 与动画插值选项 */
  canvas?: VanillaCanvasOptions;
};
