import * as foundation from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('foundation public surface', () => {
  it('exports only the thirteen runtime symbols from its root', () => {
    expect(Object.keys(foundation).sort()).toEqual(
      [
        'NonBlankStringSchema',
        'NonNegativeIntegerSchema',
        'NonNegativeNumberSchema',
        'NormalizedFractionSchema',
        'PositiveIntegerSchema',
        'PositiveNumberSchema',
        'RetikzError',
        'RetikzFoundationError',
        'RetikzFoundationErrorCode',
        'assertNonEmptyString',
        'assertPositiveNumber',
        'createReadonlyMap',
        'isRetikzError',
      ].sort(),
    );
  });

  it.each(['types', 'schema', 'assert', 'collections', 'error'])('rejects the %s subpath', async subpath => {
    await expect(import(/* @vite-ignore */ `@retikz/foundation/${subpath}`)).rejects.toThrow();
  });
});
