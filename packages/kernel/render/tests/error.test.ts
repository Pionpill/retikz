import { describe, expect, it } from 'vitest';

import { RetikzRenderError, RetikzRenderErrorCode } from '../src/error';

describe('RetikzRenderError', () => {
  it('uses the default code for a single message argument', () => {
    const error = new RetikzRenderError('default failure');

    expect(error.code).toBe(RetikzRenderErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('accepts an explicit code with a message', () => {
    const error = new RetikzRenderError(RetikzRenderErrorCode.Runtime, 'explicit failure');

    expect(error.code).toBe(RetikzRenderErrorCode.Runtime);
    expect(error.message).toBe('explicit failure');
  });
});
