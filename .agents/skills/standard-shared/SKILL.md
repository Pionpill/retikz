---
name: standard-shared
description: Use when changing retikz shared layer code, dependency-free vocabulary, anchor/side helpers, pure shared utilities, mapping tables, shared ValueOf/AssertEqual-style types, or imports that should route through shared.
---

# Standard Shared

`shared/` 是无依赖共享层，承载跨 schemas / contract / providers / pipeline / compile 复用的稳定词汇、纯函数、映射和工具类型。

进入 `shared/` 的内容必须已有明确的跨 owner 或跨层复用；单一 owner 专用内容留在 owner 内，预期未来可能复用不构成 shared 所有权。

## 放什么

- 跨层复用且不含领域语义的纯函数：`parseXxx()`、`isXxx()`、原子值转换。Vanilla authoring `normalizeXxx` 与 Core / Plot `resolveXxx` 都留在各自 owner，不因同名而上移。
- 不属于单个 IR schema 的通用 vocabulary：anchor / side 等。
- 无状态映射、索引和查表数据。
- 通用类型工具：`ValueOf`、`AssertEqual` 等。

不要放具体 IR schema 私有常量、provider definition、compile 状态、renderer primitive、业务 registry，也不要依赖 `schemas` 及以上层。

## 组织

- 主题复杂时用 `shared/<topic>/{constants,types,utils,index}.ts`。
- 简单工具可保留单文件，如 `shared/types.ts`、`shared/position.ts`。
- 模块外只从 shared barrel 或稳定子域 barrel 导入，例如 `../shared`、`../../shared`、`../../shared/geometry` 或包公开入口；主题内部文件可相邻导入。

## Vocabulary

- const object enum 用单数 PascalCase，成员 key 用 PascalCase，值保持用户 / IR 使用的字符串。
- 派生类型命名 `XxxValue`。`InputXxx` 专指 Vanilla authoring API，不在 shared 建立平行领域契约。
- 消费 shared vocabulary 时使用枚举成员，不写裸字符串。
- 避免无意义别名，例如不要把 `WebSide` 原样包成 `NodeLabelBoundarySide`。

## JSDoc

- `const` 变量默认写中文 JSDoc；只有特别简单、局部且名称已完整表达语义的常量可以省略。
- 导出的 const object enum、映射表、关键字集合及其有契约语义的成员或属性必须逐项说明。

## 改代码前检查

1. 逻辑是否无业务依赖、无状态、可被多层消费？
2. 它是通用 vocabulary，还是某个 IR schema 私有常量？
3. 是否需要补 shared barrel，避免外部 deep import？
4. 是否引入了 schema / provider / compile 类型？如果是，它不该在 shared。
