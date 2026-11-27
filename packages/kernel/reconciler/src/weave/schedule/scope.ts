import { selectCompositeInputScope } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';

import { createExecutionInvariantError, prepareScopeExecution } from '../../compile';
import type { CompileElementExecutor, CompileOwnerKey } from '../../compile';
import { executeWeaveScope, resolveWeaveScope } from '../element';
import type { WeaveEntry, WeaveReferenceRead, WeaveScopeEntry } from '../shared';
import type { WeaveTransaction } from '../state';
import type { WeaveAssembledOutput, WeaveElementExecution, WeaveExecutionContext } from './types';

/** 准备 Scope 子执行环境，返回是否需要通知子项重新检查上下文 */
export const prepareScheduledScope = (
  entry: WeaveScopeEntry,
  execution: WeaveElementExecution,
  { transaction, paths, runtime }: Pick<WeaveExecutionContext, 'transaction' | 'paths' | 'runtime'>,
  ownerOf: (entry: WeaveScopeEntry) => CompileOwnerKey | undefined,
  canReuse: (entry: WeaveEntry) => boolean,
  contextMatches: (entry: WeaveEntry, finalParent: boolean, inheritance: boolean) => boolean,
): boolean => {
  const { frame, executor } = execution;
  const path = paths.get(entry)!;
  const index = path.at(-1) as number;
  const own = transaction.readState(entry).origin.own;
  const owner = ownerOf(entry);

  const scopeFrame = {
    ...frame,
    context: {
      ...frame.context,
      compositeInput:
        frame.context.compositeInput === undefined
          ? undefined
          : selectCompositeInputScope(frame.context.compositeInput, ['children', index]),
    },
  };
  const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
  const canon = resolveWeaveScope(
    execution.runtime,
    own,
    path,
    scopeFrame.context,
    canReuse(entry) ? transaction.readState(entry) : undefined,
  );
  const scopeReads: Array<WeaveReferenceRead> = [];
  execution.scopeReads = scopeReads;
  execution.scope = execution.runtime.state.execution.namespaceStack.observeReferences(
    (name, referenceEntry, kind) => scopeReads.push({ name, entry: referenceEntry, kind, readiness: 'prepare' }),
    () =>
      prepareScopeExecution(
        execution.runtime,
        executor.output,
        {
          compileChildren: () => {
            throw createExecutionInvariantError('Authored Scope cannot traverse children during update');
          },
        },
        { ...own, children: [] },
        index,
        scopeFrame,
        { semanticOwner: owner, resolvedScope: canon },
      ),
  );
  execution.scopeDiagnostics = runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount);

  return (
    !contextMatches(entry, false, false) ||
    !compareProperties(entry.current?.resolve?.value.inheritance, execution.scope.childFrame.context.inheritance, {
      depth: 2,
    }) ||
    !compareProperties(
      entry.current?.compile?.context.preparation.preliminaryTransforms,
      execution.scope.preparation.preliminaryTransforms,
      { depth: 2 },
    )
  );
};

/** 子布局就绪后计算并投影 Scope，把结果留给输出阶段 */
export const projectScheduledScope = (
  entry: WeaveScopeEntry,
  execution: WeaveElementExecution,
  transaction: WeaveTransaction,
  canReuse: (entry: WeaveEntry) => boolean,
): void => {
  const steps = execution.scope!;
  const state = transaction.readState(entry);
  const result = executeWeaveScope(
    execution.runtime,
    state.origin.own,
    execution.frame.context,
    steps,
    execution.scopeDiagnostics ?? [],
    execution.scopeReads ?? [],
    canReuse(entry) ? state : undefined,
  );
  execution.scopeResult = result;
  steps.project(result.compile.value);
};

/** 投影就绪后发布子图元和分组诊断，不重写已经确定的包络 */
export const publishScheduledScope = (
  entry: WeaveScopeEntry,
  execution: WeaveElementExecution,
  { transaction, runtime, recordComputed }: Pick<WeaveExecutionContext, 'transaction' | 'runtime' | 'recordComputed'>,
  rootExecutor: CompileElementExecutor,
  outputOf: (entry: WeaveEntry) => WeaveAssembledOutput,
): void => {
  const steps = execution.scope!;
  // 包络已完成；此后只替换输出收集，不改变其布局事实
  steps.childFrame.state.primitives.length = 0;
  steps.childFrame.state.bounds.length = 0;
  steps.childFrame.state.allocations.length = 0;
  steps.childFrame.state.alignmentGuides.length = 0;
  for (const child of transaction.readState(entry).children) {
    const childState = outputOf(child);
    steps.childFrame.state.primitives.push(...childState.primitives);
    steps.childFrame.state.bounds.push(...childState.bounds);
    steps.childFrame.state.allocations.push(...childState.allocations);
    steps.childFrame.state.alignmentGuides.push(...childState.alignmentGuides);
    for (const primitive of childState.primitives) {
      if (primitive.type === 'path-placeholder') continue;
      const zIndex = rootExecutor.output.zIndexMap.get(primitive);
      if (zIndex !== undefined) execution.executor.output.zIndexMap.set(primitive, zIndex);
    }
  }
  steps.paths();
  steps.dispose();
  const warnings = runtime.state.workspace.diagnosticCollector.warnings;
  const warningCount = warnings.length;
  steps.publish();
  const outputDiagnostics = warnings.slice(warningCount);
  const result = execution.scopeResult!;
  const state = transaction.editState(entry);
  state.resolve = result.resolve;
  state.compile = { ...result.compile, value: steps.compiled, outputDiagnostics };
  recordComputed(
    entry,
    { ...result.compile, outputDiagnostics, value: steps.compiled },
    result.reused,
    result.referenceReads,
  );
};
