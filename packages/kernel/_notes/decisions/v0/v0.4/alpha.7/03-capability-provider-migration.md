# ADR-03：Capability provider migration

- 状态：Accepted
- 决策日期：2026-06-28
- 关联：[ADR-01](./01-provider-registry-contract.md) · [ADR-02](./02-provider-key-contract.md) · [ADR-04](./04-adapter-surface-and-docs.md)

## 背景

仅定义 registry 规则而不迁移现有 capability，会让新旧 provider 形态并存，继续复制差异并使 Core、adapter 与上层包的 authoring 心智不一致

## 决策

所有现有 provider 使用统一 `CompileOptions` 数组输入：

```ts
type CompileOptions = {
  shapes?: ReadonlyArray<ShapeDefinition>;
  arrows?: ReadonlyArray<ArrowDefinition>;
  patterns?: ReadonlyArray<PatternDefinition>;
  pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
  pathKinds?: ReadonlyArray<PathKindDefinition>;
  ribbonWidthProfiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
  composites?: ReadonlyArray<CompositeDefinition>;
  boundaries?: ReadonlyArray<BoundaryDefinition>;
  clips?: ReadonlyArray<ClipDefinition>;
};
```

Builtin 集合统一为 definition 数组，`resolveXxxRegistry` 统一使用 ADR-01 helper，compile 只消费 resolved `ReadonlyMap`。删除面向 builtin 的白名单与 fallback 分支；custom 不再覆盖 builtin。IR 中 shape、arrow、pattern、path kind 等既有用户语义保持不变

## 兼容性与最终结果

这是 0.x 的 provider 输入收敛：旧 Record、覆盖 builtin 和双轨 resolver 删除，内置与自定义 definition 走同一注册、解析和消费链路。适配层与文档按 ADR-04 暴露同形态输入

## 遗留边界

本 ADR 不新增 provider capability，也不提供 builtin replacement API；字段与领域迁移若改变公开 IR，须另立 ADR
