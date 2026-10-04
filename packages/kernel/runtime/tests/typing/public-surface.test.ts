import { describe, expect, it } from 'vitest';

import * as runtime from '../../src';

const { RetikzRuntimeErrorCode, RuntimeDiagnosticPhase, RuntimeSourcePhase } = runtime;

describe('runtime public surface', () => {
  it('公开稳定的 diagnostic 与 error const object', () => {
    expect(RuntimeDiagnosticPhase.Run).toBe('run');
    expect(RetikzRuntimeErrorCode.CaptureFailed).toBe('RUNTIME_SOURCE_CAPTURE_FAILED');
    expect(RuntimeSourcePhase.Capture).toBe('capture');
    expect(runtime).not.toHaveProperty('RetikzRuntimeSourceError');
    expect(runtime).not.toHaveProperty('RetikzRuntimeSourceRegistryError');
    expect(runtime).not.toHaveProperty('RetikzRuntimeIdentityError');
    expect(runtime).not.toHaveProperty('RetikzRuntimeSourceErrorCode');
  });
});
