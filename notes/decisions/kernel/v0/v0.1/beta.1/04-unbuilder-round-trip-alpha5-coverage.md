# ADR-04：unbuilder round-trip 补 alpha.5 新增形态测试覆盖

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-10](./roadmap.md) · [alpha.5 ADR-03 arrowDetail](../alpha.5/03-path-arrow-detail.md) · [alpha.5 ADR-04 OffsetPosition](../alpha.5/04-position-offset.md) · [alpha.5 ADR-02 StepLabel position](../alpha.5/02-step-label-position-t.md)

> **范围**：alpha.4 / alpha.5 加进 IR 的若干新形态（`AtPosition` / `OffsetPosition` / `arrowDetail` 起末子对象 / `StepLabel.position` keyword + 数值）已在 unbuilder 透传、但缺 react-layer round-trip 守门，本 ADR 补齐。

## 背景 / 约束

unbuilder round-trip 测试覆盖到 alpha.3 时代字段，但 alpha.4 / alpha.5 加进 IR 的新形态**只有透传、无 round-trip 等价性守门**——一旦 unbuilder bug 把 `arrowDetail.start.color` 误传成 `arrowDetail.color`、或漏 `OffsetPosition.of` 嵌套，没有测试会失败。具体缺口：`Node.position` 的 `AtPosition` / `OffsetPosition`、`Step.to` 的 `OffsetPosition`、`Path.arrowDetail` 顶层 + start/end merge、`StepLabel.position` 7 keyword + 任意数值。

## 决策：在 unbuilder round-trip 测试集补 5 组用例

每组 `buildIR(convertIRToReactNode(irOriginal))` 深比较等于 `irOriginal`，集中在既有 round-trip 测试文件（单文件归口，未来加新字段照格式追加）。被否决的备选：散落到各自单测文件——找起来麻烦、破坏归口一致性。

理由：不需改实现（字段已透传），纯补测；一次性补齐 alpha.5 的 react-layer 守门。

### 决策细节

- **若 round-trip 不等价 → 算 alpha.5 遗留 bug**，本 ADR scope 扩展到修 unbuilder。
- **不加 e2e SVG 输出比较**——本 ADR 只测 IR 等价性，SVG 输出由 compile / render 单测各自守。

## 不在本 ADR 范围

- `AtPosition` / `OffsetPosition` / `arrowDetail` 字段本身的 compile resolve 测试——已在 alpha.5 各 ADR 覆盖。
- builder 方向（`buildIR ← React JSX`）的 round-trip——假设 builder 透传等价（既有测试已覆盖），本 ADR 关注 unbuilder 方向。

---

> **实现指针**：level `green`、非 breaking（仅测试 + 必要时修 unbuilder，零公开 API / 运行时变化）。真源以代码为准——round-trip 用例在 `react/tests/kernel/unbuilder.test.tsx`（测对象 `convertIRToReactNode` / `buildIR`，`react/src/kernel/{unbuilder,builder}.ts`）。完整原文（5 组用例形态 / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `ea674f3f`；压缩前完整施工蓝图 = `git show ea674f3f^:notes/decisions/core/v0/v0.1/beta.1/04-unbuilder-round-trip-alpha5-coverage.md`。
