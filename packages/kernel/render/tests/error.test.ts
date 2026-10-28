import { describe, expect, it } from 'vitest';

import { RetikzRenderError, RetikzRenderErrorCode } from '../src/error';

describe('RetikzRenderError', () => {
  it('使用单个消息参数的默认代码', () => {
    const error = new RetikzRenderError('default failure');

    expect(error.code).toBe(RetikzRenderErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('接受带有消息的显式代码', () => {
    const error = new RetikzRenderError(RetikzRenderErrorCode.Runtime, 'explicit failure');

    expect(error.code).toBe(RetikzRenderErrorCode.Runtime);
    expect(error.message).toBe('explicit failure');
  });
});
