import { describe, expect, it } from 'vitest';

import { RetikzReactError, RetikzReactErrorCode } from '../src/error';

describe('RetikzReactError', () => {
  it('使用单个消息参数的默认代码', () => {
    const error = new RetikzReactError('default failure');

    expect(error.code).toBe(RetikzReactErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('接受带有消息的显式代码', () => {
    const error = new RetikzReactError(RetikzReactErrorCode.Kernel, 'explicit failure');

    expect(error.code).toBe(RetikzReactErrorCode.Kernel);
    expect(error.message).toBe('explicit failure');
  });
});
