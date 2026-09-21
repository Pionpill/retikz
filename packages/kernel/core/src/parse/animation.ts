import type { IRAnimationOrigin, IRAnimationTrack } from '../schemas';
import { AnimationProperty } from '../schemas';

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
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  ...applyBase({ duration: 400, easing: 'ease-out' }, opts),
});

/** 描边画出：`pathDraw` 0→1（仅对有描边元素有效） */
export const drawOn = (opts: AnimationPresetOptions = {}): IRAnimationTrack => ({
  property: AnimationProperty.PathDraw,
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
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
  keyframes: [
    { at: 0, value: opts.from ?? 0.8 },
    { at: 1, value: 1 },
  ],
  ...(opts.origin !== undefined ? { origin: opts.origin } : {}),
  ...applyBase({ duration: 400, easing: 'ease-out' }, opts),
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
  keyframes: [
    { at: 0, value: opts.offset ?? -20 },
    { at: 1, value: 0 },
  ],
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
  return {
    property: (opts.channel ?? 'fill') === 'stroke' ? AnimationProperty.Stroke : AnimationProperty.Fill,
    keyframes: [
      { at: 0, value: opts.from },
      { at: 1, value: opts.to },
    ],
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
  return {
    property: AnimationProperty.ViewBox,
    keyframes: [
      { at: 0, value: opts.from },
      { at: 1, value: opts.to },
    ],
    ...applyBase({ duration: 800, easing: 'ease-in-out' }, opts),
  };
};

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
 * @description 覆盖各 track 原有 delay（错峰编排以本 helper 为准）
 */
export const stagger = (
  tracks: ReadonlyArray<IRAnimationTrack>,
  stepMs: number,
  startMs = 0,
): Array<IRAnimationTrack> => tracks.map((track, index) => ({ ...track, delay: startMs + index * stepMs }));
