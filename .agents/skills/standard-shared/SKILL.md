---
name: standard-shared
description: Use when changing retikz shared layer code, dependency-free vocabulary, anchor/side helpers, pure shared utilities, mapping tables, shared ValueOf/AssertEqual-style types, or imports that should route through shared.
---

# Standard Shared

`shared/` 是无依赖共享层，只能被其它层消费。它承载跨 schema / contract / providers / pipeline / compile 的稳定词汇、纯函数、映射和工具类型。

## 放什么

- 跨层复用的纯函数，例如 `normalizeXxx()`、`parseXxx()`、`isXxx()`。
- 不属于单个 IR schema 的通用 vocabulary，例如 anchor / side。
- 无状态映射和索引，例如 `Record<CompassAnchorValue, WebAnchorValue>`。
- 通用类型工具，例如 `ValueOf`、`AssertEqual`。

不要放：

- 具体 IR schema 私有的 const object enum、schema 派生类型。
- provider definition、compile 状态、renderer primitive、业务 registry。
- 依赖 `schemas` / `contract` / `providers` / `pipeline` / `compile` 的代码。

## 主题目录

当一个 shared 主题同时包含词汇、类型、查表数据和函数时，拆成目录：

| 文件 | 职责 |
| --- | --- |
| `shared/<topic>/constants.ts` | const object enum、稳定字面量词汇、数组索引、`Map`、`Record<A, B>` 查表数据 |
| `shared/<topic>/types.ts` | 由常量派生的 `XxxValue` / `XxxInput` 类型 |
| `shared/<topic>/utils.ts` | 纯函数，通常只做 normalize / parse / classify |
| `shared/<topic>/index.ts` | 只做本主题 barrel 导出 |

简单工具可以直接放 `shared/types.ts`、`shared/position.ts` 这类单文件。

## 导入与导出

- 模块外只从包级 shared barrel 导入，例如 `../shared`、`../../shared` 或 `@retikz/core`。
- 不要从 `shared/<topic>/constants` 这类子文件 deep import。主题内部文件之间可以相邻导入。
- `shared/index.ts` 用 barrel 汇总对外共享面。
- 禁止从非 shared 模块转手 export shared 内容；消费方直接从 shared barrel 导入。

## Vocabulary 规则

- const object enum 用单数 PascalCase，例如 `WebAnchor`、`CompassSide`。
- 成员 key 用 PascalCase，值保持用户/IR 使用的字符串。
- 派生类型命名为 `XxxValue`；兼容多风格输入时命名为 `XxxInput`。
- 消费 shared vocabulary 时使用枚举成员，例如 `WebAnchor.Top`、`WebSide.Top`，不要写裸字符串。
- 避免无意义别名，不要写 `export const NodeLabelBoundarySide = WebSide`。

## 改代码前检查

1. 这段逻辑是否无业务依赖、无状态、可被多层消费？
2. 它是否属于通用 vocabulary，而不是某个具体 IR schema 私有常量？
3. 是否需要从子文件导入？如果是，优先补 shared barrel。
4. 是否引入了 schema / provider / compile 类型？如果是，说明它不该在 shared。
