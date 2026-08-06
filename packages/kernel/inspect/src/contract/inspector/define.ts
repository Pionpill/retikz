import type { IRJsonObject, JsonValue } from '@retikz/core';

import type { AnyInspectorDefinition, InspectorDefinition } from './types';

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** 校验 Inspector owner 判别字段 */
const assertValidOwner = (owner: unknown): void => {
  if (typeof owner !== 'object' || owner === null) throw new Error('Inspector owner must be an object');
  const kind = Reflect.get(owner, 'kind');
  if (kind === 'pathKind' && isNonEmptyString(Reflect.get(owner, 'name'))) return;
  if (
    kind === 'composite' &&
    isNonEmptyString(Reflect.get(owner, 'namespace')) &&
    isNonEmptyString(Reflect.get(owner, 'type'))
  ) {
    return;
  }
  throw new Error('Inspector owner must identify a non-empty composite or pathKind');
};

/** 校验 Inspector schema 是否提供同步 parse 边界 */
const assertSchema = (schema: unknown, field: string): void => {
  if (typeof schema !== 'object' || schema === null || typeof Reflect.get(schema, 'parse') !== 'function') {
    throw new Error(`Inspector ${field} must be a Zod schema`);
  }
};

/** registry 与公开 define 共用的擦除后 Definition 校验 */
export const normalizeInspectorDefinition = (input: unknown): AnyInspectorDefinition => {
  if (typeof input !== 'object' || input === null) throw new Error('Inspector definition must be an object');
  const definition = input as AnyInspectorDefinition;
  if (typeof definition.namespace !== 'string' || definition.namespace.trim().length === 0) {
    throw new Error('Inspector namespace must be a non-empty string');
  }
  if (typeof definition.name !== 'string' || definition.name.trim().length === 0) {
    throw new Error('Inspector name must be a non-empty string');
  }
  assertValidOwner(definition.owner);
  assertSchema(definition.subjectSchema, 'subjectSchema');
  assertSchema(definition.optionsInputSchema, 'optionsInputSchema');
  assertSchema(definition.optionsSchema, 'optionsSchema');
  if (definition.mergeOptionsInput !== undefined && typeof definition.mergeOptionsInput !== 'function') {
    throw new Error('Inspector mergeOptionsInput must be a function');
  }
  if (typeof definition.inspect !== 'function') throw new Error('Inspector inspect must be a function');
  return Object.freeze({ ...definition, owner: Object.freeze({ ...definition.owner }) });
};

/** 校验并冻结一个独立 Inspector Definition */
export const defineInspector = <
  TSubject extends JsonValue,
  TOptionsInput extends IRJsonObject,
  TResolvedOptions extends IRJsonObject,
>(
  definition: InspectorDefinition<TSubject, TOptionsInput, TResolvedOptions>,
): InspectorDefinition<TSubject, TOptionsInput, TResolvedOptions> => {
  return normalizeInspectorDefinition(definition) as unknown as InspectorDefinition<
    TSubject,
    TOptionsInput,
    TResolvedOptions
  >;
};
