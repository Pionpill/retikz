import type { Transform } from '../../../contract';
import type { IRTarget } from '../../../schemas';
import type { PositionTargetEvaluateContext } from '../../reference';
import type { PathTargetResolver, TargetResolution } from '../types';
import { bindPathTarget, targetKeyOf } from './view';

/** 在一次 Path 计算内按变换链复用目标绑定；不持有调用方名称树 */
export const createPathTargetResolver = (
  positionContextOf: (chain: ReadonlyArray<Transform>) => PositionTargetEvaluateContext,
): PathTargetResolver => {
  const bindingsByScope = new WeakMap<ReadonlyArray<Transform>, Map<string, TargetResolution | null>>();
  const bindingOf = (target: IRTarget, chain: ReadonlyArray<Transform>): TargetResolution | null => {
    let bindings = bindingsByScope.get(chain);
    if (bindings === undefined) {
      bindings = new Map();
      bindingsByScope.set(chain, bindings);
    }
    const key = targetKeyOf(target);
    // ⚡undefined 表示未登记，null 仍是合法命中，避免 has/get 双重查找
    const cached = bindings.get(key);
    if (cached !== undefined) return cached;
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
