# v0.1.0-rc.1 文档结构与发布候选验收计划

> 写于 2026-05-14。rc 期公开 API 冻结，不再做破坏性改动；本文记录 rc.1 的文档站结构整理、组件页组织、旧术语清理、可选对照内容、schema reference 对齐与安装验收 TODO。
>
> 关联：[`v0 roadmap`](./roadmap.md) · [`flow-rc`](../../../../../../.agents/skills/flow-rc/SKILL.md) · [`docs-doc-write`](../../../../../../.agents/skills/docs-doc-principle/SKILL.md)

## 背景与定位

`v0.1.0-beta.2` 已完成 beta 阶段的主要 API / schema 命名收敛。`v0.1.0-rc.1` 起进入发布候选窗口：

- 不再改组件名、prop 名、IR 字段名、导出类型名、公开函数签名。
- 不再新增公开能力；新增需求进入后续 minor / alpha 计划。
- 主要工作面转为文档站结构、组件文档可读性、迁移说明、安装验收、release notes 与 bug 收敛。
- 目标是让外部用户可以从 npm 安装、照文档完成常见图，并预期后续 patch 保持兼容。

## rc.1 / rc.2 边界

rc.1 只处理影响“能不能读懂核心 API 与当前版本”的文档结构问题：

- 导航结构重组。
- Source Code Guide 移到 About 下的 Developer 分组。
- 组件长文档组织。
- 可选对照内容展示。
- 页面 frontmatter 补齐。
- alpha / beta / 旧术语残留清理。
- Schema reference 中英文结构对齐。
- rc 安装验收说明与 smoke test 记录。

以下内容推迟到 rc.2：

- Examples / Recipes 独立示例库。
- 搜索索引增强。

## 当前观察

`apps/docs` 已有较完整的基础内容：

- `core/introduction`
- `core/get-start`
- `core/reading-guide`
- `core/concepts/{positioning,anchors}`
- `core/components/{tikz,node,text,coordinate,draw,path,arrow,step}`
- `core/reference/schema/*`
- `about/releases/*`

主要问题不是“缺页面”，而是学习路径仍偏开发期结构：

- `Source Code Guide` 排在 `Get Started` 后面，会把新用户从使用路径带到源码路径。
- `Concepts` 晚于 `Components`，用户在读组件 API 前缺少定位、锚点、IR / Scene、Kernel / Sugar 的心智模型。
- `Draw` overview 曾承载总览、教程、示例库、API 参考，页面过重；后续应按固定结构组织内容，避免再退化为无序 demo 清单。
- 部分页面缺 frontmatter `title` / `description`。
- 普通教程页仍有 alpha / beta / viewBox 等阶段性或旧术语残留。
- Schema reference 中英文详略不一致。

## 进度看板

| # | 标题 | 状态 | 工作量 | 优先级 |
| --- | --- | --- | --- | --- |
| 1 | 导航结构重组：Concepts 前置、Source Code Guide 移到 About / Developer | ✅ 完成（有差异） | 小 | P0 |
| 2 | 组件长文档组织规范与 Draw 首轮整理 | ✅ 完成 | 中 | P0 |
| 3 | 补齐页面 frontmatter | ✅ 完成 | 小 | P1 |
| 4 | 清理 alpha / beta / 旧术语残留 | ✅ 完成 | 小 | P0 |
| 5 | 可选对照内容：Comparison 组件与 header 开关 | ✅ 完成 | 中 | P1 |
| 6 | Schema reference 中英文结构对齐 | ⚠️ 部分完成 | 中 | P1 |
| 7 | rc 安装验收文档与 smoke test 记录 | ⚠️ 部分完成 | 中 | P0 |

---

## 实施记录（2026-05-16）

rc.1 收尾时的实际状态，与上文 plan 不完全等价：

- **TODO-1**：导航顺序按建议落地（Concepts 前置；Source Code Guide 与 AI-assisted Development 进入 About / Developer 分组）。**Concepts 子页与 plan 建议有差异**：实际为 `positioning / anchors / layers`，**未建** `IR and Scene` 与 `Kernel and Sugar` 两页（`layers` 是过程中新增，覆盖部分概念）。如后续仍需要那两条心智模型页，移交 rc.2 或 v0.2。
- **TODO-2**：Draw 子目录 `overview / way / path / arrow / step` 落地；overview 走 `用法 / 例子（按基础 / 曲线 / 形状 / 边标注 / 样式分组）/ API 参考 / 相关` 结构。曲线 / 形状 / 标注样式合入 overview 的 Examples，没新增独立子页。
- **TODO-3**：plan 列出的 21 个候选 mdx（zh + en）均已补齐 `title` + `description`。
- **TODO-4**：教程 / 概念 / 组件页已清除阶段历史表述。`core/introduction/index.{zh,en}.mdx` 的 "v0.1 alpha 正在 next 分支..." 同步改为 v0.1 rc 现状。`about/releases/{changelog,roadmap,versioning}` 与 `about/developer/source-code-guide` 内的 alpha / beta / viewBox 引用按 plan 例外保留（版本史 / 开发者向）。`versionTag` 已切到 `v0.1 rc`。
- **TODO-5**：`components/shared/comparison/` 落地（`Comparison.tsx` / `targets.ts` / `index.ts`）；`useComparisonStore` 走 zustand persist；MDX 已注册；header `...` 菜单按 `ComparisonTargets` 渲染开关，目前只暴露 `TikZ`。`ComparisonTarget` 用 `as const` + `ValueOf` 派生，符合 plan 命名约束。
- **TODO-6（部分）**：Scene / Entity / Path / Placement 四页 zh 与 en 二级标题数量已对齐（0/0、2/2、17/17、4/4）；但 zh 行数明显多于 en（如 entity 71 vs 24、path 218 vs 82），**字段说明深度仍有 gap**，本批未拉齐。**移交 rc.2 或后续 patch**。
- **TODO-7（部分）**：`get-start` 安装命令已切到 `@retikz/react@next`；`versionTag` 切到 `v0.1 rc`。**未补**独立 Vite React 项目的 install / smoke test 记录文档，**移交 rc.2 或发布前流程**。

附带的结构调整（不在 rc.1 原 plan 内，作为本批顺手收尾）：

- 文件命名 / 目录命名规范进入根 `AGENTS.md`（目录 kebab-case、组件 PascalCase、其他文件 camelCase、模块目录补 barrel）。
- `apps/docs/src/layout/{DocLayout,ViewLayout}/` 改为 kebab-case，6 个 icons / 2 个 zod-schema render-\* / shared/shortcut 改 PascalCase，`lib/schema-registry.ts → schemaRegistry.ts`，8 个模块目录补 `index.ts` barrel。
- `apps/docs/src/pages/doc-page/` 整体并入 `layout/doc-layout/`，`pages/` 目录移除。

---

## TODO-1 — 导航结构重组

### 问题

当前 `coreSection` 顺序大致为：

```txt
Introduction
Get Started
Source Code Guide
Components
Concepts
Reference
```

这个顺序更适合开发者审阅源码，不适合第一次使用 retikz 的用户。用户在进入 `Node / Path / Draw` 前，应先理解坐标、锚点、Kernel / Sugar、IR / Scene 这类基本心智模型。

### rc.1 建议结构

```txt
Core
  Introduction
  Get Started
  Concepts
    Positioning
    Anchors
    IR and Scene
    Kernel and Sugar
  Components
    TikZ
    Node
    Text
    Coordinate
    Draw
    Path
    Step
    Arrow
  Reference
    Schema

About
  Overview
  Releases
    Changelog
    Versioning
    Roadmap
  Developer
    Source Code Guide
    AI-assisted Development
```

### 说明

- `Source Code Guide` 放在 `About / Developer` 下，而不是 Core 学习路径。
- `AI-assisted Development` 也放在 Developer 分组里，避免和普通用户入口混在一起。
- `Examples / Recipes` 不在 rc.1 做，放到 rc.2。

### 影响范围

- `apps/docs/src/data/core.ts`
- `apps/docs/src/data/about.ts`
- `apps/docs/src/i18n/locales/{zh,en}.json`
- 对应 `contents/**` 目录移动

### 验收

- 首页默认入口仍为 Introduction。
- 下一页 / 上一页顺序符合新用户学习路径。
- Source Code Guide 不再出现在 Core 顶部学习路径。
- About 下有 Developer 分组。
- 中英文侧边栏一致。

---

## TODO-2 — 组件长文档组织规范与 Draw 首轮整理

### 问题

`core/components/draw/overview` 当前包含 20+ 个 preview，同时承载：

- Draw 总览
- way item 说明
- curve / cubic / bend / arc / circle / ellipse
- label
- relative
- arrow
- fill / style
- API 参考

这让页面更像全集示例库，而不是组件入口。其它组件页后续也可能遇到同类问题：示例越补越多，页面越来越长，用户反而难以判断入口、概念、API 和 recipe 的边界。

### 文档结构组织方案

组件文档统一按固定 section 组织，避免“一个 overview 塞全部”或“为了少量内容拆太多子页”：

| section / 页面类型 | 职责 | 内容上限 |
| --- | --- | --- |
| **Usage** | import + 最小 JSX 骨架 | 不放 preview |
| **Composition** | 仅 compound / 容器组件需要 | 解释父子关系，不承载示例库 |
| **Examples** | 页面主体；示例多时按抽象主题分组 | 同类示例 >= 3 时必须先分组 |
| **API Reference** | props 表、类型说明、默认值、注意事项 | 尽量少 preview，只放最小例 |
| **Related** | 相关组件、概念、底层参考链接 | 不承载长解释 |
| **Examples / Recipes** | 完整任务式示例，例如流程图、箭头关系图 | rc.2 处理 |

rc.1 先不建立全站 Examples section。组件页若示例较多，优先在 `Examples` 内按主题分组；只有多个主题彼此独立、且单页阅读或查阅成本明显过高时，才拆子页。

### Draw 整理建议

```txt
core/components/draw/
  overview        # Draw 是什么、最小连线、曲线/形状、边标注、样式、API
  way             # way item、id / coordinate / relative / fold / cycle
  path            # Kernel Path
  arrow           # 箭头详细配置
  step            # Kernel Step
```

`curve / cubic / bend / arc / circle / ellipse`、`label`、`stroke / fill / dash / arrow` 不单独开页，合并到 `Draw overview` 的 `Examples` 和 `API Reference` 中。`Path / Step / Arrow` 保留为底层 Kernel 参考；`Draw` 强调 Sugar 用法。

### 其它组件的拆分原则

- `Node overview` 保留常用入门：shape、文本、位置、基础样式。
- Node 的复杂视觉能力后续可拆为：
  - `Node text`
  - `Node shapes`
  - `Node styling`
  - `Node labels`
- `Step overview` 保留 kind 总览；各 step kind 的大量 label 示例如需收敛，优先在 `Step` 页内分组或链接到 `Draw overview`，不再新增 `Draw labels` 子页。
- `Coordinate` 当前页不长，可暂不拆。
- `TikZ` 当前页不长，可暂不拆。

### 验收

- `Draw` overview 使用 `Usage / Examples / API Reference / Related` 结构。
- 曲线、形状、边标注、样式示例按主题分组，而不是散落为多个同级顶层章节。
- 不新增 `curves / labels / styling` 子页面入口。
- 若新增或保留子页，标题、description、API 术语中英文一致。
- 原有示例不丢失，只移动或复用。
- 页面之间有明确“下一步阅读”链接。
- 不新增公开 API，不改变组件行为。

---

## TODO-3 — 补齐页面 frontmatter

### 问题

部分页面缺 `title` 或 `description`。页面标题当前主要来自 i18n label，但 rc 文档应保证每页有 frontmatter，方便：

- 搜索摘要。
- AI 读取页面。
- 页面复制。
- 后续 SEO / 静态索引。

### 已观察到的候选

- `about/ai-assisted-development/index.{zh,en}.mdx`
- `about/overview/index.{zh,en}.mdx`
- `about/releases/versioning/index.{zh,en}.mdx`
- `core/get-start/index.{zh,en}.mdx`
- `core/introduction/index.{zh,en}.mdx`
- `core/components/tikz/index.{zh,en}.mdx`
- `core/components/draw/step/index.{zh,en}.mdx`
- `core/components/node/coordinate/index.{zh,en}.mdx`
- `core/concepts/positioning/index.{zh,en}.mdx`
- `core/reference/schema/path/index.en.mdx`
- `core/reference/schema/placement/index.{zh,en}.mdx`

### 验收

- 所有 `index.zh.mdx` / `index.en.mdx` 都有 `title` 和 `description`。
- zh / en description 语义对齐。
- description 不暴露本地路径或内部流程。

---

## TODO-4 — 清理 alpha / beta / 旧术语残留

### 问题

普通用户教程页仍有阶段性文字或旧命名残留，例如：

- `anchor name scope (alpha.1)`
- `alpha.3 supports...`
- `v0.1 beta`
- `viewBox` 在非 SVG attribute 语境中出现

changelog 可以保留历史，教程页、概念页、组件页应描述当前事实。

### 建议

- 普通文档页只写当前 rc 行为。
- 发布历史只留在 changelog / migration guide。
- `viewBox` 仅在解释 SVG attribute 时保留；core / Scene 语义统一写 `layout`。
- 进入 rc 时把 `versionTag` 从 `v0.1 beta` 改为 `v0.1 rc`。

### 验收

- `apps/docs/src/contents/core/**` 中不出现阶段历史表述，除非页面主题就是版本迁移。
- `Tikz`、`strokeDasharray` 等旧 API 不出现在普通教程页。
- `viewBox` 出现处均为 SVG adapter / SVG attribute 语境。

---

## TODO-5 — 可选对照内容：Comparison 组件与 header 开关

### 问题

当前文档中有部分内容直接在正文里与 TikZ 对比。了解 TikZ 的读者会觉得这类内容有价值，但不了解或不关心 TikZ 的读者会被额外语法和迁移心智打断。

未来 plot 模块还可能需要与 Recharts、D3、shadcn/ui 等生态做对照。如果继续把对照内容写进正文，会让文档主线越来越分叉。rc.1 先只落 TikZ，对其它 target 只保留扩展点。

### 设计原则

- 对照内容是补充层，不承载必要信息；关闭全部对照后，正文仍必须完整、自洽、可学习。
- 一个对照块只对照一个对象，避免一个块里混写多个外部生态。
- 对照内容应短，优先代码片段、表格或一句语义映射，不写长篇解释。
- 普通组件页只在能降低迁移成本时使用；教程主线不依赖对照块。
- 这是 docs 站内部能力，不新增 `@retikz/core` / `@retikz/react` 公开 API。

### 命名方案

使用 `Comparison`，不使用 `Reference`，避免和 `API Reference` / `Schema Reference` 混淆。

```ts
export const ComparisonTargets = {
  TikZ: 'tikz',
} as const;

export type ComparisonTarget = ValueOf<typeof ComparisonTargets>;

export type ComparisonProps = {
  icon?: ReactNode;
  target: ComparisonTarget;
  title: string;
  children: ReactNode;
};
```

MDX 写法：

```mdx
<Comparison target="tikz" title="TikZ 对照">
  TikZ 中类似写法是 `\draw (a) -- (b);`。
</Comparison>
```

### UI 行为

- `Comparison` 视觉类似轻量 callout：整体圆角、灰色背景、轻边框。
- 顶部放 `icon?`、target badge、`title`。
- 下方放 `children` 内容。
- 默认隐藏所有对照内容，用户按 target 显式开启。
- Header 右侧 `...` 菜单新增 `对照 / Comparisons` 分组，rc.1 先只有 `TikZ` 开关。
- 开关状态写入 localStorage；不同页面共享同一组偏好。
- target 列表来自 `ComparisonTargets` 配置，不按当前页面动态生成，避免菜单在不同页面不稳定；未来需要 Recharts / shadcn/ui 时再扩展枚举和菜单。

### 影响范围

- `apps/docs/src/components/shared/Comparison` 或同等共享组件目录。
- `apps/docs/src/components/shared/mdx-content/components.tsx` 注册 MDX 组件。
- Header `...` 菜单与 i18n 文案。
- 全局 store / localStorage 偏好。
- `docs-doc-write` skill：补充“对照内容必须写进 `<Comparison>`”的写作规则。
- 迁移现有正文中直接出现的 TikZ 对照句子；必要时保留正文语义，把 TikZ 写法移入 `Comparison target="tikz"`。

### 验收

- 未开启任何 target 时，页面不显示对照块，正文仍能完整阅读。
- 开启 `TikZ` 后，只显示 `target="tikz"` 的对照块；其它 target 不显示。
- Header 菜单可以开关 TikZ，并持久化。
- `ComparisonTargets` 使用 `ValueOf` 派生 `ComparisonTarget`，不使用 TS enum。
- 文档中不再把 TikZ 对照散落在普通正文里。
- 中英文页面结构一致；对照内容可按语言分别书写。

---

## TODO-6 — Schema reference 中英文结构对齐

### 问题

Schema reference 的 zh / en 详略不完全一致，尤其 `path`、`entity`、`placement` 页面。rc 期这些页面会成为用户和 AI 的契约参考，不能只在单语里完整。

### 建议

- 以 zh 为 source of truth。
- en 同步章节数、字段表、说明顺序。
- 对能从 zod schema 自动渲染的部分，优先复用 `ZodSchema` 组件，减少手写漂移。

### 验收

- zh / en 标题层级一致。
- 同一 schema 页面字段覆盖一致。
- 字段说明与当前 `@retikz/core` schema 一致。

---

## TODO-7 — rc 安装验收文档与 smoke test

### 问题

rc 的关键价值是“外部用户可以长期使用”。需要从 npm 安装路径验证，而不是只在 monorepo workspace 内验证。

### 建议

- 新增或补充安装验收说明，明确 rc 使用：

```bash
pnpm add @retikz/react@next
```

- 用独立 Vite React 项目验证：
  - install
  - TypeScript import
  - `<TikZ>` 最小示例渲染
  - `@retikz/react` 依赖 `@retikz/core` 的发布版本，不是 `workspace:*`

### 验收

- docs 中安装指令与当前阶段一致。
- rc 发布前有 dry-run / pack / smoke test 记录。
- 若仍处 beta，页面明确使用 `@beta`；进入 rc 后统一更新为 `@next`。

---

## 执行建议

rc.1 建议按以下顺序执行：

1. TODO-1：先调整信息架构，把 Source Code Guide 移到 About / Developer。
2. TODO-4 + TODO-3：清旧术语并补 frontmatter，降低读者困惑。
3. TODO-2：整理 Draw 与组件页结构，形成组件字典页范式。
4. TODO-5：加入可选对照内容机制，收敛 TikZ 等生态对照。
5. TODO-6：对齐 schema reference，作为 API 冻结验收。
6. TODO-7：发布前做安装验收。

所有改动遵循 `flow-rc`：不做破坏性 API 改动；文档改动走 `docs-doc-write`；每个逻辑块验证后等待用户授权提交。
