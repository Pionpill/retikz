import { compileCoordinate, resolveCoordinate } from '@retikz/core';
import type { IRCoordinate } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';

import type { CompileRuntime, SubtreeCompileContext } from '../../../compile';
import { createTreePositionContext } from '../../../compile';
import { createWeaveObservation, matchWeaveReferences, restoreWeaveResources } from '../../shared';
import type { WeaveCoordinateState } from '../../shared';
import { compareCanonicalCoordinates } from './compare';

/** 从候选状态选择或计算坐标，完整构建不参与此策略 */
export const executeWeaveCoordinate = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  context: SubtreeCompileContext,
  previous?: WeaveCoordinateState,
) => {
  const resolveInputs = { child, nodeDistance: runtime.context.layout.nodeDistance };
  const compileInputs = { scopeChain: context.transformChains };
  const previousCompile = previous?.compile;
  const previousReads = previous?.referenceReads ?? [];
  const before = previous?.resolve?.value;
  const canon =
    before != null &&
    previousCompile?.diagnostics.length === 0 &&
    compareProperties({ child: previous!.resolve!.input, ...previous!.resolve!.context }, resolveInputs, { depth: 2 })
      ? before
      : resolveCoordinate(child, runtime.context.layout);
  if (
    before != null &&
    previous?.compile?.value != null &&
    previousCompile?.diagnostics.length === 0 &&
    compareCanonicalCoordinates(before, canon) &&
    compareProperties(previousCompile.context, compileInputs, { depth: 3 }) &&
    matchWeaveReferences(previousReads, runtime.state.execution.namespaceStack)
  ) {
    restoreWeaveResources(runtime, previousCompile.resources);
    return {
      resolve: { input: child, context: { nodeDistance: resolveInputs.nodeDistance }, value: canon },
      compile: { ...previousCompile, context: compileInputs },
      referenceReads: previousReads,
      reused: true,
    };
  }
  const observation = createWeaveObservation(runtime);
  const compiled = runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
    compileCoordinate(canon, createTreePositionContext(observation.runtime, context.transformChains)),
  );
  return {
    resolve: { input: child, context: { nodeDistance: resolveInputs.nodeDistance }, value: canon },
    compile: { ...observation.facts(), context: compileInputs, value: compiled },
    referenceReads: observation.reads,
    reused: false,
  };
};
