# Standard v0.1 Roadmap

> 状态：Accepted。关联：[Standard v0 roadmap](../roadmap.md) · [Standard Drawing Library 设计](../../../../architecture/standard-library-design.md) · [能力完备性总纲](../../../../../../../notes/architecture/capability-design.md) · [Core Drawing Complete](../../../../../../kernel/_notes/architecture/core-drawing-complete.md)
>
> v0.1 是 Standard 包家族的首个版本。`Grid`、`Axes` 和 `Frame` 已建立首批宿主无关 Tier 2 composite；当前版本继续补齐 capability loading、通用布局积木与面向持久化 / LLM 编辑的语义逻辑组件，不把其它 Kernel 能力打包迁出。

## 版本目标

1. 初始化 `@retikz/standard`、`@retikz/standard-react`、`@retikz/standard-vanilla`，建立独立 `standard` release group 和可发布的包边界
2. 将 React `Grid` 迁为宿主无关的 Standard Tier 2 composite，并新增 Axes 与 Frame，使 React 与 Vanilla 对同一 JSON-safe 输入得到等价的 composite IR 与 lowering 结果
3. 建立 Standard capability module / preset 机制：用户可显式选择全部或部分首批标准能力，并通过单一 bundle 接入 Core compile options 与对应 adapter
4. 固化 Standard 按 Core 可扩展机制横向分域的代码范式，为后续 definition、composite 与 Sugar 增长留出稳定位置，不预建空目录或平行机制
5. 增加 Stack、Align / Distribute 等不理解领域模型的通用布局 composite；确需测量任意 children 时先补齐并复用 Core layout-aware composite，不在 Standard 私造测量或 replay 管线
6. 增加 `Stage`、`Decision`、`Terminal`、`Junction`、`Connector` 与 `Callout` 等 JSON-safe Tier 2 语义，使持久化文档、工具链和 LLM 不必从 shape、颜色或坐标反推逻辑角色

## 能力边界

- **主责包**：`@retikz/standard` 拥有 Standard schema、composite definition / lowering、capability module 与 preset 组装；它只依赖 `@retikz/core`，必要时依赖 `@retikz/math`
- **协作包**：`standard-react` 与 `standard-vanilla` 只将同一 Standard 输入接到 `@retikz/react` / `@retikz/vanilla`，不得复制 schema、几何计算或 registry 合并
- **Core 保留**：IR、Scene、`CompileOptions`、definition / registry contract、compile、renderer 语义，以及 `Path` / `Step` 等基础图元
- **语义真源**：Standard 拥有的 Tier 2 schema 以既有 Core composite IR 持久化；输入保留 Standard discriminator、逻辑角色和结构化引用，lowering 后的 Kernel IR / Scene 只是派生产物
- **当前 Standard composite**：`Grid`、`Axes` 与 `Frame` 已分别 lower 为既有 `IRPath`、`IRNode` 与 `IRScope`；后续布局与逻辑组件继续复用同一 Core composite registry，不新增平行 IR、Scene primitive、renderer 分支或 Core compile option
- **领域边界**：Standard 只拥有可独立绘制的逻辑角色和通用绘图关系，不拥有 GraphModel、全局 nodes / edges、Port / Group 规则、拓扑校验、算法布局或编辑器状态

## Milestones

| Milestone                       | 主题                                                     | 主要产出                                                                                                                                                                                                                           | ADR / Gate                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [alpha.1](./alpha.1/roadmap.md) | **首批 Tier 2 composite、包初始化与 capability loading** | 三个 package manifest、Grid / Axes / Frame 的 schema / definition / lowering / React / Vanilla authoring、Grid 迁移、capability module、不可变 bundle、全量与按需 preset、adapter bundle 接线与公开二级入口、双语 docs / migration | 首批 composite 的输入、Core definition 注册与跨 adapter 等价证据；确认无全局注册、Core 不反向依赖 Standard，且全量 / 部分加载进入同一 Core option 合并路径 |
| alpha.2                         | **通用布局 composite**                                   | Stack、Align / Distribute 的宿主无关输入、定位、lowering 与诊断；复核 Frame 与后续任意 child 布局的 Core 能力需求                                                                                                                  | 现有 Core anchor / composite 可组合；需要测量时先完成 Core layout-aware composite                                                                          |
| alpha.3                         | **逻辑语义节点**                                         | `Stage`、`Decision`、`Terminal`、`Junction` 的 schema、definition、纯展开 lowering 与稳定 identity                                                                                                                                 | alpha.1 loading 主链；语义不由 diamond / capsule / fork bar 等 shape 代替                                                                                  |
| alpha.4                         | **逻辑关系与注释**                                       | `Connector`、`Callout`、结构化 Target、关系 role、label 与诊断                                                                                                                                                                     | alpha.2 children 布局能力、alpha.3 stable identity                                                                                                         |
| alpha.5                         | **跨入口与文档收口**                                     | React / Vanilla 等价 authoring、LLM 友好 schema 描述、文档逻辑图 dogfood、完整诊断                                                                                                                                                 | alpha.1～4；JSON round-trip、adapter 等价和真实文档消费闭环                                                                                                |
| beta.1                          | **收口与发布准备**                                       | public API 审查、bundle 组合与冲突诊断、tree-shaking / side-effect、adversarial tests、双语 docs、release / package checks                                                                                                         | Beta completeness audit；alpha completeness 全部闭环且无其它 Kernel 迁移遗留                                                                               |

## Standard loading 机制

v0.1 必须同时提供细粒度和快捷接入，但不能建立隐式全局 registry：

- **按项使用**：每项 capability 都有独立、tree-shakeable 的公开入口。Grid 作为 composite capability，调用者显式取得其 definition module 或通过对应 adapter 组件构造 Grid composite input
- **部分加载**：调用者可选择一组 Standard capability module，由 `@retikz/standard` 组装为不可变 bundle；bundle 只包含该组需要的 Core compile contribution 与 adapter 可消费元数据
- **全量加载**：提供一个显式 all preset，等价于传入本版本所有 Standard module；不得依赖 import 副作用、单例 registry 或自动改写其它 Layout / render 调用
- **adapter 接线**：React / Vanilla 对同一 bundle 必须得到等价的 Core compile options。adapter 只转发 / 组合，不重新解析 module、不维护第二份 registry
- **冲突模型**：bundle 合并沿 Core 的 provider key / diagnostics 语义处理；不在 Standard 另造“内置优先”或静默覆盖规则

Grid、Axes 与 Frame 都通过 Core 既有 `CompositeDefinition` 机制注册；后续布局与语义组件仍将每项 definition 贡献给同一 bundle。调用者选择 capability module、部分 preset 或 all preset 后，bundle 才会把相应 definition 接入 `CompileOptions.composites`；不选择时，未注册 composite 必须保持 Core 的明确诊断。

公开函数、类型和 preset 的最终命名由 alpha.1 capability loading ADR 冻结；既有 alpha.1 composite ADR 只冻结各能力的直接 definition 接线。

## Tier 2 语义约定

- `Stage`、`Decision`、`Terminal`、`Junction`、`Connector` 及固定定位的 `Callout` 以独立 Standard discriminator 保存逻辑角色，并可通过 `expand` 确定性下沉为 Node / Coordinate / Path 等 Core IR
- Stack、Align / Distribute 及需要测量任意内容的 `Callout` 是否需要 layout-aware composite，由对应 ADR 基于真实 children 测量需求决定；现有 Frame 继续使用已验证的 `expand` 主链，除非 ADR 证明必须迁移
- 即使某个组件可以同步展开，只要其角色需要跨 JSON 持久化、工具链处理或 LLM 编辑保留，就不能仅作为 React / Vanilla Sugar
- `diamond`、capsule、fork bar 等 shape 只拥有几何或视觉实现，不替代 `Decision`、`Terminal`、`Junction` 的语义 schema
- `Connector` 表达 flow / branch / dependency / feedback 等局部绘图关系；它不是全局 Edge 集合，也不负责拓扑校验、自动路由或端口规则
- 保存、diff、LLM 修改和跨入口交换都针对 Standard composite 输入；不承诺从 lowering 后的 Kernel IR 或 Scene 恢复原始 Standard 语义

上述名称的最终公开拼写、字段、默认值、Target 形态、provenance / locator 和失败诊断由各 milestone ADR 冻结，roadmap 不替代实现契约。

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
    axes/                  # Axes schema、definition、lowering 与 capability module
    frame/                 # Frame schema、definition、lowering 与 capability module
    shared/                # 跨 composite 的 JSON-safe Path style schema
  preset/                  # 跨机制的部分组合与 all preset
  index.ts                 # 只聚合稳定公开入口
```

- `arrows/`、`shapes/` 等目录是能力 owner；目录内部再按复杂度增量创建 `schema.ts`、`types.ts`、`define.ts`、`definitions.ts`、`registry.ts`、`lower.ts`、`factory.ts` 等文件。它们仍遵守 `shared → schema / contract → provider → pipeline` 的依赖方向，但不把这些层提升为 Standard 根目录 owner
- 每个 Standard composite 各自拥有 JSON-safe schema、composite definition、lowering 和 capability module。输入作为 Core composite IR 持久化，lowering 只输出公开 Core `IRChild` contribution，不得构造平行 Standard Scene 或 renderer descriptor
- `composites/shared/` 只拥有跨 composite 的 JSON-safe 样式 schema；格点枚举等无状态纯函数仍在 `shared/grid/`，不得让任一 composite owner 成为另一个可选 capability 的前置依赖
- `preset/` 只跨能力组合 module / bundle，不承载任一 arrow、shape、Grid、Axes 或 Frame 的几何、schema 校验、provider 实现或 lowering
- 没有 v0.1 实现的机制目录不应预建；上图表达稳定 owner 位置，不是本版必须创建的空目录清单

两个 adapter 按宿主职责组织：

```text
packages/library/standard-react/src/
  grid/                   # React props -> Standard Grid composite input
  axes/                   # React props -> Standard Axes composite input
  frame/                  # React children -> Standard Frame composite input
  bundle/                 # Standard bundle -> @retikz/react Layout 接线
  index.ts

packages/library/standard-vanilla/src/
  grid/                   # Vanilla builder -> Standard Grid composite input
  axes/                   # Vanilla builder -> Standard Axes composite input
  frame/                  # Vanilla builder -> Standard Frame composite input
  bundle/                 # Standard bundle -> @retikz/vanilla render / mount 接线
  index.ts
```

adapter 不持有 Standard schema、几何 helper、provider table 或 lowering；对等规则由 Standard 包测试锁定。

## 测试与文档基线

- `standard`：Grid、Axes、Frame 与后续布局 / 语义组件的 schema、JSON round-trip、输入错误、identity / Target、composite lowering 输出与 bundle 合并不变量
- `standard-react` / `standard-vanilla`：同一 composite input 的 IR 与 lowering 结果等价；同图多 capability 的稳定 contribution key / maker、部分 / all bundle 与直接 Core compile options 的等价；无副作用、重复 module 和 provider key 冲突的诊断
- Kernel 回归：`Path` / `Step`、Core compile 与 renderer 不因未安装 Standard 改变；`@retikz/react` 不再导出 Grid
- Docs：zh/en 同步 Standard 包说明、组件页面、React / Vanilla 示例、从 `@retikz/react` 迁移 Grid 的指引；用真实逻辑图 dogfood Frame、Decision、Connector、Junction 与 Callout，并检查导航、source preview、import 生成和 desktop / 500px 页面

每个 alpha ADR 必须另附测试契约矩阵，并在实现前通过 Architecture Gate。

## 不在 v0.1 范围

- 迁移 `Circle`、`Ellipse`、`Draw`、`EdgeLabel`、Arrow、Pattern、Node shape、Ribbon、`parabola` 或其它 Kernel 内容
- 新增 Core IR、Scene primitive、renderer 特判、Core 到 Standard 的反向依赖，或自动全局注册
- Standard 专有运行时、DOM / editor 状态、selection / history / viewport
- GraphModel、全局 nodes / edges 集合、Port / Group 关系语义、拓扑校验、算法布局、自动路由或避障
- Table / Plot datum、scale、数据 formatter、业务工作流等领域语义；对应 owner 负责先解析为可绘制输入
- 从 lowering 后的 Kernel IR 或 Scene 反向推断原始 Standard Tier 2 语义
- LLM prompt、模型调用、agent runtime 或自然语言解析器；v0.1 只提供稳定、带描述、可生成的语义契约
- `GridLayout`、`Wrap`、`RadialLayout`、Dimension / BraceLabel 等扩展目录；按真实消费证据进入 v0.2 评估
- 为兼容旧 import 保留 `@retikz/react` 的 Grid alias；迁移以 v0.x 的正确 owner 为准，并提供文档迁移说明

## ADR 约定

每个 milestone 在对应目录内从 `01` 编号。ADR 从 `Proposed` 开始，完成 Architecture Gate 与人工确认后才能进入实现。
