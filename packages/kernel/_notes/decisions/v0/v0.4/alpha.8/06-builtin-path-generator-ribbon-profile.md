# ADR-06: Builtin path generator and ribbon width profile

- 状态：Accepted
- 决策日期：2026-07-04
- 关联：[ADR-05](./05-stroke-dash-offset.md) · [alpha.7 ADR-02](../alpha.7/02-provider-key-contract.md) · [alpha.6 ADR-07](../alpha.6/07-path-kind-registry.md)

## 背景

Path generator 与 Ribbon width profile 已有统一 definition / registry / compile contract，但没有低歧义的 builtin 作为可直接使用的能力和 provider 参考

## 决策

Core 内置 `parabola` path generator 与 `bulge` ribbon width profile，并通过现有 provider 机制注册，不增加特殊旁路或 IR 字段

`parabola` 的输入为 `params.control` 与必需的 `to`，将当前起点、控制点和终点生成一个 `quad` command，不额外插入 `move`；缺少 `to` 时 compile fail-loud。`params.control` 按既有 target 参数解析为世界坐标

`bulge` 的输入为非负有限 `base` 与 `peak`，表示两端宽度和中点宽度；`peak < base` 表示中间收窄，输出继续通过既有 finite width 守卫

两者使用 `definePathGenerator` / `defineRibbonWidthProfile`、builtin registry、schema 和 duplicate 诊断；React / Vanilla 继续使用既有 Path / Step authoring surface

## 兼容性与最终结果

新增 provider 集合成员，不改变既有 generator step、ribbon options、stops、sampling 或 samples 语义。自定义 definition 不得覆盖 builtin

## 遗留边界

Core 不内置主观或高参数空间 generator，也不新增 taper、provider override 或独立 DSL；领域 profile 仍可通过同一 provider contract 提供
