# Chart 类型文档

以下类型页规则适用于 Scatter、Bubble 等具体 chart type 的组件合页。以 [散点图正文](../../../../apps/docs/src/modules/docs/contents/viz/chart/points/scatter/index.zh.mdx) 为结构范本，契约仍以当前公开源码为准；不照搬其数据、字段、约束或专属机制。Chart 简介、快速开始、家族总览不套类型页结构；家族总览只使用文末的图库规则。

## 全篇约束

- 采用 [组件合页](../../docs-doc-principle/references/page-contract.md#小体量组件合页) 的顺序：接入方式、基础用法、扩展用法、错误与限制、实现原理、API 参考、Schema 参考、延伸阅读。无真实内容的可选章节不造占位。
- 兼容 React、Vanilla API 与直接 IR。说明某项配置时就近对应三种入口；不要把 React 子组件名称当成通用配置名称。核对真实路径：例如 React `ScatterEncodings`、Vanilla API `encodings`、IR `recipe.encodings`，不能把 Vanilla API 与 IR 的对象层级混为一谈。
- 手写用法与 API 表格不设“默认值”或“必填”列；必要性、默认行为、继承和冲突等影响调用的信息放在说明列。类型展开为可读结构或文字说明，不只写 `XxxProps['field']` 等索引类型。
- 公共组件可出现在完整示例中，不在类型页重复讲解。接入方式之外，基础用法只在正文展示当前配置的关键片段，完整示例由 demo 源码视图承载。
- zh/en 同步。下述表格是按使用任务精选的说明，完整 API 仍按参考页规则维护，不新建平行契约真源。

- 除接入方式的最简 demo 外，基础与扩展用法的功能 demo 必须提供 controls，只选与当前示例任务强相关、调整后有明确可见变化的属性，不按 API 表穷举。偏移、旋转等通用或低频属性仅在其为演示主题时加入；固定数据与必要映射作为不变量，条件字段用 `visibleWhen`，保留项须实际生效且支持重置。静态原理插图不强制添加 controls。

## 接入方式

简短说明入口，随后放无 controls、`hideCode` 的最简 demo，再用 [DocTabs](../../docs-doc-principle/references/doc-tabs-steps.md) 展示 React + JSX、React + IR、Vanilla API、Vanilla + IR。四种写法使用同一数据与配置，得到相同结果；最简指配置负担小，不要求只有少量数据。

接入 demo 与四种写法只保留必要数据、字段映射及运行所需配置，不添加 `presentation`、标题、副标题、注释或来源组件；数据含义与来源放在 demo 外的说明或 caption 中。

React + JSX 标签内先放该 chart 的专属子组件树，再给完整 JSX。树覆盖实际支持的 encodings、properties、mark 等专属子组件，不列 `ChartData`、`ChartTitle` 等公共组件；不要为所有 chart 假定完全相同的子组件集合。

## 基础用法

基础用法下所有 demo 不添加 `presentation` 或标题、副标题、注释、来源组件；数据含义与来源放在正文或 caption。`ComponentPreview` 默认设置 `size="xl"`。基础用法不得使用 `plotExtension`；需要 Plot 扩展能力的示例放入扩展用法。

按该类型实际的 encodings、properties、mark 依次设 H3：`xxx映射`、`xxx属性`、`xxx图元`。标题用图表名称，不附加分隔点、React 组件名或 IR 路径。

每节固定按以下顺序组织：

1. **作用文字**：首段只说明配置解决什么问题，不重复列举三种入口。
2. **入口片段**：紧跟首段用三栏 `DocTabs` 对照 React + JSX、Vanilla API、IR；页签 `value` 依次为 `react-jsx`、`vanilla-api`、`direct-ir`，最后一栏的中英文标签均为 `IR`。每栏只写当前小节配置，例如 React 的专属子组件、Vanilla 的顶层字段、IR 的 `recipe` 字段；不重复数据、导入和完整图表。代码与下方 demo 的默认配置对应。
3. **属性表**：`属性名 | 类型 | 说明`。映射与图元列出该层的顶层配置；大量通用外观属性按本节任务精选并说明范围。字段驱动映射与固定属性要区分。
4. **示例说明**：先用一段文字解释数据、点和坐标的含义；随后直接用 `属性名：本例取值或绑定及效果` 的列表说明本节配置；列表后补一段读图结论、观察方法或交互提示。不加“本例使用以下属性”等空引导句，不逐项复述表格。
5. **示例 demo**：使用可查看源码的 `ComponentPreview`，入口片段已展示时默认收起源码；必须提供 controls，默认收起。每节都有与讲解直接对应的可见结果，可复用同一数据；图元节要展示追加、替换或该类型特有的图元行为。

## 扩展用法

围绕当前 chart type 选择 2–3 个实际任务，体现比基础用法更复杂的配置组合或分析需求；不要按属性机械凑节，也不要制造尚未支持的能力。标题按任务命名，内容允许自由组织。

每节采用“简短用途文字 → 分组配置表 → 简短 demo 引导 → demo”：

- 表格为 `分组 | 属性名 | 类型 | 说明`，汇总实现该任务涉及的配置，不局限于单个 React 子组件。
- 分组使用真实 IR 属性名，例如 `encodings`、`properties`、`marks`、`layout`、`guides`、`plotExtension`，不用中文职责名。同组仅首行填写分组，后续行留空；属性相对分组书写，节首交代所属层级，避免路径歧义。
- demo 前说明图表达什么、配置怎样配合及重点观察什么；不重复代码，用户从预览查看源码。
- 分面、空间坐标等可作为应用方向，但其 Plot 通用机制不在 Chart 类型页展开。确有前置需求时链接所属文档，不为每个扩展示例强配原理图。

## 实现原理

按 [组件机制](../../docs-doc-mechanism/SKILL.md) 只展开当前 chart 的特殊决策、默认策略、图元处理和约束，不复述 Plot 的通用能力。即使局部实现由多个 Chart 类型共享，只要解释当前类型的独立默认行为，也可就近讲清；不要声称该机制只属于这一种图。

- 章首先设固定小节 `### 图形构建`（英文 `### Chart construction`），用 `分组 | @retikz/chart | @retikz/plot | 描述` 四列表格对照两层配置。分组按映射、属性、图元排列；英文对应 Encodings、Properties、Mark，同组后续行留空。只写该类型实际涉及的专属转换，省略通用配置和不存在的分组，不为凑齐分组添加占位行。
- 图元行两列使用同一抽象层级的真实类型名或 Schema 名，描述说明 Chart 图元如何组合为 Plot 图元；核对源码后再写映射、属性的目标字段与应用方式。表后可简述实际下沉结果并就近附 `SourceLinks`，不重复后续机制小节。
- 阅读公开 schema、JSDoc / 注释及实际处理逻辑。若某个图元存在特殊继承、替换、计算或默认规则，除表格简述外，在这里以独立主题展开；不能仅凭注释推断尚未实现的行为。
- 解释触发条件、计算依据、显式配置的优先级、结果和边界。例如散点自动留白说明为何使用最终最大点半径，而不是展开完整尺度实现。
- 图文结合：图前说明比较对象，图中呈现该逻辑造成的可观察差异，图后解释原因；配图复用 [叙述图契约](../../docs-doc-principle/references/figure-contract.md)，不以文字流程框代替应可见的几何差异。
- 章首用 `ComponentAlert` 的 `title`、`description` 属性标明选读，不能把提示正文放在不支持的 children 中；局部机制旁用 `SourceLinks` 指向已核对的源码。

## 错误与限制

用短列表保留几个最影响正确使用的约束，例如必需映射、配置冲突、不支持的组合及图形表达边界。不抄全部校验规则，不把必须知道的调用条件只藏在实现原理中。

## API 参考

沿用 [API 参考规则](../../docs-doc-reference/SKILL.md)，按通用配置职责组织为 `xxx配置`、`xxx映射`、`xxx属性`、`xxx图元`，不以 React 组件名作标题，也不追加分隔点或路径。只保留实际存在的配置分组。

每节说明 React / Vanilla API / IR 的对应入口，后续字段和约束共用；React 独有要求单独标明。保留准确的类型范围与特殊行为，不重复基础用法的教学过程；完整参考复用已有权威生成内容。基础用法与 API 出现同名标题时，检查生成锚点及所有页内链接的实际目标。

## Schema 参考

位于 API 参考之后，按根 `XxxChartSchema` → recipe → encodings → properties → mark 排列，标题保留真实 Schema 标识符；zh/en 同步。字段读取真实 Schema，遵循 [Schema 参考规则](../../docs-doc-reference/references/schema.md)。

- 根 Schema 只展示顶层字段，嵌套类型不展开：公共配置由所属文档说明，类型专属配置在后续小节展开。
- 公共 Schema 在类型列保留名称，不递归展示内部结构。遇到展开内容，先核对源码是否已有具名 Schema，再补文档注册；没有独立名称时保留真实公开访问路径，不为展示新造 Schema、添加生产导出或伪装名称。
- mark 的 encodings / properties 不重复展开上方字段；引用对应说明并明确真实差异，包括可覆盖字段、映射形式、必填性、继承及排除项。不得把收窄后的 mark 契约标成 recipe 的同一 Schema。
- 优先通过公开 Schema 或其可达字段实例建立文档引用，不复制 Schema 定义；核验页面没有未知 Schema、错误引用或缺失翻译。

## 延伸阅读与验证

使用 `LinkedSections` 链接最有助于继续阅读的主题，如相关图表类型、图形模型或本节实际依赖的通用能力；不堆砌站点目录。

按 [文档验证](../../docs-doc-principle/references/validation.md) 检查双语、入口等价性、表格类型、源码视图和真实图形；图示核对解释与实际行为一致。仅更新本 reference 不自动迁移其他图表页面，也不授权暂存或提交。

## Chart 家族总览图库

在“如何选择”表格后，可用 `ComponentPreviews` 展示直接子图表。`items` 按表格顺序填写 `title`、对应子页 `url` 和从 `contents` 根目录开始的绝对 demo ID `files`；例如 `files: '/viz/chart/points/scatter/scatter-fertility-work'`。复用各子页基础用法中的现有 demo，优先选择缩略后仍能辨认图表类型与关键视觉差异的默认状态，不复制图表配置或新建图库专用 demo。

组件只显示无边框图形及名称链接，按宽度均衡分行并撑满；不另加 controls、源码或操作栏。中英文页面保持相同 demo ID 与顺序，分别翻译 `title`，并核对两种语言的 demo 均能加载、跟随预览主题切换。
