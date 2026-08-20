import { describe, expect, it } from 'vitest';

import { RetikzTexError, RetikzTexErrorCode } from '../src/error';

describe('RetikzTexError', () => {
  it('uses the default code for a single message argument', () => {
    const error = new RetikzTexError('default failure');

    expect(error.code).toBe(RetikzTexErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it.each([RetikzTexErrorCode.SvgMalformed, RetikzTexErrorCode.SvgUnsupported])(
    'accepts the explicit SVG code %s with a message',
    code => {
      const error = new RetikzTexError(code, 'explicit failure');

      expect(error.code).toBe(code);
      expect(error.message).toBe('explicit failure');
    },
  );
});
