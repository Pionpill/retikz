# API 生成与翻译

先核对 `apps/docs/scripts/generate-api-references.ts` 与对应 `scripts/api-reference/` 配置；沿用现有生成命令与英文翻译产物，不直接手改生成 include。

API Reference 只收录从 package `exports` 可达的真实公共标识符；入口、子路径、re-export 和 JSDoc 必须由 TypeScript 分析产物确定，不扫描任意内部源码文件。中文说明以中文 JSDoc 为源；英文说明由受审查的翻译产物生成，代码标识符、签名、枚举值、示例执行语义和 JSDoc 机器语义不翻译；示例中的读者说明按 [docs-api-jsdoc](../../docs-api-jsdoc/SKILL.md) 核对。不得在浏览器运行时调用 LLM 翻译，也不得把未经审查的机翻作为契约真源。

每次 API Reference 变更先运行生成脚本，再由 LLM 翻译新增的中文读者说明并写回生成器的英文翻译产物；随后审阅术语、代码标识符和 Markdown / MDX 结构，重新生成英文 include。缺少翻译必须让生成失败；英文 include 不得遗留未翻译的读者说明，代码块内按说明与语义字面量区分检查。LLM 只参与生成时的翻译与审阅，不参与浏览器运行时。

API Reference 的目标投影契约如下：首段 summary 生成名称下的职责摘要；`@description` 生成主体说明；`@remarks` 生成备注；字段 `@default` / `@defaultValue` 生成默认值列；`@param` 与 `@typeParam` 生成参数表；`@returns` / `@return`、`@throws` / `@exception`、`@example` 分别生成返回值、异常和用法；`@since`、`@deprecated` 生成版本和弃用元数据；`@see` 不投影，`{@link}` 只保留文字，不生成链接。可见性标签和 `@inheritDoc` 按当前 TypeDoc 配置核验，不能覆盖 package exports 的真实公开面。未使用的标签不制造空章节；不从源码签名或实现猜测缺失说明。

## 实际能力核验

目标契约不代表每种声明结构都已支持。修改前核对 `tex.ts` 中 `resolveObjectMembers`、`toSymbol`、`renderMembers` 与 `renderExamples`：对象类型自动展开一级，映射与继承成员取 TypeScript 解析结果，字段类型保留命名引用，索引签名单独展示。对象默认在「属性」页签展示字段表，完整原声明（含 `export`、类型名与 `=`）放入「类型定义」页签；多个字段组用 `DocSteps` 分段，单组直接显示表格。联合别名仅在原声明通过命名类型等方式隐藏分支结构，并且分支不超过 8 个、展开不超过 40 行和 500 字符时生成“展开类型”；直接写出的对象、字面量和基础关键字联合不重复展示；任一分支为 `Readonly`、数组、元组及其他可直接读取的包装结构时也不展开，即使 TypeScript 解析后可结构化为对象；条件类型、工具类型、`import(...)`、`$Zod` 或超限内容只保留原声明与源码链接。非对象或未确定字段的泛型保留签名，Schema 引用优先。对象字段投影 summary/description/default，可选性与只读性按解析结果，默认说明参与翻译；分组配置只负责组织字段。当前顶层函数仍只取首个签名，示例统一包成 ts 围栏且未独立翻译。遇到缺口按源码、投影、翻译分别记录，在授权范围内修复，不手改 include 或把未展示内容视为已完成。

轻量 Props 包装由脚本自动识别：顶层 `Omit` / `Pick` 与交叉组合中，直接声明字段不超过 3 个、而解析字段超过 12 个或字段文本超过 500 字符时，不渲染继承字段的大表。默认页签改为“直接属性 / Direct members”，仅列新增字段并说明继承类型和被移除字段；完整组合仍在“类型定义”。
