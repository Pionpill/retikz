# API 生成与翻译

先核对 `apps/docs/scripts/generate-api-references.ts` 与对应 `scripts/api-reference/` 配置；沿用现有生成命令与英文翻译产物，不直接手改生成 include。

API Reference 只收录从 package `exports` 可达的真实公共标识符；入口、子路径、re-export 和 JSDoc 必须由 TypeScript 分析产物确定，不扫描任意内部源码文件。中文说明以中文 JSDoc 为源；英文说明由受审查的翻译产物生成，代码标识符、签名、枚举值、示例和 JSDoc 机器语义不翻译。不得在浏览器运行时调用 LLM 翻译，也不得把未经审查的机翻作为契约真源。

每次 API Reference 变更先运行生成脚本，再由 LLM 翻译新增的中文读者说明并写回生成器的英文翻译产物；随后审阅术语、代码标识符和 Markdown / MDX 结构，重新生成英文 include。缺少翻译必须让生成失败；英文 include 除 fenced code 示例外不得遗留中文说明。LLM 只参与生成时的翻译与审阅，不参与浏览器运行时。

API Reference 生成器对常用 JSDoc 的投影规则固定如下：首段 summary 生成名称下的职责摘要；`@description` 生成主体说明；`@remarks` 生成备注；字段 `@default` / `@defaultValue` 生成默认值列；`@param` 与 `@typeParam` 生成参数表；`@returns` / `@return`、`@throws` / `@exception`、`@example` 分别生成返回值、异常和用法；`@since`、`@deprecated`、`@see` 生成版本、弃用和延伸阅读元数据。`@public` / `@private` / `@internal` 决定可见性，`@inheritDoc` 交给 TypeDoc 解析继承注释，不单独渲染。未使用的标签不制造空章节；不从源码签名或实现猜测缺失说明。
