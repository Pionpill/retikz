# ADR-NN：<一句话标题>

> 起新 ADR：`cp _template.md v<MAJOR>/v<MAJOR>.<MINOR>/v<MAJOR>.<MINOR>-<channel>.<N>/NN-<slug>.md`
> 例：`cp _template.md v0/v0.1/alpha.5/01-foo.md`
> 目录约定：
> - 一级 = MAJOR 版本号（`v0/` / `v1/`）
> - 二级 = MINOR 版本号（`v0.1/` / `v0.2/`）
> - 三级 = 版本通道节点（`alpha.5/` / `beta.1/` / `rc.1/` / `v0.1/` 表稳定）
> - PATCH 不开目录（patch 仅修 bug，不写 ADR）
> NN 是**按 milestone 重置**的两位数编号（目录已分组，编号无需全局唯一）。alpha.4 是 01-03，alpha.5 从 01 重新起计；跨 milestone 引用带前缀：`alpha.4 ADR-01`
> slug 用 kebab-case
> 模板对应 [`develop-design`](../../../.agents/skills/develop-design/SKILL.md) SKILL；改 ADR 结构时同步改两边
> 路径假设实例位于 `notes/decisions/core/<MAJOR>/<MAJOR>.<MINOR>/<MAJOR>.<MINOR>-channel.N/<NN>-...md`，模板里的相对链接按此位置写（在模板自身处链接会断，cp 到实例位置后才正确）
> **ADR 生命周期**：Proposed 期是「施工蓝图」，带完整实现契约供下游 implement / test / document Agent 执行；该里程碑**发布后、bump 到下一版本前**（也可平时主动单独发起），由 [`package-publish`](../../../.agents/skills/package-publish/SKILL.md) 阶段 6.1 把本里程碑目录下的 Accepted ADR **压缩成「决策记录」**——只留「只有 ADR 能告诉你的 WHY」：删 🔻 两段（待决策点并进「决策」/ 实现契约折成指针）、背景压成几条硬约束、DSL 表面 / 落地分布并进文档站 + 指针、删完工即失效的过渡文本（「受限于… / 待…处理」这类）。保留：决策 / 被否决选项 + 理由 / 不在范围；代码块只留核心数据结构。完整施工契约留在 Proposed commit 的 git 历史（`git show <commit>:<path>` 可捞回），工作区只留定稿态、零信息损失。详见 package-publish 阶段 6.1。

- 状态：Proposed
- 决策日期：YYYY-MM-DD
- 关联：[v0 roadmap §<段>](./v0/roadmap.md) · [analysis §<段>](../../analysis/<...>.md) · [core-design.md §<段>](../../architecture/core-design.md)

## 背景

<现状是什么、为什么不够、TikZ 怎么做、用户为什么会想要。3-5 段，避免空话>

## 决策：<最终方案一句话>

<直接写定稿方案：解决了什么、关键设计、代价。只写最终采纳的做法，不罗列被否决的中间方案>

```ts
// schema 草案 / DSL 表面 / 编译期处理示意
```

理由：

1. <第一条不可让步的理由>
2. <第二条>
3. <第三条>

## 待决策点 🔻

> 方案已定，但方案内部仍有的小决策。**列得越细，下游 Spec / 实现 Agent 越不需要猜**。
> 🔻 临时段：带硬「倾向」的其实已是决策、应直接并进「决策」段而非停在这里；封板（bump 前）时把实现期已拍板项并进「决策」、删除本段，真正悬而未决的挪「不在本 ADR 范围」。

- **<决策点 1>**：<选项与倾向>
- **<决策点 2>**：<选项与倾向>

## DSL 表面

```tsx
<最能表达本 ADR 价值的 1-2 段示例 JSX；用户读这段就知道"这玩意能用来干什么"——develop-document 阶段的 mdx demo 的种子>
```

## 测试设计

`packages/core/core/tests/<对应路径>.test.ts` 覆盖：

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

## 实现契约（必填）🔻

> 本段是下游 implement / test / document / wrapup 阶段的硬契约。AI 子 Agent 严格按此执行，偏离需开新 ADR 或本 ADR 加新条目重审。
> 🔻 临时段：前瞻施工指令，仅 Proposed → 实现窗口内有效。该里程碑发布、bump 到下一版本前（package-publish 阶段 6）整段折成一行指针——实现 commit range + 测试路径 +「最终 schema / 行为以代码为准」；完整契约留在 Proposed commit 的 git 历史。Accepted 后代码 + 测试才是真源，此表只会与代码漂移。

### Level

`red` | `yellow` | `green`

判级规则（参 [`flow-alpha`](../../../.agents/skills/flow-alpha/SKILL.md) "自动判级" 表）：

- **red**：动 `packages/core/core/src/ir/**` · `packages/core/core/src/compile/**` · `packages/*/*/src/index.ts`
- **yellow**：动 `packages/core/react/src/{kernel,sugar,render}/**` · `packages/core/core/src/parsers/**`
- **green**：仅 `apps/docs/**` / 测试 / 注释 / 配置

跨级取最高 level。本 ADR 自评 level：`<red / yellow / green>`，与"文件 scope" 段相符。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/ir/<...>.ts` | 加 / 改 / 删 | `<exact name>` | `<zod 类型>` | `<default 或 —>` | <一句话> |
| ... | ... | ... | ... | ... | ... |

每行一条字段改动。**字段名一旦写死，下游 Spec / 实现 Agent 不允许改**——发现需要改 → 回本 ADR 加条 / 开新 ADR。

无 schema 改动（黄色或绿色 ADR）→ 本表写"无"。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/core/core/src/ir/<新建>.ts`
- `packages/core/core/src/compile/<...>.ts`（修改）
- `packages/core/core/tests/<.../...>.test.ts`（新建）
- `packages/core/react/src/kernel/<...>.tsx`（新建 / 修改）
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

> 这是 [`develop-implement`](../../../.agents/skills/develop-implement/SKILL.md) Stage 2 Spec Writer 的输入。象限填得越具体，Spec Writer 写出的测试越贴 ADR 意图，越不需要 [`develop-test`](../../../.agents/skills/develop-test/SKILL.md) Stage 3 Bug Hunter 兜底。

### 依赖的现有元素

本 ADR 引用 / 扩展 / 修改的现有 IR 元素 / API / 工具：

- `<元素名>`（位于 `<file path>`）—— <如何用：仅引用 / 扩展 / 修改>
- ...

无依赖（全新孤立功能）→ 写"无"。
