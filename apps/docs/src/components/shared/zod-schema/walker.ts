import { type ZodTypeAny, z } from 'zod';
import type { ObjectField, SchemaRepr, TypeRepr } from './types';
import { lookupSchema } from '@/lib/schema-registry';

/** 类型层 walker 内部实现；skipRegistry=true 时绕过注册表（顶层 alias 展开用） */
function walkTypeImpl(schema: ZodTypeAny, skipRegistry: boolean): TypeRepr {
  if (!skipRegistry) {
    // 优先查注册表（identity）—— 命中即返回 ref，截断展开
    const reg = lookupSchema(schema);
    if (reg) return { kind: 'ref', name: reg.label, url: reg.url };
  }

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

  if (schema instanceof z.ZodObject) {
    return { kind: 'object', fields: extractFields(schema) };
  }

  return { kind: 'unknown', note: `unhandled: ${schema._def?.typeName ?? 'no typeName'}` };
}

/** 类型层 walker；下方 walk() 是顶层入口（处理 object vs alias） */
export function walkType(schema: ZodTypeAny): TypeRepr {
  return walkTypeImpl(schema, false);
}

/** 顶层入口：把整个 schema 走成 SchemaRepr（区分 object 与 alias） */
export function walk(schema: ZodTypeAny): SchemaRepr {
  let s = schema;
  while (s instanceof z.ZodLazy) s = s._def.getter();
  const topDesc = s.description;

  if (s instanceof z.ZodObject) {
    return { kind: 'object', description: topDesc, fields: extractFields(s) };
  }
  // 顶层 alias：绕过注册表，直接展开内部结构
  return { kind: 'alias', description: topDesc, type: walkTypeImpl(s, true) };
}

function extractFields(obj: z.ZodObject<z.ZodRawShape>): Array<ObjectField> {
  const shape: Record<string, ZodTypeAny> = obj.shape;
  return Object.entries(shape).map(([name, raw]) => {
    const { inner, optional } = unwrapOptional(raw);
    return {
      name,
      type: walkType(inner),
      optional,
      description: inner.description ?? raw.description,
      constraints: extractConstraints(inner),
    };
  });
}

function unwrapOptional(schema: ZodTypeAny): { inner: ZodTypeAny; optional: boolean } {
  if (schema instanceof z.ZodOptional) {
    return { inner: schema._def.innerType, optional: true };
  }
  return { inner: schema, optional: false };
}

function extractConstraints(schema: ZodTypeAny): Array<string> {
  const out: Array<string> = [];
  if (schema instanceof z.ZodNumber) {
    const checks = schema._def.checks;
    let hasMin = false;
    let hasMax = false;
    let minInclusive = true;
    let minValue: number | undefined;
    let maxValue: number | undefined;
    for (const c of checks) {
      if (c.kind === 'min') { hasMin = true; minInclusive = c.inclusive; minValue = c.value; }
      else if (c.kind === 'max') { hasMax = true; maxValue = c.value; }
    }
    // 0..1 简写
    if (hasMin && hasMax && minValue === 0 && maxValue === 1 && minInclusive) {
      return ['0..1'];
    }
    // .positive() / .nonnegative() 显示别名
    if (hasMin && minValue === 0 && !hasMax) {
      out.push(minInclusive ? 'nonnegative' : 'positive');
    } else {
      for (const c of checks) {
        if (c.kind === 'min') out.push(c.inclusive ? `min ${c.value}` : `> ${c.value}`);
        else if (c.kind === 'max') out.push(c.inclusive ? `max ${c.value}` : `< ${c.value}`);
      }
    }
  }
  if (schema instanceof z.ZodString) {
    for (const c of schema._def.checks) {
      if (c.kind === 'min') out.push(`min ${c.value}`);
      else if (c.kind === 'max') out.push(`max ${c.value}`);
    }
  }
  return out;
}
