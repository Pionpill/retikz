# Standard Contract

`contract/` 是能力契约层：声明第三方作者和内置 provider 共同实现的抽象能力。它可以依赖 `shared` 和 `schemas`，不依赖具体 provider、pipeline 或 compile 实现。

## 职责

- 定义 `XxxDefinition`、必要的 `XxxDefinitionInput`、`AnyXxxDefinition`。
- 提供作者侧入口 `defineXxx()`。
- 定义能力函数 context：`XxxResolveContext`、`XxxEmitContext`、`XxxCompileContext` 等。
- 放能力无关、无具体内置绑定的 helper。

不放内置 definition、registry 合并 / 诊断、pipeline / compile 状态或 IR schema 本身。

## 组织与命名

目录、文件和符号名以 `standard-name` 为唯一真源。`XxxDefinitionInput` 只在 Definition 作者侧输入不同于存储契约时定义，不能与 Vanilla 的 `InputXxx` 混用；擦除泛型的异构 definition 不是任意 JSON。

`defineXxx()` 即使暂时只是 typed identity，也保留为稳定 contract hook；不要写成 `@todo`。

## Discriminator

- `type`：顶层领域实体或 plot 主判别。
- `kind`：能力内部子变体或操作变体。
- `name`：命名 provider，如 shape / boundary / arrow / pattern / path generator。

同一能力内只选一个 key 字段；definition、schema、provider map、extract helper 和错误信息都跟它对齐。

## 注释

公开能力注释按 [公共 JSDoc](../../docs-doc-reference/references/jsdoc.md)，字段重点说明生命周期、跨字段行为与回调协议。
