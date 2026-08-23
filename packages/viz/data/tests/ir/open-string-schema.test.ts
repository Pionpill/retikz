import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { DataFieldFormat, FieldFormatSchema } from '../../src';

describe('Data registry-backed open string schemas', () => {
  it('hints built-in formats while preserving custom provider names', () => {
    expect(z.toJSONSchema(FieldFormatSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(DataFieldFormat) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(FieldFormatSchema.parse(DataFieldFormat.NumberString)).toBe(DataFieldFormat.NumberString);
    expect(FieldFormatSchema.parse('custom.currency')).toBe('custom.currency');
    expect(() => FieldFormatSchema.parse('   ')).toThrow();
  });
});
