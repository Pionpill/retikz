---
name: develop-wrapup
description: alpha 功能开发的收尾阶段——AI 起草 changelog 草稿（zh + en），派 Adversarial Contract Auditor 子 Agent（独立 Opus session，prompt 角度："对账 ADR 承诺 / changelog / docs / 实际行为四方一致")，把对账报告与 changelog 草稿一并呈给人工。**人工 ack 后**才进 commit + ADR 标 Accepted + roadmap 勾选。AI 不得自行 publish / push。
---

# Stage 5：收尾

实现 + 测试 + 文档都已稳，接下来把这条 ADR"封口"——写 changelog、跑第二关 adversarial 对账、人工最终审、commit、标 ADR Accepted。

## 输入

- ADR（Proposed）
- 全套 commit 历史（spec / 实现 / adversarial 修复 / 文档）
- develop-test 留下的 INFO 列表（实现稳健性素材）
- develop-document 完成的 mdx / demo

## 流程

### 5.1 起草 changelog（zh + en）

主 AI 起草 `apps/docs/src/contents/reference/releases/changelog/index.{zh,en}.mdx` 的新条目（如果是 alpha.N+1 的第一条 ADR）或追加（如果当月已有 alpha.N 段）。

格式按 [`package-publish`](../package-publish/SKILL.md) §2.2 规范：

````mdx
## v0.1.0-alpha.X

<一句总结>

### `@retikz/core`
- ...

### `@retikz/react`
- ...

### `docs`
- ...
````

但本阶段**只起草、不 commit**——changelog 的最终版本要等人工 review + adversarial 对账后才定。

### 5.2 派 Adversarial Contract Auditor 子 Agent

#### 输入准备

- ADR 全文
- changelog 草稿（zh + en）
- 本 ADR 涉及的 commit 历史 `git log --oneline <range>`
- mdx / demo diff
- schema diff（`git diff <ADR commit 起点>..HEAD -- 'packages/core/src/ir/**'`）

#### 调用方式

```ts
Agent({
  subagent_type: 'general-purpose',
  model: 'opus',
  description: 'Contract Auditor for ADR-NN',
  prompt: `<把下面的 Contract Auditor system prompt 完整粘贴 + ADR + changelog 草稿 + commit 历史 + diff 路径>`,
})
```

#### Contract Auditor 完整 system prompt

```
你是 retikz alpha 功能开发的 Adversarial Contract Auditor 子 Agent。

任务：对账。给定四个来源的"承诺 / 描述 / 实现 / 行为"——

  1. ADR（设计契约）
  2. changelog 草稿（用户视角的承诺）
  3. mdx + demo（文档站描述 + 演示）
  4. 实际代码 + 测试（实际行为）

找四方不一致。常见的不一致模式：

  A. **悄然加码**：实现 / 测试里出现的字段、prop、行为，ADR / changelog 没列
  B. **悄然减码**：ADR / changelog 承诺的字段或行为，实现 / 测试里没有 / 不完整
  C. **默认值偏移**：ADR 表写默认 4，实现里是 5（或者 ADR 写"缺省 above"，实现里缺省 below）
  D. **命名漂移**：ADR 表叫 `nodeDistance`，实现里叫 `node_distance` 或 `defaultDistance`
  E. **mdx 与代码脱节**：mdx 描述的 API 行为与实际不符（mdx 写"接受 [a,b,c]"，代码只接受 [a,b]）
  F. **demo 与文档说明矛盾**：demo 用法在 mdx 里没解释 / mdx 说有用法 demo 没演示
  G. **changelog 与 mdx 范围不符**：changelog 说"新增 X / Y / Z"，mdx 只描述了 X / Y
  H. **测试覆盖与 ADR 测试象限不符**：象限要求 ≥ 9 case，实际不到 / 类别失衡

强制约束：

- 你不修代码、不修 mdx、不修 changelog。**只报告四方对账结果**。
- 你不必抓"代码 bug"——那是 develop-test 第一关 Bug Hunter 的事。
- 你的关注点是**承诺 / 描述 / 实现的一致性**，不是"代码本身好不好"。
- 你可以查 git log / git diff 看历史。

输出格式（结构化）：

BLOCKING（必须修，否则不进 commit）：
  - 项: <字段名 / 行为>
    ADR 说: ...
    changelog 说: ...
    mdx 说: ...
    实际是: ...
    建议修哪个: <ADR / changelog / mdx / 实现>

WARNING（建议修但不阻塞）：
  - 同上

INFO（一致 / 文档质量"好消息"）：
  - <可写进 changelog 的措辞建议或省略>

只报告，不修。
```

#### Contract Auditor 输出处理

| 列表 | 处理 |
|---|---|
| BLOCKING 非空 | 主 AI 决定修哪一方（ADR / changelog / mdx / 实现），然后改完后**重跑 Auditor**确认对齐；最多 3 轮 |
| WARNING 非空 | 主 AI 决定本 ADR 内修还是 backlog |
| INFO | 整理后并入 changelog 措辞 |

注意：BLOCKING 偏差通常**不是简单的代码 bug**——可能 ADR 设计错了、可能 changelog 写得太宽、可能 mdx 没跟上。如果 1 轮没对齐，建议直接 halt 给人工——AI 自动调和"承诺差距"通常会偏向某一方。

### 5.3 多模型协同（可选）

用户可手动把同一份 ADR + changelog + commit 历史 + diff 喂给 ChatGPT 跑同样的 Contract Auditor prompt，得到第二份 BLOCKING / WARNING 列表。主 AI 接到两份后**取并集**合并 BLOCKING 列表。

### 5.4 人工 review

主 AI 把以下材料整理给人工：

```
ADR：notes/adr/<NNNN>-*.md
本 ADR commit 列表：
  - <hash> <message>
  - ...

changelog 草稿（zh）：
  <粘贴段落>

changelog 草稿（en）：
  <粘贴段落>

Adversarial 第一关 Bug Hunter 结果：
  BLOCKING（已全修）: <case 名列表>
  WARNING: <case 名列表>
  INFO: <稳健性亮点>

Adversarial 第二关 Contract Auditor 结果：
  BLOCKING: <项列表>
  WARNING: <项列表>
  INFO: <一致性亮点>

请审阅。可以的话回复"确认"或修改建议。
```

### 5.5 人工 ack 后的 commit 序列

收到人工"确认"后顺序做：

```bash
# 1. ADR 状态翻 Accepted
sed -i 's/^- 状态：Proposed/- 状态：Accepted/' notes/adr/v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>/NNNN-*.md
git add notes/adr/v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>/NNNN-*.md
git commit -m ":pencil: ADR-NN 完工：标记 Accepted"

# 2. roadmap 勾选（如果是本 alpha 段最后一条 ADR）
# 编辑 notes/plans/v0/roadmap.md 把 - [ ] vX → - [x] vX
git add notes/plans/v0/roadmap.md
git commit -m ":pencil: 勾掉 v0 roadmap §<段>"

# 3. changelog 入库
git add apps/docs/src/contents/reference/releases/changelog/index.{zh,en}.mdx
git commit -m ":books: alpha.X changelog：ADR-NN <一句话>"
```

3 个 commit 各自独立——ADR 状态 / roadmap / changelog 三件不该耦合。

### 5.6 不走到 publish

publish 是 [`package-publish`](../package-publish/SKILL.md) SKILL 的事，与本 SKILL **互斥**。

发不发版由用户决定：
- 单条 ADR 完工就发 alpha.N+1 → 走 package-publish
- 累积多条 ADR 再发 → 暂不发版，主 AI 输出"等下一个 ADR / 等用户发版"提示

## 失败 / 升级

| 情景 | 处理 |
|---|---|
| Contract Auditor 报告"实现与 ADR 严重不符" | halt → 主 AI 呈给人工，可能要回 develop-implement 重做或修 ADR |
| Contract Auditor 1 轮没对齐 | halt → 直接呈给人工，不要 AI 自行调和承诺差距 |
| 人工 review 否决 changelog | 主 AI 改写后再 review，不重跑 Adversarial（除非人工说要） |
| 人工 review 暴露代码本身的问题 | halt → 回 stage 2 / 3 修，本 SKILL 暂停 |

## 与上下游衔接

- **上游**：develop-document（文档已落地）
- **下游**：可能的 [`package-publish`](../package-publish/SKILL.md)（如要发版）；否则结束、等下条 ADR 走 flow-alpha

## 完成标志

- ADR 状态 Accepted、已 commit
- changelog zh + en 段落已入库
- roadmap 对应 alpha 段 checkbox 已勾（如适用）
- Adversarial 第二关报告附在收尾 commit 之一的 message / PR 描述里（供回溯）
- 人工显式说"完成"或调用 flow-alpha 进下一条 ADR
