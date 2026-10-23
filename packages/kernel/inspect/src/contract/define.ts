import type { JsonObject, JsonValue } from '@retikz/foundation';
import { strictObject } from 'zod';

import type { AnyInspectorDefinition, AnyInspectorDefinitionInput, InspectorDefinitionInput } from './types';

/** 仅记录本模块补全并冻结的结果，避免重复处理且不阻止对象回收 */
const sealedInspectorDefinitions = new WeakSet<AnyInspectorDefinitionInput>();

/** 无自定义选项的 Inspector 只接受空对象 */
const EmptyInspectorOptionsSchema = strictObject({});

/** 未声明消费态转换时直接使用 schema 的解析结果 */
const identityOptions = (options: JsonObject): JsonObject => options;

/** 补全并冻结 registry 与公开 define 共用的擦除后 Definition */
export const sealInspectorDefinition = (definition: AnyInspectorDefinitionInput): AnyInspectorDefinition => {
  if (sealedInspectorDefinitions.has(definition)) return definition as AnyInspectorDefinition;

  const sealedDefinition = Object.freeze({
    ...definition,
    owner: Object.freeze({ ...definition.owner }),
    optionsSchema: definition.optionsSchema ?? EmptyInspectorOptionsSchema,
    resolveOptions: definition.resolveOptions ?? identityOptions,
  });
  sealedInspectorDefinitions.add(sealedDefinition);

  return sealedDefinition;
};

/**
 * 以保留作者输入类型的方式定义 Inspector
 *
 * @param definition 作者提供的 Inspector 定义；省略选项 schema 时仅接受空对象，省略 resolver 时直接使用解析结果
 * @returns 补齐缺省选项并浅冻结的定义；已由本包处理的定义保持原引用
 * @template TSubject 所属者发布的被观察对象类型
 * @template TParsedOptions options schema 解析后的 options 类型
 * @template TResolvedOptions callback 消费的已解析 options 类型
 * @template TSourceOptions 传入 options schema 前的原始 options 输入类型
 */
export const defineInspector = <
  TSubject extends JsonValue,
  TParsedOptions extends JsonObject = Record<string, never>,
  TResolvedOptions extends JsonObject = TParsedOptions,
  TSourceOptions extends JsonObject = TParsedOptions,
>(
  definition: InspectorDefinitionInput<TSubject, TParsedOptions, TResolvedOptions, TSourceOptions>,
): InspectorDefinitionInput<TSubject, TParsedOptions, TResolvedOptions, TSourceOptions> =>
  sealInspectorDefinition(definition) as unknown as InspectorDefinitionInput<
    TSubject,
    TParsedOptions,
    TResolvedOptions,
    TSourceOptions
  >;
