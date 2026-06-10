/**
 * Path Generator Registry 扩展面
 * @description 第三方曲线生成器（parabola / sin / 二次方程曲线等）所需的类型 + `definePathGenerator` 工厂。
 *   core 不内置任何曲线生成器；外部包用 `definePathGenerator` 定义、经 `CompileOptions.pathGenerators` 注入。
 *   对齐 shape / arrow 注册面（含函数、不进 IR、运行时注入）。
 */
export type { PathGeneratorDefinition, PathGeneratorContext } from './types';
export { definePathGenerator } from './define';
