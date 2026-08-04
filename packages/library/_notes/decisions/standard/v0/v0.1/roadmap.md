# Standard v0.1 Roadmap

> 状态：Accepted。关联：[Standard v0 roadmap](../roadmap.md) · [Standard Drawing Library 设计](../../../../architecture/standard-library-design.md) · [能力完备性总纲](../../../../../../../notes/architecture/capability-design.md) · [Core Drawing Complete](../../../../../../kernel/_notes/architecture/core-drawing-complete.md)
>
> v0.1 是 Standard 包家族的首个版本。`Grid`、`Axes` 和 `Frame` 已建立首批宿主无关 Tier 2 composite；当前版本继续补齐按项 Definition 接入、通用布局积木、跨领域 Legend 呈现与面向持久化 / LLM 编辑的语义逻辑组件，不把其它 Kernel 能力打包迁出。

## 版本目标

1. 初始化 `@retikz/standard`、`@retikz/standard-react`、`@retikz/standard-vanilla`，建立独立 `standard` release group 和可发布的包边界
2. 将 React `Grid` 迁为宿主无关的 Standard Tier 2 composite，并新增 Axes 与 Frame，使 React 与 Vanilla 对同一 JSON-safe 输入得到等价的 composite IR 与 lowering 结果
3. 建立 Standard 的直接 Definition 接入约定：用户按当前图选择 Definition 并通过 Core `CompileOptions.composites` 接入；React 保持组件静态 adapter，Vanilla 提供显式 adapter 数组便利入口
4. 固化 Standard 按 Core 可扩展机制横向分域的代码范式，为后续 definition、composite 与 Sugar 增长留出稳定位置，不预建空目录或平行机制
5. 建立 renderer-agnostic Box Layout Profile，补齐 Flex、Grid、Overlay、LayoutItem 与 layout artifact；需要双轴约束、intrinsic contribution、allocated box 或 replay wrapper 时先补齐并复用 Core layout-aware composite，不在 Standard 私造测量或 replay 管线
6. 建立可由直接作者、Plot 与 Table 复用的通用 Legend 呈现；领域包保留 scale、visual encoding、formatter、provenance 与交互解析，Standard 统一 schema、布局、layout-aware compile 与领域无关 artifact
7. 增加 headless `LogicBlockBase`、`Stage`、`Decision`、`Terminal`、`Junction`、`Connector` 与 `Callout` 等 JSON-safe Tier 2 语义，使持久化文档、工具链和 LLM 不必从 shape、颜色或坐标反推逻辑角色

## 能力边界

- **主责包**：`@retikz/standard` 拥有 Standard schema、composite definition、factory 与 lowering；它只依赖 `@retikz/core`，必要时依赖 `@retikz/math`
- **协作包**：`standard-react` 与 `standard-vanilla` 只将同一 Standard 输入接到 `@retikz/react` / `@retikz/vanilla`，不得复制 schema、几何计算或 registry 合并
- **领域消费包**：Plot、Table 等官方 Tier 2 包可以使用兼容版本单向依赖 Standard；它们先把领域语义解析为 Standard 输入，并继续拥有 provenance / locator、交互与领域诊断，Standard 不反向依赖或读取领域 IR
- **Core 保留**：IR、Scene、`CompileOptions`、definition / registry contract、compile、renderer 语义，以及 `Path` / `Step` 等基础图元
- **语义真源**：Standard 拥有的 Tier 2 schema 以既有 Core composite IR 持久化；输入保留 Standard discriminator、逻辑角色和结构化引用，lowering 后的 Kernel IR / Scene 只是派生产物
- **当前 Standard composite**：`Grid`、`Axes` 与 `Frame` 已分别 lower 为既有 `IRPath`、`IRNode` 与 `IRScope`；后续布局与逻辑组件继续复用同一 Core composite registry，不新增平行 IR、Scene primitive、renderer 分支或 Core compile option
- **领域边界**：Standard 只拥有可独立绘制的逻辑角色和通用绘图关系，不拥有 GraphModel、全局 nodes / edges、Port / Group 规则、拓扑校验、算法布局或编辑器状态
- **Legend 边界**：Standard 拥有已经解析好的 title、`items | ramp`、任意 `IRChild` sample、布局与 artifact；Plot/Table 拥有 channel / scale、visual encoding、formatter、theme mapping、领域 provenance 与交互意图

## Milestones

| Milestone                       | 主题                                                  | 主要产出                                                                                                                                                                                                | ADR / Gate                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [alpha.1](./alpha.1/roadmap.md) | **首批 Tier 2 composite、包初始化与 Definition 接入** | 三个 package manifest、Grid / Axes / Frame 的 schema / definition / lowering / React / Vanilla authoring、Grid 迁移、直接 Core Definition 注入、Vanilla adapter 数组、双语 docs / migration / changelog | 首批 composite 的输入、Core definition 注册与跨 adapter 等价证据；确认无全局注册、Core 不反向依赖 Standard，且按项 definitions 进入同一 Core option 路径      |
| [alpha.2](./alpha.2/roadmap.md) | **通用 Box Layout 与 Legend**                         | Flex、Grid、Overlay、LayoutItem、layout artifact 与 inspector；领域无关 Legend items / ramp、任意 IRChild sample、typed artifact、直接 Definition 接入与 React / Vanilla authoring                      | Core layout-aware composite 主链；Legend 复用 Box Layout，领域包保留解析、provenance / locator 与交互                                                         |
| [alpha.3](./alpha.3/roadmap.md) | **语义逻辑图组件**                                    | headless `LogicBlockBase`、`Terminal`、`Stage`、`Decision`、`Junction`、`Connector`、`Callout`、布局 artifact / Scene identity、按项 Definition、React / Vanilla authoring 与 docs recipe               | alpha.1 direct Definition loading；alpha.2 Box Layout；Core composite-owned subtarget / Path host label / target-aware replay；语义不由 shape、颜色或坐标代替 |
| beta.1                          | **收口与发布准备**                                    | public API 审查、Definition 组合与冲突诊断、tree-shaking / side-effect、adversarial tests、双语 docs、release / package checks                                                                          | Beta completeness audit；alpha completeness 全部闭环且无其它 Kernel 迁移遗留                                                                                  |

## Standard Definition 接入机制

v0.1 只提供显式的细粒度 Definition 接入，不建立隐式全局 registry 或 Standard 自己的组合层：

- **按项使用**：每个 composite owner 都从包根入口提供独立的 `XxxDefinition` 与 factory。直接编译把当前图需要的 definitions 放入 Core `CompileOptions.composites`；三个包保持 `sideEffects: false`，由消费方 bundler 对未使用导出做 tree-shaking
- **直接接入**：Standard 不再提供 module、bundle、all preset 或其它跨 composite compile 组合对象；Core registry 直接接收调用方选择的 definitions
- **adapter 接线**：React JSX 继续由组件静态 adapter 按实际使用项贡献 definition；Vanilla embed 继续显式传 adapter 数组，并提供当前版本全量便利数组。adapter 数组属于 authoring 接线，不转化为 Standard compile preset
- **冲突模型**：definition 合并、重复 composite key、缺失 definition 与 warning/error 均沿 Core registry / diagnostics 语义处理；Standard 不另造“内置优先”或静默覆盖规则
- **领域包依赖**：Plot/Table 直接组合所需 Standard definitions 进入自己的 compile options；不使用 module identity、全局自动注册或私有去重

Grid、Axes 与 Frame 都通过 Core 既有 `CompositeDefinition` 机制注册；后续布局与语义组件沿用同一入口。调用者显式传入当前图需要的 definitions 后，Core 才将相应能力接入 `CompileOptions.composites`；不传入时，未注册 composite 必须保持 Core 的明确诊断。

公开 Definition、factory 与 adapter 的最终命名由各 milestone ADR 冻结；组合接入统一以 alpha.3 ADR-06 的 direct Definition contract 为准。

## Tier 2 语义约定

- `Stage`、`Decision`、`Terminal`、`Junction`、`Connector` 及固定定位的 `Callout` 以独立 Standard discriminator 保存逻辑角色；`LogicBlockBase` 只保存 headless header / sections、纵向布局、appearance 与 target，不理解内部领域内容
- Flex、Grid、Overlay、Legend 与需要测量任意内容的 Logic Diagram composite 使用 Core layout-aware contract；Connector 直接 expand 为同 id Core Path 并复用 Path host label，不为了 artifact 或 label 复制 target / path geometry，且只承诺 Core Scene 主体 id、不虚构 Path occurrence artifact；Stack / Row / Column 只作为 Flex 的 convenience authoring，Align / Distribute 由 container / item alignment 与 free-space distribution 持久化表达；现有 Frame 继续使用已验证的 `expand` 主链，除非 ADR 证明必须迁移
- Legend 以领域无关 Standard 输入保存 title、`items | ramp`、任意 `IRChild` sample 与呈现布局；Plot/Table 只把各自领域解析结果转换为该输入，不把 channel、scale、Cell selector、formatter 函数或 interaction state 注入 Standard schema
- 即使某个组件可以同步展开，只要其角色需要跨 JSON 持久化、工具链处理或 LLM 编辑保留，就不能仅作为 React / Vanilla Sugar
- `diamond`、capsule、fork bar 等 shape 只拥有几何或视觉实现，不替代 `Decision`、`Terminal`、`Junction` 的语义 schema
- `Connector` 表达 flow / branch / dependency / feedback 等局部绘图关系；它不是全局 Edge 集合，也不负责拓扑校验、自动路由或端口规则
- Process、Class 与 Data Block 只作为 docs 内部 recipe 组合 `LogicBlockBase`，不进入 package exports、Standard IR discriminator、schema registry 或 Definition contract
- 保存、diff、LLM 修改和跨入口交换都针对 Standard composite 输入；不承诺从 lowering 后的 Kernel IR 或 Scene 恢复原始 Standard 语义

上述名称的最终公开拼写、字段、默认值、Target 形态、provenance / locator 和失败诊断由各 milestone ADR 冻结，roadmap 不替代实现契约。

## 代码结构范式

`@retikz/standard` 先按 Core 的可扩展机制横向分域，而不是在包根按 Core 内部实现层纵向切目录：

```text
packages/library/standard/src/
  shared/                  # 经两个以上 owner 证明复用的 dependency-free 纯词汇
  arrows/                  # Core ArrowDefinition 的官方实现与 preset
  shapes/                  # Core ShapeDefinition 的官方实现与 preset
  boundaries/              # Core BoundaryDefinition 的官方实现与 preset
  clips/                   # Core ClipDefinition 的官方实现与 preset
  patterns/                # Core PatternDefinition 的官方实现与 preset
  path-generators/         # Core PathGeneratorDefinition 的官方实现与 preset
  path-kinds/              # Core PathKindDefinition 的官方实现与 preset
  composites/              # Core CompositeDefinition 的 schema、definition、lowering 与 artifact
    grid/                  # Grid schema、definition 与 lowering
    axes/                  # Axes schema、definition 与 lowering
    frame/                 # Frame schema、definition 与 lowering
    legend/                # Legend schema、definition、布局、artifact 与 lowering
    logic-block-base/      # headless 逻辑 Block 外壳、section target 与 artifact
    terminal/              # 开始 / 结束语义单元
    stage/                 # 轻量流程步骤
    decision/              # 条件判断语义单元
    junction/              # 分叉 / 汇合语义单元
    connector/             # 局部关系与 Core Path 路由组合
    callout/               # 显式定位说明
    shared/                # 跨 composite 的 JSON-safe Path style schema
  index.ts                 # 只聚合稳定公开入口
```

- `arrows/`、`shapes/` 等目录是能力 owner；目录内部再按复杂度增量创建 `schema.ts`、`types.ts`、`define.ts`、`definitions.ts`、`registry.ts`、`pipeline.ts`、`factory.ts` 等文件。它们仍遵守 `shared → schema / contract → provider → pipeline` 的依赖方向，但不把这些层提升为 Standard 根目录 owner
- 每个 Standard composite 各自拥有 JSON-safe schema、composite definition、factory 与 lowering。轻量、无布局能力通过 expand 输出公开 Core `IRChild` contribution；需要测量或 artifact 的能力通过 Core layout-aware compile 输出 Core children 与 typed artifact。两条分支都不得构造平行 Standard Scene 或 renderer descriptor
- `composites/shared/` 只拥有跨 composite 的 JSON-safe 样式 schema；格点枚举等无状态纯函数仍在 `shared/grid/`，不得让任一 composite owner 成为另一个可选 capability 的前置依赖
- 没有 v0.1 实现的机制目录不应预建；上图表达稳定 owner 位置，不是本版必须创建的空目录清单

两个 adapter 按宿主职责组织：

```text
packages/library/standard-react/src/
  grid/                   # React props -> Standard Grid composite input
  axes/                   # React props -> Standard Axes composite input
  frame/                  # React children -> Standard Frame composite input
  legend/                 # React props -> Standard Legend composite input
  logic-diagram/          # LogicBlock marker 与基础逻辑组件 authoring
  index.ts

packages/library/standard-vanilla/src/
  grid/                   # Vanilla builder -> Standard Grid composite input
  axes/                   # Vanilla builder -> Standard Axes composite input
  frame/                  # Vanilla builder -> Standard Frame composite input
  legend/                 # Vanilla builder -> Standard Legend composite input
  logic-diagram/          # Logic Diagram plain-data builder 与 adapter
  preset/                 # 当前版本全量 Vanilla adapter 数组便利入口
  index.ts
```

adapter 不持有 Standard schema、几何 helper、provider table 或 lowering；对等规则由 Standard 包测试锁定。

## 测试与文档基线

- `standard`：Grid、Axes、Frame、Flex、GridLayout、Overlay、Legend 与 Logic Diagram 组件的 schema、JSON round-trip、输入错误、identity / Target、layout artifact、route lowering、composite compile 与直接 Definition 选择不变量
- `standard-react` / `standard-vanilla`：同一 composite input 的 IR 与 lowering 结果等价；同图多 capability 的稳定 contribution key / maker、React 静态按需贡献、Vanilla 部分 / 全量 adapter 数组与直接 IR Definition 接线；无副作用、重复 definition 和 provider key 冲突的诊断
- Kernel 回归：`Path` / `Step`、Core compile 与 renderer 不因未安装 Standard 改变；`@retikz/react` 不再导出 Grid
- Docs：zh/en 同步 Standard 包说明、组件页面、React / Vanilla 示例、从 `@retikz/react` 迁移 Grid 的指引；用真实逻辑图 dogfood LogicBlockBase、Decision、Connector、Junction 与 Callout，并以不导出的 Process / Class / Data recipe 展示组合方式，检查导航、source preview、import 生成和 desktop / 500px 页面

每个 alpha ADR 必须另附测试契约矩阵，并在实现前通过 Architecture Gate。

## 不在 v0.1 范围

- 迁移 `Circle`、`Ellipse`、`Draw`、`EdgeLabel`、Arrow、Pattern、Node shape、Ribbon、`parabola` 或其它 Kernel 内容
- 新增 Core IR、Scene primitive、renderer 特判、Core 到 Standard 的反向依赖，或自动全局注册
- Standard 专有运行时、DOM / editor 状态、selection / history / viewport
- GraphModel、全局 nodes / edges 集合、Port / Group 关系语义、拓扑校验、算法布局、自动路由或避障
- Table / Plot datum、scale、channel / visual encoding、数据 formatter、Legend 领域解析、provenance / interaction 与业务工作流；对应 owner 负责先解析为 Standard Legend 等可绘制输入
- 从 lowering 后的 Kernel IR 或 Scene 反向推断原始 Standard Tier 2 语义
- LLM prompt、模型调用、agent runtime 或自然语言解析器；v0.1 只提供稳定、带描述、可生成的语义契约
- 对外导出 ProcessBlock、ClassBlock、DataBlock 或把 docs recipe 固化为新的 Standard discriminator
- `RadialLayout`、Tree / Layered / Force、subgrid、masonry、Dimension / BraceLabel 等扩展能力；按真实消费证据进入 v0.2 或后续领域版本评估
- 为兼容旧 import 保留 `@retikz/react` 的 Grid alias；迁移以 v0.x 的正确 owner 为准，并提供文档迁移说明

## ADR 约定

每个 milestone 在对应目录内从 `01` 编号。ADR 从 `Proposed` 开始，完成 Architecture Gate 与人工确认后才能进入实现。
