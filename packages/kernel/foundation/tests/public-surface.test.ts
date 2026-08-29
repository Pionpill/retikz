import type { AssertEqual, NonEmptyReadonlyArray, ParsedCssColor, WithRequiredProperties } from '@retikz/foundation';

import * as foundation from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

type RequiredName = WithRequiredProperties<Readonly<{ name?: string; note?: string }>, 'name'>;
type NonEmptyNumbers = NonEmptyReadonlyArray<number>;

const withRequiredPropertiesContract: AssertEqual<RequiredName, Readonly<{ name: string; note?: string }>> = true;
const nonEmptyReadonlyArrayContract: AssertEqual<NonEmptyNumbers, readonly [number, ...Array<number>]> = true;
const parsedCssColorContract: ParsedCssColor = { r: 0, g: 0.5, b: 1, a: 1 };

describe('foundation public surface', () => {
  it('exports only the eighteen runtime symbols from its root', () => {
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
        'assertPlainDataContainers',
        'assertNonEmptyString',
        'assertPositiveNumber',
        'cloneAndFreezeJson',
        'compositeOpaqueColor',
        'createOpenStringSchema',
        'createReadonlyMap',
        'isRetikzError',
        'parseStaticCssColor',
      ].sort(),
    );
  });

  it('exports type-only root contracts without adding runtime symbols', () => {
    expect(withRequiredPropertiesContract).toBe(true);
    expect(nonEmptyReadonlyArrayContract).toBe(true);
    expect(parsedCssColorContract).toEqual({ r: 0, g: 0.5, b: 1, a: 1 });
  });

  it.each(['types', 'schema', 'assert', 'collections', 'color', 'error', 'json'])(
    'rejects the %s subpath',
    async subpath => {
      await expect(import(/* @vite-ignore */ `@retikz/foundation/${subpath}`)).rejects.toThrow();
    },
  );
});
