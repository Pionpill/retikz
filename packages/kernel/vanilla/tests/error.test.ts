import { describe, expect, it } from 'vitest';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../src/error';

describe('RetikzVanillaError', () => {
  it('使用单个消息参数的默认代码', () => {
    const error = new RetikzVanillaError('default failure');

    expect(error.code).toBe(RetikzVanillaErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('接受带有消息的显式代码', () => {
    const error = new RetikzVanillaError(RetikzVanillaErrorCode.Runtime, 'explicit failure');

    expect(error.code).toBe(RetikzVanillaErrorCode.Runtime);
    expect(error.message).toBe('explicit failure');
  });
});
