import { compileCoordinate, resolveCoordinate } from '@retikz/core';
import type { IRCoordinate } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';

import type { CompileRuntime, SubtreeCompileContext } from '../../../compile';
import { createTreePositionContext } from '../../../compile';
import { createWeaveObservation, matchWeaveReferences, restoreWeaveResources } from '../../shared';
import type { WeaveStages, WeaveCoordinateState } from '../../shared';
import { compareCanonicalCoordinates } from './compare';

/** 按输入、编译上下文与引用依赖复用或重新计算坐标产物 */
export const executeWeaveCoordinate = (
  runtime: CompileRuntime,
  child: IRCoordinate,
  context: SubtreeCompileContext,
  previous?: WeaveStages<WeaveCoordinateState>,
) => {
  // 仅记录各阶段实际消费的输入通道
  const resolveInputs = { child, nodeDistance: runtime.context.layout.nodeDistance };
  const compileInputs = { scopeChain: context.transformChains };
  const previousCompile = previous?.compile;
  const previousReads = previous?.referenceReads ?? [];
  const before = previous?.resolve?.value;

  // 1. 输入与解析上下文相同时复用 canon，否则重新解析
  const canon =
    before != null &&
    previousCompile?.diagnostics.length === 0 &&
    compareProperties({ child: previous!.resolve!.input, ...previous!.resolve!.context }, resolveInputs, { depth: 2 })
      ? before
      : resolveCoordinate(child, runtime.context.layout);

  // 2. 解析结果、编译上下文与引用均有效时恢复资源并复用编译产物
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

  // 3. 重新编译并记录本轮实际使用的资源、诊断与引用
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
