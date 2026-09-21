# 文中 API 与源码入口

只记录当前任务必要的公开 API；完整查询由 docs-doc-reference 拥有。

文中 API 介绍里的函数、类型和常量名仍必须是从所属包公开入口可导入的真实标识符。不要把概念简称、内部类型或 owner 深层 export 冒充公共 API。写表前沿着“组件 Props / schema → owner barrel → package root”核对；宿主组件页还要检查同 owner barrel 的 Provider、Context、hook 与 helper，避免漏掉用户完成任务所需的伴随导出。

共享或继承 props 不在每页复制完整字段表：用一行说明公开共享契约及其职责，并链接到唯一权威页；本页只展开新增或重定义的字段。

“相关属性”统一使用 [ComponentProps](component-props.md)，不要再手写平行属性表；叙述中的少量参数就近解释。公开枚举可用 `<ApiValues name="PublicConstant" />`，由 registry 引用真实常量，不在 MDX 重抄一份取值。

机制说明先写用户可观察行为，再用 `<SourceLinks>` 给直接实现入口。每项 `path` 使用仓库相对路径，行号范围最小且必须仍支撑正文结论；源码链接不能替代解释。

实现原理页按 `docs-doc-mechanism` 展开内部成员与执行过程；明确标注的内部实现锚点不受公共 API 标识符要求限制，但不得冒充公开调用入口或进入 API Reference。
