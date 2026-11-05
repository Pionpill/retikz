import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import { toJSONSchema } from 'zod';

import {
  ArrowShapeSchema,
  BuiltinArrowShape,
  BuiltinShape,
  BuiltinPatternShape,
  PatternShapeNameSchema,
  ShapeNameSchema,
} from '../src';

const expectOpenStringSchema = (schema: ZodType, values: ReadonlyArray<string>): void => {
  expect(toJSONSchema(schema)).toMatchObject({
    anyOf: [
      { type: 'string', enum: values },
      { type: 'string', minLength: 1 },
    ],
  });
};

describe('Core 注册表支持的开放字符串 schema', () => {
  it('公开内置形状词汇表而不关闭自定义名称', () => {
    expectOpenStringSchema(ShapeNameSchema, Object.values(BuiltinShape));
    expectOpenStringSchema(ArrowShapeSchema, Object.values(BuiltinArrowShape));
    expectOpenStringSchema(PatternShapeNameSchema, Object.values(BuiltinPatternShape));
  });
});
