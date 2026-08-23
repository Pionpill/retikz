import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  TableCellFormatter,
  TableCellFormatterNameSchema,
  TableCellPresentation,
  TableCellPresentationNameSchema,
  TableCellVisualScale,
  TableCellVisualScaleNameSchema,
} from '../../src';

const expectOpenStringSchema = (schema: z.ZodType, values: ReadonlyArray<string>): void => {
  expect(z.toJSONSchema(schema)).toMatchObject({
    anyOf: [
      { type: 'string', enum: values },
      { type: 'string', minLength: 1 },
    ],
  });
};

describe('Table registry-backed open string schemas', () => {
  it('hints all built-in provider names without closing custom registries', () => {
    expectOpenStringSchema(TableCellFormatterNameSchema, Object.values(TableCellFormatter));
    expectOpenStringSchema(TableCellPresentationNameSchema, Object.values(TableCellPresentation));
    expectOpenStringSchema(TableCellVisualScaleNameSchema, Object.values(TableCellVisualScale));

    expect(TableCellFormatterNameSchema.parse('custom.formatter')).toBe('custom.formatter');
    expect(TableCellPresentationNameSchema.parse('custom.presentation')).toBe('custom.presentation');
    expect(TableCellVisualScaleNameSchema.parse('custom.visual-scale')).toBe('custom.visual-scale');
    expect(() => TableCellFormatterNameSchema.parse('   ')).toThrow();
    expect(() => TableCellPresentationNameSchema.parse('   ')).toThrow();
    expect(() => TableCellVisualScaleNameSchema.parse('   ')).toThrow();
  });
});
