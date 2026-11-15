import type {
  CompileOccurrenceLocator,
  CompositeEvaluationResult,
  IRChild,
  LayoutContribution,
  LayoutMeasurementAxis,
} from '@retikz/core';
import {
  BuiltinCompileWarningCode,
  CompileExpansionKind,
  RetikzCoreError,
  RetikzCoreErrorCode,
  allocationPointsOf,
  bindComposite,
  cloneAndFreezeJson,
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  guardProviderOutput,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  resolveComposite,
  safeErrorMessage,
  safeThrownDetail,
} from '@retikz/core';
import type { JsonValue } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import { createExecutionInvariantError } from '../../runtime';
import type { CompositeCompileOwner } from '../../runtime';
import type { CompositeArtifact } from '../../shared';
import { createCompileChildPath, formatCompileOccurrence, freezeCompileArtifact } from '../../shared';
import type { SubtreeCompileOptions, SubtreeCompileRuntime } from '../subtree';
import { createCompositeCallbackContext } from './context';
import { isCompositeOutputHandle, snapshotCompositeOutputChild } from './handle';
import { snapshotAlignmentGuides, snapshotAllocationBounds } from './layout';
import { compileCompositeOutput } from './output';
import { preflightCompositeOutputs } from './preflight';
import type { CompositeProbeContext } from './probe';
import type { CompositeExecutionContext } from './types';

/** 当前组件的执行模式、测量轴及输出来源归属 */
type CompositeCompileOptions = Pick<SubtreeCompileOptions, 'probe' | 'measurementAxis'> & {
  /** 当前组件的语义来源 owner */
  semanticOwner?: CompileOwnerKey;
};

/** 检查并快照组件回调返回的测量贡献或完整布局结果 */
const snapshotCompositeCompileResult = (
  callbackResult: CompositeEvaluationResult<JsonValue>,
  definition: Pick<ReturnType<typeof resolveComposite>, 'artifactSchema' | 'namespace' | 'type'>,
  { runtime, owner, key, occurrence }: Pick<CompositeProbeContext, 'runtime' | 'owner' | 'key' | 'occurrence'>,
  measurementAxis?: LayoutMeasurementAxis,
) =>
  guardProviderOutput(owner.label, () => {
    if ('kind' in callbackResult) {
      if (measurementAxis === undefined)
        throw createCompositeContractError(`${owner.label} returned a contribution during full layout`);
      const { contribution } = callbackResult;
      if (contribution.axis !== measurementAxis)
        throw createCompositeContractError(`${owner.label} returned a different contribution axis`);
      const dimensions =
        contribution.axis === 'x'
          ? [contribution.width]
          : contribution.axis === 'y'
            ? [contribution.height]
            : [contribution.width, contribution.height];
      if (dimensions.some(dimension => !Number.isFinite(dimension) || dimension < 0))
        throw createCompositeContractError(`${owner.label} returned an invalid contribution size`);
      return { kind: 'contribution' as const, contribution: Object.freeze({ ...contribution }) };
    }

    const { children, allocationBounds, alignmentGuides, artifact } = callbackResult;
    const snapshotChildren = Array.from(children, (output, outputIndex) => {
      if (isCompositeOutputHandle(runtime, output)) return output;
      return snapshotCompositeOutputChild(owner.label, output, outputIndex);
    });

    const explicitAllocation =
      allocationBounds === undefined ? undefined : snapshotAllocationBounds(allocationBounds, key, occurrence);
    const explicitAlignmentGuides =
      alignmentGuides === undefined
        ? undefined
        : snapshotAlignmentGuides(alignmentGuides, `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`);

    let compositeArtifact: CompositeArtifact | undefined;
    if (artifact !== undefined) {
      if (definition.artifactSchema === undefined) {
        throw createCompositeContractError(`Composite '${key}' returned artifact without artifactSchema.`);
      }

      let frozenArtifact: JsonValue;

      try {
        frozenArtifact = cloneAndFreezeJson(artifact, `Composite '${key}' artifact`);
      } catch (cause) {
        const detail = safeThrownDetail(cause);
        throw createCompositeContractError(`${owner.label} returned a non-JSON artifact: ${detail}`, { cause });
      }

      compositeArtifact = freezeCompileArtifact({
        namespace: definition.namespace,
        type: definition.type,
        occurrence,
        value: frozenArtifact,
      });
    }

    return {
      kind: 'layout' as const,
      children: snapshotChildren,
      explicitAllocation,
      explicitAlignmentGuides,
      compositeArtifact,
    };
  });

/** 执行组件回调并提交预检后的输出，测量模式返回根组件的分配贡献 */
export const compileComposite = (
  execution: CompositeExecutionContext,
  ir: Extract<IRChild, { namespace: string }>,
  index: number,
  frame: SubtreeCompileRuntime,
  occurrence: CompileOccurrenceLocator,
  compositeDepth: number,
  options: CompositeCompileOptions = {},
): LayoutContribution | undefined => {
  const { runtime, host } = execution;
  const { probe, measurementAxis, semanticOwner } = options;
  const compositeIrPath = createCompileChildPath(frame.context.pathPrefix, index);
  const binding = bindComposite(ir, runtime.context.registries.compositeRegistry);
  const { key } = binding;
  if (binding.kind === 'unregistered') {
    if (probe === true) {
      throw createLayoutProbeRecoverableError(
        `No composite registered for '${key}' at ${formatCompileOccurrence(occurrence)}`,
        { providerKey: key, occurrence },
      );
    }

    runtime.state.workspace.diagnosticCollector.collect({
      code: BuiltinCompileWarningCode.CompositeNotRegistered,
      message: `No composite registered for '${key}'; the node is skipped.`,
      path: compositeIrPath,
    });

    return;
  }

  if (compositeDepth >= runtime.context.limits.maxCompositeDepth) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `COMPOSITE_NEST_TOO_DEEP: composite expansion exceeded ${runtime.context.limits.maxCompositeDepth} levels at ${formatPropertyPath(occurrence.sourcePath)}`,
    );
  }

  const callable = resolveComposite(binding, occurrence.sourcePath);
  const owner: CompositeCompileOwner = {
    label: `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`,
  };

  const probeContext: CompositeProbeContext = {
    runtime,
    owner,
    key,
    occurrence,
    compositeDepth,
    host,
  };
  let callbackResult: CompositeEvaluationResult<JsonValue>;
  const callbackContext = createCompositeCallbackContext(
    ir,
    frame,
    compositeIrPath,
    probeContext,
    measurementAxis === undefined ? { kind: 'layout' } : { kind: 'contribution', axis: measurementAxis },
  );

  try {
    callbackResult = callable.compile(callable.node, callbackContext.createContext(frame.context.inheritance.theme));
  } catch (thrown) {
    if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;

    throw createLayoutProbeRecoverableError(safeErrorMessage(thrown, 'Composite callback threw a non-Error value'), {
      cause: thrown,
      providerKey: key,
      occurrence,
    });
  } finally {
    callbackContext.dispose();
  }

  const result = snapshotCompositeCompileResult(callbackResult, callable, probeContext, measurementAxis);
  if (result.kind === 'contribution') return result.contribution;

  const { children, explicitAllocation, explicitAlignmentGuides, compositeArtifact } = result;

  const outputFrame: SubtreeCompileRuntime = {
    context: {
      ...frame.context,
      compositeInput: undefined,
      ...(explicitAllocation === undefined ? {} : { layout: { ...frame.context.layout, skipAllocation: true } }),
    },
    state: { ...frame.state, alignmentGuides: [] },
  };
  const preparedOutputs = preflightCompositeOutputs(execution, children, owner);
  if (compositeArtifact !== undefined) frame.state.artifacts.push(compositeArtifact);

  for (const [outputIndex, output] of children.entries()) {
    if (!isCompositeOutputHandle(runtime, output)) {
      const outputOccurrence: CompileOccurrenceLocator = {
        sourcePath: occurrence.sourcePath,
        expansionPath: [...occurrence.expansionPath, { kind: CompileExpansionKind.Output, index: outputIndex }],
      };
      host.compilePreparedChild(
        output,
        outputIndex,
        outputFrame,
        outputOccurrence,
        compositeDepth + 1,
        true,
        semanticOwner === undefined
          ? undefined
          : runtime.state.execution.provenanceTracker?.createOwner(
              output,
              outputIndex,
              semanticOwner,
              true,
              runtime.state.execution.namespaceStack.identity,
            ),
      );
      continue;
    }

    compileCompositeOutput(
      execution,
      preparedOutputs.outputs.get(output)?.output ??
        (() => {
          throw createExecutionInvariantError('internal: composite output child was not preflighted');
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
    frame.state.allocations.push({
      boundsPoints: allocationPointsOf(explicitAllocation),
      skipAllocation: frame.context.layout?.skipAllocation,
    });
  }

  if (explicitAlignmentGuides !== undefined) frame.state.alignmentGuides.push(...explicitAlignmentGuides);
};
