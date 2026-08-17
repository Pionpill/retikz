import { RetikzError } from '@retikz/foundation';

import type { WaapiDescriptor } from '../../svg/animation';
import type { AnimationControls } from '../runtime';

/** WAAPI 接管前的 inline transform style 快照 */
type WaapiStyleBase = Readonly<{
  /** ownership 链的基础节点判别值 */
  kind: 'base';
  /** 接管前的 transform-origin */
  transformOrigin: string;
  /** 接管前的 transform-box */
  transformBox: string;
}>;

/** 单个 controls 对 SVG element inline transform style 的 ownership */
type WaapiStyleOwnership = {
  /** ownership 链节点判别值 */
  kind: 'owner';
  /** 区分同一次 binding 创建的稳定 owner token */
  owner: object;
  /** 本 owner 写入的 transform-origin */
  transformOrigin: string;
  /** 本 owner 写入的 transform-box */
  transformBox: string;
  /** 被本 owner 覆盖的前序 ownership 或基础快照 */
  previous: WaapiStyleOwnership | WaapiStyleBase;
  /** 当前 controls 是否已释放 */
  disposed: boolean;
};

const waapiStyleOwnerships = new WeakMap<SVGElement, WaapiStyleOwnership>();

/** WAAPI binding 构建失败且初次清理也失败时的可恢复错误 */
class RetikzWaapiBindingSetupError extends RetikzError<
  'WAAPI_BINDING_SETUP_FAILED',
  Readonly<{ cleanupCause: unknown; controls: AnimationControls }>
> {
  /** 原始 binding 构建失败 */
  override readonly cause: unknown;

  /** 初次 best-effort cleanup 的首个失败 */
  readonly cleanupCause: unknown;

  /** 保留尚未清理资源的 controls，供 renderer 最终 dispose 重试 */
  readonly controls: AnimationControls;

  /** 创建保留 primary setup cause 与可重试 controls 的错误 */
  constructor(cause: unknown, cleanupCause: unknown, controls: AnimationControls) {
    super({
      code: 'WAAPI_BINDING_SETUP_FAILED',
      message: 'WAAPI binding setup and cleanup failed',
      details: { cleanupCause, controls },
      cause,
    });
    this.cause = cause;
    this.cleanupCause = cleanupCause;
    this.controls = controls;
  }
}

/** 判断指定 inline style 当前是否由 retained WAAPI binding 接管 */
export const isWaapiAnimationStyleOwned = (element: SVGElement, key: string): boolean =>
  (key === 'transform-origin' || key === 'transformOrigin' || key === 'transform-box' || key === 'transformBox') &&
  waapiStyleOwnerships.has(element);

/**
 * 为一组实际 descriptor elements 创建可门控的 retained WAAPI binding
 * @description gate 只控制事件与可见性触发，供 renderer 在 commit / rollback 间原子切换 binding ownership
 */
export const bindWaapiDescriptorElements = (
  elements: ReadonlyArray<Element>,
  isEnabled: () => boolean,
): AnimationControls => {
  const animations: Array<Animation> = [];
  const pendingAnimations = new Set<Animation>();
  const pendingObservers = new Set<IntersectionObserver>();
  const pendingListenerCleanups = new Set<() => void>();
  const styleOwner = Object.freeze({});
  const ownedStyles = new Map<SVGElement, WaapiStyleOwnership>();
  const hasIO = typeof IntersectionObserver !== 'undefined';
  let cleanupStarted = false;
  let cleanupInProgress = false;
  let cleanupComplete = false;
  /** 外部注册或回调返回后重新读取 cleanup 状态 */
  const hasCleanupStarted = (): boolean => cleanupStarted;
  /** 外部 gate 回调返回后重新读取 cleanup gate */
  const isBindingActive = (): boolean => {
    if (cleanupStarted) return false;
    const enabled = isEnabled();
    return enabled && !cleanupStarted;
  };

  const disposeResources = (): void => {
    if (cleanupComplete || cleanupInProgress) return;
    cleanupStarted = true;
    cleanupInProgress = true;
    try {
      const failures: Array<unknown> = [];
      const attempt = (cleanup: () => void): void => {
        try {
          cleanup();
        } catch (cause) {
          failures.push(cause);
        }
      };
      for (const animation of [...pendingAnimations]) {
        attempt(() => {
          animation.cancel();
          pendingAnimations.delete(animation);
        });
      }
      for (const observer of [...pendingObservers]) {
        attempt(() => {
          observer.disconnect();
          pendingObservers.delete(observer);
        });
      }
      for (const cleanup of [...pendingListenerCleanups]) {
        attempt(() => {
          cleanup();
          pendingListenerCleanups.delete(cleanup);
        });
      }
      for (const [element, ownership] of [...ownedStyles]) {
        attempt(() => {
          if (ownership.disposed) {
            ownedStyles.delete(element);
            return;
          }
          if (waapiStyleOwnerships.get(element) !== ownership) {
            ownership.disposed = true;
            ownedStyles.delete(element);
            return;
          }
          let previous = ownership.previous;
          while (previous.kind === 'owner' && previous.disposed) previous = previous.previous;
          element.style.transformOrigin = previous.transformOrigin;
          element.style.transformBox = previous.transformBox;
          if (previous.kind === 'owner') waapiStyleOwnerships.set(element, previous);
          else waapiStyleOwnerships.delete(element);
          ownership.disposed = true;
          ownedStyles.delete(element);
        });
      }
      if (failures.length > 0) throw failures[0];
      cleanupComplete = true;
    } finally {
      cleanupInProgress = false;
    }
  };

  /** 接管外部刚创建的 animation，并在 gate 已失活时立即转入可重试清理 */
  const retainAnimation = (animation: Animation): boolean => {
    pendingAnimations.add(animation);
    if (isBindingActive()) {
      animations.push(animation);
      return true;
    }
    if (cleanupStarted) {
      cleanupComplete = false;
      disposeResources();
      return false;
    }
    animation.cancel();
    pendingAnimations.delete(animation);
    return false;
  };

  const controls: AnimationControls = Object.freeze({
    play: () => {
      for (const animation of animations) {
        if (cleanupStarted) return;
        animation.play();
      }
    },
    pause: () => {
      for (const animation of animations) {
        if (cleanupStarted) return;
        animation.pause();
      }
    },
    seek: timeMs => {
      for (const animation of animations) {
        if (cleanupStarted) return;
        animation.currentTime = timeMs;
      }
    },
    dispose: disposeResources,
    get time() {
      const first = animations[0] as Animation | undefined;
      return Number(first?.currentTime ?? 0);
    },
    get running() {
      return !cleanupStarted && animations.some(animation => animation.playState === 'running');
    },
  });

  try {
    elements.forEach(element => {
      if (cleanupStarted) return;
      const raw = element.getAttribute('data-retikz-anim');
      if (!raw) return;
      let descriptors: Array<WaapiDescriptor>;
      try {
        descriptors = JSON.parse(raw) as Array<WaapiDescriptor>;
      } catch {
        return;
      }
      for (const descriptor of descriptors) {
        if (hasCleanupStarted()) break;
        if (descriptor.transformOrigin && element instanceof SVGElement) {
          const existingOwnership = waapiStyleOwnerships.get(element);
          const ownership =
            existingOwnership?.owner === styleOwner
              ? existingOwnership
              : {
                  kind: 'owner' as const,
                  owner: styleOwner,
                  transformOrigin: descriptor.transformOrigin,
                  transformBox: 'view-box',
                  previous:
                    existingOwnership ??
                    ({
                      kind: 'base',
                      transformOrigin: element.style.transformOrigin,
                      transformBox: element.style.transformBox,
                    } as const),
                  disposed: false,
                };
          ownership.transformOrigin = descriptor.transformOrigin;
          ownership.transformBox = 'view-box';
          waapiStyleOwnerships.set(element, ownership);
          ownedStyles.set(element, ownership);
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
          (element as unknown as { animate?: (keyframes: unknown, options: unknown) => Animation }).animate?.(
            descriptor.keyframes,
            timing,
          );
        const trigger = descriptor.trigger;
        if (trigger === 'manual') {
          const animation = animate();
          if (animation && retainAnimation(animation)) animation.pause();
        } else if (trigger === 'visible' && hasIO) {
          let consumed = false;
          let registrationInProgress = true;
          /** observer 注册返回后重新读取同步消费与 cleanup 状态 */
          const shouldReleaseObserver = (): boolean => consumed || hasCleanupStarted();
          const observer = new IntersectionObserver(entries => {
            if (consumed || !isBindingActive()) return;
            for (const entry of entries) {
              if (entry.isIntersecting) {
                consumed = true;
                const animation = animate();
                if (animation && !retainAnimation(animation)) return;
                if (!isBindingActive()) return;
                observer.disconnect();
                if (!registrationInProgress) pendingObservers.delete(observer);
                return;
              }
            }
          });
          pendingObservers.add(observer);
          try {
            observer.observe(element);
          } finally {
            registrationInProgress = false;
          }
          if (shouldReleaseObserver()) {
            pendingObservers.add(observer);
            if (hasCleanupStarted()) cleanupComplete = false;
            observer.disconnect();
            pendingObservers.delete(observer);
          }
        } else if (typeof trigger === 'object') {
          // 复用单个 Animation：每次事件 cancel + play 从头重播，避免每次触发新建并无界堆积
          let animation: Animation | undefined;
          const handler = (): void => {
            if (!isBindingActive()) return;
            if (animation) {
              animation.cancel();
              if (!isBindingActive()) return;
              animation.play();
              return;
            }
            const created = animate();
            if (created && retainAnimation(created)) animation = created;
          };
          const cleanup = () => element.removeEventListener(trigger.onEvent, handler);
          pendingListenerCleanups.add(cleanup);
          try {
            element.addEventListener(trigger.onEvent, handler);
          } catch (cause) {
            pendingListenerCleanups.add(cleanup);
            if (hasCleanupStarted()) cleanupComplete = false;
            throw cause;
          }
          if (hasCleanupStarted()) {
            cleanupComplete = false;
            pendingListenerCleanups.add(cleanup);
            disposeResources();
          }
        }
      }
    });
  } catch (cause) {
    try {
      disposeResources();
    } catch (cleanupCause) {
      throw new RetikzWaapiBindingSetupError(cause, cleanupCause, controls);
    }
    throw cause;
  }

  return controls;
};

/** 从 WAAPI setup 双重失败中恢复 owner 必须重试的 controls 与 primary cause */
export const recoverWaapiBindingSetupFailure = (
  cause: unknown,
): Readonly<{ cause: unknown; controls: AnimationControls }> | undefined => {
  if (!(cause instanceof Error) || cause.name !== 'RetikzWaapiBindingSetupError') return undefined;
  const controls = Reflect.get(cause, 'controls');
  if (typeof controls !== 'object' || controls === null || typeof Reflect.get(controls, 'dispose') !== 'function') {
    return undefined;
  }
  return Object.freeze({ cause: Reflect.get(cause, 'cause'), controls: controls as AnimationControls });
};
