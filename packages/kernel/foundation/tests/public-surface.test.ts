import * as foundation from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('foundation public surface', () => {
  it('exports only the declared runtime symbols from its root', () => {
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
        'StaticCssNamedColorHexByName',
        'JsonObjectSchema',
        'JsonValueSchema',
        'assertPlainDataContainers',
        'assertNonEmptyString',
        'assertPositiveNumber',
        'cloneAndFreezeJson',
        'compositeOpaqueColor',
        'createOpenStringSchema',
        'createReadonlyMap',
        'isRetikzError',
        'mergeProperties',
        'parseStaticCssColor',
      ].sort(),
    );
  });

  it.each(['types', 'schema', 'assert', 'collections', 'objects', 'color', 'error', 'json'])(
    'rejects the %s subpath',
    async subpath => {
      await expect(import(/* @vite-ignore */ `@retikz/foundation/${subpath}`)).rejects.toThrow();
    },
  );
});
