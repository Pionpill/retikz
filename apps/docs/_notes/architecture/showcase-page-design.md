# Docs Showcase 页面设计

> **状态：设计已采用。** 本文定义文档站面向高封装组件的长期展示页契约，不表示所有具体页面已经迁移，也不维护版本排期、文件清单或施工步骤。
>
> **效力：** 约束 `apps/docs` 的页面布局、内容组织、Showcase 元数据与 `ComponentPreview` 复用边界；普通文章页继续遵守既有组件页、概念页、示例页与 Reference 页规则。
>
> **当前基线：** 不跟具体版本。关联真源为 [`apps/docs/AGENTS.md`](../../AGENTS.md) 与仓库的 docs skills。

---

## 1. 背景与目标

传统组件文档以连续文章组织信息，依靠窄正文、右侧目录和从用法到原理的线性阅读路径。这适合需要逐步建立心智模型的底层能力，但不适合 Chart、Table 和其它高度封装的组件。

这类组件的直接用户通常只需要确认用途、观察结果、调整少量参数并复制代码。文档的首要任务应从“完整讲解”转为“直接展示与调度”，让用户在接受少量信息后即可操作真实 demo、比较变体、发现同类能力并查询高层参数。

Showcase 页面因此必须满足：

1. 首屏直接展示可操作的 canonical demo
2. 保留 `ComponentPreview` 已有 controls、源码、IR、renderer 与操作能力
3. 用极少文字说明分类、用途和选择边界
4. 在同一页面内提供同 Type 示例、同 Family 能力发现与 API 查询
5. 成为所有高封装组件可复用的通用页型，不依赖 Chart 路由特判

## 2. 核心决策：内容类型与页面布局分离

Showcase 是布局维度，不是新的内容语义。文档节点继续使用 `component`、`concept`、`example`、`reference` 等既有 `pageType`，并独立声明布局：

```ts
type DocLayoutVariant = 'article' | 'showcase';
```

- `article` 表示现有文章阅读路径
- `showcase` 表示以可操作展示为主的高封装组件页面

`pageType` 由页面当前承担的内容职责决定，`layout` 只决定阅读与展示方式。公开组件契约已经稳定的调度页可以使用 `component`；capability gate 前、仅用下层公开能力展示概念效果的页面可以使用 `concept`。Table 或其它高封装组件满足相同读者任务时可以直接复用，不新增模块专用布局。

禁止根据 module、section、route segment、标题或正文 heading 自动猜测布局。页面布局必须由文档数据显式声明，保证导航、机器文档和渲染结果使用同一真源。

## 3. 页面宽度与导航

Showcase 页面不计算、不占位也不渲染右侧 TOC。页面标题、说明、元信息、主 Preview、Tabs、API 和底部导航共用同一个最大 `1200px` 内容边界；不再保留 800px 窄文本列。

普通 Article 页面保持现有 800px 正文与可选右侧 TOC，不因 Showcase 引入而改变。

Showcase 继续复用文档站的左侧导航、页面标题区、页面动作与前后页导航。右侧 TOC 的全局开关不影响 Showcase，也不为其预留空白。

承载 Showcase 文章的一级家族条目可以显式声明一个闭合的 Lucide 图标标识，图标显示在家族 label 左侧；顶层导航分组标题、家族内的具体文章和普通 Article 条目默认保持纯文本。文档数据只持有稳定标识，layout 层负责把标识解析为具体图标组件，避免在导航真源中混入任意 React 内容。图标只用于区分阅读入口，不参与页面 layout、pageType 或 Family 的推断。

## 4. 固定页面结构

Showcase 页面按以下顺序组织：

```text
title + short description + classification
selected ComponentPreview
Examples | Family | API tabs
footer navigation
```

标题来自现有文档 i18n。frontmatter description 只保留一到两句用途、分类或选择说明，不承担教程、原理或项目历史。

分类信息只帮助用户快速判断使用场景，例如 family、Canonical Type 或变量角色数量。它不能形成第二套产品 taxonomy，也不能取代文档树与公开 Chart 契约。

主 Preview 是页面唯一的完整 playground。页面默认选择 canonical Example；用户选择其它 Example 时，在同一位置替换 demo、controls、源码与说明，并保留 `ComponentPreview` 的 renderer、复制、下载、AI 与全屏等适用能力。

Chart Showcase 中的图表默认使用 `800 × 400` 逻辑尺寸，`ComponentPreview` 默认使用 `xl` 高度档位。这是文档展示基线，不改变产品 API 的默认尺寸；特殊图表需要其它比例时可在 demo 与 Preview 配置中显式覆盖。

## 5. Showcase 元数据

采用 Showcase 布局的页面在现有页面 metadata 中声明稳定关系：

```ts
type ShowcaseMetadata = {
  family: string;
  role: 'primary' | 'secondary';
  preview: string;
  order: number;
};
```

- `family` 标识用于同类发现的稳定分组，不等同于 sidebar 层级
- `role` 区分 Family 的主要成员与次要发现入口；Chart 的 Canonical Type 属于 primary，Pattern 属于 secondary
- `preview` 引用本页代表性 demo，供当前页与 Family 发现复用
- `order` 决定 Family 内稳定展示顺序，不依赖文件名或路由排序

页面内容仍由双语 MDX 策展；metadata 只拥有布局与跨页面关系，不承载说明文案、API 表或 demo 业务配置。

## 6. Examples 契约

Examples 是默认激活的 Tab，展示同一 Canonical Type 的有意义变化，包括不同数据场景、encoding、style preset、presentation 或确实改变使用选择的组合。

Examples 不枚举纯参数笛卡尔积。尺寸、颜色、间距等在同一任务与结构中连续变化的参数继续由 controls 承载，不为每个值重复创建 demo。

Examples 以响应式网格展示人工策展的选择卡片。每张卡片只包含静态 demo 缩略图、标题和单句说明；卡片不承载 controls、源码或 Preview 工具栏，也不建立第二套 Preview host。

Examples 列表的第一项是页面初始的 canonical 主 Preview。网格只显示当前主 Preview 之外的候选，因此单例页面呈现明确空状态。点击任一候选后，它在原位成为新的完整主 Preview，之前的主 Preview 回到候选网格；任一时刻只挂载一个完整 `ComponentPreview`。

候选项使用标准按钮支持键盘与焦点操作。由于当前项不在网格中，网格不存在需要额外表达的选中态，不增加选中边框或 `aria-pressed`；主 Preview 的标题与内容共同表明当前展示对象。

Examples 由当前页面人工策展，保证每个示例都回答一个真实使用问题。数量至少为一个，不设置架构级上限；内容过多时优先提高案例质量和分类清晰度，不通过压缩 Preview 牺牲可操作性。

## 7. Family 契约

Family 用于发现同一稳定分组中的其它主要能力。它不重复当前组件或 Type 的 style、数据 preset，也不把计划中、尚无真实能力的条目包装成可运行 demo。

Family 根据页面的 `family`、`role` 与 `order` 自动收集 primary 成员，标题和路由来自文档数据，代表性 demo 来自各成员的 `preview`。这样避免每篇页面手工维护重复的同类链接和预览引用。secondary 页面可以进入同一分组，但不自动扩张主要 Family 列表。

每个 Family 成员同样使用现有完整 `ComponentPreview`，每行一个，并保留该代表性 demo 的 controls 与操作能力。成员标题同时提供进入目标页面的明确导航。

若未来需要展示 planned 状态，必须先建立独立、稳定且可诊断的元数据契约；当前设计不预造伪 demo 或松散状态字符串。

## 8. API 契约

API Tab 只列直接调度当前 Type 所需的高层参数，并按数据角色、核心成员、style / presentation 与 Plot 扩展等用户职责分组。

继承自共享 Chart 或 Plot 的契约只说明职责、公开类型和权威链接，不在每个 Type 页面复制完整字段表。当前 Type 新增或收窄的字段继续使用既有四列 API 表；闭合集合复用公共值展示能力。

API 不承载实现原理、pipeline 细节、源码入口或长教程。需要深入理解的机制进入 Concept / Reference，需要完整成品步骤的内容进入 Example 页面。

## 9. Tabs、URL 与可访问性

Showcase 固定提供 `Examples`、`Family`、`API` 三个 Tab，并默认打开 Examples。

Tab 状态进入 URL：

```text
?tab=examples
?tab=family
?tab=api
```

切换 Tab 使用 replace 语义，避免污染浏览器返回历史；复制或刷新 URL 后必须恢复同一 Tab。非法或缺失的值回退到 Examples。API 内部锚点可以继续与 query 同时存在。

Tabs 必须遵守标准键盘导航、焦点与 ARIA 契约。移动端 Tab 列表允许横向滚动，不把标签压缩成难以识别的缩写。

非活动 Tab 不挂载其中的大量 Preview，避免在一个页面同时运行全部 controls 与 renderer。未选中的 Example 只渲染静态缩略图；切换 Example 时重置主 Preview 的临时 controls 与宿主状态，保证其与新示例的 canonical 状态一致。

## 10. 响应式与主题

Showcase 在大屏使用最大 1200px 内容宽度，在较窄视口占满可用空间。主 Preview 与 Family 始终保持每行一个；Examples 网格按可用宽度从单列扩展为多列，缩略图保持可辨认的比例和最小尺寸。

`ComponentPreview` 的 controls、源码面板、renderer 与弹窗继续遵循现有响应式行为，Showcase 不建立第二套 Preview host。light / dark 由文档站和 Preview 的现有主题边界处理。

## 11. 失败语义与完整性

布局、family、preview、路由与 demo 引用属于可静态检查的文档契约：

- Showcase 页缺少 metadata、canonical preview 或任一固定 Tab 时 fail-loud
- family 成员的路由、双语标题或 preview 不存在时 fail-loud
- 同一 family 的 order 冲突时 fail-loud，不依赖不稳定的遍历顺序
- Example 引用不存在时在主 Preview 与选择卡片中显示明确诊断，并由完整性检查阻止交付
- 非法 URL Tab 值属于外部输入，运行时安全回退到 Examples，不使页面不可用

Family 只有当前页面一个成员时可以呈现明确空状态；它不自动跨 family 补推荐内容。

## 12. 验证策略摘要

Showcase 需要以下稳定证据层：

1. 页面数据可以明确区分 Article 与 Showcase，且不依赖路由特判
2. Article 保持 800px + TOC，Showcase 保持 1200px + 无 TOC
3. 三个 Tab 的 URL、键盘、焦点、刷新恢复和非法值回退行为一致
4. 主 Preview 与 Family 复用完整 `ComponentPreview` 及 controls；Examples 只渲染当前项之外的静态缩略图，并能与主 Preview 原位交换
5. metadata、family、route、双语内容与 demo 引用能够被完整性检查发现错误
6. 桌面与移动端、light 与 dark、长 API 表和多列 Example 网格下仍可阅读和操作
7. 任一时刻只运行一个完整主 Preview，切换 Example 后 controls、源码和说明与选中项一致

## 13. 功能边界

docs 阅读模块拥有 Showcase 布局、内容组织、跨页面 Family 关系和文档诊断。`ComponentPreview` 继续拥有 demo registry、controls、源码、renderer 与操作宿主。

Chart、Table 等产品包不感知文档页布局，也不为 Showcase 提供专用 runtime API。Showcase metadata 是文档站内部稳定契约，不进入产品 IR、schema 或发布包。

## 14. 被否决方案

- **为 Chart 路由写布局特判**：无法服务后续高封装组件，并使页面行为依赖 URL 命名
- **新增 `pageType: 'showcase'`**：混淆内容语义与展示方式，使 component / concept / example / reference 无法独立描述
- **沿用 800px Article + TOC**：主 Preview 与 controls 空间不足，阅读路径仍以文章为中心
- **为缩略图新增 compact Preview 变体**：仍会携带不需要的 controls 与宿主状态，使选择器和完整 playground 的职责混合
- **在网格中放置多个完整 Preview**：controls、图表和源码宽度不足，并让页面同时运行多个完整宿主
- **手工维护 Family 列表**：跨页面重复、容易失效，无法形成统一完整性检查
- **把所有内容塞进 controls**：混淆单个 demo 的参数探索与跨示例、跨 Type、API 查询三个不同任务

## 15. 架构验证

- **通用性**：Showcase 通过显式 layout 与 metadata 服务任意高封装组件，不含 Chart 私有判断
- **职责分离**：pageType 继续表达内容语义，layout 表达阅读方式，Family metadata 表达跨页关系
- **复用边界**：所有真实 demo 继续走唯一 `ComponentPreview` 主链，不复制 controls、renderer 或源码能力
- **内容权重**：首屏先展示结果与最小信息，深入机制回到 Concept / Reference，符合直接调度用户的任务
- **可诊断性**：静态关系 fail-loud，URL 外部输入安全回退，错误不会被空白页面或静默删除掩盖
- **演进方向**：新增高封装组件只声明 Showcase metadata 与内容，不扩张 DocPage 路由分支或产品包职责
