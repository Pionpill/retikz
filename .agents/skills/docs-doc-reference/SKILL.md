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

API/Schema 不设阅读难度，不加相关属性。完整 API 用既有脚本生成，不手改 generated include；Schema 先核对当前生成脚本与注册器，不假定自动化已支持所有 owner。不得为参考页新增公开导出或平行 schema。
