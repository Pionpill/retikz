import {
  CoreTracePhase,
  CoreTraceUnit,
  formatCompileWarning,
  prepareSceneCompilation,
  validateCompositeInputBindings,
} from '@retikz/core';
import type { AnyCompositeDefinition, CompileWarning } from '@retikz/core';
import {
  PerformanceTraceOutcome,
  RuntimeComputationKind,
  RuntimeComputationPhase,
  defineRuntimeComputation,
} from '@retikz/runtime';
import type { RuntimeTraceReporter } from '@retikz/runtime';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import { coreChangeSetMatchesSnapshots, createCoreSnapshotIndex } from '../reconcile';
import { createFullSceneRuntimeSnapshot, freezeComputationOutput } from '../scene';
import { ReconcilerTracePhase, ReconcilerTraceUnit } from '../trace';
import { isWeaveScene, prepareWeaveCompilation } from '../weave';
import { copyCoreComputationOptions } from './options';
import { CORE_COMPUTATION_ID, CoreComputationDiagnosticCode } from './public';
import type {
  CoreComputationDefinition,
  CoreComputationOptions,
  CoreComputationPublicRead,
  CoreComputationRuntimeOptions,
} from './public';
import { CoreSourceDefinition } from './source';
import type { CoreComputationRead, CoreComputationResult, CoreComputationResultInput } from './types';

/** 缺省 warning sink 与 compileToScene 保持一致 */
const dispatchDefaultWarning = (warning: CompileWarning): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  console.warn(formatCompileWarning(warning));
};

/**
 * 创建保留 full oracle 语义的 Core Runtime Computation
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export const createCoreComputation = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  options: CoreComputationOptions<TComposites>,
  runtimeOptions: CoreComputationRuntimeOptions = {},
): CoreComputationDefinition<TComposites> => {
  const fixedOptions = copyCoreComputationOptions(options);
  const compositeInputSource = runtimeOptions.compositeInputSource;
  if (compositeInputSource !== undefined && options.compositeInputs !== undefined)
    throw new RetikzReconcilerError(
      RetikzReconcilerErrorCode.Contract,
      'createCoreComputation: composite inputs must come from either fixed options or the runtime owner',
    );

  const invalidationSources = Object.freeze([...(runtimeOptions.invalidationSources ?? [])]);
  const observers = Object.freeze([...(runtimeOptions.observers ?? [])]);
  const warningSink = fixedOptions.onWarn ?? dispatchDefaultWarning;

  const definition = defineRuntimeComputation<
    CoreComputationResultInput<TComposites>,
    CoreComputationResult<TComposites>,
    CoreComputationRead<TComposites>,
    CoreComputationPublicRead<TComposites>
  >({
    id: CORE_COMPUTATION_ID,
    sources: [
      CoreSourceDefinition,
      ...(compositeInputSource === undefined ? [] : [compositeInputSource]),
      ...invalidationSources,
    ],
    computations: [],
    tracePhases: [
      {
        phase: ReconcilerTracePhase.Update,
        unit: CoreTraceUnit.IrChild,
        outcomes: [PerformanceTraceOutcome.Full, PerformanceTraceOutcome.Incremental, PerformanceTraceOutcome.Fallback],
      },
      {
        phase: ReconcilerTracePhase.Update,
        unit: ReconcilerTraceUnit.SceneChange,
        outcomes: [PerformanceTraceOutcome.Full, PerformanceTraceOutcome.Incremental, PerformanceTraceOutcome.Fallback],
      },
    ],
    result: {
      capture: input => input,
      readForComputation: result => Object.freeze({ ...result.publicRead, state: result.state }),
      read: result => result.publicRead,
    },
    run: (view, context) => {
      const source = view.snapshot(CoreSourceDefinition).value;
      let visited = 0;
      const counter: RuntimeTraceReporter<'@retikz/core'> = Object.freeze({
        owner: '@retikz/core' as const,
        report: record => {
          if (record.phase === CoreTracePhase.Compile && record.unit === CoreTraceUnit.IrChild) {
            visited = record.visited;
          }
        },
        diagnostics: () => Object.freeze([]),
      });
      const compileOptions = {
        ...fixedOptions,
        ...(compositeInputSource === undefined ? {} : { compositeInputs: view.snapshot(compositeInputSource).value }),
        trace: counter,
      };
      validateCompositeInputBindings(source, compileOptions.compositeInputs);
      const weave = isWeaveScene(source) ? prepareWeaveCompilation(source, compileOptions, { observers }) : undefined;
      const compiled =
        weave?.compilation ?? prepareSceneCompilation(source, compileOptions, { captureProvenance: true, observers });
      if (weave !== undefined) visited = weave.visited;
      freezeComputationOutput(compiled.result);
      freezeComputationOutput(compiled.diagnostics);
      if (compiled.provenance === undefined) {
        throw new RetikzReconcilerError(
          RetikzReconcilerErrorCode.Compile,
          'createCoreComputation: full compile did not produce Runtime primitive metadata',
        );
      }

      const snapshot = createFullSceneRuntimeSnapshot(
        compiled.result.scene,
        view.candidateRevision,
        compiled.provenance,
      );
      const isUpdate = view.phase === RuntimeComputationPhase.Update;
      const publicRead = Object.freeze({
        output: Object.freeze({
          result: compiled.result,
          diagnostics: compiled.diagnostics,
          observerOutputs: compiled.observerOutputs,
        }),
        snapshot,
        ...(isUpdate
          ? {
              patch: Object.freeze({
                baseRevision: view.baseRevision,
                nextRevision: view.candidateRevision,
                operations: Object.freeze([Object.freeze({ kind: 'replaceScene' as const, snapshot })]),
              }),
            }
          : {}),
      });

      context.trace.report({
        phase: ReconcilerTracePhase.Update,
        unit: CoreTraceUnit.IrChild,
        outcome: context.execution,
        visited,
        reused: 0,
        changed: visited,
      });
      if (isUpdate) {
        context.trace.report({
          phase: ReconcilerTracePhase.Update,
          unit: ReconcilerTraceUnit.SceneChange,
          outcome: context.execution,
          visited: 1,
          reused: 0,
          changed: 1,
        });
      }

      return {
        kind: RuntimeComputationKind.Full,
        result: Object.freeze({
          publicRead,
          state: Object.freeze({
            source,
            index: createCoreSnapshotIndex(source),
            ...(weave === undefined ? {} : { weave: { current: weave.root, candidate: null } }),
          }),
        }),
      };
    },
    update: (previous, view) => {
      if (view.phase !== RuntimeComputationPhase.Update) return { kind: RuntimeComputationKind.Fallback };
      if (compositeInputSource !== undefined && view.isChanged(compositeInputSource))
        return { kind: RuntimeComputationKind.Fallback };
      if (invalidationSources.some(owner => view.isChanged(owner))) {
        return { kind: RuntimeComputationKind.Fallback };
      }

      if (observers.length > 0) return { kind: RuntimeComputationKind.Fallback };

      const changeSet = view.changeSet(CoreSourceDefinition);
      const nextSource = view.snapshot(CoreSourceDefinition).value;
      validateCompositeInputBindings(
        nextSource,
        compositeInputSource === undefined ? fixedOptions.compositeInputs : view.snapshot(compositeInputSource).value,
      );
      const nextIndex = createCoreSnapshotIndex(nextSource);
      if (changeSet !== undefined && !coreChangeSetMatchesSnapshots(previous.state.index, nextIndex, changeSet)) {
        return {
          kind: RuntimeComputationKind.Fallback,
          diagnostics: [
            {
              code: CoreComputationDiagnosticCode.ChangeSetMismatch,
              phase: RuntimeComputationPhase.Update,
              message: 'Core ChangeSet does not match the previous and next canonical Snapshots; using full fallback',
            },
          ],
        };
      }

      // 批次调度接入前，完整替换统一准备新树，避免只更新 Scene 而保留旧节点缓存
      return { kind: RuntimeComputationKind.Fallback };
    },
    observeCommit: event => {
      event.result.value.output.diagnostics.forEach(warningSink);
    },
  });

  return definition;
};
