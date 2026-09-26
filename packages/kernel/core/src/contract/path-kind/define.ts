import type { JsonValue } from '@retikz/foundation';
import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRPathBase } from '../../schemas';
import type { AnyPathKindDefinition, PathKindDefinition } from './types';

/** 保留普通与带 owner output Path kind 两个互斥分支的定义入口 */
type DefinePathKind = {
  /**
   * 定义不发布所属者产物的路径种类
   * @template TPath 经定义 schema 解析后的路径类型，默认使用 IRPathBase
   * @param definition 包含名称、完整路径 schema 和编译函数的定义
   * @returns 校验后的原定义对象，保留路径类型，不复制或修改输入
   */
  <TPath extends IRPathBase = IRPathBase>(
    definition: PathKindDefinition<TPath, never>,
  ): PathKindDefinition<TPath, never>;
  /**
   * 定义发布所属者产物的路径种类
   * @template TPath 经定义 schema 解析后的路径类型
   * @template TOwnerOutput 由 ownerOutput.schema 校验、通过编译上下文发布的 JSON 产物类型
   * @param definition 包含路径定义及 ownerOutput.schema 的定义
   * @returns 校验后的原定义对象，保留路径和产物类型，不复制或修改输入
   */
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
  assertNonEmptyString(
    definition.name,
    'definePathKind: name',
    new RetikzCoreError(RetikzCoreErrorCode.Contract, 'definePathKind: name must be a non-empty string.'),
  );
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

/**
 * 定义路径种类，保留路径及所属者产物的类型关联
 * @throws RetikzCoreError 当 name 为空或仅含空白字符、schema 没有 parse 函数，或提供的 ownerOutput.schema 不是对象时
 */
export const definePathKind = definePathKindImplementation as DefinePathKind;
