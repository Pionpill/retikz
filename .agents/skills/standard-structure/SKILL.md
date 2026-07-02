---
name: standard-structure
description: Use when changing retikz package file layout, dependency direction, layer placement, common constants/types/utils/index file organization, or deciding which standard layer skill to load.
---

# Standard Structure

retikz 模块按“shared → schemas → contract → providers → pipeline/compile”分层；core 另有 `parsers/` 作为 Sugar / DSL 到 IR 的必要入口。本 skill 只做总纲和路由；不要一次加载所有子 skill。

## 按需加载

| 改动内容 | 读取 |
| --- | --- |
| `shared/`、通用词汇、纯函数、无状态映射、工具类型 | `standard-shared` |
| `schemas/`、Zod schema、IR 类型、`.describe(...)`、`.superRefine(...)` | `standard-schema` |
| `contract/`、`XxxDefinition`、`defineXxx()`、作者侧 API、context | `standard-contract` |
| `providers/`、内置 definition、registry resolver、`BUILTIN_*`、保留名诊断 | `standard-providers` |
| `pipeline/` / `compile/`、lowering、registry 消费、options、`ResolvedXxx` | `standard-pipeline-compile` |
| `parsers/`、字符串 / DSL / Sugar shorthand 解析为 IR 节点或片段 | 本 skill；若改变 IR 形态再读 `standard-schema` |

define-registry 能力通常跨多层：先读本总纲判断 scope，再只加载本次会改到的层级 skill。

## 依赖方向

允许依赖方向：

```text
shared <- schemas <- contract <- providers <- pipeline/compile
shared/schemas <- parsers
```

右侧消费左侧；左侧不反向读取右侧。`parsers/` 是入 IR 前的纯函数旁路，只依赖 `shared` / `schemas`，输出 IR 节点或片段，供 adapter / Sugar 复用；不得依赖 `compile`、`providers` 或运行时 registry。跨层复用的纯函数优先下沉到 `shared`，IR 契约回 `schemas`，作者协议回 `contract`，内置实现回 `providers`，编排消费留在 `pipeline/compile`，字符串 / DSL shorthand 归 `parsers`。

## 共性文件

| 文件 | 职责 |
| --- | --- |
| `constants.ts` | 稳定常量、const object enum、关键字集合、查表数据 |
| `types.ts` | 导出类型、由 constants / schema 派生的类型 |
| `utils.ts` | 纯函数 helper；不得承载状态和层级副作用 |
| `define.ts` | 作者侧 define helper；contract 层常见 |
| `registry.ts` | registry 合并、按 key 查找、重复 key 诊断；providers 层常见 |
| `index.ts` | barrel 导出；不写业务逻辑 |

简单能力可合并文件；一旦职责混杂，按上表拆开。

## 导入导出

- 目录级 `index.ts` 导出当前目录稳定 API；默认 `export *`，需要裁剪公共面或避免冲突时才精选导出。
- 消费方从拥有者 barrel 导入；不要从非拥有者模块转手 export 其它层内容。
- 跨 owner 导入必须走目标 owner 的目录 barrel；带独立 barrel 的稳定子域可作为二级 owner（如 `shared/geometry`）；同 owner 内部可相邻导入，不从其它 owner deep import 到子文件。
- 尽量避免 import / export `as` 重命名；命名冲突优先在定义源头改成准确名称，或由 owner barrel 调整公共面。
- 主题内部可相邻导入；模块外避免 deep import 到 `constants.ts` / `schema.ts` 等私有文件。

## 改代码前检查

1. 改动属于哪一层？是否只加载了必要 skill？
2. import 是否沿允许依赖方向走？
3. 新文件是否职责单一，必要时按共性文件拆分？
4. barrel 是否只导出稳定 API，没有业务逻辑？
