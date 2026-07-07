---
name: develop-test
description: Use when retikz alpha implementation tests have passed but red or yellow changes still need adversarial validation against edge cases, JSON IR stability, and contract robustness before documentation.
---

# Stage 3: 自测

实现测试全绿后，继续从“构造会让实现挂的输入”角度找 bug。red / yellow 必走，green 跳过。

## 前置条件

- 工作区状态清楚；本阶段开始前记录当前 diff / commit 范围。
- ADR 仍为 `Proposed`。
- 受影响模块 lint / `tsc --noEmit` / vitest 已通过；否则回 `develop-implement`。

## 攻击面

优先找破坏 AI 友好契约的问题：

1. IR JSON round-trip 后语义不等价。
2. zod parse 错误信息含糊，LLM 难以修正。
3. schema 接收非 JSON 值或过宽类型。
4. discriminator 缺失、拼错、冲突时报错不可诊断。

再查常规边界：自引用 / 引用环、`0` / `-0` / `NaN` / `Infinity` / 极值、长字符串 / Unicode id、深层嵌套、默认值边界、与已有功能交叉。

## 执行方式

优先用独立线程、子代理或外部模型当 Bug Hunter；不可用时主 AI 自己执行并说明退化。

Bug Hunter 只做三件事：

- 读 ADR、当前实现 diff、已有测试、相关 schema / compile 入口。
- 临时写 adversarial vitest case 并运行。
- 输出 BLOCKING / WARNING / INFO，不修代码、不改现有测试、不 stage 临时草稿。

## 处理结果

| 结果     | 处理                                             |
| -------- | ------------------------------------------------ |
| BLOCKING | 提升为正式回归测试，回实现阶段修；修完重跑本阶段 |
| WARNING  | 主 AI 判断本 ADR 内修还是记 backlog / roadmap    |
| INFO     | 作为 wrapup changelog 或汇报素材                 |

同一 BLOCKING 最多修 3 轮；仍不收敛则 halt 给人工。

## 完成标志

- 最后一轮 BLOCKING 为空。
- 已确认的 BLOCKING 已转成正式测试并通过。
- 受影响模块 lint / typecheck / test 重新通过。
- WARNING / INFO 已整理给 `develop-document` / `develop-wrapup` 使用。
