import type { RuntimeTraceReporter } from '@retikz/runtime';

import {
  defineRuntimeProgram,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  RuntimeProgramKind,
  RuntimeProgramPhase,
} from '@retikz/runtime';

import type { AnyCompositeDefinition } from '../../contract';
import type { CompileWarning } from '../warning';
import type {
  CoreProgramDefinition,
  CoreProgramOptions,
  CoreProgramPublicRead,
  CoreProgramRuntimeOptions,
} from './public';
import type { CoreProgramArtifact, CoreProgramArtifactInput, CoreProgramRead } from './types';

import { CoreOwnerDefinition } from '../../contract';
import { compileCoreSnapshot } from '../compile';
import { formatCompileWarning } from '../warning';
import { coreChangeSetMatchesSnapshots, createCoreSnapshotIndex } from './diff';
import { copyCoreProgramOptions } from './options';
import { CORE_PROGRAM_ID } from './public';
import { tryCompileRootNodeStyleUpdate } from './root-node-style';
import { createFullSceneRuntimeSnapshot, freezeProgramOutput } from './snapshot';

/** 缺省 warning sink 与 compileToScene 保持一致 */
const dispatchDefaultWarning = (warning: CompileWarning): void => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  console.warn(formatCompileWarning(warning));
};

/** 创建保留 full oracle 语义的 Core Runtime Program */
export const createCoreProgram = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  options: CoreProgramOptions<TComposites>,
  runtimeOptions: CoreProgramRuntimeOptions = {},
): CoreProgramDefinition<TComposites> => {
  const fixedOptions = copyCoreProgramOptions(options);
  const invalidationOwners = Object.freeze([...(runtimeOptions.invalidationOwners ?? [])]);
  const observers = Object.freeze([...(runtimeOptions.observers ?? [])]);
  const warningSink = fixedOptions.onWarn ?? dispatchDefaultWarning;

  const definition = defineRuntimeProgram<
    CoreProgramArtifactInput<TComposites>,
    CoreProgramArtifact<TComposites>,
    CoreProgramRead<TComposites>,
    CoreProgramPublicRead<TComposites>
  >({
    id: CORE_PROGRAM_ID,
    owners: [CoreOwnerDefinition, ...invalidationOwners],
    programs: [],
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
      readForProgram: artifact => Object.freeze({ ...artifact.publicRead, state: artifact.state }),
      read: artifact => artifact.publicRead,
    },
    run: (view, context) => {
      const source = view.snapshot(CoreOwnerDefinition).value;
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
          onWarn: undefined,
          trace: counter,
        },
        { candidateRevision: view.candidateRevision, observers },
      );
      freezeProgramOutput(compiled.result);
      freezeProgramOutput(compiled.diagnostics);
      if (compiled.primitiveMetadata === undefined) {
        throw new Error('createCoreProgram: full compile did not produce Runtime primitive metadata');
      }
      const snapshot = createFullSceneRuntimeSnapshot(
        compiled.result.scene,
        view.candidateRevision,
        compiled.primitiveMetadata,
      );
      const isUpdate = view.phase === RuntimeProgramPhase.Update;
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
        kind: RuntimeProgramKind.Full,
        artifact: Object.freeze({
          publicRead,
          state: Object.freeze({ source, index: createCoreSnapshotIndex(source) }),
        }),
      };
    },
    update: (previous, view, context) => {
      if (view.phase !== RuntimeProgramPhase.Update) return { kind: RuntimeProgramKind.Fallback };
      if (invalidationOwners.some(owner => view.changed(owner))) {
        return { kind: RuntimeProgramKind.Fallback };
      }
      if (observers.length > 0) return { kind: RuntimeProgramKind.Fallback };
      const changeSet = view.changeSet(CoreOwnerDefinition);
      const nextSource = view.snapshot(CoreOwnerDefinition).value;
      const nextIndex = createCoreSnapshotIndex(nextSource);
      if (changeSet !== undefined && !coreChangeSetMatchesSnapshots(previous.state.index, nextIndex, changeSet)) {
        return {
          kind: RuntimeProgramKind.Fallback,
          diagnostics: [
            {
              code: 'CORE_CHANGESET_MISMATCH',
              phase: RuntimeProgramPhase.Update,
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
      if (incremental === undefined) return { kind: RuntimeProgramKind.Fallback };
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
      return { kind: RuntimeProgramKind.Incremental, artifact: incremental.artifact };
    },
    observeCommit: event => {
      event.artifact.value.output.diagnostics.forEach(warningSink);
    },
  });
  return definition;
};
