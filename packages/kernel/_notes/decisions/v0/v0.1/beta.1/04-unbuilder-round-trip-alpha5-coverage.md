# ADR-04：unbuilder round-trip 等价性

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联： · [alpha.5 ADR-03 arrowDetail](../alpha.5/03-path-arrow-detail.md) · [alpha.5 ADR-04 OffsetPosition](../alpha.5/04-position-offset.md) · [alpha.5 ADR-02 StepLabel position](../alpha.5/02-step-label-position-t.md)

> **目标**：保证新增 IR 形态在 React DSL 与 IR 之间无损往返

## 背景 / 约束

alpha.4 / alpha.5 新增的 IR 形态必须在 builder 与 unbuilder 间保持无损往返，尤其是 `arrowDetail` 的起末覆盖、嵌套 `OffsetPosition` 以及 `StepLabel.position` 的关键词与数值形态

## 决策：unbuilder 保持 IR round-trip 等价

构建与反构建对这些形态保持逐字段等价

理由：不需改实现（字段已透传），纯补测；一次性补齐 alpha.5 的 react-layer 守门。

### 决策细节

- **若 round-trip 不等价 → 算 alpha.5 遗留 bug**，本 ADR scope 扩展到修 unbuilder。
- IR round-trip 不定义 renderer 输出格式；SVG 等后端的输出遵循各自的 compile / render 契约

## 长期边界

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：非 breaking（零公开 API / 运行时变化）；其余默认行为、失败语义与公开契约以正文为准。
