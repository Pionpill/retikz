import type { AnyScaleDefinition } from '../../contract';

/**
 * Scale 解析所需的 registry 上下文
 * @description registry 由 pipeline 在 lowering 初始化阶段合并后注入；scale resolver 负责具体 definition lookup 和语义校验
 */
export type ScaleResolveContext = {
  /** 当前 lowering 使用的完整 scale registry */
  registry: ReadonlyMap<string, AnyScaleDefinition>;
};
