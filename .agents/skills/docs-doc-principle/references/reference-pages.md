# Reference 与 ZodSchema 按需契约

仅在编写或修改 Reference 词典页、schema registry 或 `<ZodSchema>` 时读取。

## 职责

Reference 只提供字段完整、可扫描、可链接的 schema 查询入口。教程、JSON walkthrough、行为 demo 和设计解释放到组件页、概念页或示例页。

页面位于：

```text
apps/docs/src/modules/docs/contents/<moduleId>/reference/**/index.{zh,en}.mdx
```

registry 位于：

```text
apps/docs/src/modules/docs/components/mdx-content/zod-schema/schema-registry.ts
```

## ZodSchema 规则

- `name` 必须在 registry 注册；schema instance 必须来自包公开入口
- 字段名、类型、必填和英文说明来自源码 `.describe()`
- zh 传 `descriptions` 覆盖全部中文说明；en 不重复传英文说明
- zh 只有顶层 `description` 不算完成；object schema 的每个字段与匿名对象点路径都必须由 `descriptions` 覆盖，不能依赖英文 `.describe()` fallback
- anonymous object 子字段使用点路径，如 `font.family`、`label.text`
- 合并页标题的实际 rehype slug 必须与 registry URL anchor 一致，不手猜连字符
- 新独立页还要同步 data child、i18n 和双语正文

新增 schema 的顺序：

1. 确认 schema 从所属包根入口公开导出
2. 在 registry 注册 schema、label 与真实 URL/anchor
3. 在合适页面添加 H2/H3 和 `<ZodSchema>`；zh 补齐字段与嵌套点路径，en 只传 name
4. 独立页面同步 data 与 i18n
5. 运行 docs `tsc --noEmit`、完整性脚本，并在浏览器确认没有 `Unknown schema` 或中文描述缺失 warning

字段是否完整和中文说明是否准确仍需结合 schema 源码人工核对，不能只依赖渲染成功。评审中文页时还要检查实际表格，任一字段仍显示英文 `.describe()` 都视为翻译缺失。
