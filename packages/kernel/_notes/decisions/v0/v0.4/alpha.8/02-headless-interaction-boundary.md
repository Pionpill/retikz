# ADR-02：Headless interaction manifest 边界登记

- 状态：Accepted
- 决策日期：2026-07-03
- 关联：[ADR-01](./01-drawing-complete-alpha4-closeout.md)

## 背景

现有 hydration 与 hit-test 能定位 Scene primitive，但 interaction 语义主要由 adapter / userland 从 primitive id、meta 和几何命中结果反推。Drawing Complete 需要为外部无头 runtime 提供更稳定的语义入口，同时不把 UI 状态机放进 Core

## 决策

Interaction 缺口进入 v0.5 候选，alpha.8 不新增 API。未来 Core 若提供 manifest，只拥有 JSON-safe 的 target、role、intent、hit area 和 source provenance 等关系语义；字段与 schema 需另立红级 ADR

现有 hydration / hit-test 保留为 runtime 定位层，未来 manifest 应为其提供稳定输入而不是替代它。Core 不拥有 `hovered`、`selected`、`focused`、`dragging`、tooltip open 等 runtime state，也不拥有 tooltip DOM、popover、selection outline、keyboard policy 或 editor handles

## 行为、失败语义与兼容性

alpha.8 对 IR、Scene、render hydration、React 和 Vanilla 不增加 interaction 字段或 hook；现有 primitive 定位行为保持。后续设计必须同时定义 Core 输出、Render hydration、adapter headless API 和诊断，不能以文档补丁隐式引入

## 遗留边界

target identity、hit area 是否独立于可见几何、manifest 与 Scene 的同步方式、accessibility hints 和 selection intent 仍未冻结
