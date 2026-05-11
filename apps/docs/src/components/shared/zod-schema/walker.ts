import { type ZodTypeAny, z } from 'zod';
import type { TypeRepr } from './types';
import { lookupSchema } from '@/lib/schema-registry';

/** 类型层 walker；下方 walk() 是顶层入口（处理 object vs alias）—— 在后续 task 中追加 */
export function walkType(schema: ZodTypeAny): TypeRepr {
  // 优先查注册表（identity）—— 命中即返回 ref，截断展开
  const reg = lookupSchema(schema);
  if (reg) return { kind: 'ref', name: reg.label, url: reg.url };

  if (schema instanceof z.ZodString)  return { kind: 'primitive', name: 'string' };
  if (schema instanceof z.ZodNumber)  return { kind: 'primitive', name: 'number' };
  if (schema instanceof z.ZodBoolean) return { kind: 'primitive', name: 'boolean' };
  if (schema instanceof z.ZodLiteral) return { kind: 'literal', value: schema.value };

  if (schema instanceof z.ZodEnum) {
    return { kind: 'enum', values: schema.options as ReadonlyArray<string> };
  }
  if (schema instanceof z.ZodNativeEnum) {
    return { kind: 'enum', values: Object.values(schema.enum) };
  }
  if (schema instanceof z.ZodArray) {
    const constraints: Array<string> = [];
    if (schema._def.minLength) constraints.push(`min ${schema._def.minLength.value}`);
    if (schema._def.maxLength) constraints.push(`max ${schema._def.maxLength.value}`);
    return {
      kind: 'array',
      element: walkType(schema._def.type),
      constraints,
    };
  }

  if (schema instanceof z.ZodTuple) {
    return {
      kind: 'tuple',
      elements: (schema._def.items as Array<ZodTypeAny>).map(walkType),
    };
  }
  if (schema instanceof z.ZodLazy) {
    return walkType(schema._def.getter());
  }
  if (schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion) {
    const options =
      schema instanceof z.ZodDiscriminatedUnion
        ? Array.from((schema as z.ZodDiscriminatedUnion<string, Array<z.ZodObject<z.ZodRawShape>>>).options)
        : (schema._def.options as Array<ZodTypeAny>);
    return { kind: 'union', members: options.map(walkType) };
  }

  return { kind: 'unknown', note: `unhandled: ${schema._def?.typeName ?? 'no typeName'}` };
}
