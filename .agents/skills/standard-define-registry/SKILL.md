---
name: standard-define-registry
description: Use when changing retikz define-registry capability code, including Definition contracts, defineXxx helpers, providers, builtins, custom extension points, schema discriminators, registry options, naming, or file layout in core, plot, adapters, docs, or tests.
---

# Standard Define Registry

define-registry 是 retikz 扩展能力的标准形态。遇到可枚举但应开放的能力，先设计 `XxxDefinition` / `defineXxx()` / registry contract，再实现内置项；内置项和用户自定义项必须通过同一套注册、解析、消费逻辑。

## 设计准则

- 所有注册内容都是一等公民。内置只是随包提供的常用 definition；用户 definition 应能写自己的 key / kind / type，只要不和内置保留名冲突。
- 抽象和扩展性优先。不要用 switch、硬编码白名单、固定 union、私有 fallback 表达一个未来明显会扩展的能力；先问它是否应该成为 `XxxDefinition`。
- 内置与自定义同路。编译、lowering、renderer adapter 只能消费解析后的 registry，不应在消费侧重新判断“内置特殊情况”。
- schema 是输入契约，definition 是能力契约。IR schema 保持 JSON 可序列化；函数、解析器、emit / compile 行为放在 definition/provider 层。
- fallback 是策略，不是旁路。像 boundary provider 优先、shape fallback 其次这类规则，应写在 registry/resolve 阶段，并允许自定义 definition 参与同一优先级模型。

## 文件结构

- `contract/<capability>/` 或 `contract/<capability>.ts`：公共能力契约，放 `XxxDefinition`、可选 `XxxDefinitionInput` / `AnyXxxDefinition`、`defineXxx()`、context、helper。不放内置数组，不放 IR schema。
- `providers/<capability>/`：内置 definition、provider name、registry 解析、重复 key / 保留 key 诊断、by-key map。
- `schemas/<capability>/`：JSON IR schema、const object、literal union、schema registry 描述。不放运行时函数。
- `compile` / `pipeline` / `lowering` / adapter：接收 option，解析 registry，消费 definition；不要复制内置白名单。
- docs / tests：用同一套术语描述内置和自定义，不把自定义写成补丁能力。
- core 现有能力多用 `contract/<capability>/types.ts` + `define.ts`；plot 既有 `contract/<capability>.ts`，也有 `contract/<capability>/types.ts` + `define.ts`。新增代码先贴近同包相邻能力，但职责分层不变。

## 命名规则

| 格式 | 对应文件 | 职能 |
| --- | --- | --- |
| `XxxDefinition` | `contract/<capability>/types.ts`、`contract/<capability>.ts` | registry 存储和消费的能力契约，不代表 IR 节点。 |
| `defineXxx()` | `contract/<capability>/define.ts`、`contract/<capability>.ts` | 作者侧定义入口，返回 registry 可消费的 definition。 |
| `XxxDefinitionInput` | 同 `defineXxx()` | 只在作者侧输入不同于存储契约时使用，例如补默认值、擦除泛型、收敛 schema。 |
| `AnyXxxDefinition` | 同 `XxxDefinition` | 擦除泛型后的异构 definition，常见于 plot generic registry；不要表示任意 JSON 或任意用户输入。 |
| `XxxResolveContext` / `XxxEmitContext` / `XxxCompileContext` | `contract` | definition 能力函数上下文，后缀按生命周期动词命名。 |
| `BUILTIN_XXXS` | `providers/<capability>/registry.ts` 或 `providers/<capability>/definitions.ts` | 内置 definition 数组或集合，例如 `BUILTIN_CLIPS`、`BUILTIN_TRANSFORMS`。 |
| `BUILTIN_XXX_DEFINITIONS_BY_<KEY>` | `providers/<capability>/registry.ts` 或 `definitions.ts` | 按 `TYPE` / `KIND` / `NAME` 建索引 map，例如 `BUILTIN_COORDINATE_DEFINITIONS_BY_TYPE`；不替代内置数组。 |
| `RESERVED_XXX_<KEYS>` / `REMOVED_XXX_<KEYS>` | `providers` 或 `schemas` 中最靠近诊断逻辑的位置 | 保留名和已移除名诊断，后缀必须匹配真实 discriminator。 |
| `resolveXxxRegistry()` / `xxxDefinitionOf()` / `extractXxxType|Kind|Name()` | `providers/<capability>/registry.ts` | 合并内置和用户 definition、按 key 查询、从 IR 或 option 抽取 key。 |
| `PlotXxx` / `BuiltinXxx` / `XxxKeyword` | `schemas/<capability>/constants.ts` | schema const object。plot 公共 IR 判别用 `PlotXxx`；core 内置 schema literal 才用 `BuiltinXxx`；语义关键字用 `XxxKeyword`。 |
| core `<capability>s`、plot `xxxDefinitions` | core `compile/compile.ts`、plot `pipeline/expand.ts` 或相邻 option 定义 | 用户传入自定义 definition 的公开 option。 |

新代码不要用裸 `Xxx` 表示内置 registry；旧版 `Boundary` 这类裸名只能作为反例参考。

## Discriminator 与 Option

- `type`：顶层领域实体或 plot 主判别，如 coordinate / scale / mark。
- `kind`：能力内部子变体或操作变体，如 transform / clip / path kind。
- `name`：命名 provider，如 shape / boundary / arrow / pattern / path generator。
- 同一能力内只选一个 key 字段；key set、by-key map、extract helper、错误信息都跟它对齐。
- core compile options 用能力复数名：`shapes`、`boundaries`、`clips`、`arrows`、`patterns`、`pathGenerators`、`pathKinds`、`composites`。
- plot 新增 registry option 优先用 `xxxDefinitions`；既有 `coordinates` 是历史例外，除非保持同一能力兼容，否则不要复制。

## 使用这套准则的模块

- core：参考 `packages/kernel/core/src/contract/*`、`packages/kernel/core/src/providers/*`、`packages/kernel/core/src/schemas/*`、`packages/kernel/core/src/compile/compile.ts`。优先看 shape、boundary、clip、arrow、pattern、path-kind、composite 这些已经走 define-registry 的能力。
- plot：参考 `packages/graph/plot/src/contract/*`、`packages/graph/plot/src/providers/*`、`packages/graph/plot/src/schemas/*`、`packages/graph/plot/src/pipeline/expand.ts`。优先看 coordinate、scale、transform、mark、channel、field format、statistics / row selector 这些 registry 能力。
- 新模块：先选 core 或 plot 中语义最接近的一组作为 precedent；只继承准则和职责分层，不复制历史例外命名。

## 改代码前检查

1. 这个能力是否应开放给用户自定义？如果是，走 define-registry；不要先写内置-only 逻辑。
2. 内置项和用户项是否共享同一个 `defineXxx()`、registry resolver、消费路径？
3. key 字段是 `type`、`kind` 还是 `name`？是否允许自定义 key，并拒绝内置冲突？
4. 文件是否按 contract / providers / schemas / compile-lowering 分层？
5. 命名是否和同包相邻能力一致，并避免把历史裸名当 precedent？
