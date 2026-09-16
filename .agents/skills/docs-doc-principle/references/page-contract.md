# 页型、难度与名称词典

所有文档写作先选阅读任务，再查本表；目录位置、旧页模板、篇幅和 API 数量不决定页型。此文件是固定名称、难度和通用章节的唯一规则源。

## 页型与固定难度

| 阅读任务                         | 主 skill           | 固定难度          | 阅读体验                                       |
| -------------------------------- | ------------------ | ----------------- | ---------------------------------------------- |
| 解决方案、包或组件家族总纲       | docs-doc-group     | beginner（入门）  | 说明是什么、解决什么、从哪开始，不要求内部知识 |
| 简介、快速开始、更新日志         | docs-doc-entry     | beginner（入门）  | 说明价值、完成首次使用或了解变化               |
| 基础用法、调用现有能力的使用专题 | docs-doc-usage     | beginner（入门）  | 给最小结果与可复制步骤，就近解释调用约束       |
| 基础概念                         | docs-doc-concept   | beginner（入门）  | 先场景后术语，建立调用前必需模型               |
| 核心概念、设计理念               | docs-doc-concept   | advanced（进阶）  | 解释公共约束、抽象关系与设计取舍               |
| 自定义用法：定义并注册新能力     | docs-doc-extension | advanced（进阶）  | 在已有用法上完成定义、注入、引用与验证         |
| API 参考、Schema 参考            | docs-doc-reference | advanced（进阶）  | 完整、准确、可扫描地查询契约，不穿插入门教程   |
| 进阶专题、实现原理、运行原理     | docs-doc-mechanism | internals（底层） | 明确前提，解释执行、数据变化、边界与源码定位   |
| 跟做一个完整案例                 | docs-doc-example   | beginner（入门）  | 分步累加，每步产生可观察结果                   |

难度固定于上表，不能因页面太长或术语多而改标签。基础用法包含底层内容时拆出进阶专题；调用 API 位于底层包不代表其基础教程是底层难度。“进阶”侧栏可包含扩展指南与内部机制，难度仍按页型确定，不统一改成 internals。Showcase 是展示补充规则，沿用所属页型的固定难度。博客是独立文章体系，不套用解决方案页型或据此新增难度字段。

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
- 所有 id 使用英文小写 kebab-case，以准确含义优先，不为单词数量发明缩写。版本历史尾段沿用项目已有 v0-1 等格式
- 新建或获准重构的页面使用本词典；旧 overview、basic 用法页、extension(s)、技术原理、运行原理等按实际语义迁移，不全仓机械替换。未经授权的相邻旧页不随本次写作迁移

## 公共章节与组件

| 中文 H2    | English H2             | 内容与组件                                             |
| ---------- | ---------------------- | ------------------------------------------------------ |
| 安装与使用 | Installation and usage | 可独立安装的包入口：PackageManagerInstall 后接 DocTabs |
| 基础用法   | Basic usage            | 组件与能力教程：DocTabs，不重复 npm 下载说明           |
| 章节内容   | Contents               | 分组根页：LinkedSections 列直接子页                    |
| 延伸阅读   | Further reading        | 相关页：LinkedSections，说明阅读目的                   |
| 错误与限制 | Errors and limitations | 当前任务的真实限制与可观察失败，适用时出现             |

安装与使用、基础用法的双宿主切换使用 DocTabs / DocTab，value 固定 react、vanilla，label 固定 React、Vanilla；复用现有全局接入偏好，不手写独立切换器。公共安装放 Tab 外，不同宿主的专属依赖放对应 Tab 内。真正无宿主差异的 TypeScript API 共用一份示例；只支持单端时说明实际入口，不虚构另一端。仅存在 React / Vanilla 等宿主子入口时说明其区别；只有包根入口时直接展示导入与调用，不额外强调“不需要 React / Vanilla 宿主”。

分步操作按需使用 DocSteps / DocStep；效果展示用 ComponentPreview，其 React / Vanilla 源码 Tab 已覆盖的用法不再用 DocTabs 重复展示；正文仅补必要接入说明和关键代码。具体组合读 [DocTabs / DocSteps](doc-tabs-steps.md)，demo 读 [ComponentPreview](component-preview.md)。

“章节内容”是直接子页导航；“延伸阅读”是相关主题导航，不复制同一组链接。收尾统一延伸阅读，不再新写相关、扩展阅读、接下来或 Related。无相关链接时不造空章节。正文中的单个链接仍用 Markdown；卡片写法读 [LinkedSections](linked-sections.md)。

固定章节之外按具体任务命名。文中少量参数说明就近放在对应示例旁；独立的完整 API 参考、Schema 参考和实现原理不能塞回基础用法页。影响正确调用的约束仍留在用法页，不以拆页为由隐藏。
