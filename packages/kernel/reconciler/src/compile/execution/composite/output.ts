import type {
  CompileOccurrenceLocator,
  CompositeCompileScopeProps,
  IRScope,
  SceneClipPath,
  Transform,
} from '@retikz/core';
import { CompileExpansionKind, guardProviderOutput } from '@retikz/core';

import type { CompileOwnerKey } from '../../provenance';
import { createExecutionInvariantError } from '../../runtime';
import type { CompositeCompileOwner, CompositeRuntimeOutputChild } from '../../runtime';
import type { SubtreeCompileRuntime } from '../subtree';
import { isCompositeOutputHandle } from './handle';
import { commitCompositeReplay } from './replay';
import type { CompositeExecutionContext, PreparedCompositeOutputs } from './types';

/** 匹配由普通图元及单层包装的重放组成的闭合分组；不递归将整个组件输出描述一遍 */
const describeOutputBlock = (
  output: Extract<CompositeRuntimeOutputChild, { kind: 'scope' }>,
  prepared: PreparedCompositeOutputs,
) => {
  const input: Array<unknown> = [output.props];
  const layouts: Array<object> = [];
  let primitives = 0;
  for (const child of output.children) {
    const entry = prepared.outputs.get(child)?.output;
    if (!entry) {
      if (!('type' in child) || 'namespace' in child || child.type === 'scope') return;
      input.push('ir', child);
      primitives++;
      continue;
    }
    let replay = entry;
    if (entry.kind === 'scope') {
      if (entry.children.length !== 1) return;
      const inner = prepared.outputs.get(entry.children[0])?.output;
      if (inner?.kind !== 'replay') return;
      input.push('scope', entry.props);
      replay = inner;
    }
    if (replay.kind !== 'replay') return;
    const transaction = prepared.replays.get(replay.replay)?.transaction;
    if (!transaction?.layoutIdentity) return;
    layouts.push(transaction.layoutIdentity);
    input.push('replay', replay.wrapper, transaction.originOccurrence);
  }
  return primitives ? { input, layouts } : undefined;
};

/** 编译组件句柄所表示的绑定子项、重放或作用域 */
export const compileCompositeOutput = (
  execution: CompositeExecutionContext,
  output: CompositeRuntimeOutputChild,
  index: number,
  frame: SubtreeCompileRuntime,
  parentOccurrence: CompileOccurrenceLocator,
  ownerOccurrence: CompileOccurrenceLocator,
  scopeSegment:
    | typeof CompileExpansionKind.Output
    | typeof CompileExpansionKind.ScopeChild
    | typeof CompileExpansionKind.Output,
  compositeDepth: number,
  owner: CompositeCompileOwner,
  prepared: PreparedCompositeOutputs,
  semanticOwner?: CompileOwnerKey,
  preparedScopeClipPath?: SceneClipPath,
  authoredPreliminaryTransforms?: ReadonlyArray<Transform>,
): void => {
  if (output.kind === 'bound') {
    const boundOccurrence: CompileOccurrenceLocator = {
      sourcePath: parentOccurrence.sourcePath,
      expansionPath: [...parentOccurrence.expansionPath, { kind: scopeSegment, index }],
    };
    execution.host.compilePreparedChild(
      output.child,
      index,
      { context: { ...frame.context, compositeInput: output.runtimeInputs }, state: frame.state },
      boundOccurrence,
      compositeDepth,
      true,
      semanticOwner === undefined
        ? undefined
        : execution.runtime.state.execution.provenanceTracker?.createOwner(
            output.child,
            index,
            semanticOwner,
            true,
            execution.runtime.state.execution.namespaceStack.identity,
          ),
    );

    return;
  }

  if (output.kind === 'replay') {
    commitCompositeReplay(
      execution,
      output.replay,
      output.wrapper,
      frame,
      parentOccurrence,
      index,
      prepared.replays,
      semanticOwner,
      authoredPreliminaryTransforms,
    );
    return;
  }

  const runtimeScopeChild = guardProviderOutput(owner.label, () => runtimeScopeChildOf(output.props));
  const scopeSemanticOwner =
    semanticOwner === undefined
      ? undefined
      : execution.runtime.state.execution.provenanceTracker?.createOwner(
          runtimeScopeChild,
          index,
          semanticOwner,
          true,
          execution.runtime.state.execution.namespaceStack.identity,
        );
  const scopeOccurrence: CompileOccurrenceLocator = {
    sourcePath: parentOccurrence.sourcePath,
    expansionPath: [...parentOccurrence.expansionPath, { kind: scopeSegment, index }],
  };
  execution.host.compileScopeChild(runtimeScopeChild, index, frame, {
    generatedOccurrence: scopeOccurrence,
    // 子项由 compileNested 提交，不能只比较 Scope 外壳；整块复用还需核对预检后的子项声明与布局身份
    blockStage:
      execution.host.compositeDispatcher?.block && !execution.runtime.state.execution.provenanceTracker
        ? describeOutputBlock(output, prepared)
        : undefined,
    compositeDepth,
    semanticOwner: scopeSemanticOwner,
    compileNested: (scopeFrame, scopePreliminaryTransforms) => {
      for (const [childIndex, child] of output.children.entries()) {
        if (!isCompositeOutputHandle(execution.runtime, child)) {
          const childOccurrence: CompileOccurrenceLocator = {
            sourcePath: scopeOccurrence.sourcePath,
            expansionPath: [
              ...scopeOccurrence.expansionPath,
              { kind: CompileExpansionKind.ScopeChild, index: childIndex },
            ],
          };
          execution.host.compilePreparedChild(
            child,
            childIndex,
            { context: { ...scopeFrame.context, compositeInput: undefined }, state: scopeFrame.state },
            childOccurrence,
            compositeDepth,
            true,
            scopeSemanticOwner === undefined
              ? undefined
              : execution.runtime.state.execution.provenanceTracker?.createOwner(
                  child,
                  childIndex,
                  scopeSemanticOwner,
                  true,
                  execution.runtime.state.execution.namespaceStack.identity,
                ),
          );
          continue;
        }

        const preparedChild = prepared.outputs.get(child);
        if (preparedChild === undefined) {
          throw createExecutionInvariantError('internal: execution Scope output child was not preflighted');
        }

        compileCompositeOutput(
          execution,
          preparedChild.output,
          childIndex,
          scopeFrame,
          scopeOccurrence,
          ownerOccurrence,
          'scopeChild',
          compositeDepth,
          owner,
          prepared,
          scopeSemanticOwner,
          preparedChild.scopeClipPath,
          scopePreliminaryTransforms,
        );
      }
    },
    preResolvedClipPath: preparedScopeClipPath,
  });
};

/** 将组件生成的 Scope 属性转换为普通作用域声明 */
const runtimeScopeChildOf = (props: CompositeCompileScopeProps): IRScope => {
  const { transforms, animations, ...rest } = props;
  return {
    type: 'scope',
    ...rest,
    ...(transforms === undefined ? {} : { transforms: [...transforms] }),
    ...(animations === undefined ? {} : { animations: [...animations] }),
    children: [],
  };
};
