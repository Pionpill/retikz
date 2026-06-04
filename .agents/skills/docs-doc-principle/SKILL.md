---
name: docs-doc-principle
description: retikz 文档站的总原则，所有页型（组件 / 示例 / 概念 / 入口 / Reference 词典）都必须遵守。涵盖三处协同（contents + data + i18n）、双语规则、写作风格、读者视角、DSL 优先、Comparison 写法、自绘图示规则、演示位置/关系类 demo 规范、文档宽度限制、阅读时间、Reference (ZodSchema) 页型、入口页/概念页例外、与 shadcn 的差异、可用 MDX 元素。具体页型规范分流到 docs-doc-component（组件页）/ docs-doc-example（示例页）/ docs-doc-group（分组落地页），完稿后可用 docs-doc-review 做独立评审。retikz 专用。
---

# retikz 文档总原则

## 总览

retikz 文档站，1 个页面 = **3 处同步改动**：内容（`contents/`）、注册（`data/`）、文案（`i18n/`）。漏一处会 404、菜单不显示、或标题变成 i18n key 字符串。

中文是源语言，英文跟随；mdx 走 shadcn/ui 风格，但 demo 用我们自己的 `<ComponentPreview>`。

## 使用时机 + 分流

所有 docs 改动都**先读本 skill** 拿通用规则，再按页型分流到专门 skill：

| 页型 | 路径 | 分流到 |
| --- | --- | --- |
| 组件页 | `contents/<module>/components/**` | [`docs-doc-component`](../docs-doc-component/SKILL.md) |
| 示例页 | `contents/<module>/examples/**` | [`docs-doc-example`](../docs-doc-example/SKILL.md) |
| 分组落地页 | 带 children 的分组节点（`components/node`、`reference/schema` 等） | [`docs-doc-group`](../docs-doc-group/SKILL.md) |
| 概念页 / 入口页 | `contents/<module>/concepts/**` / `introduction` / `get-start` | 本 skill 的「入口页 / 概念页例外」节 |
| Reference 词典页 | `contents/<module>/reference/**` | 本 skill 的「Reference 词典页」节 |
| 博客文章 | `contents/blog/**` | [`docs-doc-blog`](../docs-doc-blog/SKILL.md)（差异较大，blog skill 独立成体；通用规则仍继承本 skill） |
| 文档评审 | 任意文档初稿 / 改稿 / demo 补充后 | [`docs-doc-review`](../docs-doc-review/SKILL.md) |

本 skill 也直接覆盖：i18n 改 key、改菜单、改正文、加 demo 这类"对页结构无大改"的杂活。

## 三处协同的目录

```
apps/docs/src/
  contents/<moduleId>/<sectionId>/<pageId>[/<subPageId>]/
    zh.mdx                # 中文正文（必填）
    en.mdx                # 英文正文（必填）
    <demo-name>.demo.tsx  # 被 <ComponentPreview name="..."> 引用（按需）
  data/
    module.ts             # 顶层 module 列表（core / flow / plot）
    core.ts               # core module 的 sections + pages 树
    interface.ts          # Section / Page / SubPage / I18nKey 类型
  i18n/locales/
    zh.json               # 文案源（I18nResources = typeof zh）
    en.json               # 英文，由 I18nResources 类型反向约束
```

路由：`/:moduleId/:sectionId/:pageId(/:subPageId)?`。URL 段 == 目录段 == 数据节点 `id`，三处必须严格一致。

## 加叶子页面：完整步骤

以加 `core/profile/get-start` 为例（已有 `core` module 与 `profile` section）：

1. **i18n key 先行**（类型才能通）
   - `i18n/locales/zh.json`：在 `core` 命名空间下加 `"getStart": "快速开始"`
   - `i18n/locales/en.json`：相同位置加 `"getStart": "Get Started"`
2. **加内容**
   - `contents/core/profile/get-start/zh.mdx` + `en.mdx`
   - 顶部 frontmatter：`title`（与 i18n label 一致）+ `description`（一句话，渲染在 H1 下方）
3. **注册数据**
   - `data/core.ts` 找到 `id: 'profile'` 的 section，往 `pages` 里加：
     ```ts
     { id: 'get-start', label: 'core.getStart' }
     ```
   - `id` 必须等于目录段；`label` 是完整 i18n 路径，由 `I18nKey` 类型约束（拼错编译就报）

加分组（带 children 的非叶子）：在父节点加 `children: Array<SubPage>`。分组**有自己的落地页** `index.{zh,en}.mdx`（侧栏点分组主体进落地页、点右侧 chevron 展开子项）——写法见 [`docs-doc-group`](../docs-doc-group/SKILL.md)。

## 漏改对照

| 漏掉 | 现象 |
| --- | --- |
| i18n key | TS 编译失败：`label` 类型不匹配 `I18nKey` |
| mdx 文件 | 进入页面看到 `{{title}} —— v0.1 alpha 内容补充中。` 占位 |
| data 注册 | 侧边栏看不到；URL 直访 → "页面不存在" |
| zh.mdx / en.mdx 缺一份 | 切到该语言时回退到另一份；不算错但要补 |

## 中英规则

**zh 是 source of truth；en 跟随。**

- 编辑文档时若 zh / en 已不同步：以 zh 重写 en
- 翻译可在不损失语义前提下本地化（标题、列表数量、表格列保持一致）
- 中文页标题默认**不要**写括号英文（如 `自定义形状（Custom Shapes）`、`例子（Examples）`、`形状定义（ShapeDefinition）`）。只有英文名本身是用户必须识别的契约时才保留，例如 schema / 类型 / API 名称：`NodeSchema`、`ShapeDefinition`、`CompileOptions.shapes`、`ScenePrimitive`。这类英文更适合放在正文首段或 API 表里解释，而不是塞进每个中文标题。
- **代码与 zh.mdx 不一致**：停下来询问用户，不要自行选边——两边都过期的情况都见过
- 新增 i18n key：先加 `zh.json`，再加 `en.json`，顺序固定

## 写作风格

**文字尽量精简——没人喜欢一直看文字。** 能用表格 / 示例 / 代码块表达的，不要写成段落。

**文档优先服务新手，而不是展示作者全知视角。** 默认读者是**初级前端工程师**：会 React / TypeScript 基础，能读 JSX 和常见 props，但不熟 TikZ、编译器、几何术语、IR 分层、渲染管线和项目历史。写作时假设读者第一次接触这个能力，不知道内部缩写、历史决策、实现分层和术语边界。先用普通话解释“它解决什么问题 / 为什么需要 / 用户要怎么判断”，再引入 `ShapeDefinition`、`Rect`、`ScenePrimitive` 这类专名；不要一开头就写“内置 xxx 都是注册项”“emit 收轴对齐 rect”这种只有实现者秒懂的句子。

**少用专业词，必须用时先翻译成用户问题。** 术语不是禁用，但每个术语都要有读者收益：能少一个就少一个；必须出现时，先说“什么时候会用到它”，再给名字。进阶内容（内部原理、性能权衡、schema 边界、几何推导、AI/IR 细节）要放在 `ComponentAlert` / tip 或 `How it works` 中，并明确提示初次阅读可以跳过。

把每一节当作线性阅读路径来写：

- **先场景后术语**：先说“内置形状和自定义形状走同一套注册机制”，再说 “Shape Registry”。
- **先行为后内部**：先说“你只要画正放的形状，旋转交给编译器”，再解释 “emit receives an unrotated rect”。
- **先完整句后缩写**：第一次出现概念时写完整说明，后面再用短名；不要把 API 名、内部类型名、ADR 结论堆在一句话里。
- **从读者问题出发**：标题和段首优先回答“什么时候用、怎么选、会发生什么”，少用“核心约束 / 多态职责 / 注册项”这类作者视角词。
- **表格不能只塞关键词**：API / 职责表里的描述要能独立读懂；如果单元格只有“内容半轴 → 外接框半轴”这种压缩表达，必须在表前或表内展开解释。

| 表达对象 | 优先形式 |
| --- | --- |
| 对比、属性、配置、状态映射 | **表格** |
| 用法 / 效果 / 视觉展示 | **`<ComponentPreview>`** |
| API、签名、配置片段、命令 | **代码块** |
| 步骤、并列要点 | **有序 / 无序列表** |
| 概念阐释、必要的"为什么" | **段落（≤ 3 行；超过就拆 bullet 或表格）** |

其它原则：

- **客观、中性**：不写"竞品 X 做不到 / 我们更好"这类防御性 / 攻击性段落；同类项目作为隐晦提及一次即可，不要反复点名对比
- **一段话讲完不要拆两段**；逻辑断点用空行不用副标题
- **能放例子就放例子**：`<ComponentPreview>` 一个胜过三段描述
- **并列示例优先横排**：同一主题下的多个 demo 优先横向排布，便于读者直接比较；每个示例下方建议配一行浅灰说明文字，只说这张图在演什么，不要写成解释段落
- **避免冗余形容词**："非常 / 极其 / 显著 / 强大"等没有信息量的词去掉

## DSL 优先，IR 克制

retikz 文档面向**用户**——用户写的是 DSL（`<Layout>` / `<Node>` / `<Path>` / `<Draw>` 等 JSX）。正文以 DSL 用法为主；IR 是底层的持久化 / AI 生成中间表示，对用户**默认隐藏**，只在以下场景下出现：

- 介绍页 / 设计哲学页里讲整体架构
- 持久化、`<Layout ir={...}>` 直喂、AI 接入相关章节
- 该组件的行为只能借 IR 解释清楚（如"Sugar 编译期展开为 Kernel"这种 Sugar 与 Kernel 关系的引子）

普通用法页**不要**为了"完整"硬塞 IR JSON 节录或字段表——`<ComponentPreview>` 的 IR Tab 已经把"想看的人能看"留好了，不必正文复述。编译器内部（`compileToScene` / Scene primitive）一律不进用户文档。

## 不引用第三方外链

mdx 正文里不主动加任何指向第三方网站的链接（zod 官网、RFC、第三方库主页、博客等）。需要时由维护者自己加。

**例外（GitHub 仓库内文件可链）**：如果确实要引用项目仓库内的设计文档 / SKILL / AGENTS / ADR，用 GitHub 完整 URL 作超链接，让用户能点进去：

```mdx
详见 [DESIGN.md §1.2](https://github.com/Pionpill/retikz/blob/main/notes/architecture/DESIGN.md)
```

GitHub URL 是这条规则的**例外**——它指向项目自家 repo，对用户来说是可达的"项目延伸阅读"，与第三方外链性质不同。

**不要在 mdx 中暴露项目结构路径**（文件名 / 目录路径）——文档站用户看不到也点不到。例如不要写"详见 `notes/architecture/DESIGN.md` §1.2"或"参 `.agents/skills/...`"——用户读到这种描述只能去仓库 / 本地手动找。仅与"项目目录约定"相关的纯文字描述（如"ADR 起新文件用 `cp _template.md ...`"）可以保留路径作为 inline code，因为这是给已经在用 retikz 的人看的操作说明。

## 对照内容 (Comparison)

涉及 TikZ / Recharts / shadcn / D3 / 其它外部生态的对照、迁移提示、写法映射时，必须使用 `<Comparison>` 组件，不要把对照内容直接写在正文段落里。正文在隐藏所有对照块后仍应自洽完整；对照块只是给有相关背景的读者补充参照。

当前只注册了 `target="tikz"`；新增其它 target 前，先扩展 `ComparisonTargets`、Header 菜单与 i18n 文案。

```mdx
<Comparison target="tikz" title="TikZ 对照">
  TikZ 中类似写法是 `\draw (a) -- (b);`。
</Comparison>
```

写法约束：

- 一个 `<Comparison>` 块只服务一个 target，不要在同一块里混写多个生态
- 内容保持短：优先一段映射、一小段代码或一张紧凑表格
- 迁移/对照不改变正文主线，不在正文里写"对应 TikZ ..."这类散落句子
- 只有页面主题本身就是 TikZ 迁移指南时，正文才可以直接讨论 TikZ

## 图示一律 retikz 自绘

文档里的**所有可视化示例都用 retikz 自身绘制**——同级 `<name>.demo.tsx` + `<ComponentPreview name="..." />`。

- 禁止 `<img src="*.jpg|png|gif|svg" />`、截图、Mermaid、Excalidraw、draw.io 等第三方产物
- 文档站既是教材也是 retikz 的活体演示，引第三方图等于自打脸
- ASCII 框图作为**辅助叙述**允许（如 introduction 里的"IR 居中"管道图）；**演示组件用法**必须走 `<ComponentPreview>`
- 极少数确实需要外部图（screenshot、流程截图等），先在 PR 里说明理由

两种用法区分：

| 用途 | hideCode | 例 |
| --- | --- | --- |
| **演示组件用法**（"`<Node>` 长这样、props 这样配") | `false`（默认） | components/* 下每页的用例 demo |
| **叙述性插图**（架构图、流程图、概念示意——retikz 当配图工具用） | `true` | introduction / concepts 页里画 IR pipeline、anchor 体系、坐标系等 |

判断方法：用户看到这张图是想"复制源码学怎么写"还是"看懂这个概念"——前者保留源码、后者 `hideCode`。

**画叙述性插图时的具体惯例**（`stroke="none"` 当文字锚点、连线靠 id、宽度限制、双语 demo 拆分条件、模板代码等）走专门的 [`docs-figure-draw`](../docs-figure-draw/SKILL.md) skill；本文只管"什么时候用哪种"，不重复画法细节。

## 演示位置 / 关系类 demo 的写法（重要）

当 demo 的**主题是位置、引用、关系**（如 OffsetPosition / AtPosition / `<Coordinate>` / Sugar way / step.to 等），**不是**演示 Node 自己的视觉特性（shape / color / stroke / font）时，遵循以下惯例：

### Draw 优先于 Path

```tsx
// ✅ 用 Sugar：Draw way
<Draw way={['A', 'B']} arrow="->" />

// ❌ 不用 Kernel：Path + Step
<Path arrow="->">
  <Step kind="move" to="A" />
  <Step kind="line" to="B" />
</Path>
```

Draw way 简短、语义直白、与文档站现有 demo 风格一致。**唯一例外**：demo 本身就是演示 `<Path>` / `<Step>` Kernel 用法（参考 `components/path/*` 下的 demo）。

### Node 当锚点用：短标签，**保持默认色**

位置/关系 demo 里 Node 是"地理坐标"——是参照物，不是主角。文字别抢戏，但**也不要染灰**（灰色留给边标注，见下节）：

```tsx
// ✅ 锚点节点：单字母小写，文字色默认（currentColor）
<Node id="A" position={[0, 0]}>a</Node>
<Node id="B" position={{ of: 'A', offset: [80, 30] }}>b</Node>

// ❌ 长描述文字（抢视觉焦点）
<Node id="A" position={[0, 0]}>A</Node>
<Node id="B" position={{ of: 'A', offset: [80, 30] }}>右 80 下 30</Node>

// ❌ Node 文字染灰（把灰色挪给边标注，Node 文字保持默认色）
<Node id="A" position={[0, 0]} textColor="#888">a</Node>
```

具体规则：

- **id 用大写**（`A` / `B` / `C`）——id 是程序标识、给 `Draw way` 引用
- **children 文字用小写**（`a` / `b` / `c`）——视觉上是 "anchor letter"，与 id 视觉区分
- **不染色**——Node `textColor` 保持默认（继承 `currentColor`）；灰色不留给 Node 文字
- **不要把位置描述写进文字**（如 `右 80 下 30`、`cartesian+offset`）——位置 / 关系靠视觉传达，文字只标"这是哪个节点"。位置说明在 mdx 段落里讲

### Draw / Path 上的边标注：淡色（`textColor` 灰）

需要在线条上标注"这条线是什么意思"时，**边标注用淡色**（比默认色弱，跟主体节点区分）：

```tsx
// ✅ 边标注用淡色——线条主体不抢节点视觉
<Draw way={['A', 'B']} arrow="->">
  <EdgeLabel position="midway" side="above" textColor="#888">label</EdgeLabel>
</Draw>
```

`StepLabelSchema` 已支持 `textColor` / `opacity` / `font`；边标注需要弱化时优先显式给 `textColor`，不要靠降低整条 path 的视觉层级来让文字变淡。

### 最小用例先行

演示某种 schema / DSL 时，**两个节点能讲清就别用四个**——主 demo 取最朴素 case；高阶变体（of 的不同形态、嵌套、链式）拆 2-3 个独立 demo 顺序展示，每个 demo 单一主题：

```tsx
// ✅ 一个 demo 只演示一件事
// node-offset-basic.demo.tsx：A → B 用 id 引用
// node-offset-cartesian.demo.tsx：B 引用笛卡尔字面值
// node-offset-polar.demo.tsx：B 引用 polar 基准
```

不是：

```tsx
// ❌ 一个 demo 塞 5 个节点演示 3 种 of 形态 + 路径连线 + 极坐标变体
```

### 与 docs-figure-draw 的边界

| 用途 | 走的 skill | Node 默认 stroke |
| --- | --- | --- |
| 叙述性插图（架构图 / 流程图 / 概念示意） | `docs-figure-draw`，`hideCode` | `"none"`（去外框） |
| **演示位置 / 关系类用法**（本节） | 本 skill 本节 | **保留默认外框**——Node 自身是 demo 主体之一 |
| 演示 Node 视觉特性（shape / color / font） | 默认 ComponentPreview | 保留默认；文字 / 视觉自由发挥 |

## 文档宽度限制

文档正文最大宽度 **640px**（`max-w-160`）；表格 `<td>` 默认 `whitespace-nowrap`——**单元格不会自动换行**，过长会触发横向滚动。

应对策略：

- **优先压缩内容**：单元格写关键词不写整句；长解释挪到表格外的段落 / bullet
- **必要时用 `<br />` 软断行**（MDX 原生支持）：

  ```mdx
  | 列 1 | 列 2 |
  | --- | --- |
  | A | 第一行<br />第二行 |
  ```
- **3 列以内 + 每格 ≤ 12 个中文字 / 25 个英文字符** 通常能在 640px 内安全显示；超出就用 `<br />` 拆或改排版
- 单元格内有 `|` 用 `\|` 转义

代码块、URL、超长英文术语在窄屏同样会破版——能简化就简化。

## 阅读时间与页面类型

文档站顶部会显示估算阅读时间。这个数字不是硬精确值，但它用于约束页面信息密度，避免教程路径过长或字典页失去可扫描性。

| 页面类型 | 例子 | 阅读时间约束 | 处理方式 |
| --- | --- | --- | --- |
| 教程类文章 | `core/get-start`、线性 tutorial、迁移步骤、`examples/*` | **尽量 ≤ 10 分钟，且不可超过 15 分钟** | 超过 10 分钟先压缩叙述 / 拆步骤；接近 15 分钟必须拆页或改成多篇 guide |
| 字典类文章 | `components/*`、组件 API 页、能力查阅页 | **尽量 ≤ 15 分钟；特殊情况下可超过** | 超过 15 分钟时必须有清晰 TOC、主题分组、API 表和可跳读小节；若多个主题互不依赖，优先拆子页 |
| Reference / Schema | `core/reference/schema/*` | 不按完整阅读时间限制 | 以查询效率为准：字段表完整、锚点稳定、中英文结构一致 |

判断原则：

- **教程类**默认假设用户线性读完；阅读时间超限说明学习路径过长
- **字典类**默认假设用户跳读查询；可以更长，但不能变成无序 demo 堆
- 一个页面同时承担教程 + 字典时，先保证教程主线在 10 分钟内；额外查阅内容放到明确的 Reference / API / 子页中

## 入口页 / 概念页例外

- **入口页**（`introduction`、`get-start`）有自己的章节布局（介绍 / 安装 / 步骤……），不强制走组件页的 5 段结构
- **概念页**（`concepts/*`）按概念走子节，配 `<ComponentPreview hideCode>` 当叙述插图

## Reference 词典页 (`<ZodSchema>`)

`apps/docs/src/contents/core/reference/schema/<page>/index.{en,zh}.mdx` 下的页面用 **`<ZodSchema name="XxxSchema" descriptions={{...}} />`** 渲染字段表。Reference 词典是 IR schema 查询入口，跟"组件页"4 段结构无关。当前结构：4 个合并页（scene / entity / path / placement），每页一个或多个 H2/H3 + `<ZodSchema>` 块。

Reference 词典页只负责**可扫描、可链接、字段完整**，不承担教程 / 示例职责。不要为了让页面"更像文档"而添加最小 JSON 示例、逐步讲解、使用场景 walkthrough 或 ComponentPreview；这些内容应放到组件页、概念页或示例页。Reference 页正文只写 schema 分组说明、必要语义边界、跨 schema 关系和 `<Comparison>` 对照。

### name prop

变量名要在 `apps/docs/src/lib/schema-registry.ts` 注册（含 9 个顶层 + 10 个 Step 变体 + 2 个 Target 变体）。组件按 identity 反查 Zod schema 实例并自动出表 —— 字段名 / 类型 / 必填 / 英文描述都来自源码 `.describe()`。

### descriptions prop（中文 mdx 必填）

zh.mdx 用 `descriptions={{ 字段名: '中文释义' }}` 覆盖每个字段的英文描述。漏写则降级到英文 + 控制台 warn。**en.mdx 不传 descriptions**，全走 `.describe()` 英文源码。

### 嵌套 object 字段必须用点路径覆盖

字段类型是 **anonymous object**（即非注册表里的 schema，例：`NodeSchema.font` 嵌套 FontSchema、Step 各 variant 的 `label` 嵌套 StepLabelSchema）时，表格会**平铺**这些子字段为相邻匿名子行。子行描述也吃 zh.mdx 的 descriptions —— **必须用点路径**：

```tsx
<ZodSchema name="NodeSchema" descriptions={{
  font: '节点内文本的字体规格（family / size / weight / style，均可选）',
  'font.family': 'CSS font-family 字符串，如 "serif" / "monospace"',
  'font.size': '字号（用户单位）；未填走渲染器默认',
  'font.weight': 'CSS font-weight：keyword `normal`/`bold` 或数字 100..900',
  'font.style': 'CSS font-style：`normal` / `italic` / `oblique`',
}} />
```

漏写嵌套子字段 → 中文页该子行显示英文 `.describe()`（视觉残留）。控制台对每个漏写路径都会 warn。

### 哪些字段会被平铺？

判定条件：**父字段是顶层 object 字段 + 子 schema 不在 schema-registry**。检查方法：

1. 看 `packages/core` 源码，字段类型为 `XxxSchema.optional()` / `XxxSchema` 且 `XxxSchema = z.object({...})`，再确认 XxxSchema 不在 `schema-registry.ts` 21 项里 → 会被平铺
2. 开 dev server 看控制台 `[ZodSchema] ... no .describe() and no override` —— 列出所有漏写路径

目前需要翻译嵌套子字段的位置（**新加 schema / 字段时要重新检查**）：

| 父 schema.字段 | 嵌套 schema | 子字段 |
| --- | --- | --- |
| `NodeSchema.font` | FontSchema | family, size, weight, style |
| 8 个 step variant 的 `label`（Line / Fold / Curve / Cubic / Bend / Arc / CirclePath / EllipsePath） | StepLabelSchema | text, position, side |

union / array 内部的 object 不会被平铺（如 `NodeSchema.label` 是 union），保持折叠类型签名形态。

### 合并页 URL 锚点（rehype-slug 自动 id）

合并页（`path` / `placement` / `entity`）内多个 schema 用 H2/H3 标题分隔，rehype-slug 自动生成 id：

- `## Position` → `#position`
- `### Move` → `#move`
- `### CirclePath` → `#circlepath` —— **camelCase 不会插连字符**

注册表 URL 必须与自动 slug 对齐，否则 walker 输出的跨页 Link 会断。如要改 schema 名（如 `CirclePath` → `Circle Path`），rehype-slug 输出会变成 `circle-path`，registry 也得同步改。

### 加新 schema 到 Reference

1. 确认 schema 在 `@retikz/core` `index.ts` 已 export
2. `apps/docs/src/lib/schema-registry.ts` 加一行（含 schema instance + label + URL；URL 是合并页 + `#anchor` 或独立页）
3. 在合适的合并页 mdx 加 H2/H3 + `<ZodSchema name="..." descriptions={{...}} />`；zh 必须含所有字段（+ 嵌套点路径）；en 只写 `<ZodSchema name="..." />`
4. **如果是新增独立页**（不属于现有 4 合并页）：在 `data/core.ts` reference section 加 children 条目 + i18n 加 `core.refXxxSchema` key
5. 跑 `pnpm --filter @retikz/docs build` + dev 看控制台 warn

## 与 shadcn 的差异

| | shadcn/ui | retikz |
| --- | --- | --- |
| Demo 引用组件 | `<ComponentPreview name=...>` + `<ComponentSource name=...>` | 仅 `<ComponentPreview name=...>`（合二为一） |
| Demo 文件名 | `<name>-demo.tsx` | `<name>.demo.tsx`（**点号**后缀） |
| Demo 位置 | 集中在 `registry/` | mdx **同级目录** |
| Demo 形态 | 任意 React 组件 | `default export` 的**纯 FC**，**不能用 hooks**（IR 视图会调用一次该组件） |
| 双语 | 单语言 | 同目录 `zh.mdx` + `en.mdx` |
| 代码 Tab | React 源码 | React 源码 + IR JSON + Vanilla builder 代码（IR / Vanilla 均自动算） |

`ComponentPreview` props：
- `name: string` —— 同级 `<name>.demo.tsx` 的 stem，必填
- `align?: 'center' | 'start' | 'end'` —— 渲染区垂直对齐，默认 `center`
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` —— 渲染区高度档位，默认 `md`
- `componentClassName?: string` —— 覆盖渲染区容器样式（如想去掉默认 `h-72 p-10`）
- `hideCode?: boolean` —— 隐藏底部 View Code / 源码 / IR 面板，默认 `false`；**叙述性插图**必须开 `hideCode`，**演示组件用法**保持默认
- `sourceFiles?: Array<string | { file; diffFrom }>` —— 与主 demo 一起展示的附加源码文件（相对当前页目录），如抽出去的数据文件 / 共享 helper；详见下「demo 的数据文件」与 [`docs-doc-example`](../docs-doc-example/SKILL.md) 多文件 demo
- `interactive?: boolean` —— 默认 demo 必须是**无 hooks 的纯 FC**（IR / Vanilla 视图会 `Component({})` 静态执行一次求 IR）。demo 确需 hooks（`useState` / `useEffect` / 异步 `fetch` 外部数据等）时开 `interactive`：改以真元素 `<Component/>` 渲染让 hooks 生效、隐藏 svg/canvas 切换、默认**跳过 IR / Vanilla 视图**（动态数据无法静态求值），代码面板只留 React 源码（+ `sourceFiles`）。仅在真需要时开——绝大多数 demo 应保持纯 FC
  - **保留 IR 视图**：交互 demo 可从 `.demo.tsx` `export const previewIR`（**图形描述 IR**，即 Plot spec——只描述「画什么」、与具体数据无关），`ComponentPreview` 会在 IR Tab 展示它。务必与 live 渲染**同源**（同一份 marks 经 `buildPlotSpec` 得到，避免漂移）。注意这会让 `.tsx` 多一个非组件导出，按本仓惯例加 `// eslint-disable-next-line react-refresh/only-export-components -- <原因>`

### 代码视图：React / IR / Vanilla 三套

> **约定**：retikz 是多渲染器库，用户分两类——用 React 包（JSX DSL）和用 `@retikz/vanilla` 包（命令式 builder）。`ComponentPreview` 的代码面板**默认提供 react 与 vanilla 两套 authoring 代码**（外加 IR JSON），让两类用户都能直接复制等价写法。

- **React**：demo 源文件原文（`<name>.demo.tsx`）。
- **IR**：`buildPreviewIR(Component)` 派生的 IR JSON（自动算）。
- **Vanilla**：从同一份 IR codegen 出等价 `figure()` / `node()` / `draw()` / `coordinate()` / `scope()` 代码（自动算，与 demo 永远同步）。某 demo 若需更地道的 way / 写法，可同级放手写 `<name>.vanilla.ts` 覆盖 codegen。
- 不要为「只演示 React」省掉 vanilla 视图——保持两套 authoring surface 对等是库的定位；codegen 默认就给了，无需 per-demo 维护。
- **`interactive` demo（含 hooks）是 IR / Vanilla 视图的例外**：异步 / hooks demo 无法被静态执行求 IR，开 `interactive` 后默认只保留 React 视图（见上 props 表）；但可 `export const previewIR` 显式提供**图形描述 IR**（与数据无关的 Plot spec）来恢复 IR Tab。这是被允许的例外，不违反「两套 authoring surface 对等」——因为这类 demo 的重点本就是运行时行为（如 fetch），数据绑定后的完整 lower IR 既大又依赖运行时数据、不适合静态展示。

### demo 的数据文件（数据 / 取数逻辑一律抽成 `.data` 文件）

demo 的**数据来源**——无论是写死造的数据集，还是远程 `fetch` 的取数逻辑——都**不内联在 `.demo.tsx` 里**，统一抽到同级 `.data` 文件，由 `sourceFiles` 一并展示。目的：**主 demo 文件只管「画什么」，逻辑保持简单**，数据从哪来是另一层关注点。

- **命名**：`<主demo名>.data.ts`，其中 `<主demo名>` 与主 demo 文件名一致（如 `line-scatter.demo.tsx` → `line-scatter.data.ts`）。
- **多数据集**：一个 demo 用多份数据时加中段限定词 `<主demo名>.<dataset>.data.ts`（如 `line-scatter.sales.data.ts` / `line-scatter.cost.data.ts`），`<dataset>` 可选、单数据集时省略。
- **接线**：`.demo.tsx` 里 `import { foo } from './<主demo名>.data'`；mdx 里 `<ComponentPreview name="<主demo名>" sourceFiles={['<主demo名>.data.ts']} />`。
- **图标**：源码面板对 `*.data.ts` 自动用专属 **Database 图标**（区别于主 demo 的代码图标、其他附加文件的 symlink 图标），靠文件名匹配，无需额外配置。
- **写死的造数据**：`.data.ts` 里普通 `export const`，React demo 与 vanilla 覆盖（`<name>.vanilla.ts`）可共用同一份（如 `line-scatter.vanilla.ts` 复用 `line-scatter.data.ts`）。
- **远程 / 异步取数**：取数（`fetch` + 状态）同样进 `.data` 文件，主 demo 不碰：
  - **React**：`.data.ts` 导出一个 **hook**（如 `useHourlyTemperature()`）封装 `fetch` + `useState`/`useEffect`，主 `.demo.tsx` 只 `const { data } = useXxx()` 再渲染；demo 需开 `interactive`（见上 props 表）。
  - **Vanilla**：hook 是 React-only，不能跨到命令式 / SSR runtime，故 **vanilla 的远程取数单独一个文件**（不与 React hook 共用），vanilla 主文件同样只消费。

## MDX 可用元素

- GFM markdown（表格、列表、引用、链接、围栏代码块）全部支持
- 围栏代码块带语言后会上语法高亮；写 `` ```tsx showLineNumbers `` 开行号
- 行内 `<a href>`：`/` 开头自动走 react-router `<Link>`；`http(s)://` 开头自动 `target="_blank"`
- 自定义 JSX：
  - `<ComponentPreview ... />` —— 组件 / 示例 / 概念页 demo 都用
  - `<ZodSchema ... />` —— Reference 词典页用，详见上文「Reference 词典页」
  - `<Comparison ... />` —— 外部生态对照内容用，当前只支持 `target="tikz"`
  - `<ExamplePrompt ... />` —— 示例页 AI Prompt 节用，见 [`docs-doc-example`](../docs-doc-example/SKILL.md)
  - `<ComponentAlert type="tip|warn|error" title="..." description="..." />` —— 文档提示块，只传 `title` 和 `description`；`type` 省略时默认为 `tip`

### `<ComponentAlert>` 使用边界

`ComponentAlert` 用于把正文里的提示 / 警告 / 错误用法从普通段落中分离出来。它不承载长篇教程，不替代 `<Comparison>`，也不替代真实 demo；如果提示内容超过 2-3 句，优先拆成正文小节或表格。

| type | 用途 |
| --- | --- |
| `tip` | 提示、用法建议、文档阅读顺序、文档建议 |
| `warn` | 警告、非规范用法、组件错误用法、性能 / 内存问题 |
| `error` | 错误、明确错误用法 |

## Quick Reference

| 任务 | 改动 | 也要读 |
| --- | --- | --- |
| 加叶子页 | i18n × 2 + `contents/.../{zh,en}.mdx` + 在 `data/<module>.ts` 注册 `{ id, label }` | 按页型分流 |
| 改正文 | `contents/.../{zh,en}.mdx`（双语都要） | — |
| 改菜单 / 标题文案 | `i18n/locales/{zh,en}.json`（双语都要） | — |
| 加一个 demo | 同级写 `<name>.demo.tsx` + 在 mdx 里 `<ComponentPreview name="<name>" />` | — |
| 加菜单图标 | `data/core.ts` 的 `Page.icon`（仅一级 Page 支持） | — |
| 新建 module | `data/module.ts` 加条目 + 新建 `data/<module>.ts` + i18n 加新命名空间 | — |
| 加分组节点 | 父节点加 `children` + 写分组落地页 `index.{zh,en}.mdx` | [`docs-doc-group`](../docs-doc-group/SKILL.md) |
| 加新 IR schema 字典 | 注册到 `lib/schema-registry.ts` + 合适合并页加 `<ZodSchema>` 块（含 zh 嵌套点路径） | — |
| 写 TikZ 对照 | 用 `<Comparison target="tikz">` 包起来，不写进普通正文 | — |
| 加组件页 | — | [`docs-doc-component`](../docs-doc-component/SKILL.md) |
| 加示例页 | — | [`docs-doc-example`](../docs-doc-example/SKILL.md) |

## Common Mistakes

- **mdx 顶部又写 `# 标题`** —— H1 走 frontmatter，再写一遍会出现两个标题
- **demo 用 hooks** —— `ComponentPreview` 的 IR 视图会直接 `Component({})` 调用一次，hooks 在非渲染路径中会触发 React 错误
- **demo 文件名写成 `<name>-demo.tsx`** —— 我们用 `.demo.tsx`，glob 匹配不到，会显示 "Demo not found"
- **`<ComponentPreview src=...>`** —— 沿用 shadcn 写法。我们的 prop 是 `name`，不接受 `src`
- **`<ZodSchema>` 漏写嵌套字段点路径** —— `Node.font` / Step 各 variant 的 `label` 等嵌套 object 必须用 `'font.family'` / `'label.text'` 等点路径补完所有子字段中文，否则中文页该子行残留英文 `.describe()`
- **`<ZodSchema>` 的 name 不在 registry** —— 渲染会显示 "Unknown schema" 红框；新加 schema 必须先在 `apps/docs/src/lib/schema-registry.ts` 注册
- **只加一边 i18n** —— `en` 由 `I18nResources = typeof zh` 类型反向约束，少一个 key 就编译失败
- **`label` 写成 `'core/getStart'` 或 `'getStart'`** —— 必须是 `'<ns>.<key>'` 完整路径，`I18nKey` 类型会卡你
- **改 `id` 不改目录** —— `id` 决定 URL 段、决定 mdx 加载路径、决定 sidebar 的 key，三者强耦合
- **写成连续的大段文字** —— 优先表格 / 示例 / 代码块；段落超过 3 行就拆
- **写防御性 / 攻击性内容** —— "竞品做不到 / 我们更好"等段落直接删，正向表述自身能力即可
- **普通用法页大段讲 IR 结构 / 字段** —— IR 是后端 / AI 用的隐藏层，正文说 DSL 即可；要看 IR 的用户点 `<ComponentPreview>` 的 IR tab
- **把 TikZ / 外部生态对照散落在正文** —— 用 `<Comparison>` 可选显示；隐藏对照后正文仍要完整
- **塞 jpg / png / Mermaid / 截图当演示** —— 演示用 `<ComponentPreview>` + retikz 自绘；ASCII 框图作辅助叙述可以

## 验证

加完一页之后，最少跑这两步：

```bash
pnpm --filter @retikz/docs build   # 类型 + 产物，能挡 i18n 缺 key、label 类型错
pnpm --filter @retikz/docs dev     # 浏览器打开新页，确认中英、demo、TOC、菜单都对
```

### 超链接自检

写完文档（含改动 / 新页）后**逐条复核所有超链接是否可达**，TS / build / 自动测试都挡不住，断链一旦出现是用户体验灾难。重点检查：

| 类别 | 检查方法 |
| --- | --- |
| **页内锚链接**（`#xxx`） | 每一条都跳得到对应 H1-H3；CJK / 含 `+ - ° :` 的标题别手写 slug，用 github-slugger 跑一下：`cd apps/docs && node -e "import('github-slugger').then(({default:S})=>console.log(new S().slug('<标题>')))"` |
| **站内路径**（`/core/...`） | 路径段必须命中 `data/<module>.ts` 里实际注册的 `{ id }` —— 改名 / 重组目录后所有外部文档 link 一起改；最简单做法是搜全仓 `grep -r "/core/old-path"` |
| **GitHub URL** | 仓库根 / branch / 路径都对（默认 `main`）；本地复制 GitHub URL 时容易把 `blob/<commit>/...` 黏进去——必须改回 `blob/main/...` |
| **能力节 step 锚** | 示例页能力节第三列每个 `[N](#<H3-slug>)` 都要跳到对应 step H3，slug 与 github-slugger 输出一致 |
| **components/ 跳转** | 每条 `[X](/core/components/...)` 都落到现有页 —— 组件改名 / 移位时一起改 |

zh 和 en 两份 mdx **分别**检查（很多链接在两边目标 slug 不同）。改完批量改动后用浏览器开页直接挨个点是最稳的兜底。
