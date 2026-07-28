import type { WaapiDescriptor } from '../../svg/animation/waapi';
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
  const observers: Array<IntersectionObserver> = [];
  const cleanups: Array<() => void> = [];
  const styleOwner = Object.freeze({});
  const ownedStyles = new Map<SVGElement, WaapiStyleOwnership>();
  const hasIO = typeof IntersectionObserver !== 'undefined';
  let disposed = false;

  const disposeResources = (): void => {
    if (disposed) return;
    disposed = true;
    animations.forEach(animation => animation.cancel());
    observers.forEach(observer => observer.disconnect());
    cleanups.forEach(cleanup => cleanup());
    ownedStyles.forEach((ownership, element) => {
      if (ownership.disposed) return;
      ownership.disposed = true;
      if (waapiStyleOwnerships.get(element) !== ownership) return;
      let previous = ownership.previous;
      while (previous.kind === 'owner' && previous.disposed) previous = previous.previous;
      element.style.transformOrigin = previous.transformOrigin;
      element.style.transformBox = previous.transformBox;
      if (previous.kind === 'owner') waapiStyleOwnerships.set(element, previous);
      else waapiStyleOwnerships.delete(element);
    });
  };

  try {
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
          animation?.pause();
          if (animation) animations.push(animation);
        } else if (trigger === 'visible' && hasIO) {
          const observer = new IntersectionObserver(entries => {
            if (!isEnabled()) return;
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
            if (!isEnabled()) return;
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
  } catch (cause) {
    disposeResources();
    throw cause;
  }

  return {
    play: () => animations.forEach(animation => animation.play()),
    pause: () => animations.forEach(animation => animation.pause()),
    seek: timeMs => animations.forEach(animation => (animation.currentTime = timeMs)),
    dispose: disposeResources,
    get time() {
      const first = animations[0] as Animation | undefined;
      return Number(first?.currentTime ?? 0);
    },
    get running() {
      return animations.some(animation => animation.playState === 'running');
    },
  };
};
