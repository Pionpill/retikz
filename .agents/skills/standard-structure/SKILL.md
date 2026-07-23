---
name: standard-structure
description: Use when changing retikz package file layout, dependency direction, layer placement, common constants/types/utils/index file organization, or deciding which standard layer skill to load.
---

# Standard Structure

retikz 模块按“shared → schemas → contract → providers → pipeline/compile”分层；core 另有 `parsers/` 作为 Sugar / DSL 到 IR 的必要入口。本 skill 只做总纲和路由；不要一次加载所有子 skill。

## 入口类型

- 有命名类型且存在统一承载入口时，把类型写在入口处（如 `defineXxx<TParams>({...})`、builder 泛型、类泛型或构造入口），不要在其上下文回调、成员或内部参数上重复声明同一类型。

## 按需加载

| 改动内容                                                                  | 读取                                           |
| ------------------------------------------------------------------------- | ---------------------------------------------- |
| `shared/`、通用词汇、纯函数、无状态映射、工具类型                         | `standard-shared`                              |
| `schemas/`、Zod schema、IR 类型、`.describe(...)`、`.superRefine(...)`    | `standard-schema`                              |
| `contract/`、`XxxDefinition`、`defineXxx()`、作者侧 API、context          | `standard-contract`                            |
| `providers/`、内置 definition、registry resolver、`BUILTIN_*`、保留名诊断 | `standard-providers`                           |
| `pipeline/` / `compile/`、lowering、registry 消费、options、`ResolvedXxx` | `standard-pipeline-compile`                    |
| `parsers/`、字符串 / DSL / Sugar shorthand 解析为 IR 节点或片段           | 本 skill；若改变 IR 形态再读 `standard-schema` |

define-registry 能力通常跨多层：先读本总纲判断 scope，再只加载本次会改到的层级 skill。

## 依赖方向

允许依赖方向：

```text
shared <- schemas <- contract <- providers <- pipeline/compile
shared/schemas <- parsers
```

右侧消费左侧；左侧不反向读取右侧。`parsers/` 是入 IR 前的纯函数旁路，只依赖 `shared` / `schemas`，输出 IR 节点或片段，供 adapter / Sugar 复用；不得依赖 `compile`、`providers` 或运行时 registry。跨层复用的纯函数优先下沉到 `shared`，IR 契约回 `schemas`，作者协议回 `contract`，内置实现回 `providers`，编排消费留在 `pipeline/compile`，字符串 / DSL shorthand 归 `parsers`。

## JSDoc

- 中文注释和 JSDoc 的末句不写句号；多句内容只保留句间句号。
- 整体 JSDoc 写功能视角：让读者先知道函数、类、类型负责什么，不从实现过程、内部步骤或历史背景开头。
- 细节 JSDoc 可说明实现细节，但仍从功能目的出发简短描述；不要复述代码逐行做了什么。
- React / Vanilla 等面向开发者使用的公开 JSDoc，主要描述功能、使用契约、默认值和可观察行为；验收标准是用户能看懂怎么用，不写 builder / emit / Scene primitive / renderer 物化等实现细节，也不按 LLM 理解优化。

| 标签           | 用法                                           | 不写什么                              |
| -------------- | ---------------------------------------------- | ------------------------------------- |
| 主注释首句     | 写功能视角的一句话，说明负责什么               | 不写实现过程、内部步骤、历史背景      |
| `@description` | 写主语义、输入输出契约、跨字段行为             | 不写设计理由、复杂度、非主路径补充    |
| `@remarks`     | 写设计理由、非主路径补充、未来扩展钩子、复杂度 | 不复述代码逐行做了什么                |
| `@default`     | 只写非 undefined 默认值                        | 可选字段默认缺省为 undefined 时不要写 |

涉及算法选择、时间复杂度或空间复杂度时，用 `@remarks` 备注复杂度，不放进主 `@description`。

## 文件命名

- `packages/**` 下 `*.ts` / `*.js` / `*.tsx` 的 kebab-case 文件名通常组合 1–2 个语义词，确需时可用 3 个，禁止超过 3 个；`.test` / `.demo` / `.data` / 语言标记等工具后缀不计入词数。

## 共性文件

| 文件           | 职责                                                        |
| -------------- | ----------------------------------------------------------- |
| `constants.ts` | 稳定常量、const object enum、关键字集合、查表数据           |
| `types.ts`     | 导出类型、由 constants / schema 派生的类型                  |
| `utils.ts`     | 纯函数 helper；不得承载状态和层级副作用                     |
| `define.ts`    | 作者侧 define helper；contract 层常见                       |
| `registry.ts`  | registry 合并、按 key 查找、重复 key 诊断；providers 层常见 |
| `index.ts`     | barrel 导出；不写业务逻辑                                   |

简单能力可合并文件；一旦职责混杂，按上表拆开。

只有一个调用点、且没有独立契约或测试边界的短小 helper 保留在消费文件内；形成稳定概念、独立测试边界或多个消费方后再抽成文件或子域。

## React DSL 目录范式

`@retikz/react` 的 DSL 代码按 owner 拆分：

```text
kernel/
  components/  Kernel DSL 标记组件
  protocol/    displayName、水合事件、embeddable 等跨 owner 共享协议
  adapter/     JSX ↔ IR 转换逻辑：builder / unbuilder / 字段表
  runtime/     Layout 运行时、hydration 收集、renderer mode 接线
sugar/         同步展开为 Kernel 的 Sugar 组件，可再按 path / shapes 分组
render/        React 宿主渲染接线，可再按 svg / canvas / text 分组
```

- 用户可用 React 组件文件用 `PascalCase.tsx`；非组件纯逻辑用 `kebab-case.ts`。
- 内部 helper 用语义名，不用 `_xxx.ts`；例如 `fields.ts`、`display-names.ts`、`shape-helpers.ts`。
- 每个 owner 目录放 `index.ts` barrel，只导出当前 owner 的稳定 API。
- `kernel/components` 可以依赖 `kernel/protocol`，不得依赖 `adapter` / `runtime` / `render` / `sugar`。
- `kernel/adapter` 可以依赖 `kernel/components` 与 `kernel/protocol`，不得依赖 `kernel/runtime` 或 `sugar`。
- `kernel/runtime` 可以依赖 `kernel/adapter`、`kernel/protocol` 与 `render`；`sugar` 可以依赖 `kernel/components` 与 `kernel/protocol`，不得依赖 `kernel/runtime`；`render` 不依赖 `kernel/runtime`。

## 导入导出

- 目录级 `index.ts` 导出当前目录稳定 API；默认 `export *`，需要裁剪公共面或避免冲突时才精选导出。
- 包根 `index.ts` 默认用 `export *` 聚合允许公开的一级 owner barrel；一级 owner barrel 决定哪些子 owner 可以继续向上暴露。
- 不需要公开的模块不得进入向上 barrel；owner 内通过相邻路径或私有子 barrel 导入，不得为测试或复用便利转发到包根。
- 消费方从拥有者 barrel 导入；不要从非拥有者模块转手 export 其它层内容。
- 跨 owner 导入必须走目标 owner 的目录 barrel；带独立 barrel 的稳定子域可作为二级 owner（如 `shared/geometry`）；同 owner 内部可相邻导入，不从其它 owner deep import 到子文件。
- 同一文件中同 kind（type 或 value）且同 source 的 named import 必须合并为一条；type/value 因 lint 规则保持分离。
- 尽量避免 import / export `as` 重命名；命名冲突优先在定义源头改成准确名称，或由 owner barrel 调整公共面。
- 主题内部可相邻导入；模块外避免 deep import 到 `constants.ts` / `schema.ts` 等私有文件。

## 改代码前检查

1. 改动属于哪一层？是否只加载了必要 skill？
2. import 是否沿允许依赖方向走？
3. 新文件是否职责单一，必要时按共性文件拆分？
4. barrel 是否只导出稳定 API，没有业务逻辑？
