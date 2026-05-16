---
name: flow-alpha
description: retikz alpha 期 ADR 端到端开发编排——支持 **单条**（一次接 1 条 ADR，当前 worktree 跑完 5 阶段就停）与 **批量 worktree**（一次接 N 条 ADR，每条占独立 worktree + 独立分支，离线一次跑完、等人工 review 再合并）两种模式，启动前 BLOCKING 人工确认选哪种。5 阶段：设计 → 实现 → 自测 → 文档 → 收尾，每阶段硬关卡。红色改动（动 IR schema / public API / compile 核心）走 Spec-First TDD（独立 Spec Agent 起草测试 + 实现 Agent 让测试过 + 双关 Adversarial 对账）。alpha 期专用——beta / rc / 0 走 `flow-beta` 或后续阶段流程。
---

# alpha 功能开发主流程

retikz alpha 期 ADR 端到端开发的**编排器**，支持两种执行模式：

- **单条** — 一次只接 1 条 ADR，当前 worktree 跑完 5 阶段就停；主流场景
- **批量 worktree** — 一次接 N 条 ADR，每条占独立 worktree + 独立分支；离线一次跑完、等人工 review 再合并；用户离线场景专用

子流程拆成 5 个 SKILL 各司其职；本 SKILL 串起来 + 把守阶段间关卡 + 把守模式选择关卡（启动前必须人工确认模式）。

## 何时用

- 用户说"开 alpha.N+1"、"开始下个 ADR"、"上 X 功能"
- v0 roadmap 某个 alpha 段还没勾、要开始动手
- 已有 plan / 设计共识、要把 ADR 走完

不适用：

- 修 bug（直接走"问题分析 → fix → 测试 → commit"，不必 ADR）
- 仅文档孤改（直接编辑 mdx，不用本流程）
- 发版（走 [`package-publish`](../package-publish/SKILL.md)）
- beta / rc / 0 阶段（schema 冻结期不该有 ADR 级新功能）

## 执行模式（启动前 BLOCKING 人工确认）

每次启动**必须先确认本次跑哪种模式**，人工未明示前不进任何 stage、不建 worktree、不动文件。

| 模式 | 用法 | 触发关键词 / 信号 |
|---|---|---|
| **单条** | 一次接 1 条 ADR，当前 worktree 跑完 5 阶段就停 | "下一个 ADR"、"上 X 功能"、单个 ADR 编号 |
| **批量 worktree** | 一次接 N 条 ADR，每条占独立 worktree + 独立分支，等人工 review 再合并 | "批量"、"一次跑完"、"睡觉时跑"、"健身时跑"、"离线"、用户消息中含 ≥ 2 个 ADR 编号 |

主 AI 读用户上一条消息判意：

- 含批量触发词 → 主动呈方案给人工："本次跑 [ADR-A, ADR-B, ...]，建议堆叠 / 平行布局 [...]，确认？"
- 否则默认单条；若含 ≥ 2 个 ADR 编号且未说"批量" → 主动澄清："分别串行还是批量 worktree？"

模式人工 ack 后才开 stage 1。批量模式细则见下方 [批量 worktree 模式](#批量-worktree-模式) 段。

## 5 阶段总览

| # | 阶段 | 子 SKILL | 主体 | 关卡（不过则 halt） |
|---|---|---|---|---|
| 1 | 设计 | [`develop-design`](../develop-design/SKILL.md) | **人工**主导 / AI 辅助起草 | ADR 草案完成 + 人工 ack 后才进 2 |
| 2 | 实现 | [`develop-implement`](../develop-implement/SKILL.md) | AI（红色走 Spec-First；黄绿常规） | 全部 spec test 绿 + lint / tsc 全过才进 3 |
| 3 | 自测 | [`develop-test`](../develop-test/SKILL.md) | AI（Adversarial 第一关：bug hunter） | BLOCKING 全清才进 4 |
| 4 | 文档 | [`develop-document`](../develop-document/SKILL.md) | AI（衔接 docs-doc-principle） | 双语 mdx + demo + API 表完整才进 5 |
| 5 | 收尾 | [`develop-wrapup`](../develop-wrapup/SKILL.md) | AI 起草 / Adversarial 第二关对账 / **人工**最终 ack | changelog 草稿 + ADR 标 Accepted + roadmap 勾掉 + 人工授权后 commit |

## 自动判级（红 / 黄 / 绿）

每阶段开始前算改动 level——以 ADR "文件 scope" 段列出的 path 为准（在 develop-design 阶段 ADR 必填该段）。判级规则**按优先级匹配，命中即停**：

| Level | 触发文件 path |
|---|---|
| **red** | `packages/core/src/ir/**` · `packages/core/src/compile/**` · `packages/*/src/index.ts` |
| **yellow** | `packages/react/src/{kernel,sugar}/**` · `packages/core/src/parsers/**` · `packages/react/src/render/**` |
| **green** | `apps/docs/**` · `**/*.test.ts` · `**/*.md` · 配置（`*.json` / `*.yaml`） |

**跨级 ADR**（同时碰红 + 黄 + 绿）取最高 level 走流程，但绿色文档允许独立 commit 不走 Spec-First（绿色部分只过 stage 4 的简化路径）。

判级在 develop-implement / develop-test SKILL 启动时各跑一次（path glob + 表查），不依赖人工标注。

## 多模型混用

- develop-implement Stage 2 派的 **Spec Writer**
- develop-test Stage 3 派的 **Adversarial Bug Hunter**
- develop-wrapup Stage 5 派的 **Adversarial Contract Auditor**

三个 sub-Agent 默认全 **Opus**、独立 session（互不可见上下文）。同模型盲区一致风险通过 **prompt 角度故意错开**缓解：

- Spec Writer：写规格 + 测试（建设视角）
- Bug Hunter：构造让实现挂的输入（破坏视角）
- Contract Auditor：对账 ADR / changelog / docs / 行为四方一致（审计视角）

**用户可以介入用其他模型并行跑同一阶段**（例：把同一份 ADR + diff 也喂给 ChatGPT 跑 adversarial bug hunting）。主 AI 接到两份意见后**取并集 + 去重**，写进同一个 BLOCKING 列表。多模型协作不需要主 AI 主动调度——用户手动同步即可，主 AI 只负责合并意见。

## 批量 worktree 模式

启动模式 = 批量时本节生效；单条模式跳过本节。

### 启动顺序（人工 ack 选批量后主 AI 必跑）

```
1. 主 AI 读全部候选 ADR 全文（不读则不能判依赖）
2. 跑依赖分析：
   - 看每条 ADR 的"文件 scope"段——文件 path 是否交叉
   - 看"依赖的现有元素"段——是否点名另一条 ADR 的产物 / 新增类型 / 新增字段
   - 看 ADR 之间是否有"依赖于 ADR-XX"显式声明
3. 出布局图（堆叠 / 平行 / 混合）+ 推荐顺序，呈给人工拍板
4. 人工 ack 后：
   - 互不相干（无文件交叉、无符号依赖）→ subAgent 并发调度，每条 ADR 一个独立 Agent + 一个 worktree
   - 有依赖 → 按链堆叠，串行 commit
   - 混合 → 主链堆叠 + 独立支线并发
5. 建 worktree（命令见下方"worktree 建立命令"段）
6. 派 Agent（见下方"启动节奏"段）
```

**主 AI 自判独立性的硬规则**：

- 文件 scope 一处交叉就算"有依赖"，不留模糊空间
- 仅"扫一下 ADR 摘要"不算读全文——必须读完 ADR 的"实现契约段 + 文件 scope + 依赖的现有元素"三段才有资格判
- 判断结果连同推荐布局**显式呈给人工**，人工有否决权；AI 不得越过这一步直接建 worktree

### 适用 / 不适用

适用：

- 用户离线（睡觉 / 健身 / 远行）希望 AI 把多条 ADR 一次跑完
- 同一 milestone 多条 ADR 文件 scope 有交叉，但 review 时要能"任何一条独立丢弃"
- ADR 数 ≥ 2

不适用：

- ADR 数 = 1（worktree 开销不合算，走单条）
- 用户在线全程盯 review（直接走单条更省事）
- 单条 ADR 内部多 step（那是 5 阶段内部事，不开多 worktree）

### 分支与 worktree 布局（启动前主 AI 出图、人工拍板）

扫所有候选 ADR 的"文件 scope"段算交叉：

- **无交叉** → 全部从 main 拉，平行 worktree（可并发跑）
- **有交叉** → 找"地基"ADR（其它 ADR 需要先合并它的产物），按依赖链堆叠

示例（v0.1-alpha.5）：

```
main
 ├─ adr/alpha.5/01-scene-primitive       worktree: ../<repo>-adr-01
 │   └─ adr/alpha.5/04-position-offset   worktree: ../<repo>-adr-04
 │       └─ adr/alpha.5/02-step-label-t  worktree: ../<repo>-adr-02
 │           └─ adr/alpha.5/03-arrow     worktree: ../<repo>-adr-03
 └─ adr/alpha.5/todo-4-rename            worktree: ../<repo>-todo-4   ← 独立基线
```

主 AI 启动前**必须把该图呈给用户**——可推荐顺序，人工拍板。

### worktree 建立命令（人工 ack 后跑）

```bash
# 主仓在 main
git worktree add -b adr/alpha.5/01-scene-primitive   ../retikz-adr-01 main
git worktree add -b adr/alpha.5/04-position-offset   ../retikz-adr-04 adr/alpha.5/01-scene-primitive
git worktree add -b adr/alpha.5/02-step-label-t      ../retikz-adr-02 adr/alpha.5/04-position-offset
git worktree add -b adr/alpha.5/03-arrow             ../retikz-adr-03 adr/alpha.5/02-step-label-t
git worktree add -b adr/alpha.5/todo-4-rename        ../retikz-todo-4 main
```

pnpm hardlink store 下每个 worktree 的 node_modules 占用极小。

可借 `superpowers:using-git-worktrees` skill 做 worktree 建立 + 清理。

### 每个 worktree 内 AI 做的事

```
1. 进 worktree（cwd = ../<repo>-adr-XX）
2. 读 notes/adr/v0/<milestone>/<XX>-*.md
3. 按本 SKILL 5 阶段跑（红 / 黄 / 绿 按判级走 Spec-First / 常规 / 直跑）
4. 每个 stage 内部 commit 跑现有约束（lint / tsc / vitest 三关 + emoji + ADR 编号）
5. 所有 stage 跑完后再跑一次最终三关：
     pnpm lint
     pnpm test
     pnpm -r exec tsc -b --noEmit
6. 三关绿 → 进 7；不绿 → REVIEW.md 写明失败原因后 halt，不"完工"
7. worktree 根写 REVIEW.md（**未追踪、不 commit、不 stage**）—— 模板见下节
8. halt，报告"ADR-XX 已就绪可 review，分支 adr/<milestone>/XX-..."
```

**绝不 push、绝不切回 main、绝不 merge、绝不调 develop-wrapup**。
批量模式下 wrapup 在所有 worktree 合并完后**整 milestone 一次性**跑，不每条 ADR 单独 wrapup。

> Branch 内的中间 commit 由 AI 自跑（受 stage 内三关约束）；
> push / merge / 切 main 这三条是**真正的硬红线**，批量模式不放宽。

### REVIEW.md 模板（每个 worktree 根目录、不追踪）

```markdown
# Review — ADR-XX <title>

**Branch**: adr/<milestone>/XX-...
**Base**: <父分支或 main>
**Commits**: <N 个>
  - <hash> <subject>

## 三关结果

- pnpm lint：                    ✅ / ❌ <详情>
- pnpm test：                    ✅ <N passed> / ❌ <失败列表>
- pnpm -r exec tsc -b --noEmit： ✅ / ❌

## 关键改动（2-3 句讲清干了啥）

## 偏离 ADR 的地方

（没有就写"无"；有就列原因 + 建议读哪段代码确认）

## 文件清单

| 文件 | +/- | 备注 |
|---|---|---|

## 已知风险 / 不确定的点

## 建议 review 顺序

1. 先看 <file>，是核心改动
2. ...
```

唯一允许进入工作区但不进 git 的文件。Review 完由人工手删。

### 启动节奏（堆叠 vs 平行）

依据"启动顺序"段的依赖分析结果：

- **互不相干** → **默认 subAgent 并发**：主 AI 用 `superpowers:dispatching-parallel-agents` 一次派 N 个独立 Agent，每个 Agent cwd = 一个 worktree，独立 session 互不可见；同 message 多 Agent 调用并发执行
- **有依赖（堆叠）** → 串行：后面的 base 在前面之上，AI 必须等前一条 commit 完才能开下一条；不能用并发派单
- **混合** → 堆叠主链 1 路（串行）+ 独立基线 N 路（subAgent 并发）= 并发数 N+1

派 subAgent 时 prompt 必须含：

- 当前 worktree 路径（`cwd`）
- 该 ADR 的完整路径
- "你只动这个 worktree、跑完 5 阶段后写 REVIEW.md、不 push / 不 merge / 不切 main / 不调 wrapup"
- 完工标志 = REVIEW.md 写完 + halt 报告，主 AI 收到报告后才视作该 ADR 待 review

### 人工 review 后的合并（**人工 ack 后才跑，AI 不自启**）

```bash
# worktree 内 review 通过
rm REVIEW.md

# 回主仓合并
cd ../<repo>
git switch main
git merge --no-ff adr/<milestone>/XX-...   # 或 ff-only 看偏好

# 下一条 rebase 到新 main
cd ../<repo>-adr-<next>
git rebase main                            # 大概率干净，冲突就解
```

全部通过后：

```bash
git worktree remove ../<repo>-adr-XX
git branch -d adr/<milestone>/XX-...
```

### 离场期间 AI 不允许做的事

- push 任一分支
- merge 任一分支进 main
- 删 REVIEW.md（这是给人工的报告，AI 不自清）
- 删 worktree
- 调 develop-wrapup
- 跨 worktree 改文件（每个 worktree 严格只动自己分支应改的内容）

任一条触发立即 halt + 等人工。

## 与其它 SKILL 的衔接

- 本 SKILL 是 alpha 期单条 ADR 的端到端编排
- [`package-publish`](../package-publish/SKILL.md) 在 1+ 条 ADR 累积成版本节点后才调（与本 SKILL 互斥不同时跑）
- [`docs-doc-principle`](../docs-doc-principle/SKILL.md)（+ 按页型 [`docs-doc-component`](../docs-doc-component/SKILL.md) / [`docs-doc-example`](../docs-doc-example/SKILL.md)）是 develop-document 的实现细节，本 SKILL 透过 stage 4 间接调
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
| 起草新 ADR | develop-design |
| ADR 已 accept、要写代码 | develop-implement |
| 代码写完、要把测试加固 | develop-test |
| 代码 + 测试 OK，要补文档 | develop-document |
| 全完了，要写 changelog + 标 ADR Accepted | develop-wrapup |
| 一条龙（单条 ADR） | flow-alpha（本 SKILL）单条模式 |
| 多 ADR 离线一次跑完 | flow-alpha（本 SKILL）批量 worktree 模式 |

## 验证清单

5 阶段全跑完之后给用户审阅前过一遍：

- [ ] ADR 文档实现契约段 4 件全填（Level / Schema 改动 / 文件 scope / 测试象限）
- [ ] git 历史能读出"测试先于实现"的 commit 顺序（`:construction:` 测试 commit 在 `:sparkles:` 实现 commit 之前）
- [ ] 实现没动 spec test 文件、没改 schema 字段名
- [ ] Adversarial 两关报告附在收尾 commit message 中或 PR 描述里
- [ ] changelog zh + en 双语一致（不要求字字对应，结构对齐）
- [ ] roadmap checkbox 勾掉
- [ ] ADR 状态 Proposed → Accepted

### 批量模式追加项（每个 worktree 跑完后）

- [ ] REVIEW.md 已写、含三关结果 + 关键改动 + 偏离 ADR + 文件清单 + 风险 + review 顺序
- [ ] REVIEW.md 在 worktree 根、未被 stage / commit（`git status` 应为 untracked）
- [ ] worktree 内 commit 全签：emoji + ADR 编号
- [ ] **没** push、**没** 切 main、**没** merge、**没** 调 wrapup
- [ ] 工作区只动了自己分支应改的内容（无跨 worktree 串话）

收尾时机：所有 worktree 都人工 review 通过 + 合并进 main 之后，整 milestone 跑一次 develop-wrapup（不每条 ADR 单独 wrapup）。
