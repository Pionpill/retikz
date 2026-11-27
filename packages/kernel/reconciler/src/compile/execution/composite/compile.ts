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
  createContractViolationError,
  createLayoutProbeRecoverableError,
  guardProviderOutput,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  resolveComposite,
  safeErrorMessage,
  safeThrownDetail,
} from '@retikz/core';
import type { JsonValue, PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import { createExecutionInvariantError } from '../../runtime';
import type { CompileRuntime, CompositeCompileOwner } from '../../runtime';
import type { CompositeArtifact } from '../../shared';
import { createCompileChildPath, formatCompileOccurrence, freezeCompileArtifact } from '../../shared';
import type { SubtreeCompileOptions, SubtreeCompileRuntime } from '../subtree';
import { createCompositeCallbackContext } from './context';
import { isCompositeOutputHandle, readCompositeChild } from './handle';
import { snapshotAlignmentGuides, snapshotAllocationBounds } from './layout';
import { compileCompositeOutput } from './output';
import { preflightCompositeOutputs } from './preflight';
import type { CompositeProbeContext } from './probe';
import type { CompositeExecutionContext, CompositeMemoSlot } from './types';

/** 当前组件的执行模式、测量轴及输出来源归属 */
type CompositeCompileOptions = Pick<SubtreeCompileOptions, 'probe' | 'measurementAxis'> & {
  /** 当前组件的语义来源 owner */
  semanticOwner?: CompileOwnerKey;
  memoSlot?: CompositeMemoSlot;
};

/**
 * 检查并快照组件回调返回的测量贡献或完整布局结果
 * @description 测量分支返回冻结的尺寸贡献；完整布局分支返回子项、显式布局信息和领域产物的快照，供后续预检与编译消费
 */
const snapshotCompositeCompileResult = (
  callbackResult: CompositeEvaluationResult<JsonValue, object>,
  definition: Pick<ReturnType<typeof resolveComposite>, 'artifactSchema' | 'namespace' | 'type'>,
  { runtime, owner, key, occurrence }: Pick<CompositeProbeContext, 'runtime' | 'owner' | 'key' | 'occurrence'>,
  measurementAxis?: LayoutMeasurementAxis,
) =>
  guardProviderOutput(owner.label, () => {
    /** 尺寸测量分支：只有贡献结果带 kind，检查请求模式、返回轴和有限非负尺寸后直接返回 */
    if ('kind' in callbackResult) {
      if (measurementAxis === undefined)
        throw createContractViolationError(`${owner.label} returned a contribution during full layout`);
      const { contribution } = callbackResult;
      if (contribution.axis !== measurementAxis)
        throw createContractViolationError(`${owner.label} returned a different contribution axis`);
      const dimensions =
        contribution.axis === 'x'
          ? [contribution.width]
          : contribution.axis === 'y'
            ? [contribution.height]
            : [contribution.width, contribution.height];
      if (dimensions.some(dimension => !Number.isFinite(dimension) || dimension < 0))
        throw createContractViolationError(`${owner.label} returned an invalid contribution size`);
      return { kind: 'contribution' as const, contribution: Object.freeze({ ...contribution }) };
    }

    const { children, allocationBounds, alignmentGuides, artifact } = callbackResult;

    /** 普通子项直接借用；未登记的句柄不能作为普通 IR 进入分派 */
    for (const [index, child] of children.entries()) {
      if (!isCompositeOutputHandle(runtime, child))
        readCompositeChild(owner.label, child, `output child at index ${index}`);
    }

    /** 布局信息快照：保留组件显式声明的占位边界和对齐线，供父级布局消费 */
    const explicitAllocation =
      allocationBounds === undefined ? undefined : snapshotAllocationBounds(allocationBounds, key, occurrence);
    const explicitAlignmentGuides =
      alignmentGuides === undefined
        ? undefined
        : snapshotAlignmentGuides(alignmentGuides, `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`);

    /** 领域产物快照：检查产物声明，复制并冻结 JSON 值，记录组件类型和来源位置 */
    let compositeArtifact: CompositeArtifact | undefined;
    if (artifact !== undefined) {
      if (definition.artifactSchema === undefined) {
        throw createContractViolationError(`Composite '${key}' returned artifact without artifactSchema.`);
      }

      let frozenArtifact: JsonValue;

      try {
        frozenArtifact = cloneAndFreezeJson(artifact, `Composite '${key}' artifact`);
      } catch (cause) {
        const detail = safeThrownDetail(cause);
        throw createContractViolationError(`${owner.label} returned a non-JSON artifact: ${detail}`, { cause });
      }

      compositeArtifact = freezeCompileArtifact({
        namespace: definition.namespace,
        type: definition.type,
        occurrence,
        value: frozenArtifact,
      });
    }

    /** 汇总完整布局结果，交给后续输出预检和编译阶段消费 */
    return {
      kind: 'layout' as const,
      children,
      explicitAllocation,
      explicitAlignmentGuides,
      compositeArtifact,
    };
  });

/** 查找并解析组件定义，未注册时告警跳过或终止当前隔离试算 */
const resolveCompositeCallable = (
  ir: Extract<IRChild, { namespace: string }>,
  irPath: PropertyPath,
  runtime: CompileRuntime,
  occurrence: CompileOccurrenceLocator,
  compositeDepth: number,
  probe?: boolean,
): ReturnType<typeof resolveComposite> | undefined => {
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
      path: irPath,
    });

    return;
  }

  /** 检查展开深度，并按定义的 schema 解析组件输入，交给同一定义的编译回调 */
  if (compositeDepth >= runtime.context.limits.maxCompositeDepth) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `COMPOSITE_NEST_TOO_DEEP: composite expansion exceeded ${runtime.context.limits.maxCompositeDepth} levels at ${formatPropertyPath(occurrence.sourcePath)}`,
    );
  }

  return resolveComposite(binding, occurrence.sourcePath);
};

/** 执行组件回调并生成返回值快照，统一包装回调异常 */
const evaluateCompositeCallback = (
  callable: ReturnType<typeof resolveComposite>,
  frame: SubtreeCompileRuntime,
  irPath: PropertyPath,
  context: CompositeProbeContext,
  measurementAxis?: LayoutMeasurementAxis,
  memoSlot?: CompositeMemoSlot,
) => {
  let callbackResult: CompositeEvaluationResult<JsonValue, object>;
  const callbackContext = createCompositeCallbackContext(
    callable.source,
    frame,
    irPath,
    context,
    measurementAxis === undefined ? { kind: 'layout' } : { kind: 'contribution', axis: measurementAxis },
  );

  /** 执行组件回调：包装外部异常 */
  try {
    callbackResult = callable.compile(callable.ir, callbackContext(frame.context.inheritance.theme), memoSlot?.memo);
    if (memoSlot && !('kind' in callbackResult)) memoSlot.memo = callbackResult.memo;
  } catch (thrown) {
    if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;

    throw createLayoutProbeRecoverableError(safeErrorMessage(thrown, 'Composite callback threw a non-Error value'), {
      cause: thrown,
      providerKey: context.key,
      occurrence: context.occurrence,
    });
  }

  /** 检查并快照返回值，供主流程区分测量与完整布局 */
  return snapshotCompositeCompileResult(callbackResult, callable, context, measurementAxis);
};

/** 编译完整布局快照的子项，并将组件产物、显式占位边界和对齐线汇入当前输出 */
const compileCompositeLayout = (
  result: Extract<ReturnType<typeof snapshotCompositeCompileResult>, { kind: 'layout' }>,
  frame: SubtreeCompileRuntime,
  context: CompositeExecutionContext & Pick<CompositeProbeContext, 'owner' | 'occurrence' | 'compositeDepth'>,
  semanticOwner?: CompileOwnerKey,
): void => {
  const { runtime, host, owner, occurrence, compositeDepth } = context;
  const { children, explicitAllocation, explicitAlignmentGuides, compositeArtifact } = result;

  /**
   * 准备输出环境：清除作者输入绑定，隔离子项对齐线；有显式占位边界时跳过子项占位累加，避免重复计入
   */
  const outputFrame: SubtreeCompileRuntime = {
    context: {
      ...frame.context,
      compositeInput: undefined,
      ...(explicitAllocation === undefined ? {} : { layout: { ...frame.context.layout, skipAllocation: true } }),
    },
    state: { ...frame.state, alignmentGuides: [] },
  };
  /** 写入组件产物前，统一检查输出句柄和 replay 凭证的归属、重复使用及裁剪信息 */
  const preparedOutputs = preflightCompositeOutputs(context, children, owner);
  if (compositeArtifact !== undefined) frame.state.artifacts.push(compositeArtifact);

  /** 按声明顺序处理子项：普通 IR 继续编译，运行时句柄交给绑定子项、生成 Scope 或 replay 分支 */
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

    const preparedOutput = preparedOutputs.outputs.get(output);
    if (preparedOutput === undefined) {
      throw createExecutionInvariantError('internal: composite output child was not preflighted');
    }

    compileCompositeOutput(
      context,
      preparedOutput.output,
      outputIndex,
      outputFrame,
      occurrence,
      occurrence,
      'output',
      compositeDepth + 1,
      owner,
      preparedOutputs,
      semanticOwner,
      preparedOutput.scopeClipPath,
    );
  }

  /** 子项输出完成后，将组件显式声明的占位边界和对齐线汇入父级布局 */
  if (explicitAllocation !== undefined) {
    frame.state.allocations.push({
      boundsPoints: allocationPointsOf(explicitAllocation),
      skipAllocation: frame.context.layout?.skipAllocation,
    });
  }

  if (explicitAlignmentGuides !== undefined) frame.state.alignmentGuides.push(...explicitAlignmentGuides);
};

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
  const irPath = createCompileChildPath(frame.context.pathPrefix, index);

  /** 未注册时普通编译已告警，当前组件到此结束；隔离试算的失败由解析阶段抛出 */
  const callable = resolveCompositeCallable(ir, irPath, runtime, occurrence, compositeDepth, probe);
  if (callable === undefined) return;

  /** 每次回调拥有独立身份，测量、布局试算和输出句柄共享这份归属上下文 */
  const { key } = callable;
  const owner: CompositeCompileOwner = {
    label: `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`,
  };
  const context = { runtime, host, owner, key, occurrence, compositeDepth };

  /** 尺寸贡献直接返回给测量方，完整布局结果继续编译子项或提交 replay */
  const result = evaluateCompositeCallback(callable, frame, irPath, context, measurementAxis, options.memoSlot);
  if (result.kind === 'contribution') return result.contribution;

  compileCompositeLayout(result, frame, context, semanticOwner);
};
