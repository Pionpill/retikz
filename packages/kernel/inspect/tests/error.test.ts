import { describe, expect, it } from 'vitest';

import { RetikzInspectionError, RetikzInspectionErrorCode } from '../src/error';

describe('RetikzInspectionError', () => {
  it('uses the default code for a single message argument', () => {
    const error = new RetikzInspectionError('default failure');

    expect(error.code).toBe(RetikzInspectionErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('accepts an explicit code with a message', () => {
    const error = new RetikzInspectionError(RetikzInspectionErrorCode.Compile, 'explicit failure');

    expect(error.code).toBe(RetikzInspectionErrorCode.Compile);
    expect(error.message).toBe('explicit failure');
  });
});
