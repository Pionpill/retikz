import type { PatternDefinition } from './types';

/**
 * 定义一个 pattern motif 注册项
 * @description 与 `defineShape` / `definePathGenerator` 对齐的定义点 helper；当前不做额外运行时校验，
 *   只保留 `PatternDefinition` 形态并让第三方扩展面写法一致。
 * @returns 原样返回的 def（便于 `export const cross = definePattern({ ... })`）
 */
export const definePattern = (def: PatternDefinition): PatternDefinition => def;
