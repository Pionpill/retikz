---
name: standard-providers
description: Use when changing retikz providers layer code, builtin definitions, registry resolvers, BUILTIN_* collections, reserved or removed keys, custom definition merging, provider diagnostics, or implementation of contract capabilities.
---

# Standard Providers

`providers/` 是契约实现层：实现内置 definition，合并用户 definition，并向纵向领域 `resolve/` 提供统一 registry。它可以依赖 `shared`、`schemas`、`contract`，不依赖 resolve、pipeline 或 compile。

## 职责

- 提供内置 definition、内置集合和默认 provider。
- 合并内置与用户 definition。
- 诊断重复 key、内置冲突、保留名、已移除名。
- 暴露 registry resolver 和无领域 fallback 的按 key 查询 helper。

不要让消费侧复制内置白名单；不要把用户 definition 放到与内置不同的旁路逻辑。

## 组织与命名

目录、文件和符号名以 `standard-name` 为唯一真源。registry 索引、保留名集合和查询 helper 的 `<KEY>` 后缀必须匹配真实 discriminator，不要混用 `kind` 与 `name`。

## Registry 合并

- 内置先注册，用户 definition 后注册。
- 用户可使用自定义 key；覆盖内置 key 只有在明确设计为 override 时允许。
- 重复用户 key fail-loud，不静默 last-wins。
- registry resolver 只负责合并、索引和 registry-level 冲突诊断；具体 provider lookup、fallback 与上下文失败诊断属于领域 `resolveXxx`。
- pipeline / compile 只在 context 初始化时取得有效 registry，并将其注入 `XxxResolveContext`；lower / layout / emit 不直接查询 provider。

## 内置实现

- 内置项也通过 `defineXxx()` 或同等 contract 入口创建。
- 名称、kind、type 使用 schema / shared vocabulary 成员，不写裸字符串。
- 内置 helper 若有可扩展配置项，使用 `options` 对象承载；不要把第三个及之后的位置参数作为未来扩展槽。
- helper 默认留在 provider 内部；跨层复用时再抽到 `shared`。

## 改代码前检查

1. 内置和用户 definition 是否同路注册、解析、消费？
2. key 冲突、保留名和已移除名诊断是否集中在 resolver？
3. 领域 `resolveXxx` 是否消费统一 registry，且没有复制内置白名单或建立 fallback 旁路？
4. 内置集合是否在 `definitions.ts` 组装，`registry.ts` 是否只负责 resolver？
5. `BUILTIN_*` 数组里是否只放命名 definition，不直接内联长对象？
6. 新增内置项是否补了索引、默认值、测试和必要文档？
