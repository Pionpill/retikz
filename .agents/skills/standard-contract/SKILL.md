---
name: standard-contract
description: Use when changing retikz contract layer code, XxxDefinition types, defineXxx helpers, DefinitionInput/AnyDefinition types, registry discriminators, extension contracts, author-facing capability APIs, or definition context naming.
---

# Standard Contract

`contract/` 是能力契约层：声明第三方作者和内置 provider 共同实现的抽象能力。它可以依赖 `shared` 和 `schemas`，但不依赖具体 provider、pipeline 或 compile 实现。

## 职责

- 定义 `XxxDefinition`、`XxxDefinitionInput`、`AnyXxxDefinition`。
- 提供作者侧入口 `defineXxx()`。
- 定义 definition 能力函数的 context，例如 `XxxResolveContext`、`XxxEmitContext`、`XxxCompileContext`。
- 放能力无关、无具体内置绑定的 helper。

不放：

- 内置 definition 数组和 provider 实现。
- registry 合并、保留名诊断、重复 key 诊断。
- pipeline / compile 状态。
- IR schema 本身。

## 文件结构

| 文件 | 职责 |
| --- | --- |
| `contract/<capability>/types.ts` | definition、input、context、抽象协议类型 |
| `contract/<capability>/define.ts` | `defineXxx()` 和必要的作者侧规范化 |
| `contract/<capability>/index.ts` | barrel 导出 |
| `contract/<capability>.ts` | 小能力可用单文件，但职责不变 |

core 多用目录结构；plot 既有目录结构也有单文件。新增代码先贴近同包相邻能力，但不要牺牲分层。

## 命名

| 格式 | 职能 |
| --- | --- |
| `XxxDefinition` | registry 存储和消费的能力契约，不代表 IR 节点 |
| `defineXxx()` | 作者侧 definition helper，返回 registry 可消费的 definition |
| `XxxDefinitionInput` | 作者侧输入不同于存储契约时使用 |
| `AnyXxxDefinition` | 擦除泛型后的异构 definition，不表示任意 JSON |
| `XxxResolveContext` / `XxxEmitContext` / `XxxCompileContext` | definition 能力函数上下文，后缀按生命周期动词命名 |

`defineXxx()` 如果当前只是 typed identity，也保留为稳定 contract hook；用 JSDoc `@remarks` 说明它为未来默认值归一、运行时校验或泛型收敛预留入口。

## Discriminator

- `type`：顶层领域实体或 plot 主判别，如 coordinate / scale / mark。
- `kind`：能力内部子变体或操作变体，如 transform / clip / path kind。
- `name`：命名 provider，如 shape / boundary / arrow / pattern / path generator。

同一能力内只选一个 key 字段；definition 类型、schema 字段、provider map、extract helper 和错误信息都跟它对齐。

## JSDoc

- 整体 JSDoc 写类型定位、生命周期、跨字段规则和回调协议。
- 字段含义写到字段 JSDoc，不要在整体说明里枚举字段。
- 可省略字段如果有默认值或默认行为，字段 JSDoc 必须写 `@default`。
- 不要把 typed identity helper 写成 `@todo`；这不是缺失实现。

## 改代码前检查

1. 这是抽象能力协议，还是某个内置 provider 的实现？
2. contract 是否只依赖 `shared` / `schemas`？
3. key 字段是 `type`、`kind` 还是 `name`？是否全链路一致？
4. 作者侧输入是否真的不同于存储契约？如果不是，不要新增 `XxxDefinitionInput`。
5. context 是否只暴露 definition 必须知道的能力，不泄漏 pipeline / compile 内部状态？
