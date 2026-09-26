# 页型、难度与名称词典

所有文档写作先选阅读任务，再查本表；目录位置、旧页模板、篇幅和 API 数量不决定页型。此文件是固定名称、难度和通用章节的唯一规则源。

## 页型与固定难度

| 阅读任务                           | 主 skill           | 固定难度          | 阅读体验                                       |
| ---------------------------------- | ------------------ | ----------------- | ---------------------------------------------- |
| 解决方案、包或组件家族总纲         | docs-doc-group     | beginner（入门）  | 说明是什么、解决什么、从哪开始，不要求内部知识 |
| 简介、快速开始                     | docs-doc-entry     | beginner（入门）  | 说明价值、完成首次使用                         |
| 更新日志                           | docs-doc-entry     | 不设              | 按版本查阅实际变更                             |
| 基础、专题、扩展用法：调用现有能力 | docs-doc-usage     | beginner（入门）  | 给最小结果与可复制步骤，就近解释调用约束       |
| 基础概念                           | docs-doc-concept   | beginner（入门）  | 先场景后术语，建立调用前必需模型               |
| 核心概念、设计理念                 | docs-doc-concept   | advanced（进阶）  | 解释公共约束、抽象关系与设计取舍               |
| 自定义用法：定义并注册新能力       | docs-doc-extension | advanced（进阶）  | 在已有用法上完成定义、注入、引用与验证         |
| API 参考、Schema 参考              | docs-doc-reference | 不设              | 完整、准确、可扫描地查询契约，不穿插入门教程   |
| 进阶专题、实现原理、运行原理       | docs-doc-mechanism | internals（底层） | 明确前提，解释执行、数据变化、边界与源码定位   |
| 跟做一个完整案例                   | docs-doc-example   | beginner（入门）  | 分步累加，每步产生可观察结果                   |

难度只用于需要线性学习的页面，不能因页面太长或术语多而改标签。API 参考、Schema 参考与更新日志是按需检索的资料，不声明难度。基础用法包含底层内容时拆出进阶专题；调用 API 位于底层包不代表其基础教程是底层难度。“进阶”侧栏可包含扩展指南与内部机制，难度仍按页型确定，不统一改成 internals。Showcase 是展示补充规则，沿用所属页型的固定难度。博客是独立文章体系，不套用解决方案页型或据此新增难度字段。

分组总纲在阅读契约上固定入门；当前导航类型若不允许 children 节点声明 difficulty，不强塞字段，不在单篇文档任务中顺带修改类型系统。叶子页按现有字段填写；展示总纲难度需要单独获准的站点任务。

## 固定页名与 URL 尾段

| 中文                       | English                        | segment                            |
| -------------------------- | ------------------------------ | ---------------------------------- |
| 分组对象名，如布局         | Object name, e.g. Layout       | 分组根路径，不追加 overview        |
| 简介                       | Introduction                   | introduction                       |
| 快速开始                   | Quick start                    | get-start                          |
| 更新日志                   | Changelog                      | changelog                          |
| 基础用法                   | Basic usage                    | usage                              |
| 具体使用专题名，如作用域   | Task-specific name, e.g. Scope | 具体语义词，如 scope               |
| 自定义用法                 | Custom usage                   | custom                             |
| 自定义裁剪区等             | Custom clipping, etc.          | custom-clip 等 custom-<capability> |
| 实现原理                   | Implementation                 | mechanism                          |
| 具体进阶专题名，如文字测量 | Specific internals topic       | 具体语义词，如 measurement         |
| API 参考                   | API reference                  | api-reference                      |
| Schema 参考                | Schema reference               | schema-reference                   |

- 同一 owner 只有一个自定义教程时使用 custom；多个时都使用 custom-<capability>，标题明确能力名。调用内置扩展仍是普通用法，不使用 custom 页型
- 基础概念、核心概念、设计理念的组 id 分别为 basic、core、design；basic 只用于概念分组，基础用法叶子统一 usage
- sidebar label 与 frontmatter title 使用同一页名；对象归属由父级与面包屑表达，固定页名不另加包名或中英括号。代码标识符不翻译
- 中文页面中，组件文档标题使用 `组件名 · 中文名`，如 `Node · 节点`；关键的非组件专题使用 `属性名 · 中文名`，属性名首字母小写，如 `label · 标签`
- 所有 id 使用英文小写 kebab-case，以准确含义优先，不为单词数量发明缩写。版本历史尾段沿用项目已有 v0-1 等格式
- 新建或获准重构的页面使用本词典；旧 overview、basic 用法页、extension(s)、技术原理、运行原理等按实际语义迁移，不全仓机械替换。未经授权的相邻旧页不随本次写作迁移

## 公共章节与组件

| 中文 H2    | English H2             | 内容与组件                                             |
| ---------- | ---------------------- | ------------------------------------------------------ |
| 安装与使用 | Installation and usage | 可独立安装的包入口：PackageManagerInstall 后接 DocTabs |
| 接入方式   | Using this topic       | 基础、专题、扩展用法的最小结果与真实接入代码           |
| 章节内容   | Contents               | 分组根页：LinkedSections 列直接子页                    |
| 延伸阅读   | Further reading        | 相关页：LinkedSections，说明阅读目的                   |
| 错误与限制 | Errors and limitations | 当前任务的真实限制与可观察失败，适用时出现             |

接入方式的四栏、双宿主与单入口条件统一见 [DocTabs / DocSteps](doc-tabs-steps.md)，不在词典维护第二套规则。预览复用 [ComponentPreview](component-preview.md)。

有相关公开成员时按 [相关属性](component-props.md) 添加“相关属性 / Related props”，API、Schema、实现原理页及下述组件合页除外。

“章节内容”是直接子页导航；“延伸阅读”是相关主题导航，不复制同一组链接。收尾统一延伸阅读，不再新写相关、扩展阅读、接下来或 Related。无相关链接时不造空章节。正文中的单个链接仍用 Markdown；卡片写法读 [LinkedSections](linked-sections.md)。

固定章节之外按具体任务命名。文中少量参数说明就近放在对应示例旁；普通基础用法页不混入完整 API 参考、Schema 参考和实现原理。小体量组件采用下述合页模式。影响正确调用的约束仍留在用法部分，不以拆节或拆页为由隐藏。

## 小体量组件合页

单个组件的常用任务可连续讲清、参考范围局限于自身、原理只有少量局部机制时，使用 `docs-doc-usage` 的组件合页模式；不按属性数量或字数硬拆页。存在多个独立专题或需要复杂前置知识的机制时，按阅读任务拆页。

页面标题沿用组件命名，URL 使用组件根路径，不追加 usage；整体为 beginner，原理为选读。开篇说明用途与结果，随后 H2 固定顺序如下；具体任务放在对应 H2 下的 H3，不把八类阅读任务交叉混写。

| 中文 H2     | English H2             | 职责                                         |
| ----------- | ---------------------- | -------------------------------------------- |
| 接入方式    | Using this topic       | 最小预览与真实接入代码，沿用 DocTabs 契约    |
| 基础用法    | Basic usage            | 常用任务与必要调用约束                       |
| 扩展用法    | Extended usage         | 已有能力的组合与高级选项，不承担定义注册教程 |
| 错误与限制  | Errors and limitations | 真实限制与可观察失败                         |
| 实现原理    | Implementation         | 解释关键行为的局部机制与源码入口             |
| API 参考    | API reference          | 当前组件公开入口与成员的源码驱动参考         |
| Schema 参考 | Schema reference       | 当前组件持久化 IR 的公开 Schema              |
| 延伸阅读    | Further reading        | 用 LinkedSections 链接相关主题               |

固定的是顺序与职责；没有扩展用法、真实限制、独立机制、公开 Schema 或相关链接时省略对应节，不创建空占位。实现原理必须位于 API 参考之前，标题后第一项使用 `<ComponentAlert type="tip">` 提示“本节解释内部实现，仅使用组件时可跳过，直接查阅后面的 API 参考”，英文同步；跳过本节不得影响正确使用组件。

合页不再额外设置“相关属性”或“补充说明”；必要参数就近解释，集中查询交给 API 参考。API / Schema 沿用 `docs-doc-reference` 的生成来源与收录边界，不手写第二套契约；实现原理沿用 `docs-doc-mechanism` 的组件级讲解规则，不套独立原理页的开篇和收尾。已有权威参考时复用同源局部视图，不复制维护。仅调整 skill 不自动授权合并、迁移现有页面。
