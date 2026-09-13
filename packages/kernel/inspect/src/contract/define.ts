import type { JsonObject, JsonValue } from '@retikz/foundation';

import { assertNonEmptyString } from '@retikz/foundation';
import { strictObject } from 'zod';

import type {
  AnyInspectorDefinition,
  AnyInspectorDefinitionInput,
  InspectorDefinition,
  InspectorDefinitionInput,
} from './types';

import { RetikzInspectError, RetikzInspectErrorCode } from '../error';

/** 仅记录本模块校验并冻结的结果，避免重复处理且不阻止对象回收 */
const sealedInspectorDefinitions = new WeakSet<AnyInspectorDefinitionInput>();

/** 无自定义选项的 Inspector 只接受空对象 */
const EmptyInspectorOptionsSchema = strictObject({});

/** 未声明消费态转换时直接使用 schema 的解析结果 */
const identityOptions = (options: JsonObject): JsonObject => options;

const inspectorContractError = (label: string): RetikzInspectError =>
  new RetikzInspectError(RetikzInspectErrorCode.Contract, `${label} must be a non-empty string.`);

/** 校验 Inspector owner 判别字段 */
const assertValidOwner = (owner: AnyInspectorDefinition['owner']): void => {
  switch (owner.kind) {
    case 'path':
      assertNonEmptyString(owner.name, 'Inspector owner name', inspectorContractError('Inspector owner name'));
      return;
    case 'node':
    case 'scope':
    case 'coordinate':
    case 'clip':
      return;
    case 'composite':
      assertNonEmptyString(
        owner.namespace,
        'Inspector owner namespace',
        inspectorContractError('Inspector owner namespace'),
      );
      assertNonEmptyString(owner.type, 'Inspector owner type', inspectorContractError('Inspector owner type'));
      return;
  }
};

/** 校验并冻结 registry 与公开 define 共用的擦除后 Definition */
export const sealInspectorDefinition = (definition: AnyInspectorDefinitionInput): AnyInspectorDefinition => {
  if (sealedInspectorDefinitions.has(definition)) return definition as AnyInspectorDefinition;
  assertNonEmptyString(definition.namespace, 'Inspector namespace', inspectorContractError('Inspector namespace'));
  assertNonEmptyString(definition.type, 'Inspector type', inspectorContractError('Inspector type'));
  assertValidOwner(definition.owner);
  const sealedDefinition = Object.freeze({
    ...definition,
    owner: Object.freeze({ ...definition.owner }),
    optionsSchema: definition.optionsSchema ?? EmptyInspectorOptionsSchema,
    resolveOptions: definition.resolveOptions ?? identityOptions,
  });
  sealedInspectorDefinitions.add(sealedDefinition);
  return sealedDefinition;
};

/** 补齐默认选项契约并冻结 Inspector；省略 schema 时只接受空对象，省略 resolver 时使用 schema 输出 */
export const defineInspector = <
  TSubject extends JsonValue,
  TParsedOptions extends JsonObject = Record<string, never>,
  TResolvedOptions extends JsonObject = TParsedOptions,
  TSourceOptions extends JsonObject = TParsedOptions,
>(
  definition: InspectorDefinitionInput<TSubject, TParsedOptions, TResolvedOptions, TSourceOptions>,
): InspectorDefinition<TSubject, TParsedOptions, TResolvedOptions, TSourceOptions> => {
  return sealInspectorDefinition(definition) as unknown as InspectorDefinition<
    TSubject,
    TParsedOptions,
    TResolvedOptions,
    TSourceOptions
  >;
};
