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

  return { kind: 'unknown', note: `unhandled: ${schema._def?.typeName ?? 'no typeName'}` };
}
