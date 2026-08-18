import { isRetikzError } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

import type { RuntimeDiagnostic, RuntimeProgramId } from '../../src';

import {
  RetikzRuntimeError,
  RetikzRuntimeErrorCode,
  RetikzRuntimeIdentityError,
  RetikzRuntimeOwnerError,
  RetikzRuntimeOwnerErrorCode,
  RetikzRuntimeOwnerRegistryError,
  RuntimeDiagnosticCode,
  RuntimeOwnerPhase,
} from '../../src';

const program: RuntimeProgramId = { owner: 'owner', key: 'program' };
const diagnostics: ReadonlyArray<RuntimeDiagnostic> = [
  {
    code: RuntimeDiagnosticCode.ChangeSetFallback,
    phase: 'change-set',
    severity: 'warning',
    message: 'fallback',
  },
];

const expectOwnCause = (error: Error, cause: unknown): void => {
  expect(Object.hasOwn(error, 'cause')).toBe(true);
  expect(error.cause).toBe(cause);
  expect(Object.getOwnPropertyNames(error)).toContain('cause');
};

describe('runtime structured errors', () => {
  it('preserves RetikzRuntimeError compatibility while exposing Runtime details', () => {
    const cause = { input: 'scene' };
    const error = new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.ProgramRunFailed,
      phase: 'run',
      owner: 'owner',
      program,
      diagnostics,
      cause,
    });

    expect(error).toBeInstanceOf(RetikzRuntimeError);
    expect(error.name).toBe('RetikzRuntimeError');
    expect(error.code).toBe(RetikzRuntimeErrorCode.ProgramRunFailed);
    expect(error.message).toBe('RUNTIME_PROGRAM_RUN_FAILED: Runtime failed during run');
    expect(error.phase).toBe('run');
    expect(error.owner).toBe('owner');
    expect(error.program).toBe(program);
    expect(error.diagnostics).toEqual(diagnostics);
    expect(error.diagnostics).not.toBe(diagnostics);
    expect(Object.isFrozen(error.diagnostics)).toBe(true);
    expect(error.details).toEqual({ phase: 'run', owner: 'owner', program, diagnostics });
    expect(Object.isFrozen(error.details.diagnostics)).toBe(true);
    expect(error.details.diagnostics).toBe(error.diagnostics);
    expect(isRetikzError(error)).toBe(true);
    expectOwnCause(error, cause);
  });

  it('omits optional owner and program from Runtime details while retaining diagnostics', () => {
    const error = new RetikzRuntimeError({ code: RetikzRuntimeErrorCode.RevisionInvalid, phase: 'revision' });

    expect(error.owner).toBeUndefined();
    expect(error.program).toBeUndefined();
    expect(error.diagnostics).toEqual([]);
    expect(error.details).toEqual({ phase: 'revision', diagnostics: [] });
    expect(Object.hasOwn(error, 'cause')).toBe(true);
    expect(error.cause).toBeUndefined();
    expect(Object.getOwnPropertyNames(error)).toContain('cause');
    expect(isRetikzError(error)).toBe(true);
  });

  it('preserves a package-level Runtime error message, phase, and cause', () => {
    const cause = { state: 'missing' };
    const error = new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: 'missing internal state',
      phase: 'session-update',
      cause,
    });

    expect(error).toBeInstanceOf(RetikzRuntimeError);
    expect(error.name).toBe('RetikzRuntimeError');
    expect(error.code).toBe(RetikzRuntimeErrorCode.InternalInvariant);
    expect(error.message).toBe('missing internal state');
    expect(error.phase).toBe('session-update');
    expect(error.details).toEqual({ phase: 'session-update', diagnostics: [] });
    expect(isRetikzError(error)).toBe(true);
    expectOwnCause(error, cause);
  });

  it('preserves RetikzRuntimeOwnerError compatibility and lifecycle details', () => {
    const cause = new Error('dispose failed');
    const lifecycleDiagnostics = [
      {
        code: RuntimeDiagnosticCode.OwnerDisposeFailed,
        owner: 'owner',
        phase: RuntimeOwnerPhase.Retire,
        message: 'cleanup failed',
        cause,
      },
    ] as const;
    const error = new RetikzRuntimeOwnerError({
      code: RetikzRuntimeOwnerErrorCode.CaptureFailed,
      owner: 'owner',
      phase: RuntimeOwnerPhase.Capture,
      cause,
      diagnostics: lifecycleDiagnostics,
    });

    expect(error).toBeInstanceOf(RetikzRuntimeOwnerError);
    expect(error.name).toBe('RetikzRuntimeOwnerError');
    expect(error.code).toBe(RetikzRuntimeErrorCode.CaptureFailed);
    expect(error.message).toBe('RUNTIME_OWNER_CAPTURE_FAILED: owner "owner" failed during capture');
    expect(error.owner).toBe('owner');
    expect(error.phase).toBe('capture');
    expect(error.diagnostics).toEqual(lifecycleDiagnostics);
    expect(error.diagnostics).not.toBe(lifecycleDiagnostics);
    expect(Object.isFrozen(error.diagnostics)).toBe(true);
    expect(error.details).toEqual({ owner: 'owner', phase: 'capture', diagnostics: lifecycleDiagnostics });
    expect(Object.isFrozen(error.details.diagnostics)).toBe(true);
    expect(error.details.diagnostics).toBe(error.diagnostics);
    expect(isRetikzError(error)).toBe(true);
    expectOwnCause(error, cause);
  });

  it('preserves RetikzRuntimeOwnerRegistryError compatibility when cause is omitted', () => {
    const error = new RetikzRuntimeOwnerRegistryError(RetikzRuntimeOwnerErrorCode.Unknown, 'owner');

    expect(error).toBeInstanceOf(RetikzRuntimeOwnerRegistryError);
    expect(error.name).toBe('RetikzRuntimeOwnerRegistryError');
    expect(error.code).toBe(RetikzRuntimeErrorCode.Unknown);
    expect(error.message).toBe('RUNTIME_OWNER_UNKNOWN: invalid runtime owner "owner"');
    expect(error.owner).toBe('owner');
    expect(error.details).toEqual({ owner: 'owner' });
    expect(isRetikzError(error)).toBe(true);
    expectOwnCause(error, undefined);
  });

  it('preserves RetikzRuntimeIdentityError compatibility and rejected value cause', () => {
    const rejectedValue = ' ';
    const error = new RetikzRuntimeIdentityError('owner', rejectedValue);

    expect(error).toBeInstanceOf(RetikzRuntimeIdentityError);
    expect(error.name).toBe('RetikzRuntimeIdentityError');
    expect(error.code).toBe(RetikzRuntimeErrorCode.IdentityInvalid);
    expect(error.message).toBe('RUNTIME_IDENTITY_INVALID: invalid runtime identity for owner "owner"');
    expect(error.owner).toBe('owner');
    expect(error.details).toEqual({ owner: 'owner' });
    expect(isRetikzError(error)).toBe(true);
    expectOwnCause(error, rejectedValue);
  });
});
