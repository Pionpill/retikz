import type { JsonObject } from '@retikz/foundation';
import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../errors';
import type { RibbonCapDefinition } from './cap-types';

/**
 * 定义可注册的 Ribbon 端帽并校验名称
 * @template TParams 端帽参数的 JSON 对象类型，关联参数解析结果与 resolve 上下文
 * @param definition 端帽名称、参数 schema 与几何构造回调；此处只校验名称，不执行参数解析或构造回调
 * @returns 原 definition 对象，参数泛型被擦除以便统一装入端帽注册表
 * @throws RetikzExtensionError：name 为空串或全空白字符串时
 */
export const defineRibbonCap = <TParams extends JsonObject>(
  definition: RibbonCapDefinition<TParams>,
): RibbonCapDefinition => {
  assertNonEmptyString(
    definition.name,
    'Ribbon cap name',
    new RetikzExtensionError({
      code: RetikzExtensionErrorCode.AuthoringInvalid,
      message: 'Ribbon cap name must be a non-empty string.',
      details: { name: definition.name },
    }),
  );
  return definition as unknown as RibbonCapDefinition;
};
