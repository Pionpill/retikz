---
name: alpha-feature-dev
description: retikz alpha 期单条功能 / 单条 ADR 的端到端开发编排——按 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾）顺序调度子 SKILL，每阶段设硬关卡。红色改动（动 IR schema / public API / compile 核心）走 Spec-First TDD（独立 Spec Agent 起草测试 + 实现 Agent 让测试过 + 双关 Adversarial 对账）。alpha 期专用——beta / rc / 0 不该有 ADR 级新功能。
---

# alpha 功能开发主流程

retikz alpha 期单条 ADR 端到端开发的**编排器**。子流程拆成 5 个 SKILL 各司其职；本 SKILL 串起来 + 把守阶段间关卡。

## 何时用

- 用户说"开 alpha.N+1"、"开始下个 ADR"、"上 X 功能"
- v0 roadmap 某个 alpha 段还没勾、要开始动手
- 已有 plan / 设计共识、要把 ADR 走完

不适用：

- 修 bug（直接走"问题分析 → fix → 测试 → commit"，不必 ADR）
- 仅文档孤改（直接编辑 mdx，不用本流程）
- 发版（走 [`package-publish`](../package-publish/SKILL.md)）
- beta / rc / 0 阶段（schema 冻结期不该有 ADR 级新功能）

## 5 阶段总览

| # | 阶段 | 子 SKILL | 主体 | 关卡（不过则 halt） |
|---|---|---|---|---|
| 1 | 设计 | [`alpha-feature-design`](../alpha-feature-design/SKILL.md) | **人工**主导 / AI 辅助起草 | ADR 草案完成 + 人工 ack 后才进 2 |
| 2 | 实现 | [`alpha-feature-implement`](../alpha-feature-implement/SKILL.md) | AI（红色走 Spec-First；黄绿常规） | 全部 spec test 绿 + lint / tsc 全过才进 3 |
| 3 | 自测 | [`alpha-feature-test`](../alpha-feature-test/SKILL.md) | AI（Adversarial 第一关：bug hunter） | BLOCKING 全清才进 4 |
| 4 | 文档 | [`alpha-feature-document`](../alpha-feature-document/SKILL.md) | AI（衔接 docs-doc-write） | 双语 mdx + demo + API 表完整才进 5 |
| 5 | 收尾 | [`alpha-feature-wrapup`](../alpha-feature-wrapup/SKILL.md) | AI 起草 / Adversarial 第二关对账 / **人工**最终 ack | changelog 草稿 + ADR 标 Accepted + roadmap 勾掉 + 人工授权后 commit |

## 自动判级（红 / 黄 / 绿）

每阶段开始前算改动 level——以 ADR "文件 scope" 段列出的 path 为准（在 alpha-feature-design 阶段 ADR 必填该段）。判级规则**按优先级匹配，命中即停**：

| Level | 触发文件 path |
|---|---|
| **red** | `packages/core/src/ir/**` · `packages/core/src/compile/**` · `packages/*/src/index.ts` |
| **yellow** | `packages/react/src/{kernel,sugar}/**` · `packages/core/src/parsers/**` · `packages/react/src/render/**` |
| **green** | `apps/docs/**` · `**/*.test.ts` · `**/*.md` · 配置（`*.json` / `*.yaml`） |

**跨级 ADR**（同时碰红 + 黄 + 绿）取最高 level 走流程，但绿色文档允许独立 commit 不走 Spec-First（绿色部分只过 stage 4 的简化路径）。

判级在 alpha-feature-implement / alpha-feature-test SKILL 启动时各跑一次（path glob + 表查），不依赖人工标注。

## 多模型混用

- alpha-feature-implement Stage 2 派的 **Spec Writer**
- alpha-feature-test Stage 3 派的 **Adversarial Bug Hunter**
- alpha-feature-wrapup Stage 5 派的 **Adversarial Contract Auditor**

三个 sub-Agent 默认全 **Opus**、独立 session（互不可见上下文）。同模型盲区一致风险通过 **prompt 角度故意错开**缓解：

- Spec Writer：写规格 + 测试（建设视角）
- Bug Hunter：构造让实现挂的输入（破坏视角）
- Contract Auditor：对账 ADR / changelog / docs / 行为四方一致（审计视角）

**用户可以介入用其他模型并行跑同一阶段**（例：把同一份 ADR + diff 也喂给 ChatGPT 跑 adversarial bug hunting）。主 AI 接到两份意见后**取并集 + 去重**，写进同一个 BLOCKING 列表。多模型协作不需要主 AI 主动调度——用户手动同步即可，主 AI 只负责合并意见。

## 与其它 SKILL 的衔接

- 本 SKILL 是 alpha 期单条 ADR 的端到端编排
- [`package-publish`](../package-publish/SKILL.md) 在 1+ 条 ADR 累积成版本节点后才调（与本 SKILL 互斥不同时跑）
- [`docs-doc-write`](../docs-doc-write/SKILL.md) 是 alpha-feature-document 的实现细节，本 SKILL 透过 stage 4 间接调
- AGENTS.md commit / publish 红线全部继承——AI 不得自行 commit / publish；阶段间 commit 需用户 当次授权

## 失败 / 升级阈值

任何阶段任意 sub-Agent 单步连续 3 轮没收敛 → halt，主 AI 把当前状态呈给用户，由用户决定升级人工还是改 ADR / 改 spec。

具体阈值由各子 SKILL 落实：

- 实现 Agent 让 spec test 跑过：3 轮失败 halt
- Adversarial 第一关 bug hunter 找出 bug：3 轮修不动 halt
- Adversarial 第二关 contract auditor 找出不一致：1 轮修不动直接呈给人工（contract 偏差通常不是 AI 能自动修的）

## Quick Reference

| 想做的事 | 直接调的子 SKILL |
|---|---|
| 起草新 ADR | alpha-feature-design |
| ADR 已 accept、要写代码 | alpha-feature-implement |
| 代码写完、要把测试加固 | alpha-feature-test |
| 代码 + 测试 OK，要补文档 | alpha-feature-document |
| 全完了，要写 changelog + 标 ADR Accepted | alpha-feature-wrapup |
| 一条龙 | alpha-feature-dev（本 SKILL） |

## 验证清单

5 阶段全跑完之后给用户审阅前过一遍：

- [ ] ADR 文档实现契约段 4 件全填（Level / Schema 改动 / 文件 scope / 测试象限）
- [ ] git 历史能读出"测试先于实现"的 commit 顺序（`:construction:` 测试 commit 在 `:sparkles:` 实现 commit 之前）
- [ ] 实现没动 spec test 文件、没改 schema 字段名
- [ ] Adversarial 两关报告附在收尾 commit message 中或 PR 描述里
- [ ] changelog zh + en 双语一致（不要求字字对应，结构对齐）
- [ ] roadmap checkbox 勾掉
- [ ] ADR 状态 Proposed → Accepted
