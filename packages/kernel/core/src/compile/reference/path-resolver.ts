import type { Transform } from '../../contract';
import type { PathTargetResolver, TargetResolution } from '../../resolve';
import type { PositionTargetResolveContext } from '../../resolve/position';
import type { IRTarget } from '../../schemas';
import { bindPathTarget, targetKeyOf } from './path-target';

/** 在一次 Path 计算内按变换链复用目标绑定；不持有调用方名称树 */
export const createPathTargetResolver = (
  positionContextOf: (chain: ReadonlyArray<Transform>) => PositionTargetResolveContext,
): PathTargetResolver => {
  const bindingsByScope = new WeakMap<ReadonlyArray<Transform>, Map<string, TargetResolution | null>>();
  const bindingOf = (target: IRTarget, chain: ReadonlyArray<Transform>): TargetResolution | null => {
    let bindings = bindingsByScope.get(chain);
    if (bindings === undefined) {
      bindings = new Map();
      bindingsByScope.set(chain, bindings);
    }
    const key = targetKeyOf(target);
    if (bindings.has(key)) return bindings.get(key) ?? null;
    const binding = bindPathTarget(target, positionContextOf(chain));
    bindings.set(key, binding);
    return binding;
  };
  return {
    pointOfTarget: (target, chain) => bindingOf(target, chain)?.point ?? null,
    refPointOfTarget: (target, chain) => bindingOf(target, chain)?.referencePoint ?? null,
    bindTarget: bindingOf,
  };
};
