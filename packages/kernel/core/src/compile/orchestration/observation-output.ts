import type { CompileObservation, CompileObservationContext, CompileObserverOutput } from '../../contract';
import type { CompileContext } from './context';
import type { CompileObservationRuntime } from './observation';
import type { PendingCompileObservation } from './types';

import { applyTransformChain } from '../transform';
import { compareCompileOccurrences, freezeOccurrence } from './artifact';
import { compileObservedFragment } from './observation-fragment';

/** 把 owner identity 转为同 occurrence 下的稳定排序键 */
const ownerKeyOf = (entry: PendingCompileObservation): string =>
  entry.owner.kind === 'composite'
    ? `composite:${entry.owner.namespace}.${entry.owner.type}`
    : `pathKind:${entry.owner.name}`;

/** 把 observation entry 的 scope chain 投影为局部坐标到 Scene 坐标的仿射矩阵 */
const matrixOf = (entry: PendingCompileObservation): readonly [number, number, number, number, number, number] => {
  const origin = applyTransformChain([0, 0], entry.scopeChain);
  const xBasis = applyTransformChain([1, 0], entry.scopeChain);
  const yBasis = applyTransformChain([0, 1], entry.scopeChain);
  return Object.freeze([
    xBasis[0] - origin[0],
    xBasis[1] - origin[1],
    yBasis[0] - origin[0],
    yBasis[1] - origin[1],
    origin[0],
    origin[1],
  ]);
};

/** 按最终 occurrence 收集并提交一次 observed compile 的全部 owner output */
export const dispatchCompileObservations = (
  entries: ReadonlyArray<PendingCompileObservation>,
  runtime: CompileObservationRuntime | undefined,
  context: CompileContext,
): ReadonlyArray<CompileObserverOutput> => {
  if (runtime === undefined) return Object.freeze([]);

  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (left, right) =>
        compareCompileOccurrences(left.entry.occurrence, right.entry.occurrence) ||
        ownerKeyOf(left.entry).localeCompare(ownerKeyOf(right.entry)) ||
        left.index - right.index,
    );

  for (const { entry } of ordered) {
    const occurrence = freezeOccurrence(entry.occurrence);
    const observation: CompileObservation = Object.freeze({
      owner: entry.owner,
      occurrence,
      value: entry.value,
      transform: matrixOf(entry),
      provenance: Object.freeze({
        origin: freezeOccurrence(entry.origin),
        final: occurrence,
      }),
    });
    const observationContext: CompileObservationContext = Object.freeze({
      compileFragment: children => compileObservedFragment(entry, children, context),
    });
    runtime.dispatch(observation, entry.observerKeys, observationContext);
  }

  return runtime.complete();
};
