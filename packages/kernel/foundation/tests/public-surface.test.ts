import type { AssertEqual, NonEmptyReadonlyArray, WithRequiredProperties } from '@retikz/foundation';

import * as foundation from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

type RequiredName = WithRequiredProperties<Readonly<{ name?: string; note?: string }>, 'name'>;
type NonEmptyNumbers = NonEmptyReadonlyArray<number>;

const withRequiredPropertiesContract: AssertEqual<RequiredName, Readonly<{ name: string; note?: string }>> = true;
const nonEmptyReadonlyArrayContract: AssertEqual<NonEmptyNumbers, readonly [number, ...Array<number>]> = true;

describe('foundation public surface', () => {
  it('exports only the fifteen runtime symbols from its root', () => {
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
        'createReadonlyMap',
        'isRetikzError',
      ].sort(),
    );
  });

  it('exports type-only root contracts without adding runtime symbols', () => {
    expect(withRequiredPropertiesContract).toBe(true);
    expect(nonEmptyReadonlyArrayContract).toBe(true);
  });

  it.each(['types', 'schema', 'assert', 'collections', 'error', 'json'])('rejects the %s subpath', async subpath => {
    await expect(import(/* @vite-ignore */ `@retikz/foundation/${subpath}`)).rejects.toThrow();
  });
});
