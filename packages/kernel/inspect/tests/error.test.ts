import { describe, expect, it } from 'vitest';

import { RetikzInspectError, RetikzInspectErrorCode } from '../src';

describe('RetikzInspectError', () => {
  it('使用单个消息参数的默认代码', () => {
    const error = new RetikzInspectError('default failure');

    expect(error.code).toBe(RetikzInspectErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('接受带有消息的显式代码', () => {
    const error = new RetikzInspectError(RetikzInspectErrorCode.Compile, 'explicit failure');

    expect(error.code).toBe(RetikzInspectErrorCode.Compile);
    expect(error.code).toBe('INSPECTION_COMPILE_ERROR');
    expect(error.message).toBe('explicit failure');
  });
});
