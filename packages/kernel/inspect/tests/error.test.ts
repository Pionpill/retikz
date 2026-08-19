import { describe, expect, it } from 'vitest';

import { RetikzInspectError, RetikzInspectErrorCode } from '../src';

describe('RetikzInspectError', () => {
  it('uses the default code for a single message argument', () => {
    const error = new RetikzInspectError('default failure');

    expect(error.code).toBe(RetikzInspectErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('accepts an explicit code with a message', () => {
    const error = new RetikzInspectError(RetikzInspectErrorCode.Compile, 'explicit failure');

    expect(error.code).toBe(RetikzInspectErrorCode.Compile);
    expect(error.code).toBe('INSPECTION_COMPILE_ERROR');
    expect(error.message).toBe('explicit failure');
  });
});
