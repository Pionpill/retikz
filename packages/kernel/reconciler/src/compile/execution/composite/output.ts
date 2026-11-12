import type {
  CompileOccurrenceLocator,
  CompositeCompileScopeProps,
  IRScope,
  SceneClipPath,
  Transform,
} from '@retikz/core';
import { CompileExpansionKind } from '@retikz/core';

import type { CompileOwnerKey } from '../../provenance';
import { createExecutionInvariantError } from '../../runtime';
import type { CompositeCompileOwner, CompositeRuntimeOutputChild } from '../../runtime';
import type { SubtreeCompileRuntime } from '../subtree';
import { isCompositeOutputHandle } from './handle';
import { commitCompositeReplay } from './replay';
import type { CompositeExecutionContext, PreparedCompositeOutputs } from './types';

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
    execution.host.compileChild(
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

  const runtimeScopeChild = runtimeScopeChildOf(output.props);
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
  execution.host.compileScopeChild(
    runtimeScopeChild,
    index,
    frame,
    scopeOccurrence,
    compositeDepth,
    scopeSemanticOwner,
    (scopeFrame, scopePreliminaryTransforms) => {
      for (const [childIndex, child] of output.children.entries()) {
        if (!isCompositeOutputHandle(execution.runtime, child)) {
          const childOccurrence: CompileOccurrenceLocator = {
            sourcePath: scopeOccurrence.sourcePath,
            expansionPath: [
              ...scopeOccurrence.expansionPath,
              { kind: CompileExpansionKind.ScopeChild, index: childIndex },
            ],
          };
          execution.host.compileChild(
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
    preparedScopeClipPath,
  );
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
