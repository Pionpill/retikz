import type {
  CompileOccurrenceLocator,
  CompositeReplay,
  CompositeReplayWrapper,
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
import { effectiveAllocations } from '../allocation';
import type { ScopeCompileFrame, ScopeOutputContribution } from '../types';
import type { CompositeExecutionContext, PreparedReplay } from './execution';
import { allocationPointsOf, replayOccurrence, replayStyleFingerprint, replayThemeFingerprint } from './layout';

/** 将选中试编译的全部贡献提交到当前输出帧 */
export const commitCompositeReplay = (
  execution: CompositeExecutionContext,
  token: CompositeReplay,
  wrapper: CompositeReplayWrapper | undefined,
  frame: ScopeCompileFrame,
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
    execution.context.workspace.paintRegistry,
    execution.context.workspace.clipRegistry,
  );

  const wrapperClipRef =
    wrapperClipPath === undefined ? undefined : execution.context.workspace.clipRegistry.importPath(wrapperClipPath);
  const replayedPrimitives = transaction.primitives.map(primitive => remapPrimitiveResources(primitive, resourceIds));
  if (semanticOwner !== undefined && execution.context.provenanceTracker !== undefined) {
    if (transaction.provenance === undefined) throw createCompileInvariantError('Missing replay provenance');
    execution.context.provenanceTracker.importProvenance(
      transaction.provenance,
      replayedPrimitives,
      semanticOwner,
      outputIndex,
      execution.context.namespaceStack.identity,
    );
  }
  const committedPrimitives = replayedPrimitives.map((primitive): ScenePrimitive => {
    const placed: ScenePrimitive =
      transforms === undefined || transforms.length === 0
        ? primitive
        : { type: 'group', transforms: [...transforms], children: [primitive] };
    return wrapperClipRef === undefined ? placed : { type: 'group', clipRef: wrapperClipRef, children: [placed] };
  });
  const contribution: ScopeOutputContribution = {
    primitives: committedPrimitives,
    primitiveZIndices: transaction.primitiveZIndices,
    publications: [],
    layouts: [],
    bounds: [],
    allocations: [],
    artifacts: [],
  };

  if (semanticOwner !== undefined) {
    execution.context.provenanceTracker?.recordPrimitives(committedPrimitives, semanticOwner, 'composite-replay');
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
    const committedAgainstBaseline = execution.context.withWarningOccurrence(
      replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, changeOccurrence),
      () => execution.context.namespaceStack.commitForkChange(projectedChange),
    );
    if (change.overwroteBaseline && !committedAgainstBaseline) {
      const baselineWarning = transaction.namespaceBaselineWarnings.find(candidate => candidate.id === change.id);
      if (baselineWarning !== undefined) suppressedNamespaceWarnings.add(baselineWarning.warning);
    }

    if (alreadyPublished === undefined) contribution.publications.push(projectedLayout);
    publishedLayouts.set(previousLayout, projectedLayout);
  }

  for (const layout of transaction.layouts) {
    contribution.layouts.push(
      transforms === undefined || transforms.length === 0
        ? layout
        : execution.context.scopeTransformComposer.project(layout, transforms),
    );
  }

  if (wrapperClipRef === undefined) {
    for (const bounds of transaction.bounds) {
      contribution.bounds.push({
        boundsPoints:
          transforms === undefined || transforms.length === 0
            ? bounds.boundsPoints
            : bounds.boundsPoints.map(point => execution.context.scopeTransformComposer.apply(point, transforms)),
        shadow: bounds.shadow,
        ...(bounds.decoration === undefined ? {} : { decoration: bounds.decoration }),
      });
    }
  } else {
    const visualBounds = optionalVisualBoundsOfPrimitives(committedPrimitives, [
      ...execution.context.workspace.paintRegistry.resources(),
      ...execution.context.workspace.clipRegistry.resources(),
    ]);
    if (visualBounds !== undefined)
      contribution.bounds.push({
        boundsPoints: allocationPointsOf(visualBounds),
        ...(transaction.bounds.some(bounds => bounds.decoration === true) ? { decoration: true } : {}),
      });
  }

  for (const allocation of effectiveAllocations(transaction.allocations)) {
    contribution.allocations.push({
      boundsPoints:
        transforms === undefined || transforms.length === 0
          ? allocation.boundsPoints
          : allocation.boundsPoints.map(point => execution.context.scopeTransformComposer.apply(point, transforms)),
    });
  }

  for (const warning of transaction.warnings) {
    if (!suppressedNamespaceWarnings.has(warning)) {
      execution.context.workspace.diagnostics.collect(
        replaceCompileWarningOccurrence(
          warning,
          replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, compileWarningOccurrenceOf(warning)),
        ),
      );
    }
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
