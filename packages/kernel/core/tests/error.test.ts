import { describe, expect, it } from 'vitest';

import { RetikzCoreError, RetikzCoreErrorCode } from '../src/error';

describe('RetikzCoreError', () => {
  it('uses the default code for a single message argument', () => {
    const error = new RetikzCoreError('default failure');

    expect(error.code).toBe(RetikzCoreErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('accepts an explicit code with a message', () => {
    const error = new RetikzCoreError(RetikzCoreErrorCode.Compile, 'explicit failure');

    expect(error.code).toBe(RetikzCoreErrorCode.Compile);
    expect(error.message).toBe('explicit failure');
  });
});
