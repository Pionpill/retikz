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

`notes/adr/<NNNN>-<slug>.md`，状态 = Proposed。

ADR 编号规则：每个 alpha 段从 0001 开始（alpha.4 是 0001-0003，alpha.5 重新从 0001）。这与 [package-publish](../package-publish/SKILL.md) 中 "alpha.X 完工后 adr/ 给下版重新编号" 约定吻合。

## ADR 模板（必填段全展示）

````markdown
# ADR-NNNN：<标题>

- 状态：Proposed
- 决策日期：YYYY-MM-DD
- 关联：[v0-roadmap §...](../plans/v0-roadmap.md) · [tikz-gap-analysis §...](../analysis/...) · [DESIGN.md §...](../architecture/DESIGN.md)

## 背景

<现状是什么、为什么不够、TikZ 怎么做、用户为什么会想要>

## 选项

### A. <方案 A>（**推荐**）

<schema 草案 / DSL 表面 / 编译期处理示意>

### B. <方案 B>

<...>

### C. <方案 C>

<...>

## 决策：<选哪个>

理由：

1. <...>
2. <...>

## 待决策点

- <小决策 1>：<选项与倾向>
- <小决策 2>：<选项与倾向>

## DSL 表面

```tsx
<示例 JSX>
```

## 测试设计

`packages/core/tests/<对应路径>.test.ts` 覆盖：

<列出 case 类别>

## 影响

- <对现有代码 / 文档 / IR 的影响清单>

## 不在本 ADR 范围

- <推迟到下版的相关项>

---

## 实现契约（必填）

> 本段是下游 implement / test / document / wrapup 阶段的硬契约。AI 子 Agent 严格按此执行，偏离需开新 ADR。

### Level

`red` | `yellow` | `green`

| Level | 触发 |
|---|---|
| red | 动 IR schema / compile 核心 / public exports |
| yellow | 动 kernel / sugar / parser / render |
| green | 仅文档 / 测试 / 配置 |

判级与 [`alpha-feature-dev`](../alpha-feature-dev/SKILL.md) "自动判级" 表对齐——以本段下"文件 scope"为输入。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/xxx.ts` | 加字段 / 改字段 / 删字段 | `<exact name>` | `<zod 类型>` | `<default 或 —>` | <一句话> |

每行一条字段改动。**字段名一旦写死，下游 Spec / 实现 Agent 不允许改**。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/core/src/ir/xxx.ts`（新建 / 修改）
- `packages/core/src/compile/yyy.ts`（修改）
- `packages/core/tests/.../xxx.test.ts`（新建）
- `packages/react/src/kernel/Xxx.tsx`（新建 / 修改）
- ...

偏离白名单需开新 ADR 或本 ADR 加新条目重审。

### 测试象限（每条 ADR 至少 9 个 case）

按四象限填，每类不少于下限：

**Happy path（≥ 3）**：

- `<case 名>`：<触发输入> → <期望行为>
- ...

**边界（≥ 2）**：

- `<case 名>`：<min/max / 0 / 空 / 单元素> → <期望>
- ...

**错误路径（≥ 2）**：

- `<case 名>`：<schema 拒绝 / 引用未定义 / 类型错> → <期望抛错或 null>
- ...

**交互（≥ 2）**：

- `<case 名>`：<与已有功能交叉，如 rotate × scale × 本字段> → <期望>
- ...

### 依赖的现有元素

本 ADR 引用 / 扩展 / 修改的现有 IR 元素 / API / 工具：

- `IRPosition`（geometry/point）—— 不修改、仅引用
- `AT_DIRECTIONS`（ir/position/at-position.ts）—— 引用枚举值
- ...
````

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

完成本阶段的标志：`notes/adr/<NNNN>-*.md` 已 commit、实现契约段 4 件齐、人工说"可以进实现"。

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
