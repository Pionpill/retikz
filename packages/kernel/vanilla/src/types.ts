import type { CompileOptions, IRScene, Scene } from '@retikz/core';
import type { AnimationControls, AnimationPropertyRegistry, EasingRegistry } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';

import type { Figure } from './figure';
import type { AnyVanillaTier2Adapter, VanillaFigureSpec, VanillaRuntimeMeta } from './spec';

export type { AnimationControls } from '@retikz/render/animation';

/** mount / renderToSvgString 的入参：已编译 `Scene`、待编译 `IRScene`、Vanilla plain spec，或 legacy `Figure`。 */
export type RenderInput = Scene | IRScene | VanillaFigureSpec | Figure;

/** 输出资源与显示尺寸选项。 */
export type VanillaOutputOptions = {
  /** SVG 资源 id 前缀；SSR 与客户端挂载应使用同一值。 */
  idPrefix?: string;
  /** 根 SVG / Canvas 的显示宽度；缺省由 viewBox 或容器决定。 */
  width?: number;
  /** 根 SVG / Canvas 的显示高度；缺省由 viewBox 或容器决定。 */
  height?: number;
};

/** 动画渲染选项。 */
export type VanillaAnimationOptions = {
  /**
   * 是否播放动画（缺省 true）；`false` → 渲染 base 静态图（不 emit CSS/WAAPI、Canvas 不起 rAF）
   * @description runtime 据 `{ animation: { enabled: false } }` 或 `prefers-reduced-motion` 走静态路径，不起任何动画。
   */
  enabled?: boolean;
  /**
   * 静态截帧时刻（毫秒）；给定时渲染「定格在该时刻」的静态图（不播放、不 emit 动画），SSR 海报帧 / 缩略图用
   * @description SVG 后端把各 track 在该时刻的值烘焙成静态属性 / transform（复用 `evaluateTrack`）；覆盖 `enabled`。
   */
  snapshotAt?: number;
  /** 自定义 easing 注册表（透传 renderer / runtime） */
  easings?: EasingRegistry;
};

/** Canvas 专属 runtime 选项。 */
export type VanillaCanvasOptions = {
  /** 设备像素比；缺省读 `globalThis.devicePixelRatio`、再回退 1（镜像 react CanvasHost） */
  devicePixelRatio?: number;
  /** 自定义 property 插值器注册表（透传 drawScene；自定义动画通道用） */
  animationProperties?: AnimationPropertyRegistry;
};

/**
 * 两个入口共享的选项
 * @description `output` 管输出资源和显示尺寸；`compile` 只在输入是 IR / plain spec / legacy Figure 时传给
 *   `compileToScene`；`animation` 控制 SVG / Canvas runtime 动画；`adapters` 只参与 plain spec normalization。
 */
export type CommonOptions = {
  /** 输出资源与显示尺寸选项。 */
  output?: VanillaOutputOptions;
  /** core compile 选项；输入已是 Scene 时忽略。 */
  compile?: CompileOptions;
  /** runtime 动画选项。 */
  animation?: VanillaAnimationOptions;
  /** 可嵌入 Tier2 adapter 列表，仅 plain spec normalization 使用。 */
  adapters?: ReadonlyArray<AnyVanillaTier2Adapter>;
};

export type RenderToStringOptions = CommonOptions;
export type MountOptions = CommonOptions;

/** `mountSvg` 返回的句柄：`root` 元素 identity 跨 `update` 稳定、永不失效 */
export type VanillaView = {
  /** 挂载出的根 `<svg>`；跨 `update` 同一元素（不被替换） */
  readonly root: SVGSVGElement;
  /** 整图重渲染（原地复用 `root`，清子节点 + 重设 root attrs + 重物化），不承诺局部 patch */
  update: (next: RenderInput) => void;
  /** 卸载：解绑本 view 上未手动 dispose 的水合、移除 `root`、置 view 失效（再调 `update` 抛、`dispose` noop） */
  dispose: () => void;
  /**
   * 绑定 handler 到本 view 的 `<svg>`（locateSvg 定位）；handler 收 `(event, context)` 富上下文
   * @description context 由本 view 的 Scene 构造（meta / geometry / per-id 动画控制），读 live `currentScene`——
   *   `update` 后 context 自动反映新图（无需重 hydrate）。`HydrateOptions.scene` / `renderer` 在 view.hydrate 下忽略。
   */
  hydrate: (options: HydrateOptions) => HydrationHandle;
  /** 动画播放控制句柄（scene 含动画且未降级时存在）：play / pause / seek；manual trigger 经此驱动 */
  animation?: AnimationControls;
  /** 当前 plain spec normalization metadata；IR / Scene 输入时为空 metadata。 */
  readonly runtimeMeta: VanillaRuntimeMeta;
};

/** `hydrate` / `view.hydrate` 返回的解绑句柄 */
export type HydrationHandle = {
  /** 解绑本次水合的全部 listener，之后事件不再触发 */
  dispose: () => void;
};

/**
 * 水合入参：按 id 提供的 handler 注册表（事件名 → handler）+ 可选 Scene（富 context 来源）
 * @description `view.hydrate`（mountSvg / mountCanvas）忽略 `scene` / `renderer`、用自身 Scene 构造富 context；
 *   standalone `hydrate(root, options)`（SSR 后独立入口）传 `scene` → 富 context（meta / geometry / 动画），
 *   不传 → 最小 context（id + element + root + point，`meta` / `geometry` / `scene` undefined、`animation` no-op）。
 */
export type HydrateOptions = {
  /** id → 事件名 → handler 的注册表（透传给 `@retikz/render/hydration` 控制器） */
  handlers: HydrationHandlers;
  /** 富 context 来源 Scene（仅 standalone `hydrate` 用；不传则最小 context）；可经 `toScene(ir)` 得到 */
  scene?: Scene;
  /** standalone `hydrate` 的渲染后端（缺省 `'svg'`）；决定 context.renderer 与 element 定位口径 */
  renderer?: 'svg' | 'canvas';
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
 *   client→Scene 坐标映射做定位；`clientToScene` 把指针的 client 像素逆 meet-fit 映射回 Scene user units（供 hitTest）。
 */
export type CanvasView = {
  /** 挂载出的 `<canvas>`；跨 `update` 同一元素（不被替换） */
  readonly root: HTMLCanvasElement;
  /** 整图重渲染（原地复用 `root`、重设位图尺寸 + 重绘），不承诺局部 patch */
  update: (next: RenderInput) => void;
  /** 卸载：移除 `root`、解绑水合、置 view 失效（再调 `update` 抛、`dispose` noop） */
  dispose: () => void;
  /** 绑定 handler：以 `hitTest` + `clientToScene` 构造 `locate`，经 `createHydrationController` 委托 */
  hydrate: (options: HydrateOptions) => HydrationHandle;
  /**
   * 把指针的 client 像素坐标逆 meet-fit 映射成 Scene user units（命中映射用）
   * @description 始终返回逆 fit 后的 Scene 点；落在 letterbox 黑边外的点会得到 layout 区域外坐标，
   *   交给 `hitTest` 自然判为无命中（无需在此截断），故无 `null` 返回。
   */
  clientToScene: (clientX: number, clientY: number) => ScenePoint;
  /** 动画播放控制句柄（scene 含动画且未降级时存在）：rAF 时钟的 play / pause / seek */
  animation?: AnimationControls;
  /** 当前 plain spec normalization metadata；IR / Scene 输入时为空 metadata。 */
  readonly runtimeMeta: VanillaRuntimeMeta;
};

/** `mountCanvas` 选项：继承 SSR / compile 公共项，外加 canvas 显示 / dpr 透传 */
export type MountCanvasOptions = CommonOptions & {
  /** Canvas 专属 runtime 选项。 */
  canvas?: VanillaCanvasOptions;
};
