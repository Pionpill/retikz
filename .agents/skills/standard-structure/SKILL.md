---
name: standard-structure
description: Use when changing retikz package file layout, dependency direction, layer placement, common constants/types/utils/index file organization, or deciding which standard layer skill to load.
---

# Standard Structure

retikz 纵向领域包按“shared → schemas → contract → providers → resolve → pipeline/compile”分层；`resolve/` 持有 Canonical 类型，并统一处理 Source IR、当前 context、默认、优先级与领域值转换。pipeline / compile 创建和维护 context、决定依赖顺序并调度 resolver。只有 Vanilla API 包的 `normalize/` 把 authoring Input 组装为 Source IR；Core / Tier 2 的 `parse/` 处理 unknown、序列化数据或 DSL 到 Source IR。本 skill 只做总纲和路由；目录、文件和符号名遵循 `standard-name`。

## 包职能与数据边界

- 核心能力包（Core、Plot 等 domain owner）拥有 Source IR schema、domain resolver 的 `CanonicalXxx` 与 `IRXxx + XxxResolveContext -> CanonicalXxx / XxxResolution` 的 `resolveXxx`、registry 消费、lowering / compile 和 Scene 语义。不得维护框架通用 Input、DOM 或框架生命周期
- API 基础包（Vanilla、Plot Vanilla）拥有 TypeScript-only `InputXxx -> IRXxx` 的 `normalizeXxx`、共享 session / retained runtime 与 SSR 接线；不得重写 domain schema、resolve、lowering 或 Scene 语义
- 框架包（React、Plot React）把 JSX / props / lifecycle 调度为对应 Vanilla `InputXxx`；不得直接重建 Core / Plot IR builder、session 或 renderer 编排
- `normalizeXxx` 只存在于 Vanilla API 包并处理 `InputXxx -> IRXxx`；纵向领域包的 `resolveXxx` 消费 Source IR 与当前 context，统一产出 Canonical / Resolution。只有完全脱离领域且被多层复用的原子值转换才能进入 `shared`；`parseXxx` 只处理 `unknown` 边界

## 入口类型

- 有命名类型且存在统一承载入口时，把类型写在入口处（如 `defineXxx<TParams>({...})`、builder 泛型、类泛型或构造入口），不要在其上下文回调、成员或内部参数上重复声明同一类型。

## 类型信任与校验边界

- 内部调度按 TypeScript 类型契约设计，消费方通过明确的类型调用；不为纯 JavaScript 调度额外维护类型校验和错误分支，纯 JavaScript 调用由第三方自行负责校验
- JSON、持久化配置和其他类型不明确的数据，只在 parse / schema 边界完成一次 parse / 校验；Vanilla / adapter 的 `normalizeXxx` 只把已类型化的 `InputXxx` 组装为 Source IR，纵向领域 `resolveXxx` 再消费 context 唯一产出 Canonical / Resolution。进入内部实现后必须使用明确的数据类型，不以 `unknown` 或未收窄的宽联合继续传递
- 优先让 TypeScript 表达类型约束，避免重复的 `typeof`、对象结构检查和对应的 `throw`；不得在 normalize、resolve、lower 或 emit 重复 schema 已覆盖或明确 TypeScript 类型已保证的约束。只保留入口校验、schema 未覆盖且 TypeScript 无法表达的真实业务不变量或查找失败诊断
- 只在对象会暴露给外部，或会通过公开 API 返回给外部时使用 `Object.freeze`；纯内部使用的中间对象不做多余冻结，复制与明确的所有权边界已经足够时不要额外防御

## 按需加载

| 改动内容                                                                  | 读取                                           |
| ------------------------------------------------------------------------- | ---------------------------------------------- |
| `shared/`、通用词汇、纯函数、无状态映射、工具类型                         | `standard-shared`                              |
| `schemas/`、Zod schema、IR 类型、`.describe(...)`、`.superRefine(...)`    | `standard-schema`                              |
| Vanilla API `normalize/`、Input / Source IR authoring 组装                | `standard-normalize`                           |
| 纵向领域 `resolve/`、Canonical、context、默认、优先级、领域值转换         | `standard-resolve`                             |
| `contract/`、`XxxDefinition`、`defineXxx()`、作者侧 API、context          | `standard-contract`                            |
| `providers/`、内置 definition、registry resolver、`BUILTIN_*`、保留名诊断 | `standard-providers`                           |
| `pipeline/` / `compile/`、context 生命周期与调度、lowering、options       | `standard-pipeline-compile`                    |
| `parse/`、unknown / 字符串 / DSL 解析为 Source IR 节点或片段              | 本 skill；若改变 IR 形态再读 `standard-schema` |
| 目录、文件、类型、函数、enum、registry 或组件命名                         | `standard-name`                                |

define-registry 能力通常跨多层：先读本总纲判断 scope，再只加载本次会改到的层级 skill。

## 依赖方向

允许依赖方向：

```text
shared <- schemas <- contract <- providers <- resolve <- pipeline/compile
shared/schemas <- parse
shared/schemas <- Vanilla normalize
```

右侧消费左侧；左侧不反向读取右侧。`parse/` 是 unknown、字符串或 DSL 入 Source IR 的纯函数旁路，只依赖 `shared` / `schemas`，输出 `IRXxx` 节点或片段；不得依赖 `compile`、`providers` 或运行时 registry。Vanilla API `normalize/` 只依赖公开 `shared` / `schemas`，把 `InputXxx` 组装为 `IRXxx`；不得定义领域 schema、Canonical 或 compile 规则。纵向领域 `resolve/<domain>/` 从 schema IR 类型派生 `CanonicalXxx`，定义窄 `XxxResolveContext`，并统一处理默认、优先级、lookup、领域值转换和补全后不变量；pipeline / compile 只创建 context、管理阶段顺序并调度 resolver。跨层复用的纯函数优先下沉到 `shared`，IR 契约回 `schemas`，Canonical 类型与逻辑回 domain `resolve/`，作者协议回 `contract`，内置实现回 `providers`，编排消费留在 `pipeline/compile`。

## 原子契约与组合

- `shared`、`schemas` 与 `contract` 向上导出的公共内容，优先按稳定语义提供可独立复用的原子契约；上层包负责组合，不为单一消费方把组合结果下沉成底层 bundle
- 原子边界按可观察语义、不变量和扩展边界划分，不把每个字段机械拆成独立公共 API
- 多个 Tier 2 反复从同一个大型底层 schema `pick` / `omit` 出相同字段子集时，先检查拥有该语义的下层是否缺少命名契约，再决定是否新增或复用原子 schema / type / contract
- Tier 2 自己的默认值、禁用字段、输入收窄和领域组合仍留在 Tier 2；不要为了消除一次 `pick` 把消费方专属限制错误下沉
- 原子契约必须继续复用同一 JSON / IR / registry / pipeline 真源，不得因组合便利复制一套平行词汇或消费路径

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

## React DSL 目录范式

`@retikz/react` 的 DSL 代码按 owner 拆分：

```text
kernel/
  components/  Kernel DSL 标记组件
  protocol/    displayName、水合事件、embeddable 等跨 owner 共享协议
  adapter/     JSX props ↔ Vanilla `InputXxx` 转换逻辑：字段表与调度
  runtime/     Layout 运行时、hydration 收集、renderer mode 接线
sugar/         同步展开为 Kernel 的 Sugar 组件，可再按 path / shapes 分组
render/        React 宿主渲染接线，可再按 svg / canvas / text 分组
```

- 组件、helper 与子目录命名遵循 `standard-name`。
- 每个 owner 目录放 `index.ts` barrel，只导出当前 owner 的稳定 API。
- `kernel/components` 可以依赖 `kernel/protocol`，不得依赖 `adapter` / `runtime` / `render` / `sugar`。
- `kernel/adapter` 可以依赖 `kernel/components`、`kernel/protocol` 与 Vanilla `InputXxx` 合约，负责把 React props 构建为 Vanilla Input；不得依赖 `kernel/runtime` 或 `sugar`，也不得直接实现 Core Source IR builder 或绕过 Vanilla `normalizeXxx`。
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
5. 底层是否已经提供足够原子的公共契约？若需要重复 `pick` / `omit`，是否应先补下层命名契约而不是继续局部投影？
