/**
 * 具名动画 preset 工厂（Sugar）：把 roadmap §动画配方表实装成 `fadeIn()` / `spin()` / `growUp()` … 函数
 * @description 纯函数、产 `IRAnimationTrack`，用于 `animations={[fadeIn(), scaleIn()]}`。不引入新能力——
 *   产出逐字段等于手写 track（Sugar=Kernel 等价），播放 / 降级全走 renderer 既有通路。默认值 = 配方表，单一真源。
 */
import { AnimationProperty, type IRAnimationOrigin, type IRAnimationTrack } from '../ir/animation';

/** preset 公共可调项（各 preset 在此之上加专有项；默认值由各 preset 给） */
export type AnimationPresetOptions = {
  /** 单次迭代时长（毫秒）；缺省由各 preset 给 */
  duration?: number;
  /** 首次迭代前延迟（毫秒） */
  delay?: number;
  /** 缓动：具名预设 / cubic-bezier 四元组 / 注册名；缺省由各 preset 给 */
  easing?: IRAnimationTrack['easing'];
  /** 播放触发器；缺省 load */
  trigger?: IRAnimationTrack['trigger'];
};

/** 把公共项叠到 track（duration/easing 取 opts 覆盖否则 preset 默认；delay/trigger 仅在给定时写入） */
const applyBase = (
  base: { duration: number; easing: NonNullable<IRAnimationTrack['easing']> },
  opts: AnimationPresetOptions,
): Pick<IRAnimationTrack, 'duration' | 'easing' | 'delay' | 'trigger'> => ({
  duration: opts.duration ?? base.duration,
  easing: opts.easing ?? base.easing,
  ...(opts.delay !== undefined ? { delay: opts.delay } : {}),
  ...(opts.trigger !== undefined ? { trigger: opts.trigger } : {}),
});

/** 淡入：`opacity` 0→1（末帧 = base，降级见完整图） */
export const fadeIn = (opts: AnimationPresetOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.Opacity,
  keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }],
  ...applyBase({ duration: 400, easing: 'ease-out' }, opts),
});

/** 描边画出：`pathDraw` 0→1（仅对有描边元素有效） */
export const drawOn = (opts: AnimationPresetOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.PathDraw,
  keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }],
  ...applyBase({ duration: 600, easing: 'ease-in-out' }, opts),
});

/** `scaleIn` 选项：起始均匀缩放 `from` + 支点 `origin` */
export type ScaleInOptions = AnimationPresetOptions & {
  /** 起始缩放（末帧恒为 1 = base）；缺省 0.8 */
  from?: number;
  /** 缩放支点（缺省几何中心） */
  origin?: IRAnimationOrigin;
};

/** 缩放入场：`scale` from→1（均匀，绕 origin） */
export const scaleIn = (opts: ScaleInOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.Scale,
  keyframes: [{ at: 0, value: opts.from ?? 0.8 }, { at: 1, value: 1 }],
  ...(opts.origin !== undefined ? { origin: opts.origin } : {}),
  ...applyBase({ duration: 400, easing: 'ease-out' }, opts),
});

/** 从无到有放大：`scaleIn` 的 `from: 0` 别名 */
export const grow = (opts: Omit<ScaleInOptions, 'from'> = {}): IRAnimationTrack =>
  scaleIn({ ...opts, from: 0 });

/** `growUp` 选项：支点 `origin`（缺省底边中点，柱状图从基线长出） */
export type GrowUpOptions = AnimationPresetOptions & {
  /** 缩放支点；缺省 'south'（底边中点） */
  origin?: IRAnimationOrigin;
};

/** 从基线长出：`scaleY` 0→1，支点底边（柱状图入场） */
export const growUp = (opts: GrowUpOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.ScaleY,
  keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }],
  origin: opts.origin ?? 'south',
  ...applyBase({ duration: 500, easing: 'ease-out' }, opts),
});

/** `slideIn` 选项：轴向 + 起始位移 */
export type SlideInOptions = AnimationPresetOptions & {
  /** 滑入轴向；缺省 'x' */
  axis?: 'x' | 'y';
  /** 起始位移（末帧恒为 0 = base）；缺省 −20 */
  offset?: number;
};

/** 滑入：`translateX|Y` offset→0 */
export const slideIn = (opts: SlideInOptions = {}): IRAnimationTrack => ({
  property: (opts.axis ?? 'x') === 'y' ? AnimationProperty.TranslateY : AnimationProperty.TranslateX,
  keyframes: [{ at: 0, value: opts.offset ?? -20 }, { at: 1, value: 0 }],
  ...applyBase({ duration: 400, easing: 'ease-out' }, opts),
});

/** `colorShift` 选项：通道 + 起止色（均必填，纯工厂无法取 base 色） */
export type ColorShiftOptions = AnimationPresetOptions & {
  /** 起始颜色（必填） */
  from: string;
  /** 终止颜色（必填） */
  to: string;
  /** 变色通道；缺省 'fill' */
  channel?: 'fill' | 'stroke';
};

/** 变色：`fill|stroke` from→to（oklch 插值，由 renderer 端处理） */
export const colorShift = (opts: ColorShiftOptions): IRAnimationTrack => {
  // 运行时守 JS 调用方漏传（类型已要求必填，故读为可空视图以做防御校验）
  const { from, to } = opts as { from?: string; to?: string };
  if (from === undefined || to === undefined) {
    throw new Error('colorShift: `from` and `to` colors are required.');
  }
  return {
    property: (opts.channel ?? 'fill') === 'stroke' ? AnimationProperty.Stroke : AnimationProperty.Fill,
    keyframes: [{ at: 0, value: from }, { at: 1, value: to }],
    ...applyBase({ duration: 400, easing: 'ease-in-out' }, opts),
  };
};

/** `cameraTo` 选项：起止取景 `[x,y,w,h]`（均必填，纯工厂无法取当前 layout） */
export type CameraToOptions = AnimationPresetOptions & {
  /** 起始取景 `[x, y, w, h]`（必填） */
  from: [number, number, number, number];
  /** 终止取景 `[x, y, w, h]`（必填） */
  to: [number, number, number, number];
};

/** 镜头：scene 根 `viewBox` from→to（挂 `<Layout animations>` / IR 根 `animations`） */
export const cameraTo = (opts: CameraToOptions): IRAnimationTrack => {
  // 运行时守 JS 调用方漏传（类型已要求必填，故读为可空视图以做防御校验）
  const { from, to } = opts as { from?: [number, number, number, number]; to?: [number, number, number, number] };
  if (from === undefined || to === undefined) {
    throw new Error('cameraTo: `from` and `to` viewBox [x, y, w, h] are required.');
  }
  return {
    property: AnimationProperty.ViewBox,
    keyframes: [{ at: 0, value: from }, { at: 1, value: to }],
    ...applyBase({ duration: 800, easing: 'ease-in-out' }, opts),
  };
};

/** `pulse` 选项：峰值缩放 + 支点 */
export type PulseOptions = AnimationPresetOptions & {
  /** 峰值缩放；缺省 1.1 */
  peak?: number;
  /** 缩放支点（缺省几何中心） */
  origin?: IRAnimationOrigin;
};

/** 脉冲：`scale` 1→peak→1 无限循环（强调 / 心跳） */
export const pulse = (opts: PulseOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.Scale,
  keyframes: [{ at: 0, value: 1 }, { at: 0.5, value: opts.peak ?? 1.1 }, { at: 1, value: 1 }],
  iterations: 'infinite',
  ...(opts.origin !== undefined ? { origin: opts.origin } : {}),
  ...applyBase({ duration: 1000, easing: 'ease-in-out' }, opts),
});

/** `spin` 选项：旋转支点 */
export type SpinOptions = AnimationPresetOptions & {
  /** 旋转支点（缺省几何中心） */
  origin?: IRAnimationOrigin;
};

/** 旋转：`rotate` 0→360 无限循环、匀速（loader） */
export const spin = (opts: SpinOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.Rotate,
  keyframes: [{ at: 0, value: 0 }, { at: 1, value: 360 }],
  iterations: 'infinite',
  ...(opts.origin !== undefined ? { origin: opts.origin } : {}),
  ...applyBase({ duration: 1000, easing: 'linear' }, opts),
});

/** `loop` 选项：循环次数 + 方向 */
export type LoopOptions = {
  /** 循环次数；缺省 'infinite' */
  iterations?: IRAnimationTrack['iterations'];
  /** 每次迭代方向（如 'alternate'） */
  direction?: IRAnimationTrack['direction'];
};

/** 循环包装：给任意 track 叠加无限（或指定次数）循环 + 方向 */
export const loop = (track: IRAnimationTrack, opts: LoopOptions = {}): IRAnimationTrack => ({
  ...track,
  iterations: opts.iterations ?? 'infinite',
  ...(opts.direction !== undefined ? { direction: opts.direction } : {}),
});

/**
 * 错峰：给一组 track 依次叠加 delay（`startMs + i*stepMs`），实现「N 元素依次入场」
 * @description 覆盖各 track 原有 delay（错峰编排以本 helper 为准）。
 */
export const stagger = (
  tracks: ReadonlyArray<IRAnimationTrack>,
  stepMs: number,
  startMs = 0,
): Array<IRAnimationTrack> => tracks.map((track, index) => ({ ...track, delay: startMs + index * stepMs }));
