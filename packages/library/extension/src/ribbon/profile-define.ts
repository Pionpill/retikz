import type { JsonObject } from '@retikz/foundation';
import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../errors';
import type { RibbonWidthProfileDefinition, RibbonWidthProfileDefinitionInput } from './profile-types';

/**
 * 定义可注册的 Ribbon 宽度函数并校验名称
 * @template TParams 宽度函数参数的 JSON 对象类型，关联可选参数解析结果与 widthAt 上下文
 * @param definition 宽度函数名称、可选参数 schema 与采样回调；此处只校验名称，不执行参数解析或采样
 * @returns 原 definition 对象，参数泛型被擦除以便统一装入宽度函数注册表
 * @throws RetikzExtensionError：name 为空串或全空白字符串时
 */
export const defineRibbonWidthProfile = <TParams extends JsonObject = JsonObject>(
  definition: RibbonWidthProfileDefinitionInput<TParams>,
): RibbonWidthProfileDefinition => {
  assertNonEmptyString(
    definition.name,
    'Ribbon width profile name',
    new RetikzExtensionError({
      code: RetikzExtensionErrorCode.AuthoringInvalid,
      message: 'Ribbon width profile name must be a non-empty string.',
      details: { name: definition.name },
    }),
  );
  return definition as unknown as RibbonWidthProfileDefinition;
};
