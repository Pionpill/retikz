# 分层文件与符号命名

## 分层目录与文件

| Owner / 职责                   | 目录与文件名                                                           | 说明                                                                       |
| ------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Source IR 契约                 | `schemas/<domain>/schema.ts`、`types.ts`、`constants.ts`               | 只放 schema 与其 `IRXxx` 类型                                              |
| 外部 unknown 输入              | `parse/<domain>/parse.ts` 或小型 `parse/<domain>.ts`                   | `parseXxx()` 将 unknown、JSON、字符串或序列化 DSL 校验为 IR                |
| Vanilla API authoring          | `normalize/<domain>/normalize.ts`、owner-local `types.ts`              | `normalizeXxx()` 无 compile context 地把 `InputXxx` 转为 IR                |
| 纵向领域内部解析               | `resolve/<domain>/resolve.ts`、`types.ts`                              | `resolveXxx()` 消费 Source IR 与 context，产出 Canonical 或领域 Resolution |
| 扩展 contract                  | `contract/<capability>/types.ts`、`define.ts`、`index.ts`              | 只放 contract 类型与 `defineXxx()`                                         |
| 内置 provider 与 registry      | `providers/<capability>/definitions.ts`、`registry.ts`、`<builtin>.ts` | `registry.ts` 合并并诊断；`definitions.ts` 组装内置项                      |
| Compile / pipeline domain 阶段 | `compile/<domain>/lower.ts`、`layout.ts`、`emit.ts`                    | context 生命周期与调度留在 orchestration；领域解析回 `resolve/`            |
| Shared vocabulary              | `shared/<topic>/{constants,types,utils,index}.ts`                      | 小型 topic 使用单文件                                                      |
| React DSL                      | `kernel/{components,protocol,adapter,runtime}`、`sugar/`、`render/`    | 公共组件文件使用 PascalCase，其余文件遵循通用形式                          |

不得为了套用本表而新建占位目录、泛化 `helpers.ts` 或纯转发 shim。

## 按语义阶段命名符号

| 概念                            | 必须使用的名称                                                         | Owner                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 持久化 IR schema 与类型         | `XxxSchema`、`IRXxx`                                                   | `schemas/`；允许省略默认字段的 Source 用 `z.input`，解析结果用 `z.output` / `z.infer`                      |
| 可复用 IR shape                 | `XxxBaseSchema`                                                        | `schemas/`；仅在实际复用或分阶段 refinement 时使用                                                         |
| Vanilla authoring input         | `InputXxx`                                                             | 仅 Vanilla / Plot Vanilla；只写 TypeScript                                                                 |
| 完整的内部确定形态              | 通常使用 `CanonicalXxx`                                                | 纵向领域 `resolve/<domain>/types.ts`；没有 Zod schema，不持久化                                            |
| resolver 窄上下文               | `XxxResolveContext`                                                    | 纵向领域 `resolve/<domain>/types.ts`；由 pipeline / compile 按当前阶段提供                                 |
| cascade / 继承后的有效值        | `EffectiveXxx`                                                         | 使用准确领域名，不得使用泛化的 `ResolvedXxx`                                                               |
| 携带附加解析信息的结果          | `XxxResolution`                                                        | 仅在同时需要 value、provider、provenance 或 diagnostics 时使用                                             |
| 扩展 contract 与作者输入        | `XxxDefinition`、`XxxDefinitionInput`、`AnyXxxDefinition`、`defineXxx` | `contract/`；Definition input 不是 Vanilla Input                                                           |
| Const object enum 与取值 union  | `Xxx`、`XxxValue`                                                      | object 用单数 PascalCase、成员用 PascalCase，并以 `ValueOf` 派生；不得使用 TypeScript `enum` 或 `XxxEnum`  |
| 内置集合 / lookup               | `BUILTIN_XXXS`、`BUILTIN_XXX_DEFINITIONS_BY_<KEY>`                     | `providers/`；`<KEY>` 是实际 discriminator                                                                 |
| Registry 合并 / 直接索引 helper | `resolveXxxRegistry`、`xxxDefinitionOf`                                | `providers/`；直接索引 helper 不处理领域 fallback 或上下文优先级                                           |
| 外部 parse                      | `parseXxx`                                                             | 只从 `unknown` 转为 `IRXxx`                                                                                |
| Vanilla authoring 组装          | `normalizeXxx`                                                         | 只在 Vanilla API 包中从 `InputXxx` 转为 `IRXxx`                                                            |
| Domain 数据结构确定化           | `resolveXxx`                                                           | 纵向领域中从 `IRXxx + XxxResolveContext` 产出 Canonical / Resolution；不得 parse unknown 或 emit primitive |
| 语义 lowering / 输出            | `lowerXxx`、`layoutXxx`、`emitXxx`、`collectXxx`                       | 遵循对应 compile 或 pipeline 阶段                                                                          |

顶层实体 discriminator 使用 `type`，内部 variant 使用 `kind`，命名 provider 使用 `name`。同一 discriminator 必须在 schema、contract、provider index、lookup、diagnostics 与 docs 中保持一致。
