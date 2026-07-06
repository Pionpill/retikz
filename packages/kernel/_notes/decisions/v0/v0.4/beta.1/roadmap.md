# v0.4.0-beta.1 Roadmap: 编译期契约收敛

## 目标

beta.1 聚焦 v0.4 rc 前的编译期契约收敛：不新增 renderer primitive，不引入新的公开 DSL 语义，优先把已经存在但分散的底层规则写清楚，并用小步重构降低后续 path / text / compile 维护成本。

本 milestone 的主题是：

- compile 文件结构范式进入 Accepted，用于指导后续不改变行为的内部重构。
- 后续 compile 重构必须保持公开 API、IR schema 和 Scene 输出不变。

## 决策列表

| ADR | 状态 | 主题 | 说明 |
| --- | --- | --- | --- |
| [ADR-01](./01-compile-structure-convention.md) | Accepted | Compile structure convention | 规定 compile 的文件结构、阶段职责和后续小步重构边界，并以 `path/stroke` 文件布局迁移作为首个落地点。 |

## 范围

本 milestone 允许：

- 不改变公开行为的 compile 内部结构整理。
- 将 compile 中可复用的纯 helper 按分层迁往 `core/src/shared` 或 `@retikz/math`。
- 将不依赖 compile runtime 的 authoring sugar 迁往 `core/src/parsers`。
- 补充等价性测试和回归测试。

不在本 milestone 范围：

- 新增或修改公开 IR schema 字段。
- 新增 React / Vanilla DSL props。
- 修改 renderer primitive 类型。
- 新增 path kind、ribbon mode、node shape 或文本语义。

## 验收清单

- [x] ADR-01 经 review 后定稿。
- [x] ADR-01 若进入实现，所有小步重构均保持 compile 行为等价。
- [x] 受影响包 lint、typecheck 和相关测试通过。
