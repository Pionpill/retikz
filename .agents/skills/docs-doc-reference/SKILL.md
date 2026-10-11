---
name: docs-doc-reference
description: Use when writing or reviewing Retikz public JSDoc, generated API references, or source-driven Schema reference pages.
---

# API、Schema 与公开注释

公开契约以 exports 可达声明、TypeScript/JSDoc 和 Zod schema 为真源；内部 export 不自动是公共 API。只改包内 JSDoc 时不必加载整套文档站规范；修改页面时先读 [文档总则](../docs-doc-principle/SKILL.md)。

| 当前工作                           | 必读                             |
| ---------------------------------- | -------------------------------- |
| 公开 JSDoc、默认值、示例与语义审查 | [JSDoc](references/jsdoc.md)     |
| API 页面生成、投影、翻译           | [API](references/api.md) + JSDoc |
| Schema 收录、registry、字段翻译    | [Schema](references/schema.md)   |
| 新建/调整参考页面                  | [页面结构](references/page.md)   |

所有模块（包括 Kernel）的 API 与 Schema 统一收录于“API 参考 / API Reference”，独立页尾段为 `reference`。Schema 推导类型与对应 Schema 合为一个参考单元，以单层 DocTabs 切换属性、类型定义与 Schema；没有对应项的成员独立说明，不造占位。

独立 API 参考页不设阅读难度；嵌入的参考小节沿用所属页面的难度。参考不加相关属性。完整 API 用既有脚本生成，不手改 generated include；Schema 先核对当前生成脚本与注册器，不假定自动化已支持所有 owner。不得为参考页新增公开导出或平行 schema。

脚本生成后，LLM 必须主动审阅产物的契约完整性与可读性，判断是否需要补充类型展开、字段说明、分组或展示调整。将发现的问题、依据与优化建议交由用户判断，获批后修改真源或生成逻辑并重新生成、验证。长任务中记录建议，不为待批准的优化中断已授权流程，最终交付时集中提出；已授权范围内的必要修复与验证继续执行。

独立页按能力设 H2 分组，中文分组名概括用途，如“行选择”，不直接用 RowSelector 等类型名；成员使用源码原名作 H4，不进入右侧 TOC。嵌入用法、组件或专题时只设 H2“API 参考”，分组用正文标签，成员仍用 H4；页面顺序、难度和开篇收尾遵循所属页型。API 与 Schema 的源码链接直接放在标题各自名称上，不保留独立摘要链接行；细则见页面结构与 API 投影。
