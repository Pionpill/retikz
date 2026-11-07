import type { ScaleDefinition } from '@retikz/data';

import type { AnyChannelDefinition } from '../../contract';

/**
 * Scale 解析所需的 registry 上下文
 * @description registry 由 pipeline 在 lowering 初始化阶段合并后注入；scale resolver 负责具体 definition lookup 和语义校验
 */
export type ScaleResolveContext = {
  /** 当前消费的位置角色；位置策略按角色匹配 */
  role?: string;
  /** 自定义位置通道提供的显式消费策略 */
  channels?: ReadonlyArray<AnyChannelDefinition>;
  /** 当前 lowering 使用的完整 scale registry */
  registry: ReadonlyMap<string, ScaleDefinition>;
};
