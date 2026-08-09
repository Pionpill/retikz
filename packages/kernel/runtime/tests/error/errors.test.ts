import { isRetikzError } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

import type { RuntimeDiagnostic, RuntimeProgramId } from '../../src';

import {
  RuntimeError,
  RuntimeErrorCode,
  RuntimeIdentityError,
  RuntimeOwnerError,
  RuntimeOwnerErrorCode,
  RuntimeOwnerPhase,
  RuntimeOwnerRegistryError,
} from '../../src';

const program: RuntimeProgramId = { owner: 'owner', key: 'program' };
const diagnostics: ReadonlyArray<RuntimeDiagnostic> = [
  {
    code: 'RUNTIME_CHANGESET_FALLBACK',
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
  it('preserves RuntimeError compatibility while exposing Runtime details', () => {
    const cause = { input: 'scene' };
    const error = new RuntimeError({
      code: RuntimeErrorCode.ProgramRunFailed,
      phase: 'run',
      owner: 'owner',
      program,
      diagnostics,
      cause,
    });

    expect(error).toBeInstanceOf(RuntimeError);
    expect(error.name).toBe('RuntimeError');
    expect(error.code).toBe('RUNTIME_PROGRAM_RUN_FAILED');
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
    const error = new RuntimeError({ code: RuntimeErrorCode.RevisionInvalid, phase: 'revision' });

    expect(error.owner).toBeUndefined();
    expect(error.program).toBeUndefined();
    expect(error.diagnostics).toEqual([]);
    expect(error.details).toEqual({ phase: 'revision', diagnostics: [] });
    expect(Object.hasOwn(error, 'cause')).toBe(true);
    expect(error.cause).toBeUndefined();
    expect(Object.getOwnPropertyNames(error)).toContain('cause');
    expect(isRetikzError(error)).toBe(true);
  });

  it('preserves RuntimeOwnerError compatibility and lifecycle details', () => {
    const cause = new Error('dispose failed');
    const lifecycleDiagnostics = [
      {
        code: 'RUNTIME_OWNER_DISPOSE_FAILED',
        owner: 'owner',
        phase: RuntimeOwnerPhase.Retire,
        message: 'cleanup failed',
        cause,
      },
    ] as const;
    const error = new RuntimeOwnerError({
      code: RuntimeOwnerErrorCode.CaptureFailed,
      owner: 'owner',
      phase: RuntimeOwnerPhase.Capture,
      cause,
      diagnostics: lifecycleDiagnostics,
    });

    expect(error).toBeInstanceOf(RuntimeOwnerError);
    expect(error.name).toBe('RuntimeOwnerError');
    expect(error.code).toBe('RUNTIME_OWNER_CAPTURE_FAILED');
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

  it('preserves RuntimeOwnerRegistryError compatibility when cause is omitted', () => {
    const error = new RuntimeOwnerRegistryError(RuntimeOwnerErrorCode.Unknown, 'owner');

    expect(error).toBeInstanceOf(RuntimeOwnerRegistryError);
    expect(error.name).toBe('RuntimeOwnerRegistryError');
    expect(error.code).toBe('RUNTIME_OWNER_UNKNOWN');
    expect(error.message).toBe('RUNTIME_OWNER_UNKNOWN: invalid runtime owner "owner"');
    expect(error.owner).toBe('owner');
    expect(error.details).toEqual({ owner: 'owner' });
    expect(isRetikzError(error)).toBe(true);
    expectOwnCause(error, undefined);
  });

  it('preserves RuntimeIdentityError compatibility and rejected value cause', () => {
    const rejectedValue = ' ';
    const error = new RuntimeIdentityError('owner', rejectedValue);

    expect(error).toBeInstanceOf(RuntimeIdentityError);
    expect(error.name).toBe('RuntimeIdentityError');
    expect(error.code).toBe('RUNTIME_IDENTITY_INVALID');
    expect(error.message).toBe('RUNTIME_IDENTITY_INVALID: invalid runtime identity for owner "owner"');
    expect(error.owner).toBe('owner');
    expect(error.details).toEqual({ owner: 'owner' });
    expect(isRetikzError(error)).toBe(true);
    expectOwnCause(error, rejectedValue);
  });
});
