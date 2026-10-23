import type { JsonObject } from '@retikz/foundation';

import type { RibbonCapDefinition } from './cap-types';

/**
 * 定义可注册的 Ribbon 端帽
 * @template TParams 端帽参数的 JSON 对象类型，关联参数解析结果与 resolve 上下文
 * @param definition 端帽名称、参数 schema 与几何构造回调；不执行参数解析或构造回调
 * @returns 原 definition 对象，参数泛型被擦除以便统一装入端帽注册表
 */
export const defineRibbonCap = <TParams extends JsonObject>(
  definition: RibbonCapDefinition<TParams>,
): RibbonCapDefinition => {
  return definition as unknown as RibbonCapDefinition;
};
