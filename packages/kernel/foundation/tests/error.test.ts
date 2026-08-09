import { isRetikzError, RetikzError } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

type DemoDetails = Readonly<{ source: string }>;

class DemoError extends RetikzError<'DEMO_FAILED', DemoDetails> {
  constructor(details: DemoDetails, cause?: unknown, includeCause = cause !== undefined) {
    super(
      includeCause
        ? { code: 'DEMO_FAILED', message: 'Demo failed', details, cause }
        : { code: 'DEMO_FAILED', message: 'Demo failed', details },
    );
  }
}

describe('RetikzError', () => {
  it('keeps subclass identity, machine fields, and details identity', () => {
    const details = { source: 'test' } as const;
    const cause = { reason: 'input' };
    const error = new DemoError(details, cause);

    expect(error).toBeInstanceOf(DemoError);
    expect(error).toBeInstanceOf(RetikzError);
    expect(error.name).toBe('DemoError');
    expect(error.code).toBe('DEMO_FAILED');
    expect(error.message).toBe('Demo failed');
    expect(error.details).toBe(details);
    expect(error.cause).toBe(cause);
    expect(Object.isFrozen(error.details)).toBe(false);
  });

  it('always owns a cause property, including when the option is omitted', () => {
    const omittedCause = new DemoError({ source: 'test' }, undefined, false);
    const explicitUndefinedCause = new DemoError({ source: 'test' }, undefined, true);

    for (const error of [omittedCause, explicitUndefinedCause]) {
      expect(Object.hasOwn(error, 'cause')).toBe(true);
      expect(error.cause).toBeUndefined();
      expect(Object.getOwnPropertyNames(error)).toContain('cause');
    }
  });

  it('classifies the Foundation hierarchy but not shape-compatible objects', () => {
    const error = new DemoError({ source: 'test' });
    const forged = { code: 'DEMO_FAILED', details: { source: 'test' }, message: 'Demo failed' };

    expect(isRetikzError(error)).toBe(true);
    expect(isRetikzError(forged)).toBe(false);
    expect('toJSON' in error).toBe(false);
    expect('toDiagnostic' in error).toBe(false);
  });
});
