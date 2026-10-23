import type { JsonObject } from '@retikz/foundation';

import type { RibbonWidthProfileDefinition, RibbonWidthProfileDefinitionInput } from './profile-types';

/**
 * 定义可注册的 Ribbon 宽度函数
 * @template TParams 宽度函数参数的 JSON 对象类型，关联可选参数解析结果与 widthAt 上下文
 * @param definition 宽度函数名称、可选参数 schema 与采样回调；不执行参数解析或采样
 * @returns 原 definition 对象，参数泛型被擦除以便统一装入宽度函数注册表
 */
export const defineRibbonWidthProfile = <TParams extends JsonObject = JsonObject>(
  definition: RibbonWidthProfileDefinitionInput<TParams>,
): RibbonWidthProfileDefinition => {
  return definition as unknown as RibbonWidthProfileDefinition;
};
