# ADR-04：Adapter surface and provider authoring docs

- 状态：Accepted
- 决策日期：2026-06-28
- 关联：[ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md)

## 背景

用户通常通过 React `<Layout>` 或 Vanilla processing 注入 provider。若 adapter 继续接受旧 Record 或私有命名，Core 的统一 provider contract 就无法成为用户可见的稳定 authoring 语义

## 决策

React、Vanilla 与 Core 的 provider surface 同名同形，均使用 definition 数组；典型输入包括 `shapes`、`arrows`、`patterns`、`pathGenerators`、`pathKinds`、`ribbonWidthProfiles` 与 `composites`

文档以统一 provider authoring 机制为入口，明确：

1. `contract` 定义第三方 runtime definition
2. `providers` 提供内置 definition 与 registry resolve
3. Definition 可含函数和 Zod schema，但不进入 IR
4. IR 只保存字符串引用或 operation object，保持 JSON-safe
5. builtin 与 custom 共用 registry，custom 不覆盖 builtin

## 兼容性与最终结果

Adapter 不再提供旧 Record、私有 provider registry 或 renderer 旁路；React、Vanilla、headless compile 和文档示例均指向同一 Core contract。Provider registry 迁移本身仍由 ADR-03 拥有

## 遗留边界

不在本 ADR 内新增 provider 能力或为单个 docs demo 设计视觉功能；后续 adapter 扩展必须保持同名同形和 JSON/runtime 分离
