import { compileNode, evaluatePosition, evaluatePositionTargetWorld, resolveNode } from '@retikz/core';
import type { CanonicalNode, NodeCompileContext, CompiledNode, IRNode } from '@retikz/core';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import type { SubtreeCompileRuntime } from '../../compile/execution';
import { createNodeResolveContext, createNodeCompileContext } from '../../compile/execution';
import type { CompileRuntime } from '../../compile/runtime';
import { createWeaveObservation } from '../shared';
import { matchWeaveReferences, restoreWeaveResources, retainWeaveReads } from '../shared';
import type { WeaveNode, WeaveCacheMetadata } from '../shared';
import { compareCanonicalNodes, compareNodeLayoutInputs, compareNodeMeasurementInputs } from './compare';

/** 编译变化的 Node，并保留仍有效的局部布局 */
export const compileWeaveNode = (
  canon: CanonicalNode,
  context: NodeCompileContext,
  previous?: { canon: CanonicalNode; compiled: CompiledNode },
  referencesValid = true,
) => {
  if (previous === undefined) return compileNode(canon, context);
  if (!referencesValid || !compareNodeLayoutInputs(previous.canon, canon)) {
    const measured = compareNodeMeasurementInputs(previous.canon, canon);
    return compileNode(canon, context, {
      layout: {
        ...(measured ? { content: previous.compiled.layout.content, shape: previous.compiled.layout.shape } : {}),
        labels: canon.labels.map((label, index) => ({
          measurement: jsonStructuralEquals(previous.canon.labels[index]?.text, label.text)
            ? previous.compiled.layout.labels?.[index]?.measurement
            : undefined,
        })),
      },
    });
  }
  const position = canon.layout.position;
  if (!Array.isArray(position) && 'kind' in position)
    evaluatePositionTargetWorld(position.target, context.positionContext);
  else evaluatePosition(position, context.positionContext);
  return compileNode(canon, context, { layout: previous.compiled.layout });
};

/** 由增量驱动选择有效 Node 产物并直接调用 Core */
export const executeWeaveNode = (
  runtime: CompileRuntime,
  child: IRNode,
  path: PropertyPath,
  context: SubtreeCompileRuntime['context'],
  previous?: NonNullable<Extract<WeaveNode, { type: 'node' }>['current']>,
): { canon: CanonicalNode; compiled: CompiledNode; cache: WeaveCacheMetadata; reused: boolean } => {
  const resolveInputs = { child, style: context.inheritance };
  const compileInputs = { scopeChain: context.transformChains, proposal: context.layout?.childProposal };
  const cache = previous?.cache;
  const before = previous?.canon;
  const observation = createWeaveObservation(runtime);
  const canon =
    before != null &&
    cache?.diagnostics.length === 0 &&
    compareProperties(cache.resolveInputs, resolveInputs, { depth: 2 })
      ? before
      : resolveNode(child, createNodeResolveContext(observation.runtime, path, context));
  const referencesValid =
    cache !== undefined && matchWeaveReferences(cache.reads, runtime.state.execution.namespaceStack);
  const canRetain = cache?.diagnostics.length === 0 && jsonStructuralEquals(cache.compileInputs, compileInputs);
  if (
    before != null &&
    previous?.compiled != null &&
    canRetain &&
    referencesValid &&
    observation.diagnostics.length === 0 &&
    compareCanonicalNodes(before, canon)
  ) {
    restoreWeaveResources(runtime, cache);
    return { canon, compiled: previous.compiled, cache: { ...cache, resolveInputs, compileInputs }, reused: true };
  }
  const reusable =
    before != null && previous?.compiled != null && canRetain
      ? { canon: before, compiled: previous.compiled }
      : undefined;
  const compiled = runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
    compileWeaveNode(
      canon,
      createNodeCompileContext(observation.runtime, canon, path, context),
      reusable,
      referencesValid,
    ),
  );
  if (referencesValid && reusable !== undefined) retainWeaveReads(observation.reads, cache.reads);
  return { canon, compiled, cache: { ...observation.facts(), resolveInputs, compileInputs }, reused: false };
};
