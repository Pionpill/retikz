import { compileCoordinate, resolveCoordinate } from '@retikz/core';
import type { IRCoordinate } from '@retikz/core';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

import type { SubtreeCompileRuntime } from '../../compile/execution';
import { createTreePositionContext } from '../../compile/execution';
import type { CompileRuntime } from '../../compile/runtime';
import { createWeaveObservation } from '../shared';
import { matchWeaveReferences, restoreWeaveResources } from '../shared';
import type { WeaveNode } from '../shared';
import { compareCanonicalCoordinates } from './compare';

/** 从候选状态选择或计算坐标，完整构建不参与此策略 */
export const executeWeaveCoordinate = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  context: SubtreeCompileRuntime['context'],
  previous?: NonNullable<Extract<WeaveNode, { type: 'coordinate' }>['current']>,
) => {
  const resolveInputs = { child, nodeDistance: runtime.context.layout.nodeDistance };
  const compileInputs = { scopeChain: context.transformChains };
  const cache = previous?.cache;
  const before = previous?.canon;
  const canon =
    before != null &&
    cache?.diagnostics.length === 0 &&
    compareProperties(cache.resolveInputs, resolveInputs, { depth: 2 })
      ? before
      : resolveCoordinate(child, runtime.context.layout);
  if (
    before != null &&
    previous?.compiled != null &&
    cache?.diagnostics.length === 0 &&
    compareCanonicalCoordinates(before, canon) &&
    jsonStructuralEquals(cache.compileInputs, compileInputs) &&
    matchWeaveReferences(cache.reads, runtime.state.execution.namespaceStack)
  ) {
    restoreWeaveResources(runtime, cache);
    return { canon, compiled: previous.compiled, cache: { ...cache, resolveInputs, compileInputs }, reused: true };
  }
  const observation = createWeaveObservation(runtime);
  const compiled = runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
    compileCoordinate(canon, createTreePositionContext(observation.runtime, context.transformChains)),
  );
  return { canon, compiled, cache: { ...observation.facts(), resolveInputs, compileInputs }, reused: false };
};
