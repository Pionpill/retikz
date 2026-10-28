import { describe, expect, it } from 'vitest';

import { RetikzCoreError, RetikzCoreErrorCode } from '../src/error';

describe('RetikzCoreError', () => {
  it('使用单个消息参数的默认代码', () => {
    const error = new RetikzCoreError('default failure');

    expect(error.code).toBe(RetikzCoreErrorCode.Default);
    expect(error.message).toBe('default failure');
  });

  it('接受带有消息的显式代码', () => {
    const error = new RetikzCoreError(RetikzCoreErrorCode.Compile, 'explicit failure');

    expect(error.code).toBe(RetikzCoreErrorCode.Compile);
    expect(error.message).toBe('explicit failure');
  });
});
