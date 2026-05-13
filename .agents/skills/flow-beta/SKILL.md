---
name: flow-beta
description: retikz beta 期优化编排——按 plan TODO 一条一条做，**不开新功能 ADR**（仅做重构 / 命名 / 注释 / 测试 / 错误信息 / 性能 / 文档），但**允许破坏性改动**（schema 字段名 / 组件名 / 公开 API surface 重命名 / 重构）。3 阶段：实现 → 多 LLM 评估 → 收尾，每阶段硬关卡。**多 LLM 评估**是 beta 的核心阶段——评估"refactor 是否引入回归 + 是否真的更好"。**rc 起冻结公开 API**，beta 是最后一个改名窗口。
---

# beta 优化主流程

retikz beta 期 plan TODO 端到端执行的**编排器**。beta 与 alpha / rc 的核心差异：

| 维度 | alpha（`flow-alpha`） | beta（本 SKILL） | rc 之后 |
|---|---|---|---|
| 改动性质 | 加新功能 / 改 schema / 扩 API | 重构 / 命名 / 注释 / 测试加固 / 错误信息 / 性能 | 仅 bug fix |
| 输入文档 | ADR（必开） | plan TODO 条目（视复杂度可开 ADR） | bug 报告 / 文档勘误 |
| 破坏性 | 允许（alpha 是破坏性窗口） | **允许**（重构 / 改名 / 删 alias）—— 不冻结公开 API | **禁止**——公开 API 冻结起点 |
| 主要风险 | 设计选错路径 | 重构引入回归 / 改名漏改调用方 | 静态文档 / patch 行为偏差 |
| 多 LLM 用法 | 设计阶段评估 ADR | 实现完成后评估"是否引入回归 + 是否真更好" | 不强制 |
| 阶段数 | 5（设计 / 实现 / 测试 / 文档 / 收尾） | 3（实现 / 多 LLM 评估 / 收尾） | 视 patch 大小灵活 |

**与 alpha 的边界**：beta 不接"新功能 ADR"（加新 IR 形态 / 新公开 API 字段 / 新功能集）——发现需要这类改动 → halt → 推到下个 alpha 窗口（v0.2 alpha / v1 alpha 等）。重命名 / 重构 / 删 deprecated / 改默认值 这些**修改类**改动都属 beta 范围。

## 启动前确认

调用本 SKILL 前必须先确认两件事：

1. **当前在 beta 期**（`packages/core/package.json` 版本号含 `-beta.`）——否则 halt，去用 `flow-alpha`
2. **TODO 候选已在 plan 文件登记**（`notes/plans/v<MAJOR>/v<MAJOR>.<MINOR>-beta.<N>.md`）——没登记的不接

启动模式与 `flow-alpha` 对齐：

- **单条** — 一次只接 1 条 TODO，跑完 3 阶段就停（主流场景）
- **批量 worktree** — 一次接 N 条互不相干的 TODO，每条独立 worktree + 独立分支（同 flow-alpha 批量模式细则，见该 SKILL 对应段）

## 3 阶段总览

| # | 阶段 | 子 SKILL | 主体 | 关卡（不过则 halt） |
|---|---|---|---|---|
| 1 | 实现 | [`develop-implement`](../develop-implement/SKILL.md) | AI | 全部既有测试绿 + 新加测试绿 + lint / tsc 全过才进 2 |
| 2 | 多 LLM 评估 | （本 SKILL 内联，见下） | AI 调度多 LLM | 全部 LLM 都判"无回归 + 改动确有收益 + breaking 已正确登记到 changelog"才进 3 |
| 3 | 收尾 | [`develop-wrapup`](../develop-wrapup/SKILL.md)（简化路径） | AI 起草 / **人工**最终 ack | breaking 必写 changelog BREAKING + 迁移路径；visible 视情况写；internal 仅在 commit message 体现 |

**与 alpha 的关键差异**：

- 跳过 stage 1 设计——TODO 在 plan 已写清楚改动 scope、不开 ADR
- 跳过 stage 3 自测 adversarial——beta 改动多为重构，主要风险是回归不是 bug；既有测试守门 + 新加测试覆盖即可
- 跳过 stage 4 文档——beta 多数改动用户不可见（FontSchema 文件搬迁 / 注释清理 / 内部命名重构 等不影响 mdx）；用户可见时单独走 docs-doc-write
- **新增 stage 2 多 LLM 评估**——beta 的核心安全网

## 自动判级（beta 简化为 3 档）

beta 允许公开 API 改名 / 重构，但需按破坏范围分档评估深度：

| Level | 触发条件 |
|---|---|
| **internal** | 仅 `packages/{core,react}/src/**` 内部目录搬迁 / 注释 / 私有函数重命名 / 文件拆分 / 类型层重构（不导致 public API surface 变化） |
| **visible** | 触及 `apps/docs/**` / 用户可见行为（错误信息 / 默认值 / 性能可观察变化），但**不**改 public export 名 |
| **breaking** | 改 public API surface：schema 导出名 / 组件名 / 函数签名 / 公开 type 名 / 字段 rename。beta 允许，但需写 changelog BREAKING + 迁移路径 |

判级影响：
- internal：stage 2 等价性审计（轻），stage 3 不写 changelog
- visible：stage 2 等价性 + 收益审计，stage 3 视情况写 changelog
- breaking：stage 2 等价性 + 收益审计（双 LLM 必跑），stage 3 必写 changelog BREAKING 段

**红线**：若 TODO 实际是"加新功能 / 加新 IR 形态 / 加新公开字段集" → 立刻 halt 推到下个 alpha 窗口。beta 只做修改类。

## Stage 1 — 实现

复用 [`develop-implement`](../develop-implement/SKILL.md) 但做以下简化：

- **不走 Spec-First TDD**（alpha 红色专属）——beta 改动既有测试已存在，直接修改实现 + 视需要加新测试
- **既有测试断言可以改**（breaking 改名 / 重构会动测试 import 与类型名），但**断言的语义等价性必须保留**——只允许跟着 rename / 类型层调整改 import 与类型 alias，不允许弱化断言（如把 `toBe` 改 `toMatchObject`）
- **新加测试覆盖**视 TODO 性质：
  - 内部搬迁 / 注释清理 → 现有测试守门即可，不强制新加
  - 性能优化 → 加 1 个基准 / 复杂度测试
  - bug fix → 必加回归测试（先 fail 后 pass 的 commit pair）
  - 新 helper / 新 export → 加单测覆盖
- **lint / tsc / 既有测试三全过**才允许进 stage 2

完成标志：working tree 改动完整、所有守门通过、待 commit。

## Stage 2 — 多 LLM 评估（beta 核心）

beta 阶段最大风险是**重构引入回归 + breaking 改名漏改调用方**——同 model 自己 review 改动会漏。本阶段**派两个不同 LLM 独立评估**，全部通过才进 stage 3。breaking 级别改动尤其需要双 LLM 审核迁移完整性（所有内部 / 外部引用是否同步改完）。

### 评估对象

打包给评估 LLM 的输入：

1. TODO 条目原文（来自 plan）
2. 完整 diff（含被删 / 移动 / 新增 / 修改的文件）
3. 公开 API surface diff（`packages/*/src/index.ts` 的 export 列表变化）
4. 改动前后的核心文件 snapshot（用于"等价性"判定）

### 评估者 1：等价性审计（**必跑**）

**Prompt 角度**：审计视角——"这份 diff 是否有未声明的回归？breaking 改动是否完整迁移？"

关注：

- 公开 export 是否新增 / 删除 / 改名 / 改签名（**任何改动都视为破坏**，除非 TODO 明示）
- IR schema 字段名 / 语义 / 默认值是否变化
- 行为是否在用户可观察层面变化（错误信息 / 抛错条件 / 异步时序 / 性能阶梯）
- 测试覆盖是否减少（删测试 / 改弱断言 / 把 `expect.toBe` 改 `.toMatchObject`）

输出 BLOCKING / WARNING / INFO 三档：

- BLOCKING：检测到破坏（哪怕 TODO 没声明）——必须修或回退
- WARNING：边缘情况（性能未测 / 错误信息变化未文档化）——人工裁决
- INFO：备注（命名可改更好 / 顺手清理建议）——可选采纳

### 评估者 2：收益审计（**breaking / visible 必跑，internal 可选**）

**Prompt 角度**：替代视角——"这份改动是否真的更好？是否过度工程？"

关注：

- 改动是否解决 TODO 声明的问题（不是"动了"就算解决）
- 是否引入新复杂度（拆 3 文件 + 加 2 helper 解决 "重复 3 行" 是过度）
- 是否有更小的等价改动可替代
- 与项目惯例 / AGENTS.md 规则的一致性

输出同三档 BLOCKING / WARNING / INFO。

### 推荐 LLM 组合

| 评估者 | 推荐 LLM | 备选 |
|---|---|---|
| 等价性审计 | Claude Opus（独立 session）| GPT-5 / Gemini 2.x |
| 收益审计 | ChatGPT（OpenAI o3 / GPT-5）| Claude Opus / Gemini 2.x |

跨 vendor 优先。两个评估者**同 vendor 不同 model 退而求其次**，**完全同 model 同 session 不算多 LLM 评估**。

### 主 AI 调度

主 AI 不主动调外部 vendor API——评估对话由**用户在自己窗口里手动跑**（贴 prompt + diff），把结论贴回主 AI。主 AI 负责：

1. 起草打包给评估者的 prompt + 输入（diff + TODO + 关注点）
2. 等用户贴回评估意见
3. 合并 BLOCKING / WARNING / INFO 三档报告
4. BLOCKING 列表非空 → 修改实现 → 重跑 stage 1 守门 → 重跑 stage 2 评估
5. BLOCKING 清空、WARNING 已人工裁决 → 进 stage 3

### 3 轮收敛规则

同 BLOCKING 反复出现 3 轮 → halt → 主 AI 呈给人工，可能要回 plan 修 TODO 范围或退回原始实现。

## Stage 3 — 收尾

复用 [`develop-wrapup`](../develop-wrapup/SKILL.md) 但做以下简化：

| wrapup 子步骤 | beta 是否做 |
|---|---|
| changelog 草稿（zh + en） | **breaking 必写**（含 BREAKING 段 + 迁移路径）；**visible 视情况写**（用户可观察变化）；internal 不写 |
| Contract Auditor adversarial 对账 | **不走**（beta 没 ADR 可对，stage 2 多 LLM 评估已覆盖等价性审计） |
| ADR Proposed → Accepted | **不做**（beta 不开 ADR） |
| roadmap checkbox 勾选 | **做**——按 plan TODO 编号勾 |
| plan TODO 删除 / 标完成 | **做**——`notes/plans/v<MAJOR>/v<MAJOR>.<MINOR>-beta.<N>.md` 该条标 ✅ + commit hash |
| 人工授权 commit | **必走**——commit 必须显式 ack |

**与 alpha-wrapup 的硬差异**：

- 不派 Contract Auditor sub-Agent（stage 2 多 LLM 评估已经是审计）
- changelog：breaking 必写、visible 视情况、internal 仅 commit message
- 不动 ADR 状态字段（beta 无 ADR）

## 多模型混用

beta 阶段三个角色对应的 LLM 分工：

- **实现 Agent**：默认 Claude Opus（主 AI）——按 TODO 改代码
- **等价性审计 LLM**：跨 vendor（用户提供）——审计 diff 是否有未声明回归 + breaking 改动迁移是否完整
- **收益审计 LLM**：跨 vendor 第二家（用户提供）——审计改动是否真更好

主 AI 不主动调外部 vendor。用户介入手动同步——主 AI 负责打包 prompt + 合并意见。

## 批量 worktree 模式

启动模式 = 批量时本节生效；单条模式跳过本节。**批量逻辑与 `flow-alpha` 完全一致**——读全部 TODO、跑依赖分析、出布局图、人工 ack、建 worktree、派 Agent。直接参 [`flow-alpha`](../flow-alpha/SKILL.md) "批量 worktree 模式"段，把 "ADR" 替换为 "plan TODO 条目"、把 "5 阶段" 替换为 "3 阶段"即可。

## 失败 / 升级

| 触发 | 动作 |
|---|---|
| 实际改动需要**加新功能 / 加新 IR 形态 / 加新公开字段集** | halt → 这条 TODO 推到下次 alpha 窗口（beta 只做修改类） |
| 多 LLM 评估检测出 BLOCKING 3 轮不收敛 | halt → 人工裁决：要么继续重写实现，要么放弃这条 TODO |
| 评估者 1 / 评估者 2 意见冲突 | halt → 人工裁决；理由记在 commit message |
| 既有测试改动 > 既有测试断言被弱化 | halt → 这通常等于偷偷改 API；要么回退测试改动，要么 TODO 重新评估为 alpha 改动 |

## 与上下游衔接

- **上游**：beta plan TODO 已登记（`notes/plans/v<MAJOR>/v<MAJOR>.<MINOR>-beta.<N>.md`）
- **下游**：可能的 [`package-publish`](../package-publish/SKILL.md)（当 plan 全部 TODO 完成、想发版到 npm 时）；否则结束、等下条 TODO 走本 SKILL 再来一次

## 完成标志（每条 TODO）

- 实现 commit 已落、人工授权
- plan 该条 TODO 标 ✅ + commit hash
- breaking 改动有 changelog BREAKING 段 + 迁移路径（zh + en）；visible 视情况
- 多 LLM 评估意见已合并、BLOCKING 全清
- 人工显式说"完成"或调用本 SKILL 进下一条 TODO

## 何时换回 flow-alpha

发现需要**加新功能**（新 IR 形态 / 新公开字段 / 新行为）时——立刻 halt 本 SKILL，把该需求登记为下个 alpha 窗口候选（v0.2 alpha / v1 alpha），用 [`flow-alpha`](../flow-alpha/SKILL.md) 走 ADR 流程。

**beta 范围内允许**（不需要换流程）：
- 公开 type / schema / 组件名 rename（如 `Tikz → TikZ`、`ViewBox → Layout`）
- 公开函数签名重构（如 cast 收敛、参数名 `ctx → context`）
- 删 deprecated / 删 alias
- 改默认值（合理边界值修正）

**beta 范围外**（需走 alpha）：
- 加新 schema 字段 / 新 enum 形态 / 新 union 分支
- 加新公开组件 / 新功能集
- 加新 IR 节点类型

**rc 起公开 API 冻结**——上述"允许"项 rc 之后不再做。
