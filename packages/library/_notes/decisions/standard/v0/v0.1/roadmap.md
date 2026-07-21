# Standard v0.1 Roadmap

> 状态：Accepted。关联：[Standard Drawing Library 设计](../../../../architecture/standard-library-design.md) · [能力完备性总纲](../../../../../../../notes/architecture/capability-design.md) · [Core Drawing Complete](../../../../../../kernel/_notes/architecture/core-drawing-complete.md)
>
> v0.1 是 Standard 包家族的首个版本。它只迁移 `Grid`，并建立可按需或整体接入 Standard 能力的公开机制；不把其它 Kernel 能力打包迁出。

## 版本目标

1. 初始化 `@retikz/standard`、`@retikz/standard-react`、`@retikz/standard-vanilla`，建立独立 `standard` release group 和可发布的包边界
2. 将 React `Grid` 迁为宿主无关的 Standard Tier 2 composite，使 React 与 Vanilla 对同一 JSON-safe 输入得到等价的 Grid composite IR 与 lowering 结果
3. 建立 Standard capability module / preset 机制：用户可显式选择全部或部分标准能力，并通过单一 bundle 接入 Core compile options 与对应 adapter
4. 固化 Standard 按 Core 可扩展机制横向分域的代码范式，为后续 definition、composite 与 Sugar 增长留出稳定位置，不预建空目录或平行机制

## 能力边界

- **主责包**：`@retikz/standard` 拥有 Standard schema、composite definition / lowering、capability module 与 preset 组装；它只依赖 `@retikz/core`，必要时依赖 `@retikz/math`
- **协作包**：`standard-react` 与 `standard-vanilla` 只将同一 Standard 输入接到 `@retikz/react` / `@retikz/vanilla`，不得复制 schema、几何计算或 registry 合并
- **Core 保留**：IR、Scene、`CompileOptions`、definition / registry contract、compile、renderer 语义，以及 `Path` / `Step` 等基础图元
- **本版唯一迁移能力**：`Grid`。它以既有 Core composite IR 持久化，并 lower 为既有 `IRPath`；不新增 Core IR 字段、Scene primitive、renderer 分支或 Core compile option

## Milestones

| Milestone | 主题                                   | 主要产出                                                                                                                                                         | ADR / Gate                                                                                                            |
| --------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| alpha.1   | **Package 与 capability loading 基座** | 三个 package manifest、独立 release group、Standard capability module 描述、不可变 bundle、全量与按需 preset、React / Vanilla 的 bundle 接线、公开入口与代码层次 | Proposed ADR；确认 Core 不反向依赖 Standard、无 module-level 全局注册、全量 / 部分加载能落入同一 Core option 合并路径 |
| alpha.2   | **Grid 迁移与跨宿主等价**              | Grid JSON-safe composite schema、definition、lowering、React `<Grid>`、Vanilla builder、移除 Kernel React 的 Grid export、双语 docs / migration                  | Proposed ADR；Grid 输入、边界错误、主次线、边框、composite IR / lowering 等价和 React / Vanilla 证据通过              |
| beta.1    | **收口与发布准备**                     | public API 审查、bundle 组合与冲突诊断、tree-shaking / side-effect 验证、文档导航和示例、release / package checks                                                | Beta completeness audit；v0.1 无其它 Kernel 迁移遗留                                                                  |

## Standard loading 机制

v0.1 必须同时提供细粒度和快捷接入，但不能建立隐式全局 registry：

- **按项使用**：每项 capability 都有独立、tree-shakeable 的公开入口。Grid 作为 composite capability，调用者显式取得其 definition module 或通过对应 adapter 组件构造 Grid composite input
- **部分加载**：调用者可选择一组 Standard capability module，由 `@retikz/standard` 组装为不可变 bundle；bundle 只包含该组需要的 Core compile contribution 与 adapter 可消费元数据
- **全量加载**：提供一个显式 all preset，等价于传入本版本所有 Standard module；不得依赖 import 副作用、单例 registry 或自动改写其它 Layout / render 调用
- **adapter 接线**：React / Vanilla 对同一 bundle 必须得到等价的 Core compile options。adapter 只转发 / 组合，不重新解析 module、不维护第二份 registry
- **冲突模型**：bundle 合并沿 Core 的 provider key / diagnostics 语义处理；不在 Standard 另造“内置优先”或静默覆盖规则

Grid 通过 Core 既有 `CompositeDefinition` 机制注册；它的 capability module 向 bundle 贡献 Grid definition。调用者选择 Grid module、部分 preset 或 all preset 后，bundle 才会把该 definition 接入 `CompileOptions.composites`；不选择时，未注册 Grid composite 必须保持 Core 的明确诊断。

公开函数、类型和 preset 的最终命名由 alpha.1 ADR 冻结；roadmap 只固定上述可观察行为和无副作用约束。

## 代码结构范式

`@retikz/standard` 先按 Core 的可扩展机制横向分域，而不是在包根按 Core 内部实现层纵向切目录：

```text
packages/library/standard/src/
  shared/                  # bundle、capability module 等跨域纯词汇
  arrows/                  # Core ArrowDefinition 的官方实现与 preset
  shapes/                  # Core ShapeDefinition 的官方实现与 preset
  boundaries/              # Core BoundaryDefinition 的官方实现与 preset
  clips/                   # Core ClipDefinition 的官方实现与 preset
  patterns/                # Core PatternDefinition 的官方实现与 preset
  path-generators/         # Core PathGeneratorDefinition 的官方实现与 preset
  path-kinds/              # Core PathKindDefinition 的官方实现与 preset
  composites/              # Core CompositeDefinition 的 schema、lowering 与 preset
    grid/                  # Grid schema、definition、lowering 与 capability module
  preset/                  # 跨机制的部分组合与 all preset
  index.ts                 # 只聚合稳定公开入口
```

- `arrows/`、`shapes/` 等目录是能力 owner；目录内部再按复杂度增量创建 `schema.ts`、`types.ts`、`define.ts`、`definitions.ts`、`registry.ts`、`lower.ts`、`factory.ts` 等文件。它们仍遵守 `shared → schema / contract → provider → pipeline` 的依赖方向，但不把这些层提升为 Standard 根目录 owner
- `Grid` 的首版只创建 `composites/grid/`；它的 JSON-safe schema、composite definition、lowering 和 capability module 必须同 owner。输入作为 Core composite IR 持久化，lowering 输出公开 Core `IRPath` contribution，不得构造平行 Standard Scene 或 renderer descriptor
- `preset/` 只跨能力组合 module / bundle，不承载任一 arrow、shape、Grid 等能力的几何、schema 校验、provider 实现或 lowering
- 没有 v0.1 实现的机制目录不应预建；上图表达稳定 owner 位置，不是本版必须创建的空目录清单

两个 adapter 按宿主职责组织：

```text
packages/library/standard-react/src/
  grid/                   # React props -> Standard Grid composite input
  bundle/                 # Standard bundle -> @retikz/react Layout 接线
  index.ts

packages/library/standard-vanilla/src/
  grid/                   # Vanilla builder -> Standard Grid composite input
  bundle/                 # Standard bundle -> @retikz/vanilla render / mount 接线
  index.ts
```

adapter 不持有 Standard schema、几何 helper、provider table 或 lowering；对等规则由 Standard 包测试锁定。

## 测试与文档基线

- `standard`：Grid schema、输入错误、坐标枚举、`includeBoundary`、主次线、边框、composite lowering 输出与 bundle 合并不变量
- `standard-react` / `standard-vanilla`：同一 Grid input 的 composite IR 与 lowering 结果等价；部分 / all bundle 与直接 Core compile options 的等价；无副作用、重复 module 和 provider key 冲突的诊断
- Kernel 回归：`Path` / `Step`、Core compile 与 renderer 不因未安装 Standard 改变；`@retikz/react` 不再导出 Grid
- Docs：zh/en 同步 Standard 包说明、Grid 页面、React / Vanilla 示例、从 `@retikz/react` 迁移到 `@retikz/standard-react` 的指引；检查导航、source preview 与 import 生成

每个 alpha ADR 必须另附测试契约矩阵，并在实现前通过 Architecture Gate。

## 不在 v0.1 范围

- 迁移 `Circle`、`Ellipse`、`Draw`、`EdgeLabel`、Arrow、Pattern、Node shape、Ribbon、`parabola` 或其它 Kernel 内容
- 新增 Core IR、Scene primitive、renderer 特判、Core 到 Standard 的反向依赖，或自动全局注册
- Standard 专有运行时、DOM / editor 状态、selection / history / viewport
- 新增 Table / Plot / Graph / Flow 等领域语义，或为 Grid 引入数据、scale、坐标系语义
- 为兼容旧 import 保留 `@retikz/react` 的 Grid alias；迁移以 v0.x 的正确 owner 为准，并提供文档迁移说明

## ADR 约定

每个 milestone 在对应目录内从 `01` 编号。ADR 从 `Proposed` 开始，完成 Architecture Gate 与人工确认后才能进入实现。
