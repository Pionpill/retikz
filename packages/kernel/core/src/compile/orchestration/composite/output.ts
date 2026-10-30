import type { CompileOccurrenceLocator, SceneClipPath, Transform } from '../../../contract';
import { CompileExpansionKind } from '../../../contract';
import { createCompileInvariantError } from '../../probe-failure';
import type { CompileOwnerKey } from '../../provenance';
import type { ScopeCompileFrame } from '../types';
import type { CompositeExecutionContext, PreparedCompositeOutputs } from './execution';
import { isCompositeOutputHandle } from './execution';
import { runtimeScopeChildOf } from './layout';
import { commitCompositeReplay } from './replay';
import type { CompositeCompileOwner, CompositeRuntimeOutputChild } from './types';

/** 编译组件句柄所表示的绑定子项、重放或作用域 */
export const compileCompositeOutput = (
  execution: CompositeExecutionContext,
  output: CompositeRuntimeOutputChild,
  index: number,
  frame: ScopeCompileFrame,
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
      { ...frame, runtimeInputs: output.runtimeInputs },
      boundOccurrence,
      compositeDepth,
      true,
      semanticOwner === undefined
        ? undefined
        : execution.context.provenanceTracker?.createOwner(
            output.child,
            index,
            semanticOwner,
            true,
            execution.context.namespaceStack.identity,
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
      : execution.context.provenanceTracker?.createOwner(
          runtimeScopeChild,
          index,
          semanticOwner,
          true,
          execution.context.namespaceStack.identity,
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
        if (!isCompositeOutputHandle(execution.context, child)) {
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
            { ...scopeFrame, runtimeInputs: undefined },
            childOccurrence,
            compositeDepth,
            true,
            scopeSemanticOwner === undefined
              ? undefined
              : execution.context.provenanceTracker?.createOwner(
                  child,
                  childIndex,
                  scopeSemanticOwner,
                  true,
                  execution.context.namespaceStack.identity,
                ),
          );
          continue;
        }

        const preparedChild = prepared.outputs.get(child);
        if (preparedChild === undefined) {
          throw createCompileInvariantError('internal: execution Scope output child was not preflighted');
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
