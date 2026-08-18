import type { IRJsonObject, JsonValue } from '@retikz/core';

import { assertNonEmptyString } from '@retikz/foundation';

import type { AnyInspectorDefinition, InspectorDefinition } from './types';

import { RetikzInspectionError, RetikzInspectionErrorCode } from '../../error';

const assertInspectorString: (value: unknown, label: string) => asserts value is string = (value, label) => {
  if (typeof value !== 'string')
    throw new RetikzInspectionError(RetikzInspectionErrorCode.Contract, `${label} must be a non-empty string`);
  assertNonEmptyString(value, label);
};

/** 校验 Inspector owner 判别字段 */
const assertValidOwner = (owner: unknown): void => {
  if (typeof owner !== 'object' || owner === null)
    throw new RetikzInspectionError(RetikzInspectionErrorCode.Contract, 'Inspector owner must be an object');
  const kind = Reflect.get(owner, 'kind');
  if (kind === 'pathKind') {
    const name = Reflect.get(owner, 'name');
    if (typeof name === 'string') {
      assertNonEmptyString(name, 'Inspector owner name');
      return;
    }
  }
  if (kind === 'composite') {
    const namespace = Reflect.get(owner, 'namespace');
    const type = Reflect.get(owner, 'type');
    if (typeof namespace === 'string' && typeof type === 'string') {
      assertNonEmptyString(namespace, 'Inspector owner namespace');
      assertNonEmptyString(type, 'Inspector owner type');
      return;
    }
  }
  throw new RetikzInspectionError(
    RetikzInspectionErrorCode.Contract,
    'Inspector owner must identify a non-empty composite or pathKind',
  );
};

/** 校验 Inspector schema 是否提供同步 parse 边界 */
const assertSchema = (schema: unknown, field: string): void => {
  if (typeof schema !== 'object' || schema === null || typeof Reflect.get(schema, 'parse') !== 'function') {
    throw new RetikzInspectionError(RetikzInspectionErrorCode.Contract, `Inspector ${field} must be a Zod schema`);
  }
};

/** registry 与公开 define 共用的擦除后 Definition 校验 */
export const normalizeInspectorDefinition = (input: unknown): AnyInspectorDefinition => {
  if (typeof input !== 'object' || input === null)
    throw new RetikzInspectionError(RetikzInspectionErrorCode.Contract, 'Inspector definition must be an object');
  const definition = input as AnyInspectorDefinition;
  assertInspectorString(definition.namespace, 'Inspector namespace');
  assertInspectorString(definition.name, 'Inspector name');
  assertValidOwner(definition.owner);
  assertSchema(definition.subjectSchema, 'subjectSchema');
  assertSchema(definition.optionsInputSchema, 'optionsInputSchema');
  assertSchema(definition.optionsSchema, 'optionsSchema');
  if (definition.mergeOptionsInput !== undefined && typeof definition.mergeOptionsInput !== 'function') {
    throw new RetikzInspectionError(
      RetikzInspectionErrorCode.Contract,
      'Inspector mergeOptionsInput must be a function',
    );
  }
  if (typeof definition.inspect !== 'function')
    throw new RetikzInspectionError(RetikzInspectionErrorCode.Contract, 'Inspector inspect must be a function');
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
