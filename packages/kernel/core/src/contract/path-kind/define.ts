import { assertNonEmptyString } from '@retikz/foundation';

import type { IRPathBase, JsonValue } from '../../schemas';
import type { AnyPathKindDefinition, PathKindDefinition } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 保留普通与带 owner output Path kind 两个互斥分支的定义入口 */
type DefinePathKind = {
  <TPath extends IRPathBase = IRPathBase>(
    definition: PathKindDefinition<TPath, never>,
  ): PathKindDefinition<TPath, never>;
  <TPath extends IRPathBase, TOwnerOutput extends JsonValue>(
    definition: PathKindDefinition<TPath, TOwnerOutput>,
  ): PathKindDefinition<TPath, TOwnerOutput>;
};

/**
 * 定义 path kind 注册项，并校验 name 与 schema 的 Zod parse 能力
 * @remarks 保留入口用于对齐 registry API，并集中处理定义点泛型
 * @throws 当 name 不是非空字符串、schema 不具有 parse 能力，或 ownerOutput.schema 不是对象时
 */
const definePathKindImplementation = (input: unknown): unknown => {
  const definition = input as AnyPathKindDefinition;
  assertNonEmptyString(definition.name, 'definePathKind: name');
  const record = definition as unknown as Readonly<Record<string, unknown>>;
  const schema = record.schema;
  if (schema === null || typeof schema !== 'object' || typeof Reflect.get(schema, 'parse') !== 'function') {
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'definePathKind: schema must be a Zod schema.');
  }
  const ownerOutput = record.ownerOutput;
  if (ownerOutput !== undefined) {
    if (
      ownerOutput === null ||
      typeof ownerOutput !== 'object' ||
      typeof Reflect.get(ownerOutput, 'schema') !== 'object'
    ) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Contract,
        'definePathKind: ownerOutput.schema must be a Zod schema.',
      );
    }
  }
  return definition;
};

export const definePathKind = definePathKindImplementation as DefinePathKind;
