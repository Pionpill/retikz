import { describe, expect, it } from 'vitest';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../src/error';

describe('RetikzVanillaError', () => {
  it('uses the default code for a single message argument', () => {
    const error = new RetikzVanillaError('default failure');

    expect(error.code).toBe(RetikzVanillaErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('accepts an explicit code with a message', () => {
    const error = new RetikzVanillaError(RetikzVanillaErrorCode.Runtime, 'explicit failure');

    expect(error.code).toBe(RetikzVanillaErrorCode.Runtime);
    expect(error.message).toBe('explicit failure');
  });
});
