import type { IRJsonObject, JsonValue } from '@retikz/core';

import { assertNonEmptyString as assertFoundationNonEmptyString } from '@retikz/foundation';

import type { AnyInspectorDefinition, InspectorDefinition } from './types';

const assertInspectorString: (value: unknown, message: string) => asserts value is string = (value, message) => {
  if (typeof value !== 'string') throw new Error(message);
  try {
    assertFoundationNonEmptyString(value, message);
  } catch {
    throw new Error(message);
  }
};

/** 校验 Inspector owner 判别字段 */
const assertValidOwner = (owner: unknown): void => {
  if (typeof owner !== 'object' || owner === null) throw new Error('Inspector owner must be an object');
  const kind = Reflect.get(owner, 'kind');
  if (kind === 'pathKind') {
    const name = Reflect.get(owner, 'name');
    if (typeof name === 'string') {
      try {
        assertFoundationNonEmptyString(name, 'Inspector owner name');
        return;
      } catch {
        // 继续抛出既有 owner 错误
      }
    }
  }
  if (kind === 'composite') {
    const namespace = Reflect.get(owner, 'namespace');
    const type = Reflect.get(owner, 'type');
    if (typeof namespace === 'string' && typeof type === 'string') {
      try {
        assertFoundationNonEmptyString(namespace, 'Inspector owner namespace');
        assertFoundationNonEmptyString(type, 'Inspector owner type');
        return;
      } catch {
        // 继续抛出既有 owner 错误
      }
    }
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
  assertInspectorString(definition.namespace, 'Inspector namespace must be a non-empty string');
  assertInspectorString(definition.name, 'Inspector name must be a non-empty string');
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
