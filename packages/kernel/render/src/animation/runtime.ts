/**
 * 动画 runtime 基建（DOM / rAF；vanilla + react 共用）
 * @description 可复用底座：rAF 时钟（Canvas 逐帧驱动）、`prefers-reduced-motion` 判定、scene 是否
 *   含动画 / 总时长、SVG 交互 track 的 WAAPI 桥（读 `data-retikz-anim` → `element.animate` + 按 trigger 接驱动）。
 *   纯 runtime（触 DOM），与 evaluate/oklch 等纯数学分开；缺 rAF / IntersectionObserver / element.animate 的环境
 *   （SSR / 老浏览器）优雅退化
 */
import type { IRAnimationTrack, Scene, ScenePrimitive } from '@retikz/core';

import { isAutoplayTrigger } from './channels';
import { bindWaapiDescriptorElements } from './retained';

/** 可能缺席的运行时全局（SSR / 老浏览器）：lib.dom 把它们类型成必有，这里显式放宽成可选以正确降级 */
type OptionalGlobals = {
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (id: number) => void;
  matchMedia?: (query: string) => { matches: boolean } | null;
  performance?: { now?: () => number };
};
/**
 * 读取当前运行时全局，避免在测试或嵌入宿主替换 `matchMedia` / rAF 后保留模块加载时的旧引用
 * @description 浏览器生产环境中 `globalThis` 恒定；延迟读取仅让 SSR 降级与测试 stub 保持同一语义
 */
const environment = (): OptionalGlobals => globalThis;

/** 播放控制句柄（manual trigger / runtime 暴露给调用方） */
export type AnimationControls = {
  /** 开始 / 继续播放 */
  play: () => void;
  /** 暂停（保留当前时刻） */
  pause: () => void;
  /** 跳到指定时刻（毫秒）并渲染该帧 */
  seek: (timeMs: number) => void;
  /** 停止并释放（rAF / observer / listener） */
  dispose: () => void;
  /** 当前时刻（毫秒） */
  readonly time: number;
  /** 是否在播放 */
  readonly running: boolean;
};

const now = (): number => environment().performance?.now?.() ?? 0;

/** rAF 时钟选项 */
export type ClockOptions = {
  /** 每帧回调（绝对时间毫秒）；Canvas runtime 在此调 drawScene({time}) */
  onFrame: (timeMs: number) => void;
  /** 有限总时长（毫秒）→ 到点停 + 画末帧 settled；null/Infinity → 持续（infinite track） */
  durationMs?: number | null;
  /** 创建即播（缺省 false，由 trigger 决定何时 play） */
  autoplay?: boolean;
};

/** rAF 注册返回前后共享的 frame ownership */
type ClockFrameRegistration = {
  /** rAF 返回的 handle；注册尚未返回时为 null */
  id: number | null;
  /** callback 是否已经同步或异步消费该 frame */
  consumed: boolean;
};

/**
 * 创建 rAF 共享时钟：维护 scene 级 time，每帧调 onFrame；到有限时长尽头停在末帧
 * @description 缺 requestAnimationFrame（SSR）→ 退化为只画一帧（末帧 / t=0）。所有 track 共用此时钟，
 *   per-track delay 在 evaluateTrack 内偏移，天然支持错峰
 */
export const createClock = (options: ClockOptions): AnimationControls => {
  const { requestAnimationFrame: raf, cancelAnimationFrame: caf } = environment();
  const finite = options.durationMs != null && Number.isFinite(options.durationMs);
  const end = options.durationMs as number;
  let running = false;
  /** 当前待执行 frame 的注册所有权；id 发布前也可被同步 cleanup 关闭 gate */
  let frameRegistration: ClockFrameRegistration | null = null;
  let stopping = false;
  let frameCancellationInProgress = false;
  let cleanupStarted = false;
  let cleanupInProgress = false;
  let stamp = 0;
  let baseTime = 0;
  let currentTime = 0;
  /** 外部 frame callback 返回后重新读取 clock gate */
  const isRunning = (): boolean => running && !cleanupStarted;
  /** 外部 rAF 注册返回后重新读取当前 registration 的发布资格 */
  const canPublishFrame = (registration: ClockFrameRegistration): boolean =>
    running && !stopping && !cleanupStarted && frameRegistration === registration;
  /** cancel 失败返回后判断同步消费的 frame 是否需要恢复推进链 */
  const shouldRestoreFrame = (registration: ClockFrameRegistration | null): boolean =>
    registration?.consumed === true && frameRegistration === null && running && !cleanupStarted;

  /** 取消已发布 handle；失败时保留 registration 供后续 dispose 重试 */
  const cancelFrameRegistration = (registration: ClockFrameRegistration | null): void => {
    const frame = registration?.id;
    if (frame === null || frame === undefined) return;
    if (!caf) {
      if (frameRegistration === registration) frameRegistration = null;
      return;
    }
    if (frameCancellationInProgress) return;
    frameCancellationInProgress = true;
    try {
      caf(frame);
      if (frameRegistration === registration) frameRegistration = null;
    } finally {
      frameCancellationInProgress = false;
    }
  };

  const tick = (): void => {
    if (!running || stopping || cleanupStarted) return;
    currentTime = baseTime + (now() - stamp);
    if (finite && currentTime >= end) {
      currentTime = end;
      options.onFrame(currentTime);
      running = false;
      return;
    }
    options.onFrame(currentTime);
    if (isRunning()) scheduleFrame();
  };

  /** 注册下一帧，并在同步重入关闭 gate 后接管返回 handle 的清理 */
  const scheduleFrame = (): void => {
    if (!raf || !running || stopping) return;
    const registration: ClockFrameRegistration = { id: null, consumed: false };
    frameRegistration = registration;
    const frame = raf(() => {
      registration.consumed = true;
      if (frameRegistration === registration) frameRegistration = null;
      tick();
    });
    registration.id = frame;
    if (registration.consumed) return;
    if (canPublishFrame(registration)) return;
    cancelFrameRegistration(registration);
  };

  const play = (): void => {
    if (running || cleanupStarted) return;
    if (!raf) {
      // 无 rAF：直接定格末帧（有限）/ 起点
      options.onFrame(finite ? end : 0);
      return;
    }
    running = true;
    stamp = now();
    scheduleFrame();
  };
  const pause = (): void => {
    if (!running || stopping || cleanupStarted) return;
    const registration = frameRegistration;
    let cancellationFailed = false;
    let cancellationCause: unknown;
    stopping = true;
    try {
      cancelFrameRegistration(registration);
      running = false;
      baseTime = currentTime;
    } catch (cause) {
      cancellationFailed = true;
      cancellationCause = cause;
    } finally {
      stopping = false;
    }
    if (!cancellationFailed) return;
    if (shouldRestoreFrame(registration)) scheduleFrame();
    throw cancellationCause;
  };
  const seek = (timeMs: number): void => {
    if (cleanupStarted) return;
    baseTime = timeMs;
    currentTime = timeMs;
    stamp = now();
    options.onFrame(timeMs);
  };
  const dispose = (): void => {
    if (cleanupInProgress) return;
    cleanupStarted = true;
    running = false;
    cleanupInProgress = true;
    try {
      cancelFrameRegistration(frameRegistration);
    } finally {
      cleanupInProgress = false;
    }
  };

  if (options.autoplay) play();
  return {
    play,
    pause,
    seek,
    dispose,
    get time() {
      return currentTime;
    },
    get running() {
      return running && !cleanupStarted;
    },
  };
};

/** 读 `prefers-reduced-motion: reduce`；无 matchMedia（SSR）→ false */
export const prefersReducedMotion = (): boolean =>
  environment().matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/**
 * 把作者动画开关与系统减少动态效果偏好解析为最终播放状态
 * @description 未显式配置时跟随系统偏好；显式 `true` / `false` 始终覆盖系统偏好
 */
export const resolveAnimationEnabled = (explicit: boolean | undefined, reducedMotion: boolean): boolean =>
  explicit ?? !reducedMotion;

/** 递归判断 prim 树是否有任意 animations */
const primsHaveAnimations = (prims: ReadonlyArray<ScenePrimitive>): boolean =>
  prims.some(p => (p.animations?.length ?? 0) > 0 || (p.type === 'group' && primsHaveAnimations(p.children)));

/** scene 是否含任意动画（元素级或 scene 根镜头） */
export const sceneHasAnimations = (scene: Scene): boolean =>
  (scene.animations?.length ?? 0) > 0 || primsHaveAnimations(scene.primitives);

/** 递归判断 prim 树是否有自动播放（load/缺省）track */
const primsHaveAutoplay = (prims: ReadonlyArray<ScenePrimitive>): boolean =>
  prims.some(
    p => (p.animations ?? []).some(isAutoplayTrigger) || (p.type === 'group' && primsHaveAutoplay(p.children)),
  );

/**
 * scene 是否含「自动播放」(load/缺省) track（元素级或根镜头）
 * @description Canvas runtime 据此决定是否自动 `clock.play()`；全为 visible/manual/onEvent → 不自动起钟
 */
export const sceneHasAutoplayTrigger = (scene: Scene): boolean =>
  (scene.animations ?? []).some(isAutoplayTrigger) || primsHaveAutoplay(scene.primitives);

/** 一条 track 的活动结束时刻（毫秒）；iterations infinite → Infinity */
const trackEndMs = (track: IRAnimationTrack): number => {
  const iterations = track.iterations === 'infinite' ? Infinity : (track.iterations ?? 1);
  return (track.delay ?? 0) + track.duration * iterations;
};

/** 收集 scene 全部 track（元素级 + 根镜头） */
const collectTracks = (scene: Scene): Array<IRAnimationTrack> => {
  const out: Array<IRAnimationTrack> = [...(scene.animations ?? [])];
  const walk = (prims: ReadonlyArray<ScenePrimitive>): void => {
    for (const p of prims) {
      if (p.animations) out.push(...p.animations);
      if (p.type === 'group') walk(p.children);
    }
  };
  walk(scene.primitives);
  return out;
};

/**
 * scene 动画总时长（毫秒）；任一 track infinite → null（持续播放）
 * @description Canvas runtime 据此决定有限播完即停 / 持续
 */
export const sceneAnimationDurationMs = (scene: Scene): number | null => {
  const tracks = collectTracks(scene);
  if (tracks.length === 0) return 0;
  let max = 0;
  for (const track of tracks) {
    const end = trackEndMs(track);
    if (!Number.isFinite(end)) return null;
    if (end > max) max = end;
  }
  return max;
};

/** 绑定 root 自身及 descendants 上的全部 WAAPI descriptors */
export const bindWaapiDescriptors = (root: Element): AnimationControls =>
  bindWaapiDescriptorElements(
    [...(root.matches('[data-retikz-anim]') ? [root] : []), ...root.querySelectorAll('[data-retikz-anim]')],
    () => true,
  );
