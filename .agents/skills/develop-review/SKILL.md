---
name: develop-review
description: Use when auditing a retikz module or subsystem read-only to find beta cleanup, refactor, correctness, schema, test, or docs consistency findings before deciding which items become roadmap TODOs.
---

# Develop Review: 模块级只读审计

对一个 workspace 包或子系统做横向通读，输出可 triage 的分级报告。本 skill 只发现问题，不改产品代码、不改 roadmap、不提交。

## 边界

| 场景                              | 用哪个 skill                |
| --------------------------------- | --------------------------- |
| 横向审一个模块，找 beta TODO 候选 | develop-review              |
| 审计已有测试是否过期、重复或临时  | test-review                 |
| 用户明确要求固定快照多模型评审    | cross-review                |
| 为疑似 bug 写测试坐实             | cross-test                  |
| 已登记 TODO 要修                  | flow-beta                   |
| 新功能 / 新 IR / 新公开字段       | flow-alpha / develop-design |

## 启动前

1. 用户声明范围：整个包（如 `@retikz/core`）或子系统 / 路径集。
2. 记录基线：

```bash
git rev-parse HEAD
git status --short
```

3. 判断所属分组版本通道：kernel 组看相关 package 当前版本；plot 等 Tier 2 看对应 package。非 beta 也可做盘点，但报告注明“非 beta，仅供整理参考”。
4. 范围过大时先建议拆分，不硬做全仓审计。

## 必读规则

- 根和就近 `AGENTS.md`。
- 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取对应 `standard-*` skill。
- 涉及文档一致性时读 `apps/docs/AGENTS.md` 和必要 docs skill。

## 审查维度

每条 finding 必须有代码位置和成因，不能只写“可以优化”。

1. **结构**：目录职责、barrel 边界、同级模块 import、文件过大 / 过碎、层级归属、Kernel / Sugar / Tier 2 边界。
2. **正确性与类型安全**：边界值、引用解析、重复调用、错误诊断、React / Vanilla 或 plot adapter 对等、`as any` / ignore / 非必要断言、测试覆盖。按 TypeScript 信任边界重点检查：内部已声明明确类型的核心逻辑中，不应堆积与业务无关的 `unknown`、`typeof`、`Array.isArray`、对象结构探测和对应 `throw`；JSON / 持久化等外部数据应在 parser / schema / adapter 入口校验一次，内部不重复防御。区分真正的入口校验、业务不变量和查找失败诊断，不要把这些必要检查误判为冗余。若审查目标是测试资产本身是否过期、重复或临时，转用 `test-review`，不要在本 skill 中混合展开。
3. **复用与简化**：重复实现、死代码、可下沉 shared / math / core 的工具、过度工程、热路径重复计算，以及纯内部对象上无意义的 `Object.freeze`；只有公开输出或外部可获取的对象才需要冻结。
4. **schema / 数据结构 / AI 友好**：JSON 可序列化、zod `.describe` 完整与质量、const object enum、非法状态不可表达、同名同义。
5. **文档一致性**：public API、props、IR 字段、默认值、demo、zh/en 是否与当前代码一致。纯内部范围可标不适用。

## 分级

- **BLOCKING**：真实 bug、非法状态、会阻碍后续设计收敛的结构问题。
- **WARNING**：维护性或一致性风险，如重复实现、命名漂移、抽象不一致、文档落后。
- **INFO**：低优先清理或值得保留的良好模式。

预估 Level 按修复方案触及范围写：`internal` / `visible` / `breaking`，与严重度独立。

## 报告

写入：

```text
notes/reports/develop-review-YYYY-MM-DD-<module>.md
```

该目录被 `.gitignore` 忽略，报告不 stage、不 commit。

报告结构：

```md
# Develop Review Report: <module>

日期：
审查范围：
基准快照：
所属分组 / 版本通道：
覆盖率声明：

## 结论概览

## BLOCKING

| # | 位置 | 维度 | 问题 | 建议改法 | 预估 Level | 坐实出口 |

## WARNING

| # | 位置 | 维度 | 观察 | 建议改法 | 预估 Level | 坐实出口 |

## INFO

| # | 位置 | 维度 | 观察 |

## 横向发现

## 建议 triage
```

无某档时写“无”。

## 完成标志

- 报告声明了范围、基准、版本通道和覆盖率。
- finding 都有位置证据、成因、建议和预估 Level。
- 高风险项标明是否建议在后续大型任务最终阶段使用 `cross-review`，或用 `cross-test` 坐实；本次审计不自动调度。
- 审计后 `git status --short` 与基线相比，除 ignored 报告外没有产品文件变化。
