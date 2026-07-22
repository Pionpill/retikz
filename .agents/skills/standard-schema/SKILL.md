---
name: standard-schema
description: Use when changing retikz Zod/IR schema code, schema-derived public types, schema field ordering, schema validation/refinement, schema JSDoc/describe text, schema registry docs, or tests that assert schema behavior in core, plot, adapters, docs, or tests.
---

# Standard Schema

retikz schema 是 IR 契约的单一真源：字段、默认语义、JSON 可序列化边界、派生 TS 类型和文档 API 表都应从 schema 出发。改 schema 前先确认这是 IR 层契约，不是 provider / compile / adapter 的运行时能力。

## 核心准则

- IR 必须 100% JSON 可序列化，不接收函数、ReactNode、class 实例或 renderer 专属对象。
- 公开 IR 数据类型用 `z.infer<typeof XxxSchema>` 派生，不手写平行 interface。
- schema 负责输入契约和跨字段语义校验；provider / compile / lowering 负责查 registry、运行时能力、emit 和 renderer 策略。
- 闭合对象 schema 优先用 `z.strictObject({...})`；不要新增 `z.object({...}).strict()`，除非已有链式组合无法直接表达。
- 字段级约束写在字段 schema 上；跨字段、跨 kind 规则放最终 schema 的 `.superRefine(...)`。
- schema 改动影响公开 IR / DSL / docs demo 时，同步 docs、schema registry、测试和示例。
- 修改或审阅 Zod schema 时，扫描受影响 workspace 与关联 docs demo 中当前安装版本标记为 `@deprecated` 的 API；替换前确认输入契约不变。Zod 4 的 `z.number()` 默认拒绝无穷值，不使用无行为差异的 `.finite()`。

## 文件分层

| 文件                                | 职责                                                          |
| ----------------------------------- | ------------------------------------------------------------- |
| `schemas/<capability>/constants.ts` | 本 schema 私有 const object enum、关键字常量                  |
| `schemas/<capability>/schema.ts`    | Zod schema、`.describe(...)`、必要 refinement                 |
| `schemas/<capability>/types.ts`     | 由 schema / const object 派生的 TS 类型                       |
| `shared/`                           | 跨 schema / contract / providers / compile 复用的词汇与纯工具 |

不要把 IR schema 放到 `contract` / `providers` / `compile`。新增 shared 内容先读 `standard-shared`。

## 命名

| 格式            | 用途                                                               |
| --------------- | ------------------------------------------------------------------ |
| `XxxSchema`     | 完整契约 schema                                                    |
| `XxxBaseSchema` | 可复用字段契约；用于 default schema、kind schema 或最终 refinement |
| `IRXxx`         | 由 IR schema object 派生的公开 JSON 数据类型                       |
| `XxxValue`      | 由 const object enum + `ValueOf` 派生的取值 union，不加 `IR`       |
| `XxxInput`      | 只有输入形态确实不同于存储形态时使用                               |

## LLM 友好契约

- 字段名语义化，避免 `t`、`v`、`mode2` 等需要额外解释的缩写。
- `type` / `kind` 值短、稳定、区分度大；同一 union 内不要出现易混判别名。
- 字段结构优先于长说明。能用字段名、discriminator、union 拆分表达清楚的，不靠长 `.describe(...)` 补救。
- 开放式自定义字段要说明边界：provider name、custom kind，还是普通 string。
- 同一概念在不同 schema 中保持同名同义。

## 对象字段顺序

- 顶层实体判别字段用 `type`，内部子变体用 `kind`，且放对象最前面。
- 共享 shape spread 紧跟判别字段；无判别字段时，spread 放对象开头。
- 模块自有字段放在 spread 之后，按语义分组排列。

这样写能让 discriminator 一眼可见，也避免共享 shape 在后面覆盖显式字段。

## BaseSchema 与 refinement

优先把字段契约集中在 `XxxBaseSchema`，跨字段 / 跨 kind 语义放最终 `XxxSchema.superRefine(...)`。

同一概念出现多个同前缀一级字段时，优先收敛成一个对象字段；对象子字段用命名 schema/type 承载，并通过 `shape` spread、`.extend()` 或对象 spread 复用，不重复声明同一份字段 shape。

适用场景：

- 大部分字段共享，只是不同 `kind` / 模式有组合约束。
- 需要给 default schema、kind provider、docs registry 或测试复用同一份 base shape。
- 校验逻辑是跨字段的，例如互斥、某 kind 必填某字段、某字段只在某 kind 合法。

边界：

- 字段差异很大且判别闭合时，优先 `z.discriminatedUnion(...)`。
- 简单字段约束不要放进 `superRefine`。
- `superRefine` 变长时拆命名函数。
- `BaseSchema` 只有在确实复用或需要分层 refinement 时才命名。

## Union 拆分

- `z.union([...])` 中复杂 object 先命名成 `XxxYyySchema`，再引用。
- 带 `kind` 判别、字段较多、需要独立 `.describe(...)` 或后续复用的对象都应拆出稳定名字。
- 简单字面量、数字、字符串或一行小 schema 可直接放在 union 中。

## describe 与 JSDoc

- schema 字段 `.describe(...)` 用英文，面向 LLM / schema registry 说明 IR 契约。
- `.describe(...)` 保持短而准确：字段含义、允许值 / custom 扩展、默认语义、compile/runtime 边界。
- 避免重复 `.min()` / `.optional()` 等 schema 已表达的约束。
- 对 discriminator 字段，说明它是 discriminator 以及该值对应的变体语义。
- 对 provider 名称、custom key、fallback 策略，明确“可自定义”与“未注册在 compile/lowering 期处理”的边界。
- 不写实现故事、历史背景、ADR、renderer 细节或长示例。
- `schemas/**/schema.ts` 不写 JSDoc；schema 与字段的契约说明统一使用英文 `.describe(...)`。`types.ts`、`constants.ts` 的导出类型、非 schema 常量和重要 helper 默认写中文 JSDoc，纯推断 / 重命名别名（如 `ValueOf`、`z.infer`）可省略。
- 整体 JSDoc 写功能视角：让读者先知道函数、类、类型负责什么，不从实现过程、内部步骤或历史背景开头。
- 细节 JSDoc 可说明实现细节，但仍从功能目的出发简短描述；不要复述代码逐行做了什么。
- `@description` 写主语义和契约边界；`@remarks` 只写设计理由或非主路径补充；字段默认值写 `@default`，tag 值不加 Markdown 反引号；默认缺省为 undefined 时不要写。
- 不在 JSDoc / describe / 测试标题里引用 ADR、alpha/beta 历史阶段或临时过程描述。

## Refinement 与 vocabulary

- refinement 错误 `path` 指向用户应修改的具体字段；message 写当前契约，不写实现细节。
- 闭合枚举字段用 `z.enum(ConstObject)` 或 `z.literal(Const.Member)`，不用 `z.nativeEnum`。
- 开放式 provider 名称只校验 JSON 形态和非空字符串；是否注册通常在 compile / lowering 阶段 fail-loud。
- 消费 shared / schema vocabulary 时使用 const object enum 成员，不写裸字符串；只有输入样例、错误负例和文档说明可以保留字符串字面量。
- 不要从当前 schema 模块转手 export shared vocabulary；消费方直接从 shared barrel 导入。

## 改代码前检查

1. 这是 IR 契约，还是 provider / compile / adapter 行为？
2. 是否需要开放给用户自定义？如果是，先读 `standard-structure`，再读 contract / providers / pipeline 对应 skill。
3. 字段名、判别字段和值是否 LLM 友好？
4. `.describe(...)` 是否短而准确，且没有上下文膨胀？
5. 对象字段顺序、shared spread、union 拆分是否符合规则？
6. 是否能用 `BaseSchema + superRefine` 避免重复 object？
7. schema 改动是否需要同步 `types.ts`、docs、schema registry 和测试？
