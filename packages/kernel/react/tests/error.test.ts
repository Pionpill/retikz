import { describe, expect, it } from 'vitest';

import { RetikzReactError, RetikzReactErrorCode } from '../src/error';

describe('RetikzReactError', () => {
  it('uses the default code for a single message argument', () => {
    const error = new RetikzReactError('default failure');

    expect(error.code).toBe(RetikzReactErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('accepts an explicit code with a message', () => {
    const error = new RetikzReactError(RetikzReactErrorCode.Kernel, 'explicit failure');

    expect(error.code).toBe(RetikzReactErrorCode.Kernel);
    expect(error.message).toBe('explicit failure');
  });
});
