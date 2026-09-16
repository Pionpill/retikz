---
name: docs-doc-principle
description: Use before writing or reviewing Retikz solution documentation, demos, navigation or references; selects a task-based page skill and the shared naming, difficulty and chapter contract.
---

# 文档总原则与 skill 入口

## 必须先确定

1. 阅读 `apps/docs/AGENTS.md` 与 [页型、难度和名称词典](references/page-contract.md)
2. 确认解决方案、语义 owner、读者任务与本次授权范围；旧页只供事实与迁移范围参考，不以旧结构覆盖新规范
3. 按下表选择一个主写作 skill，按需加载补充规则；页型与难度按词典固定，不按目录、篇幅或当前标签推断

| 任务                         | 主 skill                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| 侧栏组织、路由归属或迁移     | [docs-doc-navigation](../docs-doc-navigation/SKILL.md)，再选正文页型 |
| 解决方案、包、组件家族总纲   | [docs-doc-group](../docs-doc-group/SKILL.md)                         |
| 简介、快速开始、更新日志     | [docs-doc-entry](../docs-doc-entry/SKILL.md)                         |
| 基础与专题用法               | [docs-doc-usage](../docs-doc-usage/SKILL.md)                         |
| 定义并注册自定义能力         | [docs-doc-extension](../docs-doc-extension/SKILL.md)                 |
| 基础概念、核心概念、设计理念 | [docs-doc-concept](../docs-doc-concept/SKILL.md)                     |
| 进阶专题、实现原理           | [docs-doc-mechanism](../docs-doc-mechanism/SKILL.md)                 |
| API / Schema 参考            | [docs-doc-reference](../docs-doc-reference/SKILL.md)                 |
| 综合任务教程                 | [docs-doc-example](../docs-doc-example/SKILL.md)                     |
| 博客文章                     | [docs-doc-blog](../docs-doc-blog/SKILL.md)                           |

## 按需补充

- 安装、宿主切换或分步接入：[DocTabs / DocSteps](references/doc-tabs-steps.md)
- 章节索引或延伸阅读：[LinkedSections](references/linked-sections.md)
- ComponentPreview 源码、数据、双语 demo：[预览契约](references/component-preview.md)
- 少量文中 API 或 SourceLinks：[文中 API](references/inline-api.md)
- 教学辅助线、引用和位置 demo：[视觉语言](references/demo-visual-language.md)
- Controls：[docs-doc-control](../docs-doc-control/SKILL.md)
- 成品展示：[docs-doc-showcase](../docs-doc-showcase/SKILL.md)，作为主写作 skill 的补充
- Standard composite：[Standard 补充](../docs-doc-usage/references/standard-composite.md)
- 叙述图：[docs-figure-contract](../docs-figure-contract/SKILL.md)，实现逻辑图再读 [docs-figure-logic](../docs-figure-logic/SKILL.md)
- 文档评审：[docs-doc-review](../docs-doc-review/SKILL.md)

只加载当前任务需要的资源，不预读整套 skills。

## 真源与协同

- 普通文档正文在 contents，导航在 data，标签在 i18n；URL 段、目录段和 data id 一致。生成日志与参考按实际数据入口处理，不为了目录形式创建空正文
- 普通页面 zh/en 成对，zh 是写作真源；生成 API 的签名/JSDoc 与 Schema 的字段/describe 仍以源码为契约真源。博客的语言规则由 blog skill 拥有
- 新建或重构时按词典同步名称、页型、难度、导航和受影响链接；不批量修改范围外的旧页
- 先从当前实现、测试及所属能力域文档核对根问题、职责、输入输出、默认值和扩展路径。内置与自定义是否同路必须以源码为据，不以旧文案推断
- 分组直接承担总纲；教程、概念、内部原理、完整 API 和 Schema 参考各有唯一职责，不在用法页复制所有内容
- 通用颜色、线宽、字号等视觉属性合并到少量说明或 controls；章节围绕语义、结构、组合与边界，不按 prop 数量展开

## 写作规则

- 段落尽量不超过 3 行；步骤用列表，映射和选择用表格，用法用 demo 或代码块
- 算法与数学关系优先用 MDX 的 MathJax 公式，不用 text / TypeScript 代码块模拟公式。简单符号或短等式使用行内公式；复杂、多项或多行公式独立 display，并在前后各用一行说明它的输入、结果或阅读重点
- H1 由 frontmatter 渲染，正文不再写 `# 标题`
- `frontmatter.description` 要能脱离页面独立说明根问题、核心职责或使用入口，不写“本页介绍”
- 中文标题不机械附括号英文；必须识别的 API、schema、类型名保留原名
- 小节标题精简干练，不与文档标题同名；例如“基础用法”页以“接入方式”开篇。优先用准确的名词或动词短语，解释放在正文；固定章节名与文档名重复时，改用具体任务名
- 生僻术语在每页首次出现时就近解释
- 正文保持中性，不写“竞品做不到 / 我们更强”；生态对照放 `<Comparison>`，隐藏后正文仍自洽
- mdx 正文默认不加第三方外链；项目仓库内延伸阅读使用可点击的 GitHub 完整 URL。blog 的例外由 `docs-doc-blog` 定义
- 不把本地文件路径当普通读者可用的延伸阅读

## DSL、IR 与图示

用户正文优先展示 DSL（如 `<Layout>`、`<Node>`、`<Path>`、`<Draw>`）。普通用法页不为了“完整”重复 IR JSON 或编译器内部；IR 只在架构、持久化、AI 接入或必须用它解释公开行为时出现。

- 同一公开能力同时提供 React 与 Vanilla 入口时，安装、入门和高频使用页必须保留两套最小接入说明：分别点明入口、注入或调用位置与产物。ComponentPreview 的实际源码视图已覆盖相应写法时不再重复 DocTabs，只补必要接入说明或关键片段；未覆盖的替代方案优先用 `DocTabs`，有顺序的操作可组合 `DocSteps`；切换展示不等于省略另一端。只有能力确实只支持其中一端，或页面明确限定单一宿主时，才可省略另一端

ComponentPreview 的 IR 与 Vanilla 配置必须保持最上层、精简的 Source IR / authoring 语义；不得把 lower、resolve 或 runtime canonical 结果直接暴露给读者。运行时为统一消费而产生的 `base`、完整 Plot 或其它下沉形态只用于校验与渲染。

所有功能 demo 和叙述图都用 retikz 自绘：同级 demo + `<ComponentPreview>`。不使用截图、PNG/JPG/GIF、Mermaid、Excalidraw 或 draw.io 代替功能展示。叙述图默认 `hideCode`；可复制用法保留源码。

关系、流程或架构图的具体画法由 `docs-figure-contract` 拥有，本 skill 只决定是否需要图。

颜色、内置能力等可枚举目录优先消费现有公开真源；已有权威清单时不手工维护第二份，不为文档展示新增公共导出。

## 文档宽度

正文最大宽度 800px，表格单元格默认不换行。表格优先 3 列以内；过长内容用 `<br />` 或拆出正文。MDX 表格中的 union `|` 写成 `\|`，同一字段的多个类型放在同一行内用 `<br />` 分隔。

## 验证

只改 skills 或其发现入口时，校验 skill frontmatter、相对引用、旧规则残留与典型任务分流；不因此迁移现有页面或要求全仓旧文档满足新词典。下列页面验证与读者评审用于实际文档改动。

先运行机械一致性检查，再做页面语义和视觉判断：

```bash
node .agents/skills/docs-doc-principle/scripts/check-doc-integrity.mjs --scope <module-or-subtree>
```

脚本检查普通页面双语配对、双语标题层级、站内路由与锚点、`SourceLinks` 文件/行号、`ComponentPreview` 主 demo 文件；它不能判断 API 描述是否符合实现、SourceLinks 是否真正支撑结论、demo 是否可读，因此不能替代源码核对和浏览器检查。

每次提交 Docs 改动前必须运行 `pnpm --filter @retikz/docs run check:static`。完成后提示用户是否运行 `check:build` 和 `check:runtime`；只有用户明确要求才执行。用户明确要求运行时巡检时，包含其依赖的生产构建。

按改动范围选择最小有效验证：

| 改动                                    | 最小验证                                                    |
| --------------------------------------- | ----------------------------------------------------------- |
| 纯 MDX 正文、表格、站内链接             | `check:static` + Oxfmt + `git diff --check` + 关键页面/链接 |
| frontmatter、标题、MDX 组件、LinkedCard | 上述检查 + 浏览器确认 zh/en、TOC、菜单                      |
| demo、data、helper、MDX import          | 上述检查 + docs `tsc --noEmit` + 浏览器确认 demo            |
| docs data、i18n、schema registry        | 上述检查 + docs `tsc --noEmit` + 对应路由/Schema            |
| 用户明确要求 CI 或产物等价验证          | `check:build`；如明确要求，再执行 `check:runtime`           |

新建 ComponentPreview 图时按 [`ComponentPreview 按需契约`](references/component-preview.md) 的新文件规则验证，不依赖旧 dev session 的热更新状态。

### 大改与新增页面的独立评审

命中任一条件即视为文档大改：新增页面；重写页面主线或章节顺序；新增或替换 demo、controls、API 表；同时对多个小节或页面做语义调整。纯错字、链接、格式和局部措辞修改不触发。

- 文档大改按中型任务处理，执行计划包含 scope、验证和完稿后的 1 个只读 Luna（`gpt-5.6-luna`）读者评审；复审上限沿用获批计划
- 新建、重写或大范围重构完成且机械检查通过后，必须派遣该 subagent，不能以主 agent 自审或检查通过代替；用户明确取消或工具不可用时如实说明未执行
- reviewer 使用 fresh 上下文，仅查看待评文档正文与页面内图示，不读取项目规范、AGENTS、skills、源码、测试、diff 或作者说明。主 agent 不传递项目历史、预期结论或补充概念解释
- 要求 reviewer 直接提出读者疑问，指出具体段落中未解释或解释过晚的概念、含糊说明、逻辑跳跃和章节衔接问题；不能靠猜测或源码替文档补齐解释。源码一致性与规范检查由主 agent 负责
- 修正 BLOCKING 后在计划上限内复用同一 reviewer，不追加第二个 reviewer；局部措辞、格式等小改由主 agent 自审

完成前还要人工确认：

- 核心功能、通用功能和边界的篇幅权重合理
- API 名可从公共入口导入，默认值与实现一致
- SourceLinks 覆盖真正的决策分支，不只是浅层入口
- 页面、demo、controls 在真实宽度下可读，错误态中没有 `Demo ... not found` 或 `Unknown schema`
- zh/en 语义对齐，而不只是标题数量相同
