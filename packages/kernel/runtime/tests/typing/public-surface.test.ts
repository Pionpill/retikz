import type * as Foundation from '@retikz/foundation';

import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  RetikzRuntimeErrorCodeValue,
  RetikzRuntimeOwnerErrorCodeValue,
  RuntimeCandidateView,
  RuntimeChangeSet,
  RuntimeCommitEvent,
  RuntimeDiagnostic,
  RuntimeDiagnosticCodeValue,
  RuntimeDiagnosticPhaseValue,
  RuntimeOwnerInput,
  RuntimeOwnerPhaseValue,
  RuntimeOwnerUpdate,
  RuntimeProgramArtifactDefinitionInput,
  RuntimeProgramContext,
  RuntimeProgramDefinition,
  RuntimeProgramDefinitionInput,
  RuntimeProgramExecutionValue,
  RuntimeProgramId,
  RuntimeProgramKindValue,
  RuntimeProgramPhaseValue,
  RuntimeProgramRegistry,
  RuntimeProgramRegistryInput,
  RuntimeProgramToken,
  RuntimeProgramTraceReporter,
  RuntimeProgramWarningInput,
  RuntimeRunResult,
  RuntimeSession,
  RuntimeSessionOptions,
  RuntimeSessionResult,
  RuntimeSessionUpdate,
  RuntimeSnapshot,
  RuntimeUpdateResult,
} from '../../src';
// @ts-expect-error Runtime no longer owns the shared OpenString type utility
import type { OpenString } from '../../src';

type RemovedRuntimeOpenString<T extends string> = OpenString<T>;
import type { RuntimeDiagnosticPhaseValue as RuntimeDiagnosticPhaseTypeValue } from '../../src/diagnostic/types';

import {
  createRuntimeChangeSet,
  createRuntimeOwnerInput,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeProgram,
  RetikzRuntimeError,
  RetikzRuntimeErrorCode,
  RetikzRuntimeOwnerErrorCode,
  RuntimeDiagnosticCode,
  RuntimeDiagnosticPhase,
  RuntimeOwnerPhase,
  RuntimeProgramExecution,
  RuntimeProgramKind,
  RuntimeProgramPhase,
} from '../../src';

describe('runtime public surface', () => {
  it('从 package root 公开 Program、transaction、Session、diagnostic 与 RetikzRuntimeError', () => {
    expectTypeOf(defineRuntimeProgram).toBeFunction();
    expectTypeOf(RuntimeProgramExecution).toBeObject();
    expectTypeOf(RuntimeProgramKind).toBeObject();
    expectTypeOf(RuntimeProgramPhase).toBeObject();
    expectTypeOf(createRuntimeProgramRegistry).toBeFunction();
    expectTypeOf(createRuntimeChangeSet).toBeFunction();
    expectTypeOf(createRuntimeOwnerInput).toBeFunction();
    expectTypeOf(createRuntimeOwnerUpdate).toBeFunction();
    expectTypeOf(createRuntimeSession).toBeFunction();
    expectTypeOf(RetikzRuntimeError).toBeConstructibleWith({
      code: 'RUNTIME_REVISION_INVALID',
      phase: 'revision',
    });

    expectTypeOf<RuntimeCandidateView>().toBeObject();
    expectTypeOf<RuntimeChangeSet<unknown>>().toBeObject();
    expectTypeOf<RuntimeCommitEvent<unknown>>().toBeObject();
    expectTypeOf<RuntimeDiagnostic>().toBeObject();
    expectTypeOf(RuntimeDiagnosticCode).toBeObject();
    expectTypeOf<RuntimeDiagnosticCodeValue>().toBeString();
    expectTypeOf(RuntimeDiagnosticPhase).toBeObject();
    expectTypeOf<RuntimeDiagnostic['phase']>().toEqualTypeOf<RuntimeDiagnosticPhaseValue>();
    expectTypeOf<RuntimeDiagnosticPhaseTypeValue>().toEqualTypeOf<RuntimeDiagnosticPhaseValue>();
    expect(RuntimeDiagnosticPhase.Run).toBe('run');
    expect(RuntimeDiagnosticCode.TraceSinkFailed).toBe('RUNTIME_TRACE_SINK_FAILED');
    expectTypeOf<RetikzRuntimeErrorCodeValue>().toBeString();
    expectTypeOf<RetikzRuntimeOwnerErrorCodeValue>().toBeString();
    expectTypeOf<RuntimeOwnerPhaseValue>().toBeString();
    expectTypeOf(RetikzRuntimeErrorCode).toBeObject();
    expectTypeOf(RetikzRuntimeOwnerErrorCode).toBeObject();
    expectTypeOf(RuntimeOwnerPhase).toBeObject();
    expect(RetikzRuntimeErrorCode.ProgramRunFailed).toBe('RUNTIME_PROGRAM_RUN_FAILED');
    expect(RetikzRuntimeOwnerErrorCode.CaptureFailed).toBe('RUNTIME_OWNER_CAPTURE_FAILED');
    expect(RuntimeOwnerPhase.Capture).toBe('capture');
    expectTypeOf<RuntimeOwnerInput>().toBeObject();
    expectTypeOf<RuntimeOwnerUpdate>().toBeObject();
    expectTypeOf<RuntimeProgramArtifactDefinitionInput<unknown, unknown, unknown, unknown>>().toBeObject();
    expectTypeOf<RuntimeProgramContext>().toBeObject();
    expectTypeOf<RuntimeProgramDefinition<unknown, unknown, unknown>>().toBeObject();
    expectTypeOf<RuntimeProgramDefinitionInput<unknown, unknown, unknown, unknown>>().toBeObject();
    expectTypeOf<RuntimeProgramExecutionValue>().toBeString();
    expectTypeOf<RuntimeProgramKindValue>().toBeString();
    expectTypeOf<RuntimeProgramPhaseValue>().toBeString();
    expectTypeOf<RuntimeProgramId>().toEqualTypeOf<Readonly<{ owner: string; key: string }>>();
    expectTypeOf<RuntimeProgramRegistry>().toBeObject();
    expectTypeOf<RuntimeProgramRegistryInput>().toBeObject();
    expectTypeOf<RuntimeProgramToken>().toBeObject();
    expectTypeOf<RuntimeProgramTraceReporter>().not.toHaveProperty('diagnostics');
    expectTypeOf<RuntimeProgramWarningInput>().toBeObject();
    expectTypeOf<RuntimeRunResult<unknown>>().toBeObject();
    expectTypeOf<RuntimeSession>().toBeObject();
    expectTypeOf<RuntimeSessionOptions>().toBeObject();
    expectTypeOf<RuntimeSessionResult>().toBeObject();
    expectTypeOf<RuntimeSessionUpdate>().toBeObject();
    expectTypeOf<RuntimeSnapshot<unknown>>().toBeObject();
    expectTypeOf<RuntimeUpdateResult<unknown>>().toBeObject();
  });

  it('uses Foundation for the shared OpenString utility', () => {
    expectTypeOf<Foundation.OpenString<'custom'>>().toBeString();
    void ({} as RemovedRuntimeOpenString<'custom'>);
  });
});
