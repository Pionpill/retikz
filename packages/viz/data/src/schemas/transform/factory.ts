import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { literal, strictObject } from 'zod';

/** 组合变换判别字段与参数契约，内置及扩展共享同一严格外壳 */
export const createTransformSchema = <
  const TKind extends string,
  TParamsSchema extends ZodType<Record<string, JsonValue>, Record<string, JsonValue>>,
>(
  kind: TKind,
  paramsSchema: TParamsSchema,
) =>
  strictObject({
    kind: literal(kind).describe('Transform operation discriminator'),
    params: paramsSchema,
  });
