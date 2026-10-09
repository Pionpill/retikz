import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { literal, strictObject } from 'zod';

/**
 * 组合变换判别字段与参数契约，内置及扩展共享同一严格外壳
 * @template TKind 变换操作的固定注册名称
 * @template TParamsSchema 参数对象的输入与解析契约
 * @param kind 完整操作的固定名称
 * @param paramsSchema 参数对象的 schema，保留其默认值与校验约束
 * @returns 包含 kind 和必填 params 的严格对象 schema
 */
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
