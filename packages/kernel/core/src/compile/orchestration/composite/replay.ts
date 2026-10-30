import type {
  CompileOccurrenceLocator,
  CompositeReplay,
  CompositeReplayWrapper,
  GroupPrimitive,
  ScenePrimitive,
  Transform,
} from '../../../contract';
import { freezeCompileArtifact } from '../../artifact';
import { compileWarningOccurrenceOf, replaceCompileWarningOccurrence } from '../../diagnostics';
import type { CompiledNodeLayout } from '../../node';
import { createCompileInvariantError } from '../../probe-failure';
import type { CompileOwnerKey } from '../../provenance';
import { projectPublishedCompileLayout } from '../../reference';
import { importSceneResources, remapPrimitiveResources } from '../../resource';
import { optionalVisualBoundsOfPrimitives } from '../../scene';
import type { InputCompileWarning } from '../../warning';
import { effectiveAllocations, pushAllocation } from '../allocation';
import { recordPrimitiveZIndex } from '../primitive';
import type { TraversalFrame } from '../types';
import type { CompositeExecutionContext, PreparedReplay } from './execution';
import { allocationPointsOf, replayOccurrence, replayStyleFingerprint, replayThemeFingerprint } from './layout';

/** 将选中试编译的全部贡献提交到当前输出帧 */
export const commitCompositeReplay = (
  context: CompositeExecutionContext,
  token: CompositeReplay,
  wrapper: CompositeReplayWrapper | undefined,
  frame: TraversalFrame,
  occurrence: CompileOccurrenceLocator,
  outputIndex: number,
  preparedReplays: ReadonlyMap<CompositeReplay, PreparedReplay>,
  semanticOwner?: CompileOwnerKey,
  authoredPreliminaryTransforms?: ReadonlyArray<Transform>,
): void => {
  const prepared = preparedReplays.get(token);
  if (prepared === undefined) throw createCompileInvariantError('internal: replay was not preflighted before commit');

  const { wrapperClipPath } = prepared;
  const transaction =
    prepared.transaction.materialize !== undefined &&
    (prepared.transaction.styleFingerprint !== replayStyleFingerprint(frame.scopeDefaults) ||
      prepared.transaction.themeFingerprint !== replayThemeFingerprint(frame.theme))
      ? prepared.transaction.materialize({
          scopeChain: frame.scopeChain,
          scopeDefaults: frame.scopeDefaults,
          theme: frame.theme,
        })
      : prepared.transaction;

  const transforms = wrapper?.transforms;
  const authoredPreliminary = transaction.scopeChainApplied ? undefined : authoredPreliminaryTransforms;
  const resourceIds = importSceneResources(
    transaction.resources,
    context.runtime.context.workspace.paintRegistry,
    context.runtime.context.workspace.clipRegistry,
  );

  const wrapperClipRef =
    wrapperClipPath === undefined
      ? undefined
      : context.runtime.context.workspace.clipRegistry.importPath(wrapperClipPath);
  const replayedPrimitives = transaction.primitives.map(primitive => remapPrimitiveResources(primitive, resourceIds));
  if (semanticOwner !== undefined && context.runtime.state.provenanceTracker !== undefined) {
    if (transaction.provenance === undefined) throw createCompileInvariantError('Missing replay provenance');
    context.runtime.state.provenanceTracker.importProvenance(
      transaction.provenance,
      replayedPrimitives,
      semanticOwner,
      outputIndex,
      context.runtime.state.namespaceStack.identity,
    );
  }
  const committedPrimitives: Array<ScenePrimitive> = [];
  if ((transforms === undefined || transforms.length === 0) && wrapperClipRef === undefined) {
    replayedPrimitives.forEach((primitive, index) => {
      frame.primitiveSink.push(primitive);
      committedPrimitives.push(primitive);
      recordPrimitiveZIndex(context.runtime.state.zIndexOf, primitive, transaction.primitiveZIndices[index]);
    });
  } else {
    replayedPrimitives.forEach((primitive, index) => {
      const placed: ScenePrimitive =
        transforms === undefined || transforms.length === 0
          ? primitive
          : { type: 'group', transforms: [...transforms], children: [primitive] };
      const wrapped: GroupPrimitive =
        wrapperClipRef === undefined
          ? (placed as GroupPrimitive)
          : { type: 'group', clipRef: wrapperClipRef, children: [placed] };
      frame.primitiveSink.push(wrapped);
      committedPrimitives.push(wrapped);
      recordPrimitiveZIndex(context.runtime.state.zIndexOf, wrapped, transaction.primitiveZIndices[index]);
    });
  }

  if (semanticOwner !== undefined) {
    context.runtime.state.provenanceTracker?.recordPrimitives(committedPrimitives, semanticOwner, 'composite-replay');
  }

  const suppressedNamespaceWarnings = new Set<InputCompileWarning>();
  const namespaceParentChain =
    authoredPreliminary === undefined
      ? frame.scopeChain
      : frame.scopeChain.slice(0, frame.scopeChain.length - authoredPreliminary.length);
  const namespaceTransforms = [...(authoredPreliminary ?? []), ...(transforms ?? [])];
  const publishedLayouts = new Map<CompiledNodeLayout, CompiledNodeLayout>();

  for (const [changeIndex, change] of transaction.namespaceChanges.entries()) {
    const previousLayout = change.entry.layout;
    const alreadyPublished = publishedLayouts.get(previousLayout);
    const projectedLayout =
      alreadyPublished ?? projectPublishedCompileLayout(previousLayout, namespaceParentChain, namespaceTransforms);
    const projectedChange = { ...change, entry: { ...change.entry, layout: projectedLayout } };

    const changeOccurrence = transaction.namespaceChangeOccurrences[changeIndex] ?? occurrence;
    const committedAgainstBaseline = context.host.withWarningOccurrence(
      replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, changeOccurrence),
      () => context.runtime.state.namespaceStack.commitForkChange(projectedChange),
    );
    if (change.overwroteBaseline && !committedAgainstBaseline) {
      const baselineWarning = transaction.namespaceBaselineWarnings.find(candidate => candidate.id === change.id);
      if (baselineWarning !== undefined) suppressedNamespaceWarnings.add(baselineWarning.warning);
    }

    if (alreadyPublished === undefined) frame.publicationSink.push(projectedLayout);
    publishedLayouts.set(previousLayout, projectedLayout);
  }

  for (const layout of transaction.layouts) {
    frame.layoutSink.push(
      transforms === undefined || transforms.length === 0
        ? layout
        : context.scopeTransformsContext.project(layout, transforms),
    );
  }

  if (wrapperClipRef === undefined) {
    for (const contribution of transaction.bounds) {
      frame.boundsSink.push({
        boundsPoints:
          transforms === undefined || transforms.length === 0
            ? contribution.boundsPoints
            : contribution.boundsPoints.map(point => context.scopeTransformsContext.apply(point, transforms)),
        shadow: contribution.shadow,
        ...(contribution.decoration === undefined ? {} : { decoration: contribution.decoration }),
      });
    }
  } else {
    const visualBounds = optionalVisualBoundsOfPrimitives(committedPrimitives, [
      ...context.runtime.context.workspace.paintRegistry.resources(),
      ...context.runtime.context.workspace.clipRegistry.resources(),
    ]);
    if (visualBounds !== undefined)
      frame.boundsSink.push({
        boundsPoints: allocationPointsOf(visualBounds),
        ...(transaction.bounds.some(contribution => contribution.decoration === true) ? { decoration: true } : {}),
      });
  }

  for (const contribution of effectiveAllocations(transaction.allocations)) {
    pushAllocation(
      frame.allocationSink,
      transforms === undefined || transforms.length === 0
        ? contribution.boundsPoints
        : contribution.boundsPoints.map(point => context.scopeTransformsContext.apply(point, transforms)),
      frame.allocationBoundary,
    );
  }

  for (const warning of transaction.warnings) {
    if (!suppressedNamespaceWarnings.has(warning)) {
      context.runtime.context.workspace.diagnostics.collect(
        replaceCompileWarningOccurrence(
          warning,
          replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, compileWarningOccurrenceOf(warning)),
        ),
      );
    }
  }

  for (const artifact of transaction.artifacts) {
    frame.artifactSink.push(
      freezeCompileArtifact({
        ...artifact,
        occurrence: replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, artifact.occurrence),
      }),
    );
  }
};
