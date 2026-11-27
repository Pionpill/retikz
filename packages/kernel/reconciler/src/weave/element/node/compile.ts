import { compileNode, evaluatePosition, evaluatePositionTargetWorld, resolveNode } from '@retikz/core';
import type { CanonicalNode, NodeCompileContext, CompiledNode, IRNode } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import type { CompileRuntime, SubtreeCompileContext } from '../../../compile';
import { createNodeCompileContext, createNodeResolveContext } from '../../../compile';
import {
  compareTextBlocks,
  createWeaveObservation,
  matchWeaveReferences,
  restoreWeaveResources,
  retainWeaveReads,
} from '../../shared';
import type { WeaveStages, WeaveNodeState, WeaveReferenceRead } from '../../shared';
import {
  compareCanonicalNodes,
  compareNodeLayoutInputs,
  compareNodeMeasurementInputs,
  retainCanonicalNode,
} from './compare';

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
          measurement: compareTextBlocks(previous.canon.labels[index]?.text, label.text)
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

/** 按输入、编译上下文与引用依赖复用节点产物，变化时保留有效的局部布局 */
export const executeWeaveNode = (
  runtime: CompileRuntime,
  child: IRNode,
  path: PropertyPath,
  context: SubtreeCompileContext,
  previous?: WeaveStages<WeaveNodeState>,
): {
  resolve: NonNullable<WeaveNodeState['resolve']>;
  compile: NonNullable<WeaveNodeState['compile']>;
  referenceReads: ReadonlyArray<WeaveReferenceRead>;
  reused: boolean;
} => {
  // child 来自不可变编辑输入；默认配置只取 Node 通道，registry 与根配置由会话保证稳定
  const resolveInputs = {
    child,
    nodeDefaults: context.inheritance.defaults.node,
    mode: context.inheritance.theme.mode,
  };
  const compileInputs = { scopeChain: context.transformChains, proposal: context.layout?.childProposal };
  const previousCompile = previous?.compile;
  const previousReads = previous?.referenceReads ?? [];
  const priorResolve = previous?.resolve;
  const before = priorResolve?.value;
  let observation: ReturnType<typeof createWeaveObservation> | undefined;
  let canon = before;

  // 1. 未命中解析阶段时才创建资源与诊断收集器
  if (
    priorResolve?.value == null ||
    previousCompile?.diagnostics.length !== 0 ||
    priorResolve.context.mode !== resolveInputs.mode ||
    !jsonStructuralEquals(priorResolve.context.nodeDefaults, resolveInputs.nodeDefaults) ||
    !jsonStructuralEquals(priorResolve.input, resolveInputs.child)
  ) {
    observation = createWeaveObservation(runtime);
    canon = retainCanonicalNode(
      before,
      resolveNode(child, createNodeResolveContext(observation.runtime, path, context)),
    );
  } else {
    canon = priorResolve.value;
  }

  // 2. 核对引用、编译上下文与解析结果，并要求新旧诊断均允许整体复用
  const referencesValid =
    previousCompile !== undefined && matchWeaveReferences(previousReads, runtime.state.execution.namespaceStack);
  const canRetain =
    previousCompile?.diagnostics.length === 0 &&
    jsonStructuralEquals(previousCompile.context.scopeChain, compileInputs.scopeChain) &&
    jsonStructuralEquals(previousCompile.context.proposal, compileInputs.proposal);
  if (
    before != null &&
    previous?.compile?.value != null &&
    canRetain &&
    referencesValid &&
    !observation?.diagnostics.length &&
    compareCanonicalNodes(before, canon)
  ) {
    restoreWeaveResources(runtime, previousCompile.resources);
    return {
      resolve: {
        input: child,
        context: { nodeDefaults: resolveInputs.nodeDefaults, mode: resolveInputs.mode },
        value: canon,
      },
      compile: { ...previousCompile, context: compileInputs },
      referenceReads: previousReads,
      reused: true,
    };
  }

  observation ??= createWeaveObservation(runtime);
  // 3. 整体不能复用时，选择仍有效的测量或布局产物参与重新编译
  const reusable =
    before != null &&
    previousCompile?.value != null &&
    previousCompile.diagnostics.length === 0 &&
    jsonStructuralEquals(previousCompile.context.proposal, compileInputs.proposal)
      ? { canon: before, compiled: previousCompile.value }
      : undefined;
  const compiled = runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
    compileWeaveNode(
      canon,
      createNodeCompileContext(observation.runtime, canon, path, context),
      reusable,
      referencesValid && canRetain,
    ),
  );
  // 局部复用可能跳过原有读取，保留仍有效的依赖事实
  if (canRetain && referencesValid && reusable !== undefined) retainWeaveReads(observation.reads, previousReads);
  return {
    resolve: {
      input: child,
      context: { nodeDefaults: resolveInputs.nodeDefaults, mode: resolveInputs.mode },
      value: canon,
    },
    compile: { ...observation.facts(), context: compileInputs, value: compiled },
    referenceReads: observation.reads,
    reused: false,
  };
};
