import type { RuntimeTraceReporter } from '@retikz/runtime';
import {
  defineRuntimeComputation,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  RuntimeComputationKind,
  RuntimeComputationPhase,
} from '@retikz/runtime';

import type { AnyCompositeDefinition } from '../../contract';
import { CoreSourceDefinition } from '../../contract';
import { resolveCompositeInputScope } from '../../contract/composite';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { compileCoreSnapshot } from '../compile';
import { CompileWarningCode } from '../constants';
import type { CompileWarning } from '../warning';
import { formatCompileWarning } from '../warning';
import { coreChangeSetMatchesSnapshots, createCoreSnapshotIndex } from './diff';
import { copyCoreComputationOptions } from './options';
import type {
  CoreComputationDefinition,
  CoreComputationOptions,
  CoreComputationPublicRead,
  CoreComputationRuntimeOptions,
} from './public';
import { CORE_COMPUTATION_ID } from './public';
import { tryCompileRootNodeStyleUpdate } from './root-node-style';
import { createFullSceneRuntimeSnapshot, freezeComputationOutput } from './snapshot';
import type { CoreComputationArtifact, CoreComputationArtifactInput, CoreComputationRead } from './types';

/** 缺省 warning sink 与 compileToScene 保持一致 */
const dispatchDefaultWarning = (warning: CompileWarning): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  console.warn(formatCompileWarning(warning));
};

/** 创建保留 full oracle 语义的 Core Runtime Computation */
export const createCoreComputation = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  options: CoreComputationOptions<TComposites>,
  runtimeOptions: CoreComputationRuntimeOptions = {},
): CoreComputationDefinition<TComposites> => {
  const fixedOptions = copyCoreComputationOptions(options);
  const compositeInputSource = runtimeOptions.compositeInputSource;
  if (compositeInputSource !== undefined && options.compositeInputs !== undefined)
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      'createCoreComputation: composite inputs must come from either fixed options or the runtime owner',
    );

  const invalidationSources = Object.freeze([...(runtimeOptions.invalidationSources ?? [])]);
  const observers = Object.freeze([...(runtimeOptions.observers ?? [])]);
  const warningSink = fixedOptions.onWarn ?? dispatchDefaultWarning;

  const definition = defineRuntimeComputation<
    CoreComputationArtifactInput<TComposites>,
    CoreComputationArtifact<TComposites>,
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
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.IrChild,
        outcomes: [PerformanceTraceOutcome.Full, PerformanceTraceOutcome.Incremental, PerformanceTraceOutcome.Fallback],
      },
      {
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.SceneChange,
        outcomes: [PerformanceTraceOutcome.Full, PerformanceTraceOutcome.Incremental, PerformanceTraceOutcome.Fallback],
      },
    ],
    artifact: {
      capture: input => input,
      readForComputation: artifact => Object.freeze({ ...artifact.publicRead, state: artifact.state }),
      read: artifact => artifact.publicRead,
    },
    run: (view, context) => {
      const source = view.snapshot(CoreSourceDefinition).value;
      let visited = 0;
      const counter: RuntimeTraceReporter<'@retikz/core'> = Object.freeze({
        owner: '@retikz/core' as const,
        report: record => {
          if (record.phase === PerformanceTracePhase.Compile && record.unit === PerformanceTraceUnit.IrChild) {
            visited = record.visited;
          }
        },
        diagnostics: () => Object.freeze([]),
      });
      const compiled = compileCoreSnapshot(
        source,
        {
          ...fixedOptions,
          ...(compositeInputSource === undefined ? {} : { compositeInputs: view.snapshot(compositeInputSource).value }),
          onWarn: undefined,
          trace: counter,
        },
        { candidateRevision: view.candidateRevision, observers },
      );
      freezeComputationOutput(compiled.result);
      freezeComputationOutput(compiled.diagnostics);
      if (compiled.primitiveMetadata === undefined) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          'createCoreComputation: full compile did not produce Runtime primitive metadata',
        );
      }

      const snapshot = createFullSceneRuntimeSnapshot(
        compiled.result.scene,
        view.candidateRevision,
        compiled.primitiveMetadata,
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
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.IrChild,
        outcome: context.execution,
        visited,
        reused: 0,
        changed: visited,
      });
      if (isUpdate) {
        context.trace.report({
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.SceneChange,
          outcome: context.execution,
          visited: 1,
          reused: 0,
          changed: 1,
        });
      }

      return {
        kind: RuntimeComputationKind.Full,
        artifact: Object.freeze({
          publicRead,
          state: Object.freeze({ source, index: createCoreSnapshotIndex(source) }),
        }),
      };
    },
    update: (previous, view, context) => {
      if (view.phase !== RuntimeComputationPhase.Update) return { kind: RuntimeComputationKind.Fallback };
      if (compositeInputSource !== undefined && view.changed(compositeInputSource))
        return { kind: RuntimeComputationKind.Fallback };
      if (invalidationSources.some(owner => view.changed(owner))) {
        return { kind: RuntimeComputationKind.Fallback };
      }

      if (observers.length > 0) return { kind: RuntimeComputationKind.Fallback };

      const changeSet = view.changeSet(CoreSourceDefinition);
      const nextSource = view.snapshot(CoreSourceDefinition).value;
      resolveCompositeInputScope(
        nextSource,
        compositeInputSource === undefined ? fixedOptions.compositeInputs : view.snapshot(compositeInputSource).value,
      );
      const nextIndex = createCoreSnapshotIndex(nextSource);
      if (changeSet !== undefined && !coreChangeSetMatchesSnapshots(previous.state.index, nextIndex, changeSet)) {
        return {
          kind: RuntimeComputationKind.Fallback,
          diagnostics: [
            {
              code: CompileWarningCode.ChangeSetMismatch,
              phase: RuntimeComputationPhase.Update,
              message: 'Core ChangeSet does not match the previous and next canonical Snapshots; using full fallback',
            },
          ],
        };
      }

      const incremental = tryCompileRootNodeStyleUpdate(
        previous,
        nextSource,
        nextIndex,
        fixedOptions,
        view.baseRevision,
        view.candidateRevision,
      );
      if (incremental === undefined) return { kind: RuntimeComputationKind.Fallback };

      context.trace.report({
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.IrChild,
        outcome: PerformanceTraceOutcome.Incremental,
        visited: incremental.reused + 1,
        reused: incremental.reused,
        changed: 1,
      });
      context.trace.report({
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.SceneChange,
        outcome: PerformanceTraceOutcome.Incremental,
        visited: incremental.operationCount,
        reused: 0,
        changed: incremental.operationCount,
      });

      return { kind: RuntimeComputationKind.Incremental, artifact: incremental.artifact };
    },
    observeCommit: event => {
      event.artifact.value.output.diagnostics.forEach(warningSink);
    },
  });

  return definition;
};
