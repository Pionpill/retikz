import { describe, expect, it, vi } from 'vitest';

import { createMathJaxEngine } from '../../src';
import { RetikzTexError, RetikzTexErrorCode } from '../../src/error';

const { initializationFailure } = vi.hoisted(() => ({
  initializationFailure: new Error('synthetic MathJax initialization failure'),
}));

vi.mock('mathjax-full/js/mathjax.js', () => {
  throw initializationFailure;
});

describe('[mathjax-engine] initialization failure', () => {
  it('统一包装为 RetikzTexError，并保留原始 cause 与通用诊断', async () => {
    try {
      await createMathJaxEngine();
      expect.fail('expected MathJax initialization to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzTexError);
      const texError = error as RetikzTexError;
      expect(texError.code).toBe(RetikzTexErrorCode.MathJax);
      expect(texError.cause).toBeInstanceOf(Error);
      expect((texError.cause as Error & { cause?: unknown }).cause).toBe(initializationFailure);
      expect(texError.message).toContain('failed to initialize MathJax');
      expect(texError.message).not.toContain('not installed');
    }
  });
});
