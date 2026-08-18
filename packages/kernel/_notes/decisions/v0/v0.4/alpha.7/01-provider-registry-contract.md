# ADR-01：Provider registry contract

- 状态：Accepted
- 决策日期：2026-06-28
- 关联：[ADR-02](./02-provider-key-contract.md) · [ADR-03](./03-capability-provider-migration.md) · [ADR-04](./04-adapter-surface-and-docs.md)

## 背景

Kernel 的 shape、arrow、pattern、path generator、path kind、ribbon width profile 与 composite 都是 runtime definition 扩展，但旧 registry 在数组、Record、覆盖和冲突行为上不一致

## 决策

所有 Kernel provider registry 使用统一输入和解析规则：

```ts
type ProviderRegistryOptions<TDefinition> = {
  capability: string;
  builtins: ReadonlyArray<TDefinition>;
  custom?: ReadonlyArray<TDefinition>;
  keyOf: (definition: TDefinition) => string;
  optionName: string;
};

const resolveProviderRegistry: <TDefinition>(
  options: ProviderRegistryOptions<TDefinition>,
) => ReadonlyMap<string, TDefinition>;
```

- builtin 与 custom 都是 definition 数组
- builtin 先注册，custom 后注册，输出为 `ReadonlyMap`
- builtin 内部、custom 内部以及 custom 与 builtin 的重复 key 都直接 throw
- alpha.7 不提供覆盖 builtin 的入口
- unknown lookup 必须 fail-loud，错误包含 capability、失败 key、可用 key 和 options 字段名
- helper 是 Core 内部基础设施，不作为本阶段独立公共 API

Definition 是注册单元，避免 key 与 definition 内容分离；禁止覆盖 builtin 以保持可诊断性

## 兼容性与最终结果

现有 provider 通过同一数组、Map、duplicate 和 unknown 语义解析；旧 Record 输入和覆盖行为删除，不保留 alias 或 fallback。内置与自定义 provider 的 compile 消费路径相同

## 遗留边界

替换 builtin、namespace escape hatch 和开放 registry helper 若未来需要，须另立契约
