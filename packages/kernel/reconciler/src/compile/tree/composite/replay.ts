import type {
  CompileOccurrenceLocator,
  CompiledReferenceGeometry,
  CompositeReplay,
  CompositeReplayWrapper,
  ScenePrimitive,
  Transform,
} from '@retikz/core';
import {
  CompileExpansionKind,
  allocationPointsOf,
  calculateBoundsOfPrimitives,
  projectReferenceGeometry,
  projectPublishedReference,
} from '@retikz/core';

import type { CompileOwnerKey } from '../../provenance';
import { importSceneResources } from '../../resource';
import { createExecutionInvariantError } from '../../runtime';
import { compileWarningOccurrenceOf, freezeCompileArtifact, replaceCompileWarningOccurrence } from '../../shared';
import type { SubtreeCompileRuntime } from '../runtime';
import type { SubtreeOutputContribution } from '../types';
import type { CompositeExecutionContext, PreparedReplay } from './types';

/** 将选中试编译的全部贡献提交到当前输出帧 */
export const commitCompositeReplay = (
  execution: CompositeExecutionContext,
  token: CompositeReplay,
  wrapper: CompositeReplayWrapper | undefined,
  frame: SubtreeCompileRuntime,
  occurrence: CompileOccurrenceLocator,
  outputIndex: number,
  preparedReplays: ReadonlyMap<CompositeReplay, PreparedReplay>,
  semanticOwner?: CompileOwnerKey,
  authoredPreliminaryTransforms?: ReadonlyArray<Transform>,
): void => {
  const prepared = preparedReplays.get(token);
  if (prepared === undefined) throw createExecutionInvariantError('internal: replay was not preflighted before commit');

  const { wrapperClipPath, transaction: preparedTransaction } = prepared;
  const transaction =
    preparedTransaction.materialize !== undefined &&
    (preparedTransaction.styleFingerprint !== replayStyleFingerprint(frame.context.inheritance.defaults) ||
      preparedTransaction.themeFingerprint !== replayThemeFingerprint(frame.context.inheritance.theme))
      ? preparedTransaction.materialize({
          scopeChain: frame.context.transformChains,
          scopeDefaults: frame.context.inheritance.defaults,
          theme: frame.context.inheritance.theme,
        })
      : preparedTransaction;

  const transforms = wrapper?.transforms;
  const authoredPreliminary = transaction.scopeChainApplied ? undefined : authoredPreliminaryTransforms;
  importSceneResources(
    transaction.resources,
    execution.runtime.state.workspace.paintRegistry,
    execution.runtime.state.workspace.clipRegistry,
  );

  const wrapperClipRef =
    wrapperClipPath === undefined
      ? undefined
      : execution.runtime.state.workspace.clipRegistry.registerPath(wrapperClipPath);
  const replayedPrimitives =
    execution.runtime.state.execution.provenanceTracker?.materializePrimitives(transaction.primitives) ??
    transaction.primitives;
  if (semanticOwner !== undefined && execution.runtime.state.execution.provenanceTracker !== undefined) {
    if (transaction.provenance === undefined) throw createExecutionInvariantError('Missing replay provenance');
    execution.runtime.state.execution.provenanceTracker.importProvenance(
      transaction.provenance,
      replayedPrimitives,
      semanticOwner,
      outputIndex,
      execution.runtime.state.execution.namespaceStack.identity,
    );
  }
  const committedPrimitives = replayedPrimitives.map((primitive): ScenePrimitive => {
    const placed: ScenePrimitive =
      transforms === undefined || transforms.length === 0
        ? primitive
        : { type: 'group', transforms: [...transforms], children: [primitive] };
    return wrapperClipRef === undefined ? placed : { type: 'group', clipRef: wrapperClipRef, children: [placed] };
  });
  const contribution: SubtreeOutputContribution = {
    primitives: committedPrimitives,
    primitiveZIndices: transaction.primitiveZIndices,
    publications: [],
    geometries: [],
    bounds: [],
    allocations: [],
    artifacts: [],
  };

  if (semanticOwner !== undefined) {
    execution.runtime.state.execution.provenanceTracker?.recordPrimitives(
      committedPrimitives,
      semanticOwner,
      'composite-replay',
    );
  }

  const namespaceParentChain =
    authoredPreliminary === undefined
      ? frame.context.transformChains
      : frame.context.transformChains.slice(0, frame.context.transformChains.length - authoredPreliminary.length);
  const namespaceTransforms = [...(authoredPreliminary ?? []), ...(transforms ?? [])];
  const publishedLayouts = new Map<CompiledReferenceGeometry, CompiledReferenceGeometry>();

  for (const [changeIndex, change] of transaction.namespaceChanges.entries()) {
    const previousLayout = change.entry.geometry;
    const alreadyPublished = publishedLayouts.get(previousLayout);
    const projectedLayout =
      alreadyPublished ?? projectPublishedReference(previousLayout, namespaceParentChain, namespaceTransforms);
    const projectedChange = { ...change, entry: { ...change.entry, geometry: projectedLayout } };

    const changeOccurrence = transaction.namespaceChangeOccurrences[changeIndex] ?? occurrence;
    execution.runtime.state.execution.withWarningOccurrence(
      replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, changeOccurrence),
      () => execution.runtime.state.execution.namespaceStack.commitForkChange(projectedChange),
    );

    if (alreadyPublished === undefined) contribution.publications.push(projectedLayout);
    publishedLayouts.set(previousLayout, projectedLayout);
  }

  for (const layout of transaction.geometries) {
    contribution.geometries.push(
      transforms === undefined || transforms.length === 0
        ? layout
        : projectReferenceGeometry(
            layout,
            execution.runtime.state.execution.scopeTransformComposer.resolve(transforms),
          ),
    );
  }

  if (wrapperClipRef === undefined) {
    for (const bounds of transaction.bounds) {
      contribution.bounds.push({
        boundsPoints:
          transforms === undefined || transforms.length === 0
            ? bounds.boundsPoints
            : bounds.boundsPoints.map(point =>
                execution.runtime.state.execution.scopeTransformComposer.apply(point, transforms),
              ),
        shadow: bounds.shadow,
        ...(bounds.decoration === undefined ? {} : { decoration: bounds.decoration }),
      });
    }
  } else {
    const visualBounds = calculateBoundsOfPrimitives(committedPrimitives, [
      ...execution.runtime.state.workspace.paintRegistry.getResources(),
      ...execution.runtime.state.workspace.clipRegistry.getResources(),
    ]);
    if (visualBounds !== undefined)
      contribution.bounds.push({
        boundsPoints: allocationPointsOf(visualBounds),
        ...(transaction.bounds.some(bounds => bounds.decoration === true) ? { decoration: true } : {}),
      });
  }

  for (const allocation of transaction.allocations) {
    if (allocation.skipAllocation === true) continue;
    contribution.allocations.push({
      boundsPoints:
        transforms === undefined || transforms.length === 0
          ? allocation.boundsPoints
          : allocation.boundsPoints.map(point =>
              execution.runtime.state.execution.scopeTransformComposer.apply(point, transforms),
            ),
    });
  }

  for (const warning of transaction.warnings) {
    execution.runtime.state.workspace.diagnosticCollector.collect(
      replaceCompileWarningOccurrence(
        warning,
        replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, compileWarningOccurrenceOf(warning)),
      ),
    );
  }

  for (const artifact of transaction.artifacts) {
    contribution.artifacts.push(
      freezeCompileArtifact({
        ...artifact,
        occurrence: replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, artifact.occurrence),
      }),
    );
  }
  execution.host.acceptContribution(frame, contribution);
};

/** 按有效默认配置判断 replay 是否需要重新物化 */
export const replayStyleFingerprint = (
  scopeDefaults: SubtreeCompileRuntime['context']['inheritance']['defaults'],
): string => JSON.stringify(scopeDefaults);

/** 对 resolved Theme 做 compile-local 稳定比较 */
export const replayThemeFingerprint = (theme: SubtreeCompileRuntime['context']['inheritance']['theme']): string =>
  JSON.stringify(theme);

/** 将试编译内的出现位置重定位到最终重放位置，保留内部展开后缀 */
const replayOccurrence = (
  parent: CompileOccurrenceLocator,
  index: number,
  origin: CompileOccurrenceLocator,
  child: CompileOccurrenceLocator,
): CompileOccurrenceLocator => {
  return {
    sourcePath: parent.sourcePath,
    expansionPath: [
      ...parent.expansionPath,
      { kind: CompileExpansionKind.Replay, index },
      ...child.expansionPath.slice(origin.expansionPath.length),
    ],
  };
};
