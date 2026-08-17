# ADR-02：Provider key contract

- 状态：Accepted
- 决策日期：2026-06-28
- 关联：[ADR-01](./01-provider-registry-contract.md) · [ADR-03](./03-capability-provider-migration.md)

## 背景

统一 registry 后，definition 的 key 必须有单一、可诊断且不与 IR discriminant 漂移的来源。Kernel 同时存在字符串引用 provider 和完整 operation provider，不能机械使用一种命名方式

## 决策

字符串引用 provider 以 definition 的 `name` 作为唯一 key：

- `ShapeDefinition.name` ↔ `node.shape`
- `ArrowDefinition.name` ↔ `arrowDetail.shape`
- `PatternDefinition.name` ↔ pattern 引用
- `PathGeneratorDefinition.name` ↔ generator step `name`
- `RibbonWidthProfileDefinition.name` ↔ ribbon width profile 引用

operation provider 从 operation discriminant 或 namespace 取 key：

- `PathKindDefinition` 从 schema literal `kind` 取 key
- `CompositeDefinition` 使用 `${namespace}.${type}`，保留 namespace 防撞

字符串引用没有可抽取的 operation schema，因此 `name` 是真源；operation key 必须绑定 IR discriminant，避免 definition name 与 schema literal 双真源

## 兼容性与最终结果

Provider registry、错误消息和文档都使用上述 key 来源；不引入全局 namespace registry。重复、未知和实际迁移分别遵循 ADR-01、ADR-03

## 遗留边界

新增 provider capability 必须明确属于字符串引用或 operation provider，并选择与其语义一致的 key 真源
