import type { ArrowDefinition } from './types';

/**
 * 定义一个 arrow 注册项
 * @description 与 `defineShape` / `definePathGenerator` 对齐的定义点 helper；当前不做额外运行时校验，
 *   只保留 `ArrowDefinition` 形态并让第三方扩展面写法一致。
 * @remarks 当前 helper 只做 `ArrowDefinition` 类型约束并原样返回定义对象；保留该稳定入口是为了与
 *   其它 `defineXxx()` API 对齐，并为未来添加运行时校验、默认值归一或泛型收敛预留扩展点。
 * @returns 原样返回的 def（便于 `export const bracket = defineArrow({ ... })`）
 */
export const defineArrow = (def: ArrowDefinition): ArrowDefinition => def;
