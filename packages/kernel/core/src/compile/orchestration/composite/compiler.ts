import type { JsonValue, PropertyPath } from '@retikz/foundation';
import { encodePropertyPath, formatPropertyPath } from '@retikz/foundation';

import type {
  CompileOccurrenceLocator,
  CompositeBoundChild,
  CompositeCompileChild,
  CompositeCompileContext,
  CompositeCompileResult,
  CompositeContributionResult,
  CompositeRuntimeInputContext,
  LayoutContribution,
  Transform,
} from '../../../contract';
import { CompileExpansionKind, LayoutChildProbeKind, naturalLayoutProposal } from '../../../contract';
import { captureCompositeInputScope, selectCompositeInputScope } from '../../../contract/composite';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import { bindComposite, resolveComposite, resolvePath as resolvePathValue, resolveTheme } from '../../../resolve';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeErrorMessage,
  safeThrownDetail,
} from '../../../resolve/diagnostics';
import type { IRChild, IRPosition, IRTarget } from '../../../schemas';
import { cloneAndFreezeJson } from '../../../shared/json';
import {
  createCompileChildPath,
  formatCompileOccurrence,
  freezeCompileArtifact,
  freezeOccurrence,
} from '../../artifact';
import { BuiltinCompileWarningCode } from '../../constants';
import type { NamespaceStack } from '../../namespace';
import {
  createCompileInvariantError,
  createLayoutChildFailure,
  raiseLayoutChildFailure,
  wrapLayoutProbeError,
} from '../../probe-failure';
import type { CompileOwnerKey } from '../../provenance';
import { bindPathTarget, createPositionResolveContext } from '../../reference';
import { withProviderOutputValidationBoundary } from '../../scene-primitive';
import type { createScopeTransformContext } from '../../transform';
import type { CompositeArtifact } from '../../types';
import { cloneAlignmentGuides } from '../alignment-guide';
import { pushAllocation } from '../allocation';
import { cloneLayoutProposal } from '../layout-proposal';
import type { compileChildrenToPrimitives, CompileTraversal } from '../traversal';
import type { TraversalCompileOptions, TraversalFrame, TraversalRuntime } from '../types';
import { isCompositeOutputHandle } from './execution';
import {
  createCompositeBoundChild,
  createCompositeReplayChild,
  createCompositeScopeChild,
  snapshotCompositeLayoutChild,
  snapshotCompositeOutputChild,
} from './handle';
import {
  allocationPointsOf,
  boundsRectOf,
  contributionOfBounds,
  projectContribution,
  snapshotAllocationBounds,
} from './layout';
import { compileCompositeOutput } from './output';
import { preflightCompositeOutputs } from './preflight';
import type { CompositeProbeContext } from './probe';
import { evaluateCompositeLayout, probeCompositeLayout } from './probe';
import type { CompositeCompileOwner, CompositeReplayMaterializeContext } from './types';

/** 执行复合组件、预检输出并提交选中的布局重放 */
export class CompositeCompiler {
  /** 根组件在按需测量模式下产生的分配贡献 */
  rootContribution: LayoutContribution | undefined;

  constructor(
    private readonly rootChildren: ReadonlyArray<IRChild>,
    private readonly options: TraversalCompileOptions,
    readonly runtime: TraversalRuntime,
    readonly scopeTransformsContext: ReturnType<typeof createScopeTransformContext>,
    readonly host: Pick<
      CompileTraversal,
      'withWarningOccurrence' | 'compileChild' | 'compileScopeChild' | 'resolveExplicitBoundary'
    >,
    private readonly compileChildren: typeof compileChildrenToPrimitives,
  ) {}

  /** 执行组件回调并按声明顺序编译其最终输出 */
  compile(
    child: Extract<IRChild, { namespace: string }>,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    semanticOwner?: CompileOwnerKey,
  ): void {
    const compositeIrPath = createCompileChildPath(frame.locatorPrefix, index);
    const binding = bindComposite(child, this.runtime.context.shared.registries.compositeRegistry);
    const { key } = binding;
    if (binding.kind === 'unregistered') {
      if (this.options.probe === true) {
        throw createLayoutProbeRecoverableError(
          `No composite registered for '${key}' at ${formatCompileOccurrence(occurrence)}`,
          { providerKey: key, occurrence },
        );
      }

      this.runtime.context.workspace.diagnostics.collect({
        code: BuiltinCompileWarningCode.CompositeNotRegistered,
        message: `No composite registered for '${key}'; the node is skipped.`,
        path: compositeIrPath,
      });

      return;
    }

    if (compositeDepth >= this.runtime.context.shared.limits.maxCompositeDepth) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `COMPOSITE_NEST_TOO_DEEP: composite expansion exceeded ${this.runtime.context.shared.limits.maxCompositeDepth} levels at ${formatPropertyPath(occurrence.sourcePath)}`,
      );
    }

    const resolution = resolveComposite(binding, occurrence.sourcePath);
    const owner: CompositeCompileOwner = {
      label: `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`,
    };

    const sourceInputs = frame.runtimeInputs ?? { source: child, bindings: [] };
    const authoredChildren = new Map<string, CompositeBoundChild>();
    const runtimeInputContext: CompositeRuntimeInputContext = Object.freeze({
      runtimeInput: sourceInputs.bindings.find(input => input.path.length === 0)?.input,
      selectSourceChild: path => {
        const pathKey = JSON.stringify(path);
        const existing = authoredChildren.get(pathKey);
        if (existing !== undefined) return existing;

        const selected = createCompositeBoundChild(
          this.runtime.context.session,
          owner,
          selectCompositeInputScope(sourceInputs, path),
        );
        authoredChildren.set(pathKey, selected);

        return selected;
      },
      bindChild: (nextChild, inputs) =>
        createCompositeBoundChild(this.runtime.context.session, owner, captureCompositeInputScope(nextChild, inputs)),
    });
    const probeContext: CompositeProbeContext = {
      shared: this.runtime.context.shared,
      runtime: this.runtime,
      owner,
      key,
      occurrence,
      compositeDepth,
      compileChildren: this.compileChildren,
    };
    const callable = resolution;
    let callbackResult: unknown;
    let layoutProbeIndex = 0;
    // 回调内只保留查询事实，不持有可消费的 replay 或目标解析游标
    const queryEnvironments = new Map<
      string,
      Readonly<{ namespaceStack: NamespaceStack; scopeChain: ReadonlyArray<Transform> }>
    >();
    let queryNamespaceIdentity = this.runtime.state.namespaceStack.measurementIdentity;

    try {
      const createLayoutContext = (theme: TraversalFrame['theme']): CompositeCompileContext => ({
        ...runtimeInputContext,
        theme,
        withTheme: override =>
          createLayoutContext(
            resolveTheme(
              theme,
              override,
              formatPropertyPath([...compositeIrPath, 'theme']),
              this.runtime.context.shared.registries.themeRegistry,
            ),
          ),
        proposal: cloneLayoutProposal(frame.childProposal ?? naturalLayoutProposal, key, occurrence),
        evaluation:
          this.options.measurementAxis !== undefined && child === this.rootChildren[0]
            ? { kind: 'contribution', axis: this.options.measurementAxis }
            : { kind: 'layout' },
        measureChild: (nextChild, proposal, axis) => {
          const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
          const inputEntry = this.runtime.context.session.outputChildren.get(nextChild);
          if (inputEntry !== undefined && (inputEntry.owner !== owner || inputEntry.child.kind !== 'bound'))
            throw createCompositeContractError(`${owner.label} measureChild requires a child from this callback`);
          const inputs = inputEntry?.child.kind === 'bound' ? inputEntry.child.runtimeInputs : undefined;
          const clonedChild = withProviderOutputValidationBoundary(owner.label, () =>
            snapshotCompositeLayoutChild(
              owner.label,
              inputEntry?.child.kind === 'bound' ? inputEntry.child.child : nextChild,
              layoutProbeIndex,
            ),
          );
          const probeOccurrence = freezeOccurrence({
            sourcePath: occurrence.sourcePath,
            expansionPath: [
              ...occurrence.expansionPath,
              { kind: CompileExpansionKind.Probe, index: layoutProbeIndex++ },
            ],
          });
          const cacheKey = JSON.stringify([
            this.runtime.context.session.identityOf(inputs?.source ?? nextChild),
            inputs === undefined ? this.runtime.context.session.identityOf(owner) : null,
            inputs?.sourcePath,
            clonedChild,
            axis,
            clonedProposal,
            frame.scopeDefaults,
            theme,
            frame.scopeChain,
            inputs?.bindings.map(input => [input.path, this.runtime.context.session.identityOf(input.input)]),
            this.runtime.context.session.identityOf(this.runtime.state.namespaceStack.measurementIdentity),
            compositeDepth,
          ]);
          const cached = this.runtime.context.session.getMeasurement(cacheKey);
          if (cached !== undefined) {
            return { kind: 'resolved', result: cached };
          }
          try {
            const { laid } = evaluateCompositeLayout(
              probeContext,
              clonedChild,
              clonedProposal,
              probeOccurrence,
              frame.scopeChain,
              frame.scopeDefaults,
              theme,
              false,
              inputs,
              undefined,
              axis,
            );
            const allocation = laid.contribution ?? contributionOfBounds(axis, boundsRectOf(laid));
            const result = projectContribution(allocation, clonedProposal);
            this.runtime.context.session.setMeasurement(cacheKey, result);
            return { kind: 'resolved', result };
          } catch (thrown) {
            if (isFatalProbeError(thrown)) throw thrown;
            const failure = createLayoutChildFailure(
              this.runtime.context.session.failures,
              owner,
              wrapLayoutProbeError(thrown),
              'namespace' in clonedChild ? `${clonedChild.namespace}.${clonedChild.type}` : clonedChild.type,
              probeOccurrence,
            );
            return { kind: 'failed', failure };
          }
        },
        resolvePathTargets: query => {
          const queryChild = snapshotCompositeLayoutChild(owner.label, query.child, layoutProbeIndex++);
          const namespaceIdentity = this.runtime.state.namespaceStack.measurementIdentity;
          if (queryNamespaceIdentity !== namespaceIdentity) {
            queryEnvironments.clear();
            queryNamespaceIdentity = namespaceIdentity;
          }
          // Definition、测量器、绑定所有者与递归预算在当前回调内固定；派生 theme 按值区分
          const queryKey = JSON.stringify([queryChild, theme, frame.scopeDefaults, frame.scopeChain]);
          let shared = queryEnvironments.get(queryKey);
          if (shared === undefined) {
            let queryNamespace: NamespaceStack | undefined;
            let queryChain = frame.scopeChain;
            const probe = probeCompositeLayout(
              probeContext,
              queryChild,
              naturalLayoutProposal,
              occurrence,
              frame.scopeChain,
              frame.scopeDefaults,
              theme,
              false,
              undefined,
              (scope, namespace, chain) => {
                if (scope !== queryChild) return;
                queryNamespace = namespace.fork();
                // 查询者位于被测子项之外；保留真正的祖先，但不把子项自身视为查询者的祖先
                if (scope.id !== undefined) queryNamespace.leaveScope();
                queryChain = chain;
              },
            );
            shared = { namespaceStack: queryNamespace ?? probe.namespaceStack, scopeChain: queryChain };
            queryEnvironments.set(queryKey, shared);
            if (queryEnvironments.size > 64) queryEnvironments.delete(queryEnvironments.keys().next().value!);
          } else {
            queryEnvironments.delete(queryKey);
            queryEnvironments.set(queryKey, shared);
          }
          // fork 隔离 resolving phase 与引用解析状态，缓存快照始终只读
          const targetNamespace = shared.namespaceStack.fork();
          const queryChain = shared.scopeChain;
          const positionContext = createPositionResolveContext({
            nodeBoundaryContext: this.runtime.context.workspace.nodeBoundaryContext,
            lookupReference: id => targetNamespace.lookupReference(id),
            nodeDistance: this.runtime.context.shared.layout.nodeDistance,
            scopeChain: queryChain,
            resolveExplicitBoundary: this.host.resolveExplicitBoundary,
          });
          targetNamespace.enterResolvingPhase();

          try {
            const bindingOf = (target: IRTarget) => {
              try {
                return bindPathTarget(target, positionContext);
              } catch (cause) {
                if (isFatalProbeError(cause)) throw cause;
                const pointIndex = query.points.indexOf(target);
                const field = target === query.source ? 'source' : `points[${pointIndex}]`;
                throw new RetikzCoreError({
                  code: RetikzCoreErrorCode.Compile,
                  message: `Path target query could not resolve ${field}.`,
                  details: { path: field },
                  cause,
                });
              }
            };

            const queryResolution = resolvePathValue(
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: query.source },
                  { type: 'step', kind: 'smooth', points: [...query.points] },
                ],
              },
              {
                mode: theme.mode,
                scopeChain: queryChain,
                targetResolver: {
                  pointOfTarget: target => bindingOf(target)?.point ?? null,
                  bindTarget: target => bindingOf(target),
                },
                pathRegistry: this.runtime.context.shared.registries.pathRegistry,
                arrowRegistry: this.runtime.context.shared.registries.arrowRegistry,
                markRegistry: this.runtime.context.shared.registries.markRegistry,
                patternRegistry: this.runtime.context.shared.registries.patternRegistry,
                round: this.runtime.context.shared.layout.round,
                irPath: ['query'],
              },
            );

            const pointAt = (locator: PropertyPath, field: string): IRPosition => {
              const point = queryResolution.targets.get(encodePropertyPath(locator))?.point;
              if (point === undefined || point === null || !point.every(Number.isFinite))
                throw new RetikzCoreError({
                  code: RetikzCoreErrorCode.Compile,
                  message: `Path target query could not resolve ${field}.`,
                  details: { path: field },
                });

              return [point[0], point[1]];
            };

            return {
              source: pointAt(['query', 'children', 0, 'to'], 'source'),
              points: query.points.map((_point, pointIndex) =>
                pointAt(['query', 'children', 1, 'points', pointIndex], `points[${pointIndex}]`),
              ),
            };
          } finally {
            targetNamespace.exitResolvingPhase();
          }
        },
        warn: (code, message, subPath) =>
          this.runtime.context.workspace.diagnostics.collect({
            code,
            message,
            path: subPath === undefined || subPath.length === 0 ? compositeIrPath : [...compositeIrPath, ...subPath],
          }),
        layoutChild: (nextChild, proposal) => {
          const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
          const inputEntry = this.runtime.context.session.outputChildren.get(nextChild);
          if (inputEntry !== undefined && (inputEntry.owner !== owner || inputEntry.child.kind !== 'bound'))
            throw createCompositeContractError(
              `${owner.label} layoutChild requires an authored or bound child from this callback`,
            );

          const probeInputs = inputEntry?.child.kind === 'bound' ? inputEntry.child.runtimeInputs : undefined;
          const clonedChild = withProviderOutputValidationBoundary(owner.label, () =>
            snapshotCompositeLayoutChild(
              owner.label,
              inputEntry?.child.kind === 'bound' ? inputEntry.child.child : nextChild,
              layoutProbeIndex,
            ),
          );
          const probeOccurrence = freezeOccurrence({
            sourcePath: occurrence.sourcePath,
            expansionPath: [...occurrence.expansionPath, { kind: CompileExpansionKind.Probe, index: layoutProbeIndex }],
          });
          layoutProbeIndex += 1;

          try {
            const probed = probeCompositeLayout(
              probeContext,
              clonedChild,
              clonedProposal,
              probeOccurrence,
              frame.scopeChain,
              frame.scopeDefaults,
              theme,
              false,
              probeInputs,
            );
            const { layoutResult, transaction } = probed;
            transaction.materialize = ({
              scopeChain,
              scopeDefaults,
              theme: replayTheme,
            }: CompositeReplayMaterializeContext) =>
              probeCompositeLayout(
                probeContext,
                clonedChild,
                clonedProposal,
                probeOccurrence,
                scopeChain,
                scopeDefaults,
                replayTheme,
                true,
                probeInputs,
              ).transaction;
            this.runtime.context.session.replayTransactions.set(layoutResult.replay, transaction);
            this.runtime.context.session.layoutResults.set(layoutResult, { owner, replay: layoutResult.replay });

            return Object.freeze({ kind: LayoutChildProbeKind.Resolved, result: layoutResult });
          } catch (thrown) {
            if (isFatalProbeError(thrown)) throw thrown;

            const error = wrapLayoutProbeError(thrown);
            const fallbackProviderKey =
              'namespace' in clonedChild ? `${clonedChild.namespace}.${clonedChild.type}` : clonedChild.type;
            const failure = createLayoutChildFailure(
              this.runtime.context.session.failures,
              owner,
              error,
              fallbackProviderKey,
              probeOccurrence,
            );

            return Object.freeze({ kind: LayoutChildProbeKind.Failed, failure });
          }
        },
        replay: (layoutResult, wrapper) =>
          createCompositeReplayChild(this.runtime.context.session, owner, layoutResult, wrapper),
        raise: failure => raiseLayoutChildFailure(this.runtime.context.session.failures, owner, failure),
        createScope: (props, children) =>
          createCompositeScopeChild(this.runtime.context.session, owner, props, children),
      });

      callbackResult = callable.compile(callable.node, createLayoutContext(frame.theme));
    } catch (thrown) {
      if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;

      throw createLayoutProbeRecoverableError(safeErrorMessage(thrown, 'Composite callback threw a non-Error value'), {
        cause: thrown,
        providerKey: key,
        occurrence,
      });
    } finally {
      queryEnvironments.clear();
    }

    const handledContribution = withProviderOutputValidationBoundary(owner.label, () => {
      if (
        callbackResult !== null &&
        typeof callbackResult === 'object' &&
        'kind' in callbackResult &&
        callbackResult.kind === 'contribution'
      ) {
        if (this.options.measurementAxis === undefined || child !== this.rootChildren[0])
          throw createCompositeContractError(`${owner.label} returned a contribution during full layout`);
        const candidate = callbackResult as CompositeContributionResult;
        const contribution = candidate.contribution;
        if (contribution.axis !== this.options.measurementAxis)
          throw createCompositeContractError(`${owner.label} returned a different contribution axis`);
        const dimensions =
          contribution.axis === 'x'
            ? [contribution.width]
            : contribution.axis === 'y'
              ? [contribution.height]
              : [contribution.width, contribution.height];
        if (dimensions.some(dimension => !Number.isFinite(dimension) || dimension < 0))
          throw createCompositeContractError(`${owner.label} returned an invalid contribution size`);
        this.rootContribution = Object.freeze({ ...contribution });
        return true;
      }

      return false;
    });
    if (handledContribution) return;

    const validatedResult = withProviderOutputValidationBoundary(owner.label, () => {
      if (
        callbackResult === null ||
        typeof callbackResult !== 'object' ||
        Array.isArray(callbackResult) ||
        !('children' in callbackResult)
      ) {
        throw createCompositeContractError(
          `${owner.label} returned an invalid compile result; children must be an array.`,
        );
      }

      const result = callbackResult as CompositeCompileResult<JsonValue>;
      const resultChildren = result.children;
      const resultAllocationBounds = result.allocationBounds;
      const resultAlignmentGuides = result.alignmentGuides;
      const resultArtifact = result.artifact;
      if (!Array.isArray(resultChildren)) {
        throw createCompositeContractError(
          `${owner.label} returned an invalid compile result; children must be an array.`,
        );
      }

      const children = Array.from(
        resultChildren,
        (output, outputIndex): IRChild | CompositeCompileChild | CompositeBoundChild => {
          if (isCompositeOutputHandle(this.runtime, output)) return output;
          return snapshotCompositeOutputChild(owner.label, output, outputIndex);
        },
      );

      const explicitAllocation =
        resultAllocationBounds === undefined
          ? undefined
          : snapshotAllocationBounds(resultAllocationBounds, key, occurrence);
      const explicitAlignmentGuides =
        resultAlignmentGuides === undefined
          ? undefined
          : cloneAlignmentGuides(resultAlignmentGuides, `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`);

      let compositeArtifact: CompositeArtifact | undefined;
      if (resultArtifact !== undefined) {
        if (callable.artifactSchema === undefined) {
          throw createCompositeContractError(`Composite '${key}' returned artifact without artifactSchema.`);
        }

        let frozenArtifact: JsonValue;

        try {
          frozenArtifact = cloneAndFreezeJson(resultArtifact, `Composite '${key}' artifact`);
        } catch (cause) {
          const detail = safeThrownDetail(cause);
          throw createCompositeContractError(`${owner.label} returned a non-JSON artifact: ${detail}`, { cause });
        }

        compositeArtifact = freezeCompileArtifact({
          namespace: callable.namespace,
          type: callable.type,
          occurrence,
          value: frozenArtifact,
        });
      }

      return { children, explicitAllocation, explicitAlignmentGuides, compositeArtifact };
    });

    const { children, explicitAllocation, explicitAlignmentGuides, compositeArtifact } = validatedResult;

    const outputFrame: TraversalFrame = {
      ...frame,
      runtimeInputs: undefined,
      alignmentGuideSink: [],
      ...(explicitAllocation === undefined ? {} : { allocationBoundary: {} }),
    };
    const preparedOutputs = preflightCompositeOutputs(this, children, owner);
    if (compositeArtifact !== undefined) frame.artifactSink.push(compositeArtifact);

    for (const [outputIndex, output] of children.entries()) {
      if (!isCompositeOutputHandle(this.runtime, output)) {
        const outputOccurrence: CompileOccurrenceLocator = {
          sourcePath: occurrence.sourcePath,
          expansionPath: [...occurrence.expansionPath, { kind: CompileExpansionKind.Output, index: outputIndex }],
        };
        this.host.compileChild(
          output,
          outputIndex,
          outputFrame,
          outputOccurrence,
          compositeDepth + 1,
          true,
          semanticOwner === undefined
            ? undefined
            : this.runtime.state.provenanceTracker?.createOwner(
                output,
                outputIndex,
                semanticOwner,
                true,
                this.runtime.state.namespaceStack.identity,
              ),
        );
        continue;
      }

      compileCompositeOutput(
        this,
        preparedOutputs.outputs.get(output)?.output ??
          (() => {
            throw createCompileInvariantError('internal: composite output child was not preflighted');
          })(),
        outputIndex,
        outputFrame,
        occurrence,
        occurrence,
        'output',
        compositeDepth + 1,
        owner,
        preparedOutputs,
        semanticOwner,
        preparedOutputs.outputs.get(output)?.scopeClipPath,
      );
    }

    if (explicitAllocation !== undefined) {
      pushAllocation(frame.allocationSink, allocationPointsOf(explicitAllocation), frame.allocationBoundary);
    }

    if (explicitAlignmentGuides !== undefined) frame.alignmentGuideSink.push(...explicitAlignmentGuides);
  }
}
