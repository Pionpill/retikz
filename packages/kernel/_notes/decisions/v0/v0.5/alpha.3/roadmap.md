# v0.5.0-alpha.3 上下文颜色

- 状态：已完成
- 目标版本：`0.5.0-alpha.3`
- 前置：alpha.2 的 Foundation、Core Theme、Tier 2 lowering 与 renderer-neutral Scene 契约已 Accepted
- 关联：[v0.5 roadmap](../roadmap.md) · [视觉 Theme 设计](../../../../../../../notes/architecture/visual-theme-design.md)

## 目标

alpha.3 补齐 Core 上下文颜色：具有明确主色来源的颜色槽位可以使用归一化权重，Core 在完整 Theme、Scope 与图元样式级联后，按 Light / Dark 模式确定为不透明颜色字符串。Foundation 统一拥有静态 CSS 颜色解析与不透明预合成原子；Graph、Plot、Table 等 Tier 2 Theme 只声明主色链并下沉兼容槽位，不各自维护颜色算法

本次发布不包含 cooperative scheduler、progressive materialization 或 generation session。对应[候选 ADR-01](../candidates/01-cooperative-concurrent-runtime.md)、[ADR-02](../candidates/02-progressive-materialization.md)与[ADR-03](../candidates/03-generation-session.md)保持未实现 Proposed，不属于 `0.5.0-alpha.3` 的公开契约

## ADR

| ADR                                           | 状态     | 主题       | 交付                                                               |
| --------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------ |
| [ADR-01](./01-contextual-color-resolution.md) | Accepted | 上下文颜色 | Foundation 颜色原子、Core 最终确定化与 Tier 2 Theme 主色链统一适配 |

## 已交付边界

- Foundation 是静态 CSS 颜色解析与不透明 source-over 预合成的唯一 owner
- Core 数值颜色只允许位于 `[0, 1]`，并在完整级联后按最终有效主色确定化
- Light / Dark 分别使用不透明白色 / 黑色作为基准底色，结果为小写不透明十六进制颜色
- 数值颜色不替代 opacity、palette、scale range、gradient、pattern、shadow 或宿主 `currentColor`
- Graph、Plot、Table 只声明各自唯一主色链，Canonical、Scene 与 renderer 不保留数值颜色分支
- 直接 JSON、React 与 Vanilla 共享同一 schema、resolve、诊断与 renderer-neutral 输出

## 不在 alpha.3 范围

- Cooperative scheduler、Program chunk / Worker offload 与异步 prepare
- Progressive materialization、renderer presentation batch 与独立 materialization revision
- Generation session、draft branch、模型调用、prompt、token stream 或聊天 UI
- 用数值替代 palette、scale range、gradient stop、pattern、shadow 或 opacity
- 在 renderer、宿主 CSS 或 Tier 2 包中建立平行颜色解析与合成算法
