import { z } from 'zod';

import type { ObjectField, SchemaRepr, TypeRepr } from './types';

import { lookupSchema } from './schema-registry';

type AnySchema = z.core.$ZodType;

function descriptionOf(schema: AnySchema): string | undefined {
  return z.globalRegistry.get(schema)?.description;
}

const isGreaterThan = (def: z.core.$ZodCheckDef): def is z.core.$ZodCheckGreaterThanDef => def.check === 'greater_than';
const isLessThan = (def: z.core.$ZodCheckDef): def is z.core.$ZodCheckLessThanDef => def.check === 'less_than';
const isMinLength = (def: z.core.$ZodCheckDef): def is z.core.$ZodCheckMinLengthDef => def.check === 'min_length';
const isMaxLength = (def: z.core.$ZodCheckDef): def is z.core.$ZodCheckMaxLengthDef => def.check === 'max_length';

function checkDefsOf(schema: {
  def: { checks?: ReadonlyArray<z.core.$ZodCheck<never>> | undefined };
}): Array<z.core.$ZodCheckDef> {
  return (schema.def.checks ?? []).map(check => check._zod.def);
}

const MAX_DEPTH = 16;

type WalkCtx = { seen: ReadonlySet<AnySchema>; depth: number };

const ROOT_CTX: WalkCtx = { seen: new Set(), depth: 0 };

function truncated(schema: AnySchema): TypeRepr {
  const reg = lookupSchema(schema);
  return reg ? { kind: 'ref', name: reg.label, url: reg.url } : { kind: 'unknown', note: 'recursive' };
}

function walkTypeImpl(schema: AnySchema, skipRegistry: boolean, ctx: WalkCtx = ROOT_CTX): TypeRepr {
  if (!skipRegistry) {
    const reg = lookupSchema(schema);
    if (reg) return { kind: 'ref', name: reg.label, url: reg.url };
  }

  if (ctx.seen.has(schema) || ctx.depth >= MAX_DEPTH) return truncated(schema);
  const next: WalkCtx = { seen: new Set(ctx.seen).add(schema), depth: ctx.depth + 1 };

  if (schema instanceof z.ZodString) return { kind: 'primitive', name: 'string' };
  if (schema instanceof z.ZodNumber) return { kind: 'primitive', name: 'number' };
  if (schema instanceof z.ZodBoolean) return { kind: 'primitive', name: 'boolean' };
  if (schema instanceof z.ZodNull) return { kind: 'literal', value: null };
  if (schema instanceof z.ZodLiteral) {
    const [value] = schema.values;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return { kind: 'literal', value };
    }
    return { kind: 'unknown', note: `unhandled literal: ${String(value)}` };
  }

  if (schema instanceof z.ZodEnum) {
    return { kind: 'enum', values: schema.options };
  }
  if (schema instanceof z.ZodArray) {
    const constraints: Array<string> = [];
    for (const def of checkDefsOf(schema)) {
      if (isMinLength(def)) constraints.push(`min ${def.minimum}`);
      else if (isMaxLength(def)) constraints.push(`max ${def.maximum}`);
    }
    return {
      kind: 'array',
      element: walkTypeImpl(schema.element, false, next),
      constraints,
    };
  }

  if (schema instanceof z.ZodTuple) {
    return {
      kind: 'tuple',
      elements: schema.def.items.map(item => walkTypeImpl(item, false, next)),
    };
  }
  if (schema instanceof z.ZodLazy) {
    return walkTypeImpl(schema.unwrap(), false, next);
  }
  if (schema instanceof z.ZodUnion) {
    return { kind: 'union', members: schema.options.map(member => walkTypeImpl(member, false, next)) };
  }

  if (schema instanceof z.ZodObject) {
    return {
      kind: 'object',
      fields: extractFields(schema, next),
      additionalProperties: schema.def.catchall instanceof z.ZodUnknown,
    };
  }

  return { kind: 'unknown', note: `unhandled: ${schema._zod.def.type}` };
}

export function walkType(schema: AnySchema): TypeRepr {
  return walkTypeImpl(schema, false);
}

export function walk(schema: AnySchema): SchemaRepr {
  let s = schema;
  while (s instanceof z.ZodLazy) s = s.unwrap();
  const topDesc = descriptionOf(s);

  if (s instanceof z.ZodObject) {
    return { kind: 'object', description: topDesc, fields: extractFields(s, { seen: new Set([s]), depth: 1 }) };
  }
  return { kind: 'alias', description: topDesc, type: walkTypeImpl(s, true, ROOT_CTX) };
}

function extractFields(obj: z.ZodObject, ctx: WalkCtx = ROOT_CTX): Array<ObjectField> {
  return Object.entries(obj.shape).map(([name, raw]) => {
    const { inner, optional } = unwrapOptional(raw);
    return {
      name,
      type: walkTypeImpl(inner, false, ctx),
      optional,
      description: descriptionOf(inner) ?? descriptionOf(raw),
      constraints: extractConstraints(inner),
    };
  });
}

function unwrapOptional(schema: AnySchema): { inner: AnySchema; optional: boolean } {
  if (schema instanceof z.ZodOptional) {
    return { inner: schema.unwrap(), optional: true };
  }
  return { inner: schema, optional: false };
}

function extractConstraints(schema: AnySchema): Array<string> {
  const out: Array<string> = [];
  if (schema instanceof z.ZodNumber) {
    const defs = checkDefsOf(schema);
    const min = defs.find(isGreaterThan);
    const max = defs.find(isLessThan);
    if (min?.value === 0 && min.inclusive && max?.value === 1 && max.inclusive) {
      return ['0..1'];
    }
    if (min?.value === 0 && !max) {
      out.push(min.inclusive ? 'nonnegative' : 'positive');
    } else {
      if (min) out.push(min.inclusive ? `min ${min.value}` : `> ${min.value}`);
      if (max) out.push(max.inclusive ? `max ${max.value}` : `< ${max.value}`);
    }
  }
  if (schema instanceof z.ZodString) {
    for (const def of checkDefsOf(schema)) {
      if (isMinLength(def)) out.push(`min ${def.minimum}`);
      else if (isMaxLength(def)) out.push(`max ${def.maximum}`);
    }
  }
  return out;
}
