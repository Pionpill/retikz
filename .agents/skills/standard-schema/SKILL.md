---
name: standard-schema
description: Use when changing retikz Zod/IR schema code, schema-derived public types, schema field ordering, schema validation/refinement, schema JSDoc/describe text, schema registry docs, or tests that assert schema behavior in core, plot, adapters, docs, or tests.
---

# Standard Schema

retikz schema 是 IR 契约的单一真源：字段、默认语义、JSON 可序列化边界、派生 TS 类型和文档 API 表都应从 schema 出发。改 schema 前先确认这是 IR 层契约，而不是 provider / compile / adapter 的运行时能力。

## 设计准则

- IR 必须 100% JSON 可序列化。schema 不接收函数、ReactNode、class 实例或 renderer 专属对象。
- zod schema 是单一真源；公开 IR 数据类型用 `z.infer<typeof XxxSchema>` 派生，不手写平行 interface。
- schema 负责输入契约和跨字段语义校验；provider / compile / lowering 负责运行时能力、查 registry、emit 和 renderer 策略。
- 字段级约束尽量写在字段 schema 上，例如 `.min()`、`.optional()`、`.describe()`；跨字段、跨 kind 规则放在最终 schema 的 `.superRefine(...)`。
- schema 改动影响公开 IR / DSL / docs demo 时，同步 docs、schema registry、测试和示例。

## 文件分层

- `schemas/<capability>/constants.ts`：const object enum、关键字常量。成员 JSDoc 用中文说明业务含义。
- `schemas/<capability>/schema.ts`：Zod schema、字段 `.describe(...)`、对象级 `.describe(...)`、必要 refinement。
- `schemas/<capability>/types.ts`：由 schema / const object 派生的 TS 类型；派生类型、非 schema 常量、函数、类用中文 JSDoc。
- `shared/`：只消费 shared 已有词汇和工具；新增 shared 内容先读 `standard-shared`。
- `contract` / `providers` / `compile`：不要反向放 IR schema；需要开放能力或调整分层时先读 `standard-structure`，再按需读 `standard-contract` / `standard-providers` / `standard-pipeline-compile`。

## 命名

| 格式 | 用途 |
| --- | --- |
| `XxxSchema` | 最终 schema，调用方应优先使用它验证完整契约 |
| `XxxBaseSchema` | 可复用字段契约；用于派生 default schema、kind-specific schema 或最终 refinement |
| `IRXxx` | 由 IR schema object `z.infer` 派生的公开 JSON 数据类型 |
| `XxxValue` | 由 const object enum + `ValueOf` 派生的取值 union，不加 `IR` |
| `XxxInput` | 只有输入形态确实不同于存储形态时使用 |

## LLM 友好契约

schema registry 会被 LLM 读取和生成，因此字段名、判别值和 `.describe(...)` 都以 LLM 友好为第一准则：低歧义、短上下文、高辨识度。

- 属性名尽量语义化。优先写 `boundaryPosition`、`placementOffset` 这类读名即可理解的字段，不写 `t`、`v`、`mode2` 这类需要额外解释的缩写。
- `type` / `kind` 值要短、稳定、区分度大。避免语义接近或需要上下文猜测的值；同一个 union 里不要出现容易混淆的判别名。
- 字段结构比长说明更重要。能通过字段名、判别字段、union 拆分表达清楚的，不靠 `.describe(...)` 长篇补救。
- 开放式自定义字段要明确边界，例如说明是 provider name、custom kind，还是普通 string；避免 LLM 把任意文本当作内置枚举。
- 避免一字母字段和过度缩写，除非它是领域公认符号且 schema 上下文非常明确；否则宁可字段名稍长。
- 同一概念在不同 schema 中保持同名同义；不要一处叫 `side`、一处叫 `direction`、一处叫 `position` 却表达同一件事。

## 对象字段顺序

- `type` / `kind` 等判别字段放对象最前面；顶层实体用 `type`，内部子变体用 `kind`。
- 共享 shape spread 紧跟判别字段；无判别字段时，spread 放对象开头。
- 模块自有字段放在 spread 之后，按语义分组排列。
- 这样写是为了让 discriminator 一眼可见，并避免共享 shape 放在后面悄悄覆盖当前 schema 的显式字段。

示例：

```ts
export const PathBaseSchema = z.object({
  type: z.literal('path').describe('Discriminator marking this child as a path.'),
  ...DrawableInstanceSchema.shape,
  ...DrawableStyleSchema.shape,
  kind: z.string().min(1).optional().describe('Path kind provider name.'),
});
```

## BaseSchema + superRefine

优先把字段契约集中在 `XxxBaseSchema`，把跨字段 / 跨 kind 的语义约束放到最终 `XxxSchema.superRefine(...)`。

适用场景：

- 大部分字段共享，只是不同 `kind` / 模式下有组合约束。
- 需要给 `XxxDefaultSchema`、kind provider、docs registry 或测试复用同一份 base shape。
- 校验逻辑是跨字段的，例如某 kind 必须有某字段、某字段只在某 kind 下合法、两个字段互斥。

边界：

- 字段差异很大且判别闭合时，优先 `z.discriminatedUnion(...)`。
- 简单字段约束不要放进 `superRefine`。
- `superRefine` 变长时拆成命名校验函数，例如 `validateStrokePath(path, ctx)` / `validateRibbonPath(path, ctx)`。
- `BaseSchema` 只有在确实复用或需要分层 refinement 时才命名；普通小 schema 不强行拆 base。

## Union 成员拆分

- `z.union([...])` 里不要直接塞复杂 object；对象成员超过少量字段、带 `kind` 判别、或有独立 `.describe(...)` 语义时，先命名成 `XxxYyySchema`，再在 union 中引用。
- 这样做能让 schema registry、测试、类型推导和后续复用都指向稳定名字，也避免 union 里嵌一大坨导致 LLM 难以定位具体变体。
- 简单字面量、数字、字符串或一行小 schema 可以直接放在 union 中。

示例：

```ts
export const RibbonWidthStopsSchema = z.object({
  kind: z.literal('stops').describe('Discriminator for stop-based width rules.'),
  stops: z.array(RibbonWidthStopSchema).min(2),
});

export const RibbonWidthProfileSchema = z.object({
  kind: z.literal('profile').describe('Discriminator for registered width profiles.'),
  name: z.string().min(1),
});

export const RibbonWidthSchema = z.union([
  z.number().nonnegative(),
  RibbonWidthStopsSchema,
  RibbonWidthProfileSchema,
]);
```

## describe 与 JSDoc

- schema 字段 `.describe(...)` 用英文，面向 LLM / schema registry 准确识别 IR 契约；它是必要的契约提示，不是普通注释。
- `.describe(...)` 保持简洁干练，包含必要信息即可，避免长篇解释导致 schema registry 上下文膨胀。
- `.describe(...)` 优先说明字段含义、允许值 / custom 扩展、默认语义、compile/runtime 边界；避免重复 schema 已表达的 `.min()` / `.optional()` 等约束。
- 对 `type` / `kind` 字段，describe 要说明它是 discriminator，并让 LLM 能判断该值对应的变体语义。
- 对开放式 provider 名称、custom key、fallback 策略，describe 要明确“可自定义”与“未注册在 compile/lowering 期处理”的边界。
- 不要在 describe 里写实现故事、历史背景、ADR、renderer 细节或长示例；这些会稀释 LLM 对字段契约的注意力。
- IR schema 文件里的 schema 常量一般不写 JSDoc；schema 说明统一看字段级 / 对象级 zod `.describe(...)`。
- `types.ts`、`constants.ts` 的派生类型和非 schema 常量用中文 JSDoc；不要连续写两条 `/** ... */` 叠在同一个导出前，保留最准确的一条。
- 不在 JSDoc / describe / 测试标题里引用 ADR、alpha/beta 历史阶段或临时过程描述。

## Refinement 写法

- 错误 `path` 指向用户应修改的具体字段。
- 错误 message 写当前契约，不写实现细节；能说明合法组合时直接说合法组合。
- 对闭合枚举字段，用 `z.enum(ConstObject)` 或 `z.literal(Const.Member)`，不用 `z.nativeEnum`。
- 对开放式 provider 名称，只校验 JSON 形态和非空字符串；是否注册通常在 compile / lowering 阶段 fail-loud。

## Vocabulary 使用准则

- 使用 const object enum 成员，不直接写裸字符串。消费 shared / schema vocabulary 时写 `WebSide.Top`、`WebAnchor.TopLeft`、`PathLineCap.Round` 这类枚举成员；只有 schema/parser 的用户输入样例、错误负例和文档说明可以保留字符串字面量。
- 避免无意义别名。不要为了局部语境把一个既有 vocabulary 原样包一层，例如不要写 `export const NodeLabelBoundarySide = WebSide`；schema 直接使用 `WebSide`，类型直接使用 `WebSideValue` 或对应输入类型。
- 禁止从当前模块 export 其它模块的内容。`schemas/<capability>/constants.ts` 只导出本模块自有 vocabulary；shared vocabulary 从 shared barrel 导入并直接使用，不要在 capability 模块或根 barrel 中用新名字转手导出。

## 改代码前检查

1. 这是 IR 契约，还是 provider / compile / adapter 行为？
2. 是否需要开放给用户自定义？如果是，先读 `standard-structure`，再按需读 `standard-contract` / `standard-providers`。
3. 字段名是否语义化，LLM 能否不看长说明就理解大意？
4. 判别字段是 `type` 还是 `kind`？值是否区分度足够，且放在对象最前面？
5. `.describe(...)` 是否短而准确，包含必要边界，没有上下文膨胀？
6. 共享 shape spread 是否紧跟判别字段或对象开头？
7. 是否能用 `BaseSchema + superRefine` 避免一大坨重复 object？
8. schema 改动是否需要同步 `types.ts`、docs、schema registry 和测试？
