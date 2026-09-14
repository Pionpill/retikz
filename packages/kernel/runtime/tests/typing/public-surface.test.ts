import { describe, expect, it } from 'vitest';

import * as runtime from '../../src';

const { RetikzRuntimeErrorCode, RuntimeDiagnosticPhase, RuntimeOwnerPhase } = runtime;

describe('runtime public surface', () => {
  it('公开稳定的 diagnostic 与 error const object', () => {
    expect(RuntimeDiagnosticPhase.Run).toBe('run');
    expect(RetikzRuntimeErrorCode.CaptureFailed).toBe('RUNTIME_OWNER_CAPTURE_FAILED');
    expect(RuntimeOwnerPhase.Capture).toBe('capture');
    expect(runtime).not.toHaveProperty('RetikzRuntimeOwnerError');
    expect(runtime).not.toHaveProperty('RetikzRuntimeOwnerRegistryError');
    expect(runtime).not.toHaveProperty('RetikzRuntimeIdentityError');
    expect(runtime).not.toHaveProperty('RetikzRuntimeOwnerErrorCode');
  });
});
