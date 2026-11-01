import type { JsonValue } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type {
  CompileOccurrenceLocator,
  CompositeBoundChild,
  CompositeCompileChild,
  CompositeCompileResult,
  CompositeContributionResult,
  LayoutContribution,
  LayoutMeasurementAxis,
} from '../../../contract';
import { CompileExpansionKind } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import { bindComposite, resolveComposite } from '../../../resolve';
import { guardProviderOutput } from '../../../resolve';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeErrorMessage,
  safeThrownDetail,
} from '../../../resolve/diagnostics';
import type { IRChild } from '../../../schemas';
import { cloneAndFreezeJson } from '../../../shared/json';
import { createCompileChildPath, formatCompileOccurrence, freezeCompileArtifact } from '../../artifact';
import { createCompileInvariantError } from '../../errors';
import type { CompileOwnerKey } from '../../provenance';
import { allocationPointsOf } from '../../scene';
import type { CompositeArtifact } from '../../types';
import { BuiltinCompileWarningCode } from '../../warning';
import { cloneAlignmentGuides } from '../alignment-guide';
import { pushAllocation } from '../allocation';
import type { CompileExecutionContext } from '../context';
import type { TreeCompileFrame } from '../frame';
import { createCompositeCallbackContext } from './context';
import { isCompositeOutputHandle, snapshotCompositeOutputChild } from './handle';
import { snapshotAllocationBounds } from './layout';
import { compileCompositeOutput } from './output';
import { preflightCompositeOutputs } from './preflight';
import type { CompositeProbeContext } from './probe';
import type { CompositeCompileHost, CompositeCompileOwner } from './types';

/** 复合组件执行策略及按需测量的根元素 */
export type CompositeCompilerOptions = {
  /** 当前子树首个元素，仅该元素允许返回测量贡献 */
  rootChild: IRChild | undefined;
  /** 是否在隔离试编译中执行 */
  probe?: boolean;
  /** 本次根组件的测量轴，省略时生成完整输出 */
  measurementAxis?: LayoutMeasurementAxis;
};

/** 执行复合组件、预检输出并提交选中的布局重放 */
export class CompositeCompiler {
  /** 根组件在按需测量模式下产生的分配贡献 */
  rootContribution: LayoutContribution | undefined;

  constructor(
    readonly context: CompileExecutionContext,
    readonly host: CompositeCompileHost,
    private readonly options: CompositeCompilerOptions,
  ) {}

  /** 执行组件回调并按声明顺序编译其最终输出 */
  compile(
    child: Extract<IRChild, { namespace: string }>,
    index: number,
    frame: TreeCompileFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    semanticOwner?: CompileOwnerKey,
  ): void {
    const compositeIrPath = createCompileChildPath(frame.locatorPrefix, index);
    const binding = bindComposite(child, this.context.shared.registries.compositeRegistry);
    const { key } = binding;
    if (binding.kind === 'unregistered') {
      if (this.options.probe === true) {
        throw createLayoutProbeRecoverableError(
          `No composite registered for '${key}' at ${formatCompileOccurrence(occurrence)}`,
          { providerKey: key, occurrence },
        );
      }

      this.context.workspace.diagnostics.collect({
        code: BuiltinCompileWarningCode.CompositeNotRegistered,
        message: `No composite registered for '${key}'; the node is skipped.`,
        path: compositeIrPath,
      });

      return;
    }

    if (compositeDepth >= this.context.shared.limits.maxCompositeDepth) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `COMPOSITE_NEST_TOO_DEEP: composite expansion exceeded ${this.context.shared.limits.maxCompositeDepth} levels at ${formatPropertyPath(occurrence.sourcePath)}`,
      );
    }

    const resolution = resolveComposite(binding, occurrence.sourcePath);
    const owner: CompositeCompileOwner = {
      label: `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`,
    };

    const probeContext: CompositeProbeContext = {
      context: this.context,
      owner,
      key,
      occurrence,
      compositeDepth,
      host: this.host,
    };
    const callable = resolution;
    let callbackResult: unknown;
    const callbackContext = createCompositeCallbackContext(
      child,
      frame,
      compositeIrPath,
      probeContext,
      this.options.measurementAxis !== undefined && child === this.options.rootChild
        ? { kind: 'contribution', axis: this.options.measurementAxis }
        : { kind: 'layout' },
    );

    try {
      callbackResult = callable.compile(callable.node, callbackContext.createContext(frame.theme));
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

    const handledContribution = guardProviderOutput(owner.label, () => {
      if (
        callbackResult !== null &&
        typeof callbackResult === 'object' &&
        'kind' in callbackResult &&
        callbackResult.kind === 'contribution'
      ) {
        if (this.options.measurementAxis === undefined || child !== this.options.rootChild)
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

    const validatedResult = guardProviderOutput(owner.label, () => {
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
          if (isCompositeOutputHandle(this.context, output)) return output;
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

    const outputFrame: TreeCompileFrame = {
      ...frame,
      runtimeInputs: undefined,
      alignmentGuideSink: [],
      ...(explicitAllocation === undefined ? {} : { allocationBoundary: {} }),
    };
    const preparedOutputs = preflightCompositeOutputs(this, children, owner);
    if (compositeArtifact !== undefined) frame.artifactSink.push(compositeArtifact);

    for (const [outputIndex, output] of children.entries()) {
      if (!isCompositeOutputHandle(this.context, output)) {
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
            : this.context.provenanceTracker?.createOwner(
                output,
                outputIndex,
                semanticOwner,
                true,
                this.context.namespaceStack.identity,
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
