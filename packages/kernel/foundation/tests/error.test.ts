import type { ValueOf } from '@retikz/foundation';

import { isRetikzError, RetikzError, RetikzFoundationError, RetikzFoundationErrorCode } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

type DemoDetails = Readonly<{ source: string }>;

const RetikzDemoErrorCode = {
  Failed: 'DEMO_FAILED',
} as const;

type RetikzDemoErrorCodeValue = ValueOf<typeof RetikzDemoErrorCode>;

class RetikzDemoError extends RetikzError<RetikzDemoErrorCodeValue, DemoDetails> {
  constructor(details: DemoDetails, cause?: unknown, includeCause = cause !== undefined) {
    super(
      includeCause
        ? { code: RetikzDemoErrorCode.Failed, message: 'Demo failed', details, cause }
        : { code: RetikzDemoErrorCode.Failed, message: 'Demo failed', details },
    );
  }
}

describe('RetikzError', () => {
  it('keeps subclass identity, machine fields, and details identity', () => {
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

  it('always owns a cause property, including when the option is omitted', () => {
    const omittedCause = new RetikzDemoError({ source: 'test' }, undefined, false);
    const explicitUndefinedCause = new RetikzDemoError({ source: 'test' }, undefined, true);

    for (const error of [omittedCause, explicitUndefinedCause]) {
      expect(Object.hasOwn(error, 'cause')).toBe(true);
      expect(error.cause).toBeUndefined();
      expect(Object.getOwnPropertyNames(error)).toContain('cause');
    }
  });

  it('classifies the Foundation hierarchy but not shape-compatible objects', () => {
    const error = new RetikzDemoError({ source: 'test' });
    const forged = { code: RetikzDemoErrorCode.Failed, details: { source: 'test' }, message: 'Demo failed' };

    expect(isRetikzError(error)).toBe(true);
    expect(isRetikzError(forged)).toBe(false);
    expect('toJSON' in error).toBe(false);
    expect('toDiagnostic' in error).toBe(false);
  });
});

describe('RetikzFoundationError', () => {
  it('uses the Foundation default code for a single message argument', () => {
    const error = new RetikzFoundationError('Foundation failed');

    expect(error.code).toBe(RetikzFoundationErrorCode.Default);
    expect(error.message).toBe('Foundation failed');
    expect(error.details).toEqual({});
  });
});
