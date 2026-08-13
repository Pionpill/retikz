---
name: standard-normalize
description: Use when changing Retikz Vanilla or Plot Vanilla authoring normalization, or Core / Plot Source IR to Canonical normalization, including normalizeXxx behavior, shorthand expansion, canonical defaults, semantic validation, and domain-value conversion.
---

# Standard Normalize

`normalize/` 有两个由 owner 分开的调度位置。两者都将同义写法收敛为下游唯一形态，但输入、输出和职责不同；不得为此建立跨包的泛化 normalize 层。

```text
Vanilla / Plot Vanilla
Input (`InputXxx`) -> normalizeXxx -> Source IR (`IRXxx`)

Core / Plot
Source IR (`IRXxx`) -> compile resolveXxx（准备 NormalizeContext）
                   -> normalizeXxx(IRXxx, NormalizeContext) -> Canonical (`CanonicalXxx`)
                                                               -> lower / emit
```

Core / Plot 的 `normalizeXxx` 由 `compile/<domain>/resolve.ts` 调度。`resolve.ts` 负责准备 registry、引用、host、data 等编译 context；`normalize/` 负责以该明确 context 生成 Canonical，不能把同一默认、校验或值转换复制到 resolve、lower 或 emit。

## 两种 normalize 的职责

| Owner                  | 输入与输出                                 | 负责                                                                                                        | 不负责                                                                                     |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Vanilla / Plot Vanilla | `InputXxx -> IRXxx`                        | authoring shorthand 组装、稳定输入字段补齐、已类型化输入的组合校验                                          | `unknown` parse、IR 紧凑写法展开、领域默认、主题色、registry / host / data 解析、Canonical |
| Core / Plot            | `IRXxx + NormalizeContext -> CanonicalXxx` | 展开持久化 IR 的等价简写、补领域默认、语义与 canonical 不变量校验、颜色等领域值转换、theme 默认与主题色落值 | `unknown` parse、框架 Input / JSX、Scene primitive、lowering 或 renderer 输出              |

Source IR 是唯一可持久化的 JSON 契约，只有它使用 Zod schema。`InputXxx` 与 `CanonicalXxx` 都只写 TypeScript 类型且不持久化。

## 校验与转换边界

- `parseXxx` / schema 处理 `unknown`、JSON、字符串和序列化输入的形态校验；Core / Plot normalize 不重复做 `typeof`、对象结构探测或 schema parse
- 不得添加无意义校验：schema 已覆盖的字段约束、`IRXxx` / `InputXxx` 等明确 TypeScript 类型已保证的形态，不得在 normalize、resolve、lower 或 emit 重新检查或抛错
- Vanilla normalize 只校验已类型化 Input 中 TypeScript 无法表达、且 schema 尚未覆盖的 authoring 组合不变量。它不能把显式 `0`、`false`、空数组或 authoring 字段静默丢弃
- Core / Plot normalize 只校验 Source IR 到 Canonical 必需、且 schema 尚未覆盖的领域语义不变量，例如简写展开后或默认补齐后才出现的跨字段关系。校验后的内部流程只消费明确的 Canonical 类型
- Core / Plot normalize 负责 canonical 表示转换，例如颜色、长度、间距或其它领域值的同义形式收敛；同一转换不得在 lower、emit、adapter 或 renderer 再做一份
- 需要 registry、theme、data、host 或 reference 的规范化输入，由 `resolve.ts` 先准备为窄的 `NormalizeContext` 再传入。normalizer 不直接导入 compile、pipeline 或 provider registry
- theme 的 style、mode、默认颜色与 token 由 Core / Plot normalize 使用 context 确定。Vanilla 不复制领域主题默认逻辑

## 所有权与依赖

- Vanilla / Plot Vanilla `normalize/` 只依赖目标 domain 的公开 `schemas` / `IRXxx` 与 `shared`；不得依赖 `contract`、`providers`、`pipeline`、`compile`、runtime 或 renderer
- Core / Plot `normalize/` 只依赖本 domain 的 `schemas`、`shared` 与其窄 `NormalizeContext` 类型；compile 依赖它并提供 context。不得反向依赖 Vanilla、adapter、renderer 或框架生命周期
- `compile/<domain>/resolve.ts` 可以消费 provider registry、data、host 与引用，构造 `NormalizeContext` 并调度 Core / Plot `normalizeXxx`；不得重新实现 canonical 默认、校验或值转换
- React / framework adapter 只构建 Vanilla `InputXxx` 并调度 Vanilla normalize；不得绕过 Vanilla 直接构建不同的 Source IR

## 组织与命名

目录、文件和符号名以 `standard-name` 为唯一真源。两个 owner 的同名目录使用同一目录范式，但绝不共享业务实现：

| Owner                  | `normalize/<domain>/` 内容                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Vanilla / Plot Vanilla | `normalize.ts` 放 `InputXxx -> IRXxx` 的 `normalizeXxx`；`types.ts` 放 owner-local `InputXxx` 与私有输入 helper 类型                     |
| Core / Plot            | `normalize.ts` 放 `IRXxx + NormalizeContext -> CanonicalXxx` 的 `normalizeXxx`；`types.ts` 放 `CanonicalXxx` 与必要的 `NormalizeContext` |

小型 domain 保持相邻文件；只有出现独立概念、测试边界或多个调用点才拆 topic 文件。不要建泛化 `utils.ts`、空 `resolve.ts` 或为未来可能的转换预建目录。

## 与相邻阶段的区分

| 层 / 函数                          | 输入                           | 输出                                                 | 主要职责                                                               |
| ---------------------------------- | ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `parseXxx` / `parse/`              | `unknown`、字符串、序列化数据  | Source IR                                            | 外部输入形态校验与 parse                                               |
| `normalizeXxx` / Vanilla           | TypeScript `InputXxx`          | Source IR                                            | authoring 组装                                                         |
| `resolveXxx` / Core / Plot compile | Source IR + compile options    | `NormalizeContext`，或委托 normalizer 后的 Canonical | registry、引用、host、data 等 context 解析；调度 normalizer 而不复制它 |
| `normalizeXxx` / Core / Plot       | Source IR + `NormalizeContext` | Canonical                                            | 默认、语义校验、等价写法与领域值转换                                   |
| `lowerXxx` / pipeline              | Canonical                      | 下层 IR / command                                    | 语义 lowering                                                          |

若 compile 的顶层 `resolveXxx` 为便利而直接返回 Canonical，它仍必须委托 Core / Plot normalizer；Canonical 归属不因此转移到 `compile/`。不要新增无独立语义的 `ResolvedXxx`。

## 改代码前检查

1. 当前是 Vanilla `Input -> IR`，还是 Core / Plot `Source IR -> Canonical`？
2. `unknown` 校验是否仍只在 parse / schema 边界进行，且没有重复 schema 或 TypeScript 已保证的校验？
3. canonical 默认、仅在 Canonical 化后出现的跨字段不变量、颜色等领域值转换是否只在 Core / Plot normalize 中实现一次？
4. context 是否由 compile 显式准备为窄 `NormalizeContext`，而非由 normalizer 反向读取 registry 或 host？
5. 每种等价 Input / Source IR 是否都得到相同 Canonical，且保留显式 falsy 值？
6. 是否避免 adapter、resolve、lower、emit 或 renderer 重复实现 normalizer 的分支？
