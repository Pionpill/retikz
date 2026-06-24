/**
 * 动画 runtime 基建（DOM / rAF；vanilla + react 共用）
 * @description 可复用底座：rAF 时钟（Canvas 逐帧驱动）、`prefers-reduced-motion` 判定、scene 是否
 *   含动画 / 总时长、SVG 交互 track 的 WAAPI 桥（读 `data-retikz-anim` → `element.animate` + 按 trigger 接驱动）。
 *   纯 runtime（触 DOM），与 evaluate/oklch 等纯数学分开；缺 rAF / IntersectionObserver / element.animate 的环境
 *   （SSR / 老浏览器）优雅退化。
 */
import type { IRAnimationTrack, Scene, ScenePrimitive } from '@retikz/core';
import { isAutoplayTrigger } from './channels';
import type { WaapiDescriptor } from '../svg/animation/waapi';

/** 可能缺席的运行时全局（SSR / 老浏览器）：lib.dom 把它们类型成必有，这里显式放宽成可选以正确降级 */
type OptionalGlobals = {
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (id: number) => void;
  matchMedia?: (query: string) => { matches: boolean } | null;
  performance?: { now?: () => number };
};
const env = globalThis as unknown as OptionalGlobals;

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

const now = (): number => env.performance?.now?.() ?? 0;

/** rAF 时钟选项 */
export type ClockOptions = {
  /** 每帧回调（绝对时间毫秒）；Canvas runtime 在此调 drawScene({time}) */
  onFrame: (timeMs: number) => void;
  /** 有限总时长（毫秒）→ 到点停 + 画末帧 settled；null/Infinity → 持续（infinite track） */
  durationMs?: number | null;
  /** 创建即播（缺省 false，由 trigger 决定何时 play） */
  autoplay?: boolean;
};

/**
 * 创建 rAF 共享时钟：维护 scene 级 time，每帧调 onFrame；到有限时长尽头停在末帧
 * @description 缺 requestAnimationFrame（SSR）→ 退化为只画一帧（末帧 / t=0）。所有 track 共用此时钟，
 *   per-track delay 在 evaluateTrack 内偏移，天然支持错峰。
 */
export const createClock = (options: ClockOptions): AnimationControls => {
  const raf = env.requestAnimationFrame;
  const caf = env.cancelAnimationFrame;
  const finite = options.durationMs != null && Number.isFinite(options.durationMs);
  const end = options.durationMs as number;
  let running = false;
  let rafId: number | null = null;
  let stamp = 0;
  let baseTime = 0;
  let currentTime = 0;

  const tick = (): void => {
    currentTime = baseTime + (now() - stamp);
    if (finite && currentTime >= end) {
      currentTime = end;
      options.onFrame(currentTime);
      running = false;
      rafId = null;
      return;
    }
    options.onFrame(currentTime);
    if (raf) rafId = raf(tick);
  };

  const play = (): void => {
    if (running) return;
    if (!raf) {
      // 无 rAF：直接定格末帧（有限）/ 起点
      options.onFrame(finite ? end : 0);
      return;
    }
    running = true;
    stamp = now();
    rafId = raf(tick);
  };
  const pause = (): void => {
    running = false;
    if (rafId !== null && caf) caf(rafId);
    rafId = null;
    baseTime = currentTime;
  };
  const seek = (timeMs: number): void => {
    baseTime = timeMs;
    currentTime = timeMs;
    stamp = now();
    options.onFrame(timeMs);
  };
  const dispose = (): void => {
    running = false;
    if (rafId !== null && caf) caf(rafId);
    rafId = null;
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
      return running;
    },
  };
};

/** 读 `prefers-reduced-motion: reduce`；无 matchMedia（SSR）→ false */
export const prefersReducedMotion = (): boolean =>
  env.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/** 递归判断 prim 树是否有任意 animations */
const primsHaveAnimations = (prims: ReadonlyArray<ScenePrimitive>): boolean =>
  prims.some(p => (p.animations?.length ?? 0) > 0 || (p.type === 'group' && primsHaveAnimations(p.children)));

/** scene 是否含任意动画（元素级或 scene 根镜头） */
export const sceneHasAnimations = (scene: Scene): boolean =>
  (scene.animations?.length ?? 0) > 0 || primsHaveAnimations(scene.primitives);

/** 递归判断 prim 树是否有自动播放（load/缺省）track */
const primsHaveAutoplay = (prims: ReadonlyArray<ScenePrimitive>): boolean =>
  prims.some(p => (p.animations ?? []).some(isAutoplayTrigger) || (p.type === 'group' && primsHaveAutoplay(p.children)));

/**
 * scene 是否含「自动播放」(load/缺省) track（元素级或根镜头）
 * @description Canvas runtime 据此决定是否自动 `clock.play()`；全为 visible/manual/onEvent → 不自动起钟。
 */
export const sceneHasAutoplayTrigger = (scene: Scene): boolean =>
  (scene.animations ?? []).some(isAutoplayTrigger) || primsHaveAutoplay(scene.primitives);

/** 一条 track 的活动结束时刻（毫秒）；iterations infinite → Infinity */
const trackEndMs = (track: IRAnimationTrack): number => {
  const iterations = track.iterations === 'infinite' ? Infinity : track.iterations ?? 1;
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
 * @description Canvas runtime 据此决定有限播完即停 / 持续。
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

/**
 * 绑定 SVG 交互 track（读 root 下 `data-retikz-anim`）：按 trigger 经 WAAPI 播放
 * @description visible→IntersectionObserver 进视口播；manual→创建即暂停、句柄控制；{onEvent}→事件委托命中即播。
 *   load track 不在此（已由 CSS 自播）。缺 element.animate / IntersectionObserver 的环境优雅跳过。返回控制句柄。
 *   timing.easing 已由编译期烘焙成 CSS 串（含自定义 easing 的 bezier 形式），本桥直传、无需 easing 注册表。
 */
export const bindWaapiDescriptors = (root: Element): AnimationControls => {
  const animations: Array<Animation> = [];
  const observers: Array<IntersectionObserver> = [];
  const cleanups: Array<() => void> = [];
  const hasIO = typeof IntersectionObserver !== 'undefined';

  const elements = root.querySelectorAll('[data-retikz-anim]');
  elements.forEach(element => {
    const raw = element.getAttribute('data-retikz-anim');
    if (!raw) return;
    let descriptors: Array<WaapiDescriptor>;
    try {
      descriptors = JSON.parse(raw) as Array<WaapiDescriptor>;
    } catch {
      return;
    }
    for (const descriptor of descriptors) {
      if (descriptor.transformOrigin && element instanceof SVGElement) {
        element.style.transformOrigin = descriptor.transformOrigin;
        element.style.transformBox = 'view-box';
      }
      const timing: KeyframeAnimationOptions = {
        duration: descriptor.timing.duration,
        delay: descriptor.timing.delay,
        easing: descriptor.timing.easing,
        iterations: descriptor.timing.iterations === 'infinite' ? Infinity : descriptor.timing.iterations,
        direction: descriptor.timing.direction as PlaybackDirection | undefined,
        fill: descriptor.timing.fill as FillMode,
      };
      const animate = (): Animation | undefined =>
        (element as unknown as { animate?: (k: unknown, t: unknown) => Animation }).animate?.(descriptor.keyframes, timing);
      const trigger = descriptor.trigger;
      if (trigger === 'manual') {
        const animation = animate();
        animation?.pause();
        if (animation) animations.push(animation);
      } else if (trigger === 'visible' && hasIO) {
        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const animation = animate();
              if (animation) animations.push(animation);
              observer.disconnect();
            }
          }
        });
        observer.observe(element);
        observers.push(observer);
      } else if (typeof trigger === 'object') {
        // 复用单个 Animation：每次事件 cancel + play 从头重播，避免每次触发新建并无界堆积
        let animation: Animation | undefined;
        const handler = (): void => {
          if (animation) {
            animation.cancel();
            animation.play();
            return;
          }
          animation = animate();
          if (animation) animations.push(animation);
        };
        element.addEventListener(trigger.onEvent, handler);
        cleanups.push(() => element.removeEventListener(trigger.onEvent, handler));
      }
    }
  });

  return {
    play: () => animations.forEach(a => a.play()),
    pause: () => animations.forEach(a => a.pause()),
    seek: timeMs => animations.forEach(a => (a.currentTime = timeMs)),
    dispose: () => {
      animations.forEach(a => a.cancel());
      observers.forEach(o => o.disconnect());
      cleanups.forEach(c => c());
    },
    get time() {
      const first = animations[0] as Animation | undefined;
      return Number(first?.currentTime ?? 0);
    },
    get running() {
      return animations.some(a => a.playState === 'running');
    },
  };
};
