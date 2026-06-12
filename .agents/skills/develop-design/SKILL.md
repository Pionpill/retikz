---
name: develop-design
description: alpha 功能开发的设计阶段——产出 ADR 草案，含必填实现契约段（Level / Schema 改动表 / 文件 scope / 测试象限 ≥ 9 case / 依赖现有元素）。本阶段**主要由人工参与**，AI 仅辅助起草 / 整理 / 校验完整性。AI 不得跳过本阶段直接进 implement。
---

# Stage 1：设计

alpha 功能开发的入口。产出**一份 ADR**——下游所有阶段（implement / test / document / wrapup）都按它走。

## 设计原则（一等优先级）

retikz 的根本设计原则——**AI 一等公民、IR 是为 AI 设计的**（[`notes/architecture/core-design.md`](../../../notes/architecture/core-design.md) §7）。本阶段 ADR 的所有选项分析、字段命名、默认值决策都必须先过 AI 友好性这一关：

- 新加字段是否 100% JSON 可序列化？（不能是函数 / class / ReactNode / Symbol / Map / Set）
- 字段名是否沿用 TikZ 词汇 + 不缩写？（保留 LLM 训练数据亲和力）
- discriminated union 是否用清晰 `type` 字段？
- schema 是否 LLM 直生成 / 编辑友好？（避免顺序敏感的隐式数组、polymorphic 同字段两种类型、magic literal）

任何设计选项削弱 AI 友好性 → 否决，无论其他维度收益多大。详 `core-design.md` 的 AI 友好原则。

### 适配器对等：react / vanilla 两套 authoring surface

retikz 是多渲染器库，authoring 层有两套对用户的入口——`@retikz/react`（JSX DSL）与 `@retikz/vanilla`（命令式 builder）。**凡 ADR 引入 / 改动 authoring API（新图元、新 DSL 表面、新 props/config 字段），「DSL 表面」段必须同时给 react 与 vanilla 两套写法**，不能只设计 react 一套：

- 两套都消费同一份 IR + zod schema（单一真源），故字段设计天然共享；ADR 要显式列出两套调用示例，确认 vanilla builder 也能表达。
- 若某能力只在一套适配器有意义（如纯 SSR / 纯 React hook 集成），在「不在本 ADR 范围」段写明并给理由，不是默认省掉另一套。
- 下游 develop-implement 据此落两套实现、cross-test 据此两套都测、develop-document 据此 demo 出两套代码视图。

## 主体责任

| 角色 | 做什么 |
|---|---|
| **人工** | 提出问题域、列选项、做决策、定 schema 字段名 / 默认值 / 测试 case |
| **AI** | 复述问题域、整理 ADR 模板、查现有 IR 是否已有相近概念、检查实现契约段完整性 |

人工是设计阶段的**最终决策者**——AI 不得自行确定 schema 字段名 / 默认值 / 是否纳入此版本。AI 给选项，人工拍板。

## 输入

启动本 SKILL 需要：

1. 功能描述（用户的一句话需求 + 关联的 v0 roadmap 条目）
2. 关联的 TikZ 等价语义（如有）

## 输出

`notes/decisions/core/v<MAJOR>/v<MAJOR>.<MINOR>/v<MAJOR>.<MINOR>-<channel>.<N>/<NNNN>-<slug>.md`，状态 = Proposed。

例：`notes/decisions/core/v0/v0.1/alpha.5/01-some-feature.md`

### 目录约定

- **一级**：MAJOR 版本（`v0/` / `v1/`）
- **二级**：MINOR 版本（`v0.1/` / `v0.2/`），该目录下的 `roadmap.md` 是 minor 总路线
- **三级**：版本通道节点（`alpha.5/` / `beta.1/` / `rc.1/` / `v0.1/` 表稳定），该目录下的 `roadmap.md` 是 milestone 执行路线
- **PATCH 不开目录**：patch 仅修 bug、不写 ADR
- **ADR 永久保留**：被新版决策覆盖时只标 `状态：Superseded by ADR-NN`，不删

### 编号规则

- **按 milestone 重置 + 两位数**：每个 `v<MAJOR>.<MINOR>-<channel>.<N>/` 目录下从 `01` 起重新计数（目录已经做了版本分组，不需要全局唯一编号）
- alpha.4 是 ADR-01 ~ ADR-03 → alpha.5 从 ADR-01 重新起计
- 跨 milestone 引用要带 milestone 前缀消歧：`alpha.4 ADR-01`、`alpha.5 ADR-02`
- ADR 一旦分配编号，本 milestone 内编号永远绑定该 ADR（即使后来 Rejected / Superseded）
- 起新 ADR 前查 `notes/README.md` 索引拿当前 milestone 的下一个未用编号

### 模板

复制 `notes/decisions/core/_template.md` 到目标位置：

```bash
cp notes/decisions/core/_template.md notes/decisions/core/v<MAJOR>/v<MAJOR>.<MINOR>/v<MAJOR>.<MINOR>-<channel>.<N>/<NNNN>-<slug>.md
```

模板里的相对链接已按"实例位于三级 milestone 目录"写好，cp 后能直接用。

## ADR 必填段速查

完整模板在 [`notes/decisions/core/_template.md`](../../../notes/decisions/core/_template.md)（cp 到三级目录 `v<MAJOR>/v<MAJOR>.<MINOR>/v<MAJOR>.<MINOR>-channel.N/<NNNN>-<slug>.md` 后路径自动正确）。本 SKILL 只列必填段速查供 AI / 人工写 ADR 时核对：

**叙述部分**：

- 标题（`# ADR-NN：<一句话>`）
- 状态 / 决策日期 / 关联（v0 roadmap / core-design.md）
- 背景（现状 + 痛点 + TikZ 等价）
- 决策（定稿方案：schema 草案 + DSL 表面 + 理由；只写最终采纳的做法，不列被否决的中间方案）
- 待决策点（方案内部的小决策，越细越好）
- DSL 表面（用户角度示例 JSX）
- 测试设计（case 类别概述，具体 case 在实现契约段）
- 影响（对现有代码 / 文档 / IR 的牵动）
- 不在本 ADR 范围（推迟项）

**实现契约（必填，下游 Spec / 实现 / 测试 / 文档 Agent 的硬约束）**：

| 段 | 必填项 |
|---|---|
| Level | `red` \| `yellow` \| `green`（判级表见 [`flow-alpha`](../flow-alpha/SKILL.md) "自动判级"） |
| Schema 改动 | 表格：文件 / 操作 / 字段名 / 类型 / 默认值 / describe；无改动写"无" |
| 文件 scope | 白名单：本 ADR 实现允许触碰的所有文件；偏离需新开 ADR 或加条 |
| 测试象限 | 4 类各达下限：happy ≥ 3 / 边界 ≥ 2 / 错误路径 ≥ 2 / 交互 ≥ 2，**至少 9 case**（**plot alpha milestone 例外**：按复杂度适量、覆盖真实有意义的 accept/reject 与几何断言即可，不硬凑 9——见该 plot milestone roadmap 的「测试 case 规则」） |
| 依赖现有元素 | 本 ADR 引用 / 扩展的现有 IR / API / 工具，每条注明用途（仅引用 / 扩展 / 修改） |

## 流程

1. **人工与 AI 对话整理需求** → AI 复述确认
2. AI 起草 ADR：背景 / 决策 / DSL 表面 / 测试设计部分
3. **多 LLM 评估同一份 ADR 草案**（见下"多 LLM 设计评估"段）
4. **人工 review 并填实现契约段**——schema 字段表 / 文件 scope / 测试象限 必填
5. AI 校验完整性：
   - schema 字段表每行四列填全
   - 文件 scope 至少包含 IR 文件 + 测试文件
   - 测试象限四类各达下限（≥ 3 / ≥ 2 / ≥ 2 / ≥ 2 = 9 起步）；**plot alpha milestone 放宽为按复杂度适量、不硬凑 9（见该 milestone roadmap）**
   - 校验失败 → 报告人工补充
6. **人工确认 ADR 可进入实现**；若需要提交，按根 AGENTS.md 由用户当次授权后再 commit。状态仍 Proposed，直到 develop-wrapup 阶段才翻 Accepted

完成本阶段的标志：`notes/decisions/core/v<MAJOR>/v<MAJOR>.<MINOR>/v<MAJOR>.<MINOR>-<channel>.<N>/<NNNN>-*.md` 已写好、实现契约段 4 件齐、多 LLM 评估意见已合并、人工说"可以进实现"。是否已 commit 取决于用户当次授权。

## 多 LLM 设计评估

**核心动作**：把第 2 步起草的 ADR 草案**贴给至少 2 个不同 LLM**（不同 vendor 或不同 model），各自跑一轮独立评估，把意见交叉合并。

为什么必须做：

- **同 model 同上下文盲区一致**——主 AI 起草时漏的选项 / 字段命名歧义 / schema 反例，自己 review 一遍照样漏
- **设计阶段是改动最便宜的关卡**——schema 字段名定下来后实现 / 测试 / 文档全跟着走，越晚改成本越高
- **跨 vendor 拉数据多样性**——不同公司训练数据 / 对齐风格不同，看待"什么是好 IR schema"的偏好系统性不同

### 推荐组合

至少使用 1 个与起草上下文独立的评估视角；红色改动建议再加第 2 个。优先跨模型 / 跨供应商 / 跨线程；如果只能用同一模型，也要新开上下文并如实标注局限。不要在 skill 里写死模型名。

### 评估 prompt 角度（强制错开）

避免三个 LLM 都从"建设视角"看 ADR——三种角度故意错开：

| LLM 角色 | prompt 角度 | 关注 |
|---|---|---|
| 起草者 | **建设视角**——把 ADR 写完整 | 选项完备性、决策理由、DSL 表面 |
| 评估者 1 | **挑刺视角**——"这份 ADR 哪些地方会让用户 / LLM 误用？"| schema 命名歧义 / 默认值反直觉 / 测试象限漏 case / TikZ 习惯偏离 |
| 评估者 2 | **替代方案视角**——"如果不这么做，还有哪些更简单 / 更通用的方式？" | 字段是否过度设计、能否合并到已有 schema、是否该推迟到下版 |

### 人工合并意见

人工读完三方意见后：

1. 把评估者提的**反对意见 / 替代方案**逐条 vote：采纳 / 部分采纳 / 拒绝 + 理由
2. 拒绝项写进 ADR 的"待决策点"或"不在本 ADR 范围"段（让审计 trail 完整）
3. 采纳项直接改 ADR 草案
4. 若两个评估者意见冲突 → 人工裁决，理由写进 ADR

**人工是裁决者**，不是单纯把多 LLM 意见取并集；意见可能互相矛盾、可能都不对，最终由人决定。

### 输出归档

评估对话不进 git，但**评估结论**要在 ADR 中体现：

- 采纳的方案 → 写进"决策"段
- 拒绝的意见 → 写进"待决策点"或"不在本 ADR 范围"附理由
- 不在 ADR 里出现 = 没评估过；审计时按 missing 处理

### 何时可以跳过

只有一种：**绿色 level 改动**（纯文档 / 纯注释 / 纯 demo），ADR 本身就是走过场，可跳。红色 / 黄色必走。

## 失败 / 升级

- 选项分析陷入死循环（每次重整都改决策）：halt → 人工应当先做更小的 PoC（不走 ADR）确认方向
- 实现契约段填不全（schema 字段没想清楚 / 测试 case 列不全）：halt → ADR 没准备好就不进 implement
- ADR 描述跨度太大（一条 ADR 想做 3+ 个独立特性）：拆 ADR

## 与上下游衔接

- **上游**：v0 roadmap 给出"该做什么"
- **下游**：develop-implement 读本阶段产出的 ADR 进入实现
- **不调** docs-doc-principle / docs-doc-component / docs-doc-example——文档在 develop-document 阶段才写

## 完成标志

- ADR 文件存在、状态 Proposed
- 实现契约段四件齐（Level + Schema 改动 + 文件 scope + 测试象限）
- 已写好；如已获授权则已 commit
- 人工显式说"开始实现"或调用 develop-implement
