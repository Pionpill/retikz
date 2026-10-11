# Schema Reference 与 ZodSchema 按需契约

仅在编写或修改合并 API 参考中的 Schema 内容、schema registry 或 `<ZodSchema>` 时读取。API 声明投影见 [API 生成与翻译](api.md)，合并结构见 [参考页结构](page.md)；概念页中的少量手写说明属于“文中 API 介绍”。

## 职责

Schema 内容提供字段完整、可扫描的校验查询入口，收录在 API 参考中。推导类型与对应 Schema 共用一个参考单元，Schema 字段通过同层页签查看；独立 Schema 保留自己的单元。推导类型的一级属性表复用这里维护的中文字段翻译。教程、JSON walkthrough、行为 demo 和设计解释放到组件页、概念页或示例页。

独立 API 参考位于对应 owner 的 reference；路径示意：

```text
apps/docs/src/modules/docs/contents/<owner-path>/reference/index.{zh,en}.mdx
```

registry 位于：

```text
apps/docs/src/modules/docs/components/mdx-content/zod-schema/schema-registry.ts
```

## 组件收录范围

- 按组件职责列出所需 schema 名称，再从包公开入口与现有 registry 获取；包级导入范围不决定页面展示范围
- 仅收录用户编写 IR 的输入 schema；排除解析态、Canonical、编译输出、运行时及重复的内部组合辅助 schema。`SceneSchema` 若是用户填写的 IR 根输入，不属于编译输出
- 主 schema 之外，只收录组件所有的直接子 schema，或该页面承担的专属配置通道输入 schema；不把“字段直接引用”或“高度相关”当作扩展收录范围的理由
- 共享 geometry、style、entity、default 等 schema 只在字段类型中保留源码原名，交给其所属组件或包的参考页说明；不重复建立小节，不沿共享引用递归收录全包
- 复用真实 schema，不为文档新造组件专属 schema、复制字段定义或深层导入内部文件；所选 schema 的自身字段仍须完整展示与翻译

## ZodSchema 规则

- 定义小节标题使用 Schema 原始标识符（保留 Schema 后缀）；只翻译说明，不翻译代码成员
- 具名 Schema 在字段类型引用处显示原名，不加超链接；定义标题中的名称链接真实声明，定义内容展示自身字段
- 枚举能唯一对应公开常量时复用 `ApiValues` 悬浮展示取值；无法明确对应时直接显示枚举值，不猜测名称。`ApiValues` 保持枚举功能，不承载对象、联合类型或 Schema 详情

- `name` 必须在 registry 注册；schema instance 必须来自包公开入口
- 字段名、类型、必填和英文说明来自源码 `.describe()`
- zh 传 `descriptions` 覆盖全部中文说明；en 不重复传英文说明
- zh 只有顶层 `description` 不算完成；object schema 的每个字段与匿名对象点路径都必须由 `descriptions` 覆盖，不能依赖英文 `.describe()` fallback
- anonymous object 子字段使用点路径，如 `font.family`、`label.text`
- registry 保留的 URL/anchor 仅作定位元数据，不据此生成类型超链接
- 新独立页还要同步 data child、i18n 和双语正文

新增 schema 的顺序：

1. 确认 schema 从所属包根入口公开导出
2. 在 registry 注册 schema、label 与真实 URL/anchor
3. 按真实声明与推导类型配对，将 `<ZodSchema>` 放入同层 Schema 页签；无配对类型时以 Schema 原名作 H4，标题名称链接源码。嵌入非独立页时收录于 H2“API 参考”，不另设“Schema 参考”；zh 补齐字段与嵌套点路径，en 只传 name
4. 独立页面同步 data 与 i18n
5. 运行 docs `tsc --noEmit`、完整性脚本，并在浏览器确认没有 `Unknown schema` 或中文描述缺失 warning

字段是否完整和中文说明是否准确仍需结合 schema 源码人工核对，不能只依赖渲染成功。评审中文页时还要检查实际表格，任一字段仍显示英文 `.describe()` 都视为翻译缺失。

字段结构来自 ZodSchema 对公开 schema 的读取；中文 descriptions 由 LLM 按源码英文 describe 翻译并核对术语、默认与点路径。现有流程不等同于已有完整 Schema 页面生成脚本；新增自动化须另有工程授权。
