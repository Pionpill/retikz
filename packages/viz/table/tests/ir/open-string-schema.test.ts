import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import { toJSONSchema } from 'zod';

import {
  BuiltinTableCellFormatter,
  TableCellFormatterNameSchema,
  BuiltinTableCellPresentation,
  TableCellPresentationNameSchema,
  BuiltinTableCellVisualScale,
  TableCellVisualScaleNameSchema,
} from '../../src';

const expectOpenStringSchema = (schema: ZodType, values: ReadonlyArray<string>): void => {
  expect(toJSONSchema(schema)).toMatchObject({
    anyOf: [
      { type: 'string', enum: values },
      { type: 'string', minLength: 1 },
    ],
  });
};

describe('Table 注册表支持的开放字符串 schema', () => {
  it('提示所有内置提供者名称，而不关闭自定义注册表', () => {
    expectOpenStringSchema(TableCellFormatterNameSchema, Object.values(BuiltinTableCellFormatter));
    expectOpenStringSchema(TableCellPresentationNameSchema, Object.values(BuiltinTableCellPresentation));
    expectOpenStringSchema(TableCellVisualScaleNameSchema, Object.values(BuiltinTableCellVisualScale));

    expect(TableCellFormatterNameSchema.parse('custom.formatter')).toBe('custom.formatter');
    expect(TableCellPresentationNameSchema.parse('custom.presentation')).toBe('custom.presentation');
    expect(TableCellVisualScaleNameSchema.parse('custom.visual-scale')).toBe('custom.visual-scale');
    expect(() => TableCellFormatterNameSchema.parse('   ')).toThrow();
    expect(() => TableCellPresentationNameSchema.parse('   ')).toThrow();
    expect(() => TableCellVisualScaleNameSchema.parse('   ')).toThrow();
  });
});
