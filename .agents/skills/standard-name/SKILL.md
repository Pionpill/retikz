---
name: standard-name
description: 新增、移动、拆分或审查 Retikz 源码目录、文件、导出类型、函数、枚举、registry 或框架组件命名时使用，确保符合仓库命名规范。
---

# 标准命名

`standard-name` 是 Retikz 源码命名的唯一真源。先确定 owner 与职责，再从下表选择目录、文件和符号名。领域 skill 只说明行为与归属，不重复定义命名。

## 通用形式

- 使用完整的语义词。不得缩写 `direction`、`reference`、`background`；已建立的 TikZ / SVG / CSS 术语如 `stroke`、`fill`、`cx` 例外
- 目录与非组件文件使用 kebab-case。源码名通常用一至两个语义词，只有确实区分独立概念时才用第三个；`.test` / `.demo` / `.data` / locale 后缀不计入词数
- React 组件和类才使用 PascalCase。hook、store、context 分别使用 `useXxx`、`useXxxStore`、`useXxxContext`；其余值和函数使用 camelCase
- `index.ts` 只用作目录 barrel：导出 owner 的稳定表面，不承载业务逻辑
- `types.ts` 放导出或 owner 内共享类型，`constants.ts` 放稳定常量与 const object enum，`utils.ts` 只放没有更窄职责的纯 helper。只有一个调用点的 helper 与其 consumer 相邻
- 概念在定义处命名。不得通过 import / export `as` 隐藏 owner 本应解决的命名冲突

## 分层目录与文件

| Owner / 职责                     | 目录与文件名                                                           | 说明                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Source IR 契约                   | `schemas/<domain>/schema.ts`、`types.ts`、`constants.ts`               | 只放 schema 与其 `IRXxx` 类型                                                        |
| 外部 unknown 输入                | `parse/<domain>/parse.ts` 或小型 `parse/<domain>.ts`                   | `parseXxx()` 将 unknown、JSON、字符串或序列化 DSL 校验为 IR                          |
| Vanilla / Plot Vanilla authoring | `normalize/<domain>/normalize.ts`、owner-local `types.ts`              | `normalizeXxx()` 无 compile context 地把 `InputXxx` 转为 IR                          |
| Core / Plot 内部规范化           | `normalize/<domain>/normalize.ts`、`types.ts`                          | `normalizeXxx()` 将 Source IR 规范化为 Canonical；`resolve.ts` 准备 context 并调度它 |
| 扩展 contract                    | `contract/<capability>/types.ts`、`define.ts`、`index.ts`              | 只放 contract 类型与 `defineXxx()`                                                   |
| 内置 provider 与 registry        | `providers/<capability>/definitions.ts`、`registry.ts`、`<builtin>.ts` | `registry.ts` 合并并诊断；`definitions.ts` 组装内置项                                |
| Compile / pipeline domain 阶段   | `compile/<domain>/resolve.ts`、`lower.ts`、`layout.ts`、`emit.ts`      | 只有该阶段存在时才新增对应文件                                                       |
| Shared vocabulary                | `shared/<topic>/{constants,types,utils,index}.ts`                      | 小型 topic 使用单文件                                                                |
| React DSL                        | `kernel/{components,protocol,adapter,runtime}`、`sugar/`、`render/`    | 公共组件文件使用 PascalCase，其余文件遵循通用形式                                    |

不得为了套用本表而新建占位目录、泛化 `helpers.ts` 或纯转发 shim。

## 按语义阶段命名符号

| 概念                            | 必须使用的名称                                                         | Owner                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 持久化 IR schema 与类型         | `XxxSchema`、`IRXxx`                                                   | `schemas/`；`IRXxx = z.infer<typeof XxxSchema>`                                                            |
| 可复用 IR shape                 | `XxxBaseSchema`                                                        | `schemas/`；仅在实际复用或分阶段 refinement 时使用                                                         |
| Vanilla authoring input         | `InputXxx`                                                             | 仅 Vanilla / Plot Vanilla；只写 TypeScript                                                                 |
| 完整的内部 IR 形态              | `CanonicalXxx`                                                         | Core / Plot `normalize/<domain>/types.ts`；没有 Zod schema，不持久化                                       |
| 有独立语义的 context 派生对象   | `EffectiveXxx` 或其准确领域名                                          | 不得使用泛化的 `ResolvedXxx`                                                                               |
| 扩展 contract 与作者输入        | `XxxDefinition`、`XxxDefinitionInput`、`AnyXxxDefinition`、`defineXxx` | `contract/`；Definition input 不是 Vanilla Input                                                           |
| Const object enum 与取值 union  | `Xxx`、`XxxValue`                                                      | object 用单数 PascalCase、成员用 PascalCase，并以 `ValueOf` 派生；不得使用 TypeScript `enum` 或 `XxxEnum`  |
| 内置集合 / lookup               | `BUILTIN_XXXS`、`BUILTIN_XXX_DEFINITIONS_BY_<KEY>`                     | `providers/`；`<KEY>` 是实际 discriminator                                                                 |
| Provider lookup / registry 合并 | `xxxDefinitionOf`、`resolveXxxRegistry`                                | `providers/`                                                                                               |
| 外部 parse                      | `parseXxx`                                                             | 只从 `unknown` 转为 `IRXxx`                                                                                |
| Vanilla authoring 组装          | `normalizeXxx`                                                         | Vanilla / Plot Vanilla 中只从 `InputXxx` 转为 `IRXxx`                                                      |
| Domain IR 规范化                | `normalizeXxx`                                                         | Core / Plot 中只从 `IRXxx` 加 `NormalizeContext` 转为 `CanonicalXxx`                                       |
| Compile context 解析            | `resolveXxx`                                                           | 解析 registry、引用、host、data 等 context，并调度 domain normalizer；不得 parse unknown 或 emit primitive |
| 语义 lowering / 输出            | `lowerXxx`、`layoutXxx`、`emitXxx`、`collectXxx`                       | 遵循对应 compile 或 pipeline 阶段                                                                          |

顶层实体 discriminator 使用 `type`，内部 variant 使用 `kind`，命名 provider 使用 `name`。同一 discriminator 必须在 schema、contract、provider index、lookup、diagnostics 与 docs 中保持一致。

## Review 清单

1. 选定的 owner 是否匹配数据或行为，而不是当前 caller？
2. 每个新增目录 / 文件名是否在分层表内，或存在更明确的领域名？
3. Input / IR / Canonical / Definition 的命名是否匹配实际阶段与持久化边界？
4. `parse` 与两种 owner 的 `normalize` 是否明确区分，且只有 Core / Plot domain normalizer 产出 Canonical？
5. enum、provider collection、barrel、组件和 helper 是否符合规定形式？
6. 局部别名、泛化 helper、旧名或平行类型是否掩盖了 owner 问题？

## 常见错误

- 不得将 `CanonicalXxx` 放在 `schemas/`、`contract/`、`providers/` 或 compile-private `types.ts`；它属于 Core / Plot 的 domain normalizer，由 compile 导入
- 不得将 `XxxDefinitionInput` 命名为 `InputXxxDefinition`；两者 owner 不同
- 不得将 unknown 外部校验命名为 `normalize`，或将 context 解析命名为 `parse`
- 已有明确阶段或领域名时，不得使用 `processXxx`、`handleXxx`、`doXxx`、`completeXxx` 或泛化 `ResolvedXxx`
