import { z } from 'zod';
import type { ObjectField, SchemaRepr, TypeRepr } from './types';
import { lookupSchema } from '@/lib/schema-registry';

/** walker 通行的 schema 类型：v4 里 shape / options / element / unwrap 给出的都是 core 类型，classic 是其子类型 */
type AnySchema = z.core.$ZodType;

/** 读取 .describe(...) 文案；v4 描述存于 globalRegistry，core 类型上没有 description getter */
function descriptionOf(schema: AnySchema): string | undefined {
  return z.globalRegistry.get(schema)?.description;
}

const isGreaterThan = (def: z.core.$ZodCheckDef): def is z.core.$ZodCheckGreaterThanDef => def.check === 'greater_than';
const isLessThan = (def: z.core.$ZodCheckDef): def is z.core.$ZodCheckLessThanDef => def.check === 'less_than';
const isMinLength = (def: z.core.$ZodCheckDef): def is z.core.$ZodCheckMinLengthDef => def.check === 'min_length';
const isMaxLength = (def: z.core.$ZodCheckDef): def is z.core.$ZodCheckMaxLengthDef => def.check === 'max_length';

/** 取 schema 上挂的 check def 列表（min / max / length 等约束的单一来源） */
function checkDefsOf(schema: { def: { checks?: ReadonlyArray<z.core.$ZodCheck<never>> | undefined } }): Array<z.core.$ZodCheckDef> {
  return (schema.def.checks ?? []).map(check => check._zod.def);
}

/**
 * 递归深度上限：超过即截断展开，防止递归 schema（如 z.lazy 自引用的 between / target）
 * 在注册表 identity 截断失效时无限展开导致 collectFieldPaths 爆栈（Maximum call stack size exceeded）。
 * 实测 IR 中最深的合理嵌套远小于此值；正常 schema 不会触顶。
 */
const MAX_DEPTH = 16;

/** walk 的递归上下文：seen 走当前路径上的 schema 做环检测；depth 是深度上限的兜底守卫 */
type WalkCtx = { seen: ReadonlySet<AnySchema>; depth: number };

const ROOT_CTX: WalkCtx = { seen: new Set(), depth: 0 };

/** 命中环 / 触顶时的截断节点：能查到注册项则给 ref，否则标记 recursive */
function truncated(schema: AnySchema): TypeRepr {
  const reg = lookupSchema(schema);
  return reg ? { kind: 'ref', name: reg.label, url: reg.url } : { kind: 'unknown', note: 'recursive' };
}

/** 类型层 walker 内部实现；skipRegistry=true 时绕过注册表（顶层 alias 展开用） */
function walkTypeImpl(schema: AnySchema, skipRegistry: boolean, ctx: WalkCtx = ROOT_CTX): TypeRepr {
  if (!skipRegistry) {
    // 优先查注册表（identity）—— 命中即返回 ref，截断展开
    const reg = lookupSchema(schema);
    if (reg) return { kind: 'ref', name: reg.label, url: reg.url };
  }

  // 守卫：当前路径已见过本 schema（环），或深度触顶 —— 截断，避免无限展开 / 爆栈
  if (ctx.seen.has(schema) || ctx.depth >= MAX_DEPTH) return truncated(schema);
  const next: WalkCtx = { seen: new Set(ctx.seen).add(schema), depth: ctx.depth + 1 };

  if (schema instanceof z.ZodString)  return { kind: 'primitive', name: 'string' };
  if (schema instanceof z.ZodNumber)  return { kind: 'primitive', name: 'number' };
  if (schema instanceof z.ZodBoolean) return { kind: 'primitive', name: 'boolean' };
  if (schema instanceof z.ZodLiteral) {
    // v4 ZodLiteral 可承载多值；本仓 literal 均为单值，取第一个并窄化到可渲染类型
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
  // ZodDiscriminatedUnion 继承自 ZodUnion，一并覆盖
  if (schema instanceof z.ZodUnion) {
    return { kind: 'union', members: schema.options.map(member => walkTypeImpl(member, false, next)) };
  }

  if (schema instanceof z.ZodObject) {
    return { kind: 'object', fields: extractFields(schema, next) };
  }

  return { kind: 'unknown', note: `unhandled: ${schema._zod.def.type}` };
}

/** 类型层 walker；下方 walk() 是顶层入口（处理 object vs alias） */
export function walkType(schema: AnySchema): TypeRepr {
  return walkTypeImpl(schema, false);
}

/** 顶层入口：把整个 schema 走成 SchemaRepr（区分 object 与 alias） */
export function walk(schema: AnySchema): SchemaRepr {
  let s = schema;
  while (s instanceof z.ZodLazy) s = s.unwrap();
  const topDesc = descriptionOf(s);

  if (s instanceof z.ZodObject) {
    // 顶层 object 自身入 seen，防止其字段回指顶层时无限展开
    return { kind: 'object', description: topDesc, fields: extractFields(s, { seen: new Set([s]), depth: 1 }) };
  }
  // 顶层 alias：绕过注册表展开内部结构；不预置 s 进 seen，否则会被环守卫立即截断
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
    // 0..1 简写
    if (min?.value === 0 && min.inclusive && max?.value === 1 && max.inclusive) {
      return ['0..1'];
    }
    // .positive() / .nonnegative() 显示别名
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
