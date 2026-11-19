import { compileNode, evaluatePosition, evaluatePositionTargetWorld, resolveNode } from '@retikz/core';
import type { CanonicalNode, NodeCompileContext, CompiledNode, IRNode } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';
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
import type { WeaveNodeState, WeaveReferenceRead } from '../../shared';
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
  previous?: WeaveNodeState,
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
  const before = previous?.resolve?.value;
  const observation = createWeaveObservation(runtime);

  // 1. 输入与解析上下文相同时复用 canon，否则重新解析并保留等价子产物
  const canon =
    before != null &&
    previousCompile?.diagnostics.length === 0 &&
    compareProperties({ child: previous!.resolve!.input, ...previous!.resolve!.context }, resolveInputs, { depth: 2 })
      ? before
      : retainCanonicalNode(before, resolveNode(child, createNodeResolveContext(observation.runtime, path, context)));

  // 2. 核对引用、编译上下文与解析结果，并要求新旧诊断均允许整体复用
  const referencesValid =
    previousCompile !== undefined && matchWeaveReferences(previousReads, runtime.state.execution.namespaceStack);
  // ⚡只展开上下文包装、变换项及双轴提案的标量字段，不做无界递归
  const canRetain =
    previousCompile?.diagnostics.length === 0 &&
    compareProperties(previousCompile.context, compileInputs, { depth: 3 });
  if (
    before != null &&
    previous?.compile?.value != null &&
    canRetain &&
    referencesValid &&
    observation.diagnostics.length === 0 &&
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

  // 3. 整体不能复用时，选择仍有效的测量或布局产物参与重新编译
  const reusable =
    before != null && previous?.compile?.value != null && canRetain
      ? { canon: before, compiled: previous.compile.value }
      : undefined;
  const compiled = runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
    compileWeaveNode(
      canon,
      createNodeCompileContext(observation.runtime, canon, path, context),
      reusable,
      referencesValid,
    ),
  );
  // 局部复用可能跳过原有读取，保留仍有效的依赖事实
  if (referencesValid && reusable !== undefined) retainWeaveReads(observation.reads, previousReads);
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
