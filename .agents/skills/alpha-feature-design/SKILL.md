---
name: alpha-feature-design
description: alpha 功能开发的设计阶段——产出 ADR 草案，含必填实现契约段（Level / Schema 改动表 / 文件 scope / 测试象限 ≥ 9 case / 依赖现有元素）。本阶段**主要由人工参与**，AI 仅辅助起草 / 整理 / 校验完整性。AI 不得跳过本阶段直接进 implement。
---

# Stage 1：设计

alpha 功能开发的入口。产出**一份 ADR**——下游所有阶段（implement / test / document / wrapup）都按它走。

## 主体责任

| 角色 | 做什么 |
|---|---|
| **人工** | 提出问题域、列选项、做决策、定 schema 字段名 / 默认值 / 测试 case |
| **AI** | 复述问题域、整理 ADR 模板、查现有 IR 是否已有相近概念、检查实现契约段完整性 |

人工是设计阶段的**最终决策者**——AI 不得自行确定 schema 字段名 / 默认值 / 是否纳入此版本。AI 给选项，人工拍板。

## 输入

启动本 SKILL 需要：

1. 功能描述（用户的一句话需求 + 关联的 v0-roadmap 条目）
2. 关联的 TikZ 等价语义（如有）
3. tikz-gap-analysis 中的优先级（P0 / P1 / P2）

## 输出

`notes/adr/v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>/<NNNN>-<slug>.md`，状态 = Proposed。

例：`notes/adr/v0/v0.1-alpha.5/0004-some-feature.md`

### 目录约定

- **一级**：MAJOR 版本（`v0/` / `v1/`）
- **二级**：版本通道节点（`v0.1-alpha.5/` / `v0.1-beta.1/` / `v0.1-rc.1/` / `v0.1/` 表稳定）
- **PATCH 不开目录**：patch 仅修 bug、不写 ADR
- **ADR 永久保留**：被新版决策覆盖时只标 `状态：Superseded by ADR-NNNN`，不删

### 编号规则

- **项目级全局单调**：跨 milestone 不重置
- alpha.4 是 ADR-0001 ~ ADR-0003 → alpha.5 从 ADR-0004 起
- ADR 一旦分配编号，编号永远绑定该 ADR（即使后来 Rejected / Superseded）
- 起新 ADR 前查 `notes/adr/README.md` 索引拿下一个未用编号

### 模板

复制 `notes/adr/_template.md` 到目标位置：

```bash
cp notes/adr/_template.md notes/adr/v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>/<NNNN>-<slug>.md
```

模板里的相对链接已按"实例位于二级目录"写好，cp 后能直接用。

## ADR 必填段速查

完整模板在 [`notes/adr/_template.md`](../../../notes/adr/_template.md)（cp 到二级目录 `v<MAJOR>/v<MAJOR>.<MINOR>-channel.N/<NNNN>-<slug>.md` 后路径自动正确）。本 SKILL 只列必填段速查供 AI / 人工写 ADR 时核对：

**叙述部分**：

- 标题（`# ADR-NNNN：<一句话>`）
- 状态 / 决策日期 / 关联（v0-roadmap / tikz-gap-analysis / DESIGN.md）
- 背景（现状 + 痛点 + TikZ 等价）
- 选项（≥ 2 个，含 schema 草案 + DSL 表面）
- 决策（选哪个 + 理由）
- 待决策点（选项内部的小决策，越细越好）
- DSL 表面（用户角度示例 JSX）
- 测试设计（case 类别概述，具体 case 在实现契约段）
- 影响（对现有代码 / 文档 / IR 的牵动）
- 不在本 ADR 范围（推迟项）

**实现契约（必填，下游 Spec / 实现 / 测试 / 文档 Agent 的硬约束）**：

| 段 | 必填项 |
|---|---|
| Level | `red` \| `yellow` \| `green`（判级表见 [`alpha-feature-dev`](../alpha-feature-dev/SKILL.md) "自动判级"） |
| Schema 改动 | 表格：文件 / 操作 / 字段名 / 类型 / 默认值 / describe；无改动写"无" |
| 文件 scope | 白名单：本 ADR 实现允许触碰的所有文件；偏离需新开 ADR 或加条 |
| 测试象限 | 4 类各达下限：happy ≥ 3 / 边界 ≥ 2 / 错误路径 ≥ 2 / 交互 ≥ 2，**至少 9 case** |
| 依赖现有元素 | 本 ADR 引用 / 扩展的现有 IR / API / 工具，每条注明用途（仅引用 / 扩展 / 修改） |

## 流程

1. **人工与 AI 对话整理需求** → AI 复述确认
2. AI 起草 ADR：背景 / 选项 / 决策 / DSL 表面 / 测试设计部分
3. **人工 review 并填实现契约段**——schema 字段表 / 文件 scope / 测试象限 必填
4. AI 校验完整性：
   - schema 字段表每行四列填全
   - 文件 scope 至少包含 IR 文件 + 测试文件
   - 测试象限四类各达下限（≥ 3 / ≥ 2 / ≥ 2 / ≥ 2 = 9 起步）
   - 校验失败 → 报告人工补充
5. **人工 commit ADR**（emoji `:books:` 或 `:sparkles:`）—— 状态仍 Proposed，直到 alpha-feature-wrapup 阶段才翻 Accepted

完成本阶段的标志：`notes/adr/v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>/<NNNN>-*.md` 已 commit、实现契约段 4 件齐、人工说"可以进实现"。

## 失败 / 升级

- 选项分析陷入死循环（每次重整都改决策）：halt → 人工应当先做更小的 PoC（不走 ADR）确认方向
- 实现契约段填不全（schema 字段没想清楚 / 测试 case 列不全）：halt → ADR 没准备好就不进 implement
- ADR 描述跨度太大（一条 ADR 想做 3+ 个独立特性）：拆 ADR

## 与上下游衔接

- **上游**：v0-roadmap 给出"该做什么"
- **下游**：alpha-feature-implement 读本阶段产出的 ADR 进入实现
- **不调** docs-doc-write——文档在 alpha-feature-document 阶段才写

## 完成标志

- ADR 文件存在、状态 Proposed
- 实现契约段四件齐（Level + Schema 改动 + 文件 scope + 测试象限）
- 已 commit
- 人工显式说"开始实现"或调用 alpha-feature-implement
