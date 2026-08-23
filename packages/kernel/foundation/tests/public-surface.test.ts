import type { AssertEqual, WithRequiredProperties } from '@retikz/foundation';

import * as foundation from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

type RequiredName = WithRequiredProperties<Readonly<{ name?: string; note?: string }>, 'name'>;

const withRequiredPropertiesContract: AssertEqual<RequiredName, Readonly<{ name: string; note?: string }>> = true;

describe('foundation public surface', () => {
  it('exports only the fourteen runtime symbols from its root', () => {
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
        'cloneAndFreezeJson',
        'createOpenStringSchema',
        'cloneAndFreezeJson',
        'createOpenStringSchema',
        'isRetikzError',
      ].sort(),
    );
  });

  it('exports WithRequiredProperties as a type-only root contract', () => {
    expect(withRequiredPropertiesContract).toBe(true);
  });

  it.each(['types', 'schema', 'assert', 'error', 'json'])('rejects the %s subpath', async subpath => {
    await expect(import(/* @vite-ignore */ `@retikz/foundation/${subpath}`)).rejects.toThrow();
  });
});
