import { describe, expect, it } from 'vitest';

import { RetikzTexError, RetikzTexErrorCode } from '../src/error';

describe('RetikzTexError', () => {
  it('uses the default code for a single message argument', () => {
    const error = new RetikzTexError('default failure');

    expect(error.code).toBe(RetikzTexErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('accepts an explicit code with a message', () => {
    const error = new RetikzTexError(RetikzTexErrorCode.Svg, 'explicit failure');

    expect(error.code).toBe(RetikzTexErrorCode.Svg);
    expect(error.message).toBe('explicit failure');
  });
});
