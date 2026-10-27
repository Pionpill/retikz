import * as foundation from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('基础公共面', () => {
  it('仅从其根导出声明的运行时符号', () => {
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
        'staticCssNamedColorHexByName',
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
        'jsonStructuralEquals',
        'mergeDefinedProperties',
        'mergeProperties',
        'parseStaticCssColor',
      ].sort(),
    );
  });

  it.each(['types', 'schema', 'assert', 'collections', 'objects', 'color', 'error', 'json'])(
    '拒绝 %s 子路径',
    async subpath => {
      await expect(import(/* @vite-ignore */ `@retikz/foundation/${subpath}`)).rejects.toThrow();
    },
  );
});
