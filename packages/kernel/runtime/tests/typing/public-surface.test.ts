import { describe, expect, it } from 'vitest';

import {
  RetikzRuntimeErrorCode,
  RetikzRuntimeOwnerErrorCode,
  RuntimeDiagnosticCode,
  RuntimeDiagnosticPhase,
  RuntimeOwnerPhase,
} from '../../src';

describe('runtime public surface', () => {
  it('公开稳定的 diagnostic 与 error const object', () => {
    expect(RuntimeDiagnosticPhase.Run).toBe('run');
    expect(RuntimeDiagnosticCode.TraceSinkFailed).toBe(RuntimeDiagnosticCode.TraceSinkFailed);
    expect(RetikzRuntimeErrorCode.ProgramRunFailed).toBe(RetikzRuntimeErrorCode.ProgramRunFailed);
    expect(RetikzRuntimeErrorCode.InternalInvariant).toBe(RetikzRuntimeErrorCode.InternalInvariant);
    expect(RetikzRuntimeOwnerErrorCode.CaptureFailed).toBe(RetikzRuntimeErrorCode.CaptureFailed);
    expect(RuntimeOwnerPhase.Capture).toBe('capture');
  });
});
