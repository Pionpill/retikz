import type { JsonObject } from '@retikz/foundation';

import { assertNonEmptyString } from '@retikz/foundation';

import type { RibbonWidthProfileDefinition, RibbonWidthProfileDefinitionInput } from './profile-types';

import { RetikzStandardError, RetikzStandardErrorCode } from '../errors';

/**
 * 定义 ribbon width profile 注册项并校验名称
 * @remarks 集中封装参数泛型擦除边界
 * @throws 当 name 为空串或全空白字符串时
 */
export const defineRibbonWidthProfile = <TParams extends JsonObject = JsonObject>(
  definition: RibbonWidthProfileDefinitionInput<TParams>,
): RibbonWidthProfileDefinition => {
  assertNonEmptyString(
    definition.name,
    'Ribbon width profile name',
    new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Ribbon width profile name must be a non-empty string.',
      details: { name: definition.name },
    }),
  );
  return definition as unknown as RibbonWidthProfileDefinition;
};
