---
name: standard-contract
description: Use when changing retikz contract layer code, XxxDefinition types, defineXxx helpers, DefinitionInput/AnyDefinition types, registry discriminators, extension contracts, author-facing capability APIs, or definition context naming.
---

# Standard Contract

`contract/` 是能力契约层：声明第三方作者和内置 provider 共同实现的抽象能力。它可以依赖 `shared` 和 `schemas`，不依赖具体 provider、pipeline 或 compile 实现。

## 职责

- 定义 `XxxDefinition`、必要的 `XxxDefinitionInput`、`AnyXxxDefinition`。
- 提供作者侧入口 `defineXxx()`。
- 定义能力函数 context：`XxxResolveContext`、`XxxEmitContext`、`XxxCompileContext` 等。
- 放能力无关、无具体内置绑定的 helper。

不放内置 definition、registry 合并 / 诊断、pipeline / compile 状态或 IR schema 本身。

## 组织与命名

| 形态 | 规则 |
| --- | --- |
| `contract/<capability>/types.ts` | definition、input、context、抽象协议类型 |
| `contract/<capability>/define.ts` | `defineXxx()` 和必要的作者侧规范化 |
| `contract/<capability>/index.ts` | barrel 导出 |
| `XxxDefinition` | registry 存储和消费的能力契约，不代表 IR 节点 |
| `XxxDefinitionInput` | 仅当作者侧输入不同于存储契约时使用 |
| `AnyXxxDefinition` | 擦除泛型后的异构 definition，不表示任意 JSON |

`defineXxx()` 即使暂时只是 typed identity，也保留为稳定 contract hook；不要写成 `@todo`。

## Discriminator

- `type`：顶层领域实体或 plot 主判别。
- `kind`：能力内部子变体或操作变体。
- `name`：命名 provider，如 shape / boundary / arrow / pattern / path generator。

同一能力内只选一个 key 字段；definition、schema、provider map、extract helper 和错误信息都跟它对齐。

## JSDoc

- 默认写 JSDoc：definition 类型、helper、context、capability 字段和重要内部宽类型都要说明；纯推断 / 重命名别名可省略。
- `@description` 写主语义、生命周期、跨字段规则、回调协议或 registry 消费契约。
- `@remarks` 只写设计理由、typed identity / future hook 这类非主路径补充。
- 字段含义写到字段 JSDoc；可省略字段有默认行为时写 `@default`，tag 值直接写标识符或字面量，不加 Markdown 反引号。

## 改代码前检查

1. 这是抽象能力协议，还是某个内置 provider 实现？
2. contract 是否只依赖 `shared` / `schemas`？
3. key 字段是否全链路一致？
4. context 是否只暴露 definition 必须知道的能力，不泄漏 pipeline / compile 内部状态？
