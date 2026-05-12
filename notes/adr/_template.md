# ADR-NN：<一句话标题>

> 起新 ADR：`cp _template.md v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>/NN-<slug>.md`
> 例：`cp _template.md v0/v0.1-alpha.5/01-foo.md`
> 二级目录约定：
> - 一级 = MAJOR 版本号（`v0/` / `v1/`）
> - 二级 = 版本通道节点（`v0.1-alpha.5/` / `v0.1-beta.1/` / `v0.1-rc.1/` / `v0.1/` 表稳定）
> - PATCH 不开目录（patch 仅修 bug，不写 ADR）
> NN 是**按 milestone 重置**的两位数编号（目录已分组，编号无需全局唯一）。alpha.4 是 01-03，alpha.5 从 01 重新起计；跨 milestone 引用带前缀：`alpha.4 ADR-01`
> slug 用 kebab-case
> 模板对应 [`alpha-feature-design`](../../../../.agents/skills/alpha-feature-design/SKILL.md) SKILL；改 ADR 结构时同步改两边
> 路径假设实例位于 `notes/adr/<MAJOR>/<MAJOR>.<MINOR>-channel.N/<NN>-...md`，模板里的相对链接按此位置写（在模板自身处链接会断，cp 到实例位置后才正确）

- 状态：Proposed
- 决策日期：YYYY-MM-DD
- 关联：[v0 roadmap §<段>](../../../plans/v0/roadmap.md) · [tikz-gap-analysis §<段>](../../../analysis/<...>.md) · [DESIGN.md §<段>](../../../architecture/DESIGN.md)

## 背景

<现状是什么、为什么不够、TikZ 怎么做、用户为什么会想要。3-5 段，避免空话>

## 选项

### A. <方案 A>（**推荐**）

```ts
// schema 草案 / DSL 表面 / 编译期处理示意
```

<逐条说明：解决了什么、代价是什么>

### B. <方案 B>

<同上>

### C. <方案 C>

<同上；如只对比两个方案则删掉这节>

## 决策：<选哪个>

理由：

1. <第一条不可让步的理由>
2. <第二条>
3. <第三条>

## 待决策点

> 选项已选，但选项内部仍有的小决策。**列得越细，下游 Spec / 实现 Agent 越不需要猜**。

- **<决策点 1>**：<选项与倾向>
- **<决策点 2>**：<选项与倾向>

## DSL 表面

```tsx
<最能表达本 ADR 价值的 1-2 段示例 JSX；用户读这段就知道"这玩意能用来干什么"——alpha-feature-document 阶段的 mdx demo 的种子>
```

## 测试设计

`packages/core/tests/<对应路径>.test.ts` 覆盖：

- <case 类别 1>
- <case 类别 2>
- ...

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- <对现有代码的影响：哪些文件受牵动、哪些 IR 字段意义变了>
- <对文档站的影响：哪些章节要补 / 改>
- <对外 API 的影响：哪些 prop 加 / 改 / 删>
- <breaking 改动则显式标 ⚠️ BREAKING + 迁移路径>

## 不在本 ADR 范围

- <列推迟到下版的相关项；写清楚省得 review 时被问 "为什么不顺手做掉 X">

---

## 实现契约（必填）

> 本段是下游 implement / test / document / wrapup 阶段的硬契约。AI 子 Agent 严格按此执行，偏离需开新 ADR 或本 ADR 加新条目重审。

### Level

`red` | `yellow` | `green`

判级规则（参 [`alpha-feature-dev`](../../../../.agents/skills/alpha-feature-dev/SKILL.md) "自动判级" 表）：

- **red**：动 `packages/core/src/ir/**` · `packages/core/src/compile/**` · `packages/*/src/index.ts`
- **yellow**：动 `packages/react/src/{kernel,sugar,render}/**` · `packages/core/src/parsers/**`
- **green**：仅 `apps/docs/**` / 测试 / 注释 / 配置

跨级取最高 level。本 ADR 自评 level：`<red / yellow / green>`，与"文件 scope" 段相符。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/<...>.ts` | 加 / 改 / 删 | `<exact name>` | `<zod 类型>` | `<default 或 —>` | <一句话> |
| ... | ... | ... | ... | ... | ... |

每行一条字段改动。**字段名一旦写死，下游 Spec / 实现 Agent 不允许改**——发现需要改 → 回本 ADR 加条 / 开新 ADR。

无 schema 改动（黄色或绿色 ADR）→ 本表写"无"。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/core/src/ir/<新建>.ts`
- `packages/core/src/compile/<...>.ts`（修改）
- `packages/core/tests/<.../...>.test.ts`（新建）
- `packages/react/src/kernel/<...>.tsx`（新建 / 修改）
- `apps/docs/src/contents/<...>/<...>.mdx`（修改）
- `apps/docs/src/contents/<...>/<...>.demo.tsx`（新建）
- ...

偏离白名单的改动需要：
- 加新条目到本 ADR 的"实现契约 → 文件 scope"段，并自我注解"为什么扩展 scope"
- 或开新 ADR

### 测试象限

每条 ADR **至少 9 个 case**，按四象限分布：

**Happy path（≥ 3）**：

- `<case 名>`：<触发输入> → <期望行为>
- `<case 名>`：...
- `<case 名>`：...

**边界（≥ 2）**：

- `<case 名>`：<min/max / 0 / 空 / 单元素 / undefined> → <期望>
- `<case 名>`：...

**错误路径（≥ 2）**：

- `<case 名>`：<schema 拒绝 / 引用未定义 / 类型错> → <期望抛错或 null>
- `<case 名>`：...

**交互（≥ 2）**：

- `<case 名>`：<与已有功能交叉，如 rotate × scale × 本字段> → <期望>
- `<case 名>`：...

> 这是 [`alpha-feature-implement`](../../../../.agents/skills/alpha-feature-implement/SKILL.md) Stage 2 Spec Writer 的输入。象限填得越具体，Spec Writer 写出的测试越贴 ADR 意图，越不需要 [`alpha-feature-test`](../../../../.agents/skills/alpha-feature-test/SKILL.md) Stage 3 Bug Hunter 兜底。

### 依赖的现有元素

本 ADR 引用 / 扩展 / 修改的现有 IR 元素 / API / 工具：

- `<元素名>`（位于 `<file path>`）—— <如何用：仅引用 / 扩展 / 修改>
- ...

无依赖（全新孤立功能）→ 写"无"。
