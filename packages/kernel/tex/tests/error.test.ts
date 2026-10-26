import { describe, expect, it } from 'vitest';

import { RetikzTexError, RetikzTexErrorCode } from '../src/error';

describe('RetikzTexError', () => {
  it('使用单个消息参数的默认代码', () => {
    const error = new RetikzTexError('default failure');

    expect(error.code).toBe(RetikzTexErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it.each([RetikzTexErrorCode.SvgMalformed, RetikzTexErrorCode.SvgUnsupported])(
    '接受带有消息的显式 SVG 代码 %s',
    code => {
      const error = new RetikzTexError(code, 'explicit failure');

      expect(error.code).toBe(code);
      expect(error.message).toBe('explicit failure');
    },
  );
});
