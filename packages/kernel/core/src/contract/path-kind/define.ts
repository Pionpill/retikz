import { assertNonEmptyString as assertFoundationNonEmptyString } from '@retikz/foundation';

import type { IRJsonObject, JsonValue } from '../../schemas';
import type { AnyPathKindDefinition, PathKindDefinition } from './types';

/** 保留普通与带 owner output Path kind 两个互斥分支的定义入口 */
type DefinePathKind = {
  <TOptions = IRJsonObject>(definition: PathKindDefinition<TOptions, never>): PathKindDefinition<TOptions, never>;
  <TOptions, TOwnerOutput extends JsonValue>(
    definition: PathKindDefinition<TOptions, TOwnerOutput>,
  ): PathKindDefinition<TOptions, TOwnerOutput>;
};

/**
 * 定义 path kind 注册项，并校验 schema literal key
 * @remarks 保留入口用于对齐 registry API，并集中处理定义点泛型
 * @throws 当 schema.shape.kind 不是非空 literal 字符串时
 */
const definePathKindImplementation = (input: unknown): unknown => {
  const definition = input as AnyPathKindDefinition;
  const kind = definition.schema.shape.kind.value;
  const message = 'definePathKind: schema.shape.kind must be a non-empty z.literal string.';
  if (typeof kind !== 'string') throw new Error(message);
  try {
    assertFoundationNonEmptyString(kind, 'definePathKind schema literal');
  } catch {
    throw new Error(message);
  }
  const record = definition as unknown as Readonly<Record<string, unknown>>;
  const ownerOutput = record.ownerOutput;
  if (ownerOutput !== undefined) {
    if (
      ownerOutput === null ||
      typeof ownerOutput !== 'object' ||
      typeof Reflect.get(ownerOutput, 'schema') !== 'object'
    ) {
      throw new Error('definePathKind: ownerOutput.schema must be a Zod schema.');
    }
  }
  return definition;
};

export const definePathKind = definePathKindImplementation as DefinePathKind;
