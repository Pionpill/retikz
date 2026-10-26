import type { ValueOf } from '@retikz/foundation';
import { isRetikzError, RetikzError, RetikzFoundationError, RetikzFoundationErrorCode } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

type DemoDetails = Readonly<{ source: string }>;

const RetikzDemoErrorCode = {
  Failed: 'DEMO_FAILED',
} as const;

type RetikzDemoErrorCode = ValueOf<typeof RetikzDemoErrorCode>;

class RetikzDemoError extends RetikzError<RetikzDemoErrorCode, DemoDetails> {
  constructor(details: DemoDetails, cause?: unknown, includeCause = cause !== undefined) {
    super(
      includeCause
        ? { code: RetikzDemoErrorCode.Failed, message: 'Demo failed', details, cause }
        : { code: RetikzDemoErrorCode.Failed, message: 'Demo failed', details },
    );
  }
}

describe('RetikzError', () => {
  it('保留子类标识、机器字段和详细信息标识', () => {
    const details = { source: 'test' } as const;
    const cause = { reason: 'input' };
    const error = new RetikzDemoError(details, cause);

    expect(error).toBeInstanceOf(RetikzDemoError);
    expect(error).toBeInstanceOf(RetikzError);
    expect(error.name).toBe('RetikzDemoError');
    expect(error.code).toBe(RetikzDemoErrorCode.Failed);
    expect(error.message).toBe('Demo failed');
    expect(error.details).toBe(details);
    expect(error.cause).toBe(cause);
    expect(Object.isFrozen(error.details)).toBe(false);
  });

  it('始终拥有原因属性，包括省略该选项时', () => {
    const omittedCause = new RetikzDemoError({ source: 'test' }, undefined, false);
    const explicitUndefinedCause = new RetikzDemoError({ source: 'test' }, undefined, true);

    for (const error of [omittedCause, explicitUndefinedCause]) {
      expect(Object.hasOwn(error, 'cause')).toBe(true);
      expect(error.cause).toBeUndefined();
      expect(Object.getOwnPropertyNames(error)).toContain('cause');
    }
  });

  it('对 Foundation 层次结构进行分类，但不对形状兼容的对象进行分类', () => {
    const error = new RetikzDemoError({ source: 'test' });
    const forged = { code: RetikzDemoErrorCode.Failed, details: { source: 'test' }, message: 'Demo failed' };

    expect(isRetikzError(error)).toBe(true);
    expect(isRetikzError(forged)).toBe(false);
    expect('toJSON' in error).toBe(false);
    expect('toDiagnostic' in error).toBe(false);
  });
});

describe('RetikzFoundationError', () => {
  it('对单个消息参数使用 Foundation 默认代码', () => {
    const error = new RetikzFoundationError('Foundation failed');

    expect(error.code).toBe(RetikzFoundationErrorCode.Default);
    expect(error.message).toBe('Foundation failed');
    expect(error.details).toEqual({});
  });

  it('公开静态颜色原子的稳定颜色错误代码', () => {
    expect(RetikzFoundationErrorCode.Color).toBe('FOUNDATION_COLOR_ERROR');
  });
});
