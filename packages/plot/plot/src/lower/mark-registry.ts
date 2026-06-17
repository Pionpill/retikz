/**
 * mark lowering 行为注册表（文档化入口）
 * @description 仓库已有 composite（defineComposite）/ coordinate（options.coordinates 工厂）注册范式；mark 与之对齐——
 *   内置 6 个 mark 是 6 个内置 lowering 注册项，`lowerMark` 按 type 查表分发（取代写死的 type 判别链）。
 *   `MarkDefinition` 接口与 `MARK_REGISTRY` 定义在 mark.ts（与 MarkChannels / MarkProvenance 同处、避免循环依赖），
 *   此模块只做文档化 re-export。IR schema 仍是 ir/mark.ts 的静态单一真源（不由 registry 组装）；
 *   公开 `registerMark` API + schema registry 留待需求驱动。
 */
export { MARK_REGISTRY } from './mark';
export type { MarkDefinition } from './mark';
