import { describe, expectTypeOf, it } from 'vitest';

import type {
  RuntimeCandidateView,
  RuntimeChangeSet,
  RuntimeCommitEvent,
  RuntimeDiagnostic,
  RuntimeErrorCode,
  RuntimeOwnerInput,
  RuntimeOwnerUpdate,
  RuntimeProgramArtifactDefinitionInput,
  RuntimeProgramContext,
  RuntimeProgramDefinition,
  RuntimeProgramDefinitionInput,
  RuntimeProgramId,
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
  RuntimeWarningDiagnostic,
} from '../../src';

import {
  createRuntimeChangeSet,
  createRuntimeOwnerInput,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeProgram,
  RuntimeError,
} from '../../src';

describe('runtime public surface', () => {
  it('从 package root 公开 Program、transaction、Session、diagnostic 与 RuntimeError', () => {
    expectTypeOf(defineRuntimeProgram).toBeFunction();
    expectTypeOf(createRuntimeProgramRegistry).toBeFunction();
    expectTypeOf(createRuntimeChangeSet).toBeFunction();
    expectTypeOf(createRuntimeOwnerInput).toBeFunction();
    expectTypeOf(createRuntimeOwnerUpdate).toBeFunction();
    expectTypeOf(createRuntimeSession).toBeFunction();
    expectTypeOf(RuntimeError).toBeConstructibleWith({
      code: 'RUNTIME_REVISION_INVALID',
      phase: 'revision',
    });

    expectTypeOf<RuntimeCandidateView>().toBeObject();
    expectTypeOf<RuntimeChangeSet<unknown>>().toBeObject();
    expectTypeOf<RuntimeCommitEvent<unknown>>().toBeObject();
    expectTypeOf<RuntimeDiagnostic>().toBeObject();
    expectTypeOf<RuntimeErrorCode>().toBeString();
    expectTypeOf<RuntimeOwnerInput>().toBeObject();
    expectTypeOf<RuntimeOwnerUpdate>().toBeObject();
    expectTypeOf<RuntimeProgramArtifactDefinitionInput<unknown, unknown, unknown, unknown>>().toBeObject();
    expectTypeOf<RuntimeProgramContext>().toBeObject();
    expectTypeOf<RuntimeProgramDefinition<unknown, unknown, unknown>>().toBeObject();
    expectTypeOf<RuntimeProgramDefinitionInput<unknown, unknown, unknown, unknown>>().toBeObject();
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
    expectTypeOf<RuntimeWarningDiagnostic>().toBeObject();
  });
});
