---
name: cross-test
description: Use when probing existing Retikz behavior with adversarial or regression tests, including Alpha post-implementation validation and independent defect discovery.
---

# 缺陷挖掘与对抗测试

以当前公开契约、实现与测试为依据构造反例，不为制造失败发明能力。测试编写按 test-contract；旧测试资产审计用 test-review。

## 范围与权限

用户未指定包/模块时先确认，不默认扫描全部 packages。独立测试任务允许写获准测试，不自动允许修产品代码、改 roadmap、stage 或提交。subagent 只按已批准计划使用。

- 普通缺陷挖掘：读 [方法与攻击面](references/method.md)。
- Alpha red/yellow 实现后的自测：额外读 [Alpha 自测](references/alpha.md)；green 可跳过。
- 报告与正式化：读 [证据与输出](references/report.md)。

先列出当前行为、已有守卫和本轮新增失效模式，复用既有 helper/case。所有失败应有可复现输入与预期依据；不把体验偏好写成 bug。

运行顺序按根 AGENTS：Oxfmt → 受影响 Oxlint → tsc --noEmit 与必要测试。临时探索仅写目标 workspace 的 tests/_scratch，使用 pnpm temp:test 自动清理；不在脚本外保留临时 case。静态类型已排除的输入不靠强转伪造 runtime case。
