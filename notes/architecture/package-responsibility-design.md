# 包职能设计

> **状态：全仓长期架构设计。** 本文定义 Core / Plot、Vanilla 与框架包的职能、依赖方向和数据边界，不冻结具体方法名、props、JSX 组件或内部文件位置。具体公开契约由相应 ADR 冻结。
>
> 关联：[能力完备性与模块边界](./capability-design.md) · [包拓扑](./package-topology.md) · [原子契约与组合设计](./atomic-contract-design.md) · [性能与增量运行时设计](./performance-design.md)

---

## 1. 分组与依赖方向

Retikz 将领域语义、无框架 API 和框架适配分为三组。右侧包只能依赖左侧公开能力，不得反向依赖或复制同一职能。

```text
核心能力包                 API 基础包                     框架包

@retikz/core  <-  @retikz/vanilla       <-  @retikz/react
      ^                  ^                         ^
      |                  |                         |
@retikz/plot  <-  @retikz/plot-vanilla  <-  @retikz/plot-react
```

`@retikz/plot` 依赖 Core 的公开绘图能力；`@retikz/plot-vanilla` 同时组合 Plot 与 Vanilla；`@retikz/plot-react` 同时复用 Plot Vanilla 和 React。`@retikz/vanilla/dom` 是 Vanilla 的浏览器子入口，根入口不得依赖它。

| 分组       | 包                     | 核心职能                                                                         | 不承担的职能                                                                 |
| ---------- | ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 核心能力包 | `@retikz/core`         | 通用绘图 Source IR、Canonical、Definition / registry、Core compile 与 Scene 语义 | authoring Input、DOM mount、框架生命周期、Plot 领域语义                      |
| 核心能力包 | `@retikz/plot`         | Plot Source IR、Canonical、数据可视化 grammar、Plot pipeline / lowering          | 通用 Core 语义、DOM、框架 props / JSX、独立 session                          |
| API 基础包 | `@retikz/vanilla`      | Core authoring API、Input builder、共享实例 / retained runtime、SSR              | Core schema、Core IR-to-Canonical resolve、Core lowering / Scene 语义        |
| API 基础包 | `@retikz/plot-vanilla` | Plot authoring API、Plot Input builder、Plot 与 Vanilla 的实例组合               | Plot grammar / schema / IR-to-Canonical resolve、lowering、DOM、框架生命周期 |
| 框架包     | `@retikz/react`        | React JSX / props、hook、ref、生命周期与 Vanilla 调度                            | Core IR builder、平行 session、renderer 编排                                 |
| 框架包     | `@retikz/plot-react`   | Plot React JSX / props 与 Plot Vanilla 调度                                      | Plot IR builder、平行 Plot runtime、Plot pipeline                            |

## 2. 核心能力包

### 2.1 `@retikz/core`

Core 是通用绘图领域的唯一 owner。它定义 JSON-safe 的 Core Source IR schema 与 `IRXxx` 类型，维护通用 Definition / registry，负责将 Core Source IR 编译为 renderer-agnostic Scene。

Core 还拥有 `IRXxx -> CanonicalXxx` 的领域 normalize：展开 IR 等价简写、补齐领域默认值、校验 Canonical 化后出现的领域不变量，并完成颜色等领域值转换，使所有 compile 内部消费收敛到 Canonical。`CanonicalXxx` 定义在领域 `normalize/<domain>/types.ts`，由同目录的 `normalizeXxx` 产出；`compile/<domain>/resolve.ts` 只准备 context 并调度它。只有 `IRXxx` 由 Zod schema 派生。Core 对外的编译入口保持为接收 `IRScene` 的 `compileToScene`；不新增同义的 `compileIRToScene`。

Core 不提供框架通用 authoring Input，不持有 JSX、DOM、框架调度或浏览器挂载能力。它也不因上层 API 的便利需求扩展持久化 IR 以外的平行输入模型。

### 2.2 `@retikz/plot`

Plot 是数据可视化领域的唯一 owner。它定义 Plot Source IR schema 与 `IRXxx` 类型，拥有 data、scale、coordinate、mark、guide 等领域语义，以及 Plot Source IR 的 Canonical resolve、pipeline 和到 Core IR 的 lowering。

Plot 只通过 Core 的公开能力输出 Core IR，不复制 Core compile、Scene 或 renderer 语义。它不维护框架 authoring Input、DOM mount、React props / JSX 或独立 retained session。

## 3. API 基础包

### 3.1 `@retikz/vanilla`

Vanilla 是 Core 的无框架 API 基础包，面向 plain JavaScript、SSR、Worker 和框架包。它定义 TypeScript-only 的 `InputXxx`，用 `normalizeXxx` 将 authoring Input 组装为 Core Source IR，并组合 Runtime、Render 与 Core 的公开能力提供实例创建、更新、订阅、诊断和释放。

Vanilla 负责 retained rendering、增量更新、revision 和 session 生命周期的通用 API 接线，但不重新实现 Core 的 Source IR schema、`resolveXxx`、Definition / registry、lowering 或 Scene 语义。根入口必须无 DOM 依赖；`@retikz/vanilla/dom` 才承载浏览器 mount、hydration、元素管理和浏览器事件。

### 3.2 `@retikz/plot-vanilla`

Plot Vanilla 是 Plot 的无框架 API 基础包。它定义 Plot `InputXxx`，用 `normalizeXxx` 组装 Plot Source IR，并复用 Plot 与 Vanilla 的公开实例和运行时能力，让 Plot 使用者无需直接拼装 IR。

它不复制 Plot schema、IR-to-Canonical resolve、pipeline / lowering 或 Core compile，也不引入 DOM、JSX 或框架生命周期。需要浏览器挂载时由 Vanilla DOM 子入口承接。

## 4. 框架包

### 4.1 `@retikz/react`

React 是 Core API 的框架适配包。它将 JSX、props、children、hook、ref、React 生命周期和并发调度映射为 Vanilla `InputXxx` 与 Vanilla 实例调用，并订阅实例状态以驱动 React 宿主输出。

React 不直接实现 Core Source IR builder，不重建 Program、Runtime Session、retained renderer 或图形更新协议。React 专属能力只属于 React 接线，不能成为通用运行时的平行实现。

### 4.2 `@retikz/plot-react`

Plot React 是 Plot API 的框架适配包。它将 Plot JSX / props 映射为 Plot Vanilla `InputXxx`，并复用 Plot Vanilla 和 React 的既有能力完成生命周期与宿主接线。

它不得直接构建 Plot Source IR、复制 Plot pipeline 或建立独立的 Plot session。未来 Vue、Svelte、Solid 等框架包遵循同一结构：只适配各自的 authoring 语法、响应式模型、生命周期与宿主绑定。

## 5. 数据与类型边界

```text
Framework / Vanilla Input (`InputXxx`, TypeScript only)
  -> Vanilla normalizeXxx
Source IR (`IRXxx`, schema-derived, JSON-safe, persisted)
  -> Core / Plot compile resolveXxx（准备 NormalizeContext）
  -> Core / Plot domain normalizeXxx
Canonical (`CanonicalXxx`, domain normalize types, internal, no schema)
  -> lowerXxx
-> Scene
```

| 形态           | owner                 | 定义与用途                                                                                 |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `InputXxx`     | Vanilla               | TypeScript authoring API；没有 Zod schema，不持久化                                        |
| `IRXxx`        | Core / Plot           | 从 Source IR schema 派生；唯一可持久化 JSON 契约，可保留紧凑等价简写                       |
| `CanonicalXxx` | Core / Plot normalize | 由 `IRXxx` 派生的完整内部类型；定义在 `normalize/<domain>/types.ts`，没有 schema、不持久化 |

`parseXxx` 只接受 `unknown`、序列化 JSON、字符串或 provider payload 等外部数据；公开 compile 已接收 `IRXxx` 时不得重新 parse。Vanilla `normalizeXxx` 表示 `InputXxx` 到 Source IR 的组装。

Vanilla `normalizeXxx` 是纯函数：只组装 authoring Input，不读取 registry、data、host 或 DOM，也不 warning。Core / Plot `normalizeXxx` 才展开 IR 等价简写、补领域默认值、校验 Canonical 化后才出现的领域不变量，并完成颜色等领域值转换；`resolveXxx` 只解析 options / registry / data / host 等 context 后调度 normalizer。不得重复 schema 已覆盖或明确 TypeScript 类型已保证的校验。Theme 的 style、mode、颜色与 token 默认全部由 Core / Plot normalize 使用 context 确定；可由 `CompileOptions.themeStyles` 注入的颜色必须在该阶段决定。

## 6. 跨包不变量

1. 同一领域能力只能有一个 Source IR schema、一个 Vanilla Input-to-IR normalize、一个 Core / Plot IR-to-Canonical normalize 与一个正式 compile / lowering 路径
2. API 基础包与框架包只能改变 authoring 语法、生命周期或宿主接线，不能改变领域 IR、Canonical、Scene 或 renderer 的可观察语义
3. `InputXxx` 的便利写法与 TypeScript 类型属于 Vanilla；持久化 compact 写法属于 Source IR；`CanonicalXxx` 由 `IRXxx` 派生并定义在 Core / Plot domain `normalize/`。三者不得混为同一 schema 或平行真源
4. Vanilla 根入口、Core、Plot 都不得反向依赖 DOM 或框架包；DOM 能力只进入明确子入口
5. 领域默认值与 IR shorthand 由 Core / Plot resolve 决定，不得在 Vanilla、adapter 或每个下游 consumer 各自复制
6. 新能力先建立其领域 owner 的公开契约；再由 Vanilla 与框架包等价接入，不以 adapter 便利创建平行 IR、registry、session 或 renderer 路径

## 7. ADR 约束

修改任一包的职责、依赖方向、Source IR / Canonical 边界、Input builder、DOM 子入口或框架适配路径时，ADR 必须说明：

- 能力属于 Core / Plot、API 基础包、DOM 子入口还是具体框架包
- `InputXxx`、`IRXxx`、`CanonicalXxx` 的 owner、持久化边界和 normalize / resolve 责任；若有额外上下文对象，说明其独立语义名而非泛用 `ResolvedXxx`
- React / Vanilla 与其它框架能否通过同一 Vanilla 链路获得等价领域语义；不能等价时的 capability 差异和诊断
- 是否引入反向依赖、平行 schema、平行 normalize、平行 session、平行 compile 或 renderer 路径
