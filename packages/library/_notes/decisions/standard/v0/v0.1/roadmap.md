# Standard v0.1 Roadmap

> 状态：alpha.1～alpha.4 已完成。关联：[Standard v0 roadmap](../roadmap.md) · [Standard Drawing Library 设计](../../../../architecture/standard-library-design.md) · [能力完备性总纲](../../../../../../../notes/architecture/capability-design.md) · [Core Drawing Complete](../../../../../../kernel/_notes/architecture/core-drawing-complete.md)
>
> 图式语义后继：[Graph v0.1 roadmap](../../../../../../schematic/_notes/decisions/graph/v0/v0.1/roadmap.md) 已把 alpha.3 元素迁入 Diagram。布局后继：[Layout v0.1 roadmap](../../../layout/v0/v0.1/roadmap.md) 已在 alpha.1 接管排版布局
>
> v0.1 是 Standard 包家族的首个版本。`Grid`、`Axes`、`Frame` 与 Legend 建立宿主无关 Tier 2 composite；alpha.2 曾验证的通用布局已在当前 alpha.4 迁入 Layout package family，Standard 回归横向绘图拓展边界，并在同一当前版本内增加任意 child Surface。

## 版本目标

1. 初始化 `@retikz/standard`、`@retikz/standard-react`、`@retikz/standard-vanilla`，建立独立 `standard` release group 和可发布的包边界
2. 将 React `Grid` 迁为宿主无关的 Standard Tier 2 composite，并新增 Axes 与 Frame，使 React 与 Vanilla 对同一 JSON-safe 输入得到等价的 composite IR 与 lowering 结果
3. 建立 Standard 的直接 Definition 接入约定：用户按当前图选择 Definition 并通过 Core `CompileOptions.composites` 接入；React 保持组件静态 adapter，Vanilla 提供显式 adapter 数组便利入口
4. 固化 Standard 按 Core 可扩展机制横向分域的代码范式，为后续 definition、composite 与 Sugar 增长留出稳定位置，不预建空目录或平行机制
5. alpha.2 建立 renderer-agnostic Box Layout Profile，验证 Flex、Grid、Overlay、LayoutItem、layout artifact 与 Core layout-aware composite 的完整闭环
6. 建立可由直接作者、Plot 与 Table 复用的通用 Legend 呈现；领域包保留 scale、visual encoding、formatter、provenance 与交互解析，Standard 统一 Legend schema、layout-aware compile 与领域无关 artifact
7. alpha.3 验证 headless `GraphFrame`、统一 `GraphNode`、`GraphConnector` 与 Callout 后，将这些图式契约迁入 Graph
8. alpha.4 配合 Layout v0.1 alpha.1 把排版布局迁入独立 owner，提供单一任意 `IRChild` 的 renderer-neutral Surface，并以独立能力子入口接管可选 Shape、Arrow、Clip 与 Ribbon

## 能力边界

- **主责包**：`@retikz/standard` 拥有 Standard schema、composite definition、factory 与 lowering；它依赖 `@retikz/core`，需要几何计算时依赖 `@retikz/math`，需要排版组合时依赖 `@retikz/layout` 根入口或 `/compose`
- **协作包**：`standard-react` 与 `standard-vanilla` 只将同一 Standard 输入接到 `@retikz/react` / `@retikz/vanilla`，不得复制 schema、几何计算或 registry 合并
- **领域消费包**：Plot、Table 等官方 Tier 2 包可以使用兼容版本单向依赖 Standard；它们先把领域语义解析为 Standard 输入，并继续拥有 provenance / locator、交互与领域诊断，Standard 不反向依赖或读取领域 IR
- **Core 保留**：IR、Scene、`CompileOptions`、definition / registry contract、compile、renderer 语义，以及 `Path` / `Step` 等基础图元
- **语义真源**：Standard 拥有的 Tier 2 schema 以既有 Core composite IR 持久化；输入保留 Standard discriminator 与结构化引用，lowering 后的 Kernel IR / Scene 只是派生产物
- **Standard composite**：`Grid`、`Axes`、`Frame`、Legend 与 Surface 复用 Core composite registry；排版 Layout 由独立 package family 通过同一 registry 接入
- **领域边界**：Standard 不拥有 Diagram Graph、GraphModel、全局 nodes / edges、Port / Group 规则、拓扑校验、算法布局或编辑器状态
- **Legend 边界**：Standard 拥有已经解析好的 title、`items | ramp`、任意 `IRChild` sample、Legend 排版规则与 artifact；Layout 提供领域无关排版 composition；Plot/Table 拥有 channel / scale、visual encoding、formatter、theme mapping、领域 provenance 与交互意图

## Milestones

| Milestone                       | 主题                                                  | 主要产出                                                                                                                                                                                                | ADR / Gate                                                                                                                                               |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [alpha.1](./alpha.1/roadmap.md) | **首批 Tier 2 composite、包初始化与 Definition 接入** | 三个 package manifest、Grid / Axes / Frame 的 schema / definition / lowering / React / Vanilla authoring、Grid 迁移、直接 Core Definition 注入、Vanilla adapter 数组、双语 docs / migration / changelog | 首批 composite 的输入、Core definition 注册与跨 adapter 等价证据；确认无全局注册、Core 不反向依赖 Standard，且按项 definitions 进入同一 Core option 路径 |
| [alpha.2](./alpha.2/roadmap.md) | **通用 Box Layout 与 Legend**                         | Flex、Grid、Overlay、LayoutItem、layout artifact 与 inspector；领域无关 Legend items / ramp、任意 IRChild sample、typed artifact、直接 Definition 接入与 React / Vanilla authoring                      | Core layout-aware composite 主链；Legend 复用 Box Layout，领域包保留解析、provenance / locator 与交互                                                    |
| [alpha.3](./alpha.3/roadmap.md) | **语义逻辑图组件（历史）**                            | 验证 headless `GraphFrame`、统一 `GraphNode`、`GraphConnector` 与 Callout；现行 owner 与后续演进由 Graph alpha.1 接管                                                                                   | ADR-01～05 已 Superseded；直接 Definition 原则 ADR-06 继续约束 Standard 与 Graph                                                                         |
| [alpha.4](./alpha.4/roadmap.md) | **Layout owner 迁移与横向绘图拓展**                   | 完成 Layout owner 迁移、任意 child Surface、可选 Shape / Arrow / Clip providers、Sector 统一、五种 ClipShape 与 Standard Ribbon Path Kind 完整迁移                                                      | ADR-01～05 均已 Accepted；Core 保留通用 provider graph、Path host 与 renderer-neutral compile 边界                                                       |
| beta.1                          | **收口与发布准备**                                    | public API 审查、Definition 组合与冲突诊断、tree-shaking / side-effect、adversarial tests、双语 docs、release / package checks                                                                          | Beta completeness audit；alpha completeness 全部闭环且无其它 Kernel 迁移遗留                                                                             |

## Standard Definition 接入机制

v0.1 只提供显式的细粒度 Definition 接入，不建立隐式全局 registry 或 Standard 自己的组合层：

- **按项使用**：每个 composite owner 都从包根入口提供独立的 `XxxDefinition` 与 factory。直接编译把当前图需要的 definitions 放入 Core `CompileOptions.composites`；三个包保持 `sideEffects: false`，由消费方 bundler 对未使用导出做 tree-shaking
- **直接接入**：Standard 不再提供 module、bundle、all preset 或其它跨 composite compile 组合对象；Core registry 直接接收调用方选择的 definitions
- **adapter 接线**：React JSX 继续由组件静态 adapter 按实际使用项贡献 definition；Vanilla embed 继续显式传 adapter 数组，并提供当前版本全量便利数组。adapter 数组属于 authoring 接线，不转化为 Standard compile preset
- **冲突模型**：definition 合并、重复 composite key、缺失 definition 与 warning/error 均沿 Core registry / diagnostics 语义处理；Standard 不另造“内置优先”或静默覆盖规则
- **领域包依赖**：Plot/Table 直接组合所需 Standard definitions 进入自己的 compile options；不使用 module identity、全局自动注册或私有去重

Grid、Axes、Frame、Legend 与 Surface 都通过 Core 既有 `CompositeDefinition` 机制注册。Layout 迁移后也直接使用同一机制，不由 Standard 转手注册。调用者显式传入当前图需要的 definitions 后，Core 才将相应能力接入 `CompileOptions.composites`；嵌套能力的跨 namespace 闭包由 Core provider graph 统一装配，不传入时，未注册 composite 必须保持 Core 的明确诊断。

公开 Definition、factory 与 adapter 的最终命名由各 milestone ADR 冻结；组合接入统一以 alpha.3 ADR-06 的 direct Definition contract 为准。

## Tier 2 语义约定

- GraphFrame、GraphNode、GraphConnector 与 Callout 的现行 owner、namespace 和图式职责由 [Graph v0.1](../../../../../../schematic/_notes/decisions/graph/v0/v0.1/roadmap.md) 维护；Standard 不保留对应 discriminator、Definition 或 adapter
- FlexLayout、GridLayout、OverlayLayout 与通用 LayoutItem 由 Layout v0.1 维护；Standard Legend 只通过 Layout `/compose` 复用排版，现有 Frame 继续使用已验证的 `expand` 主链，除非 ADR 证明必须迁移
- Legend 以领域无关 Standard 输入保存 title、`items | ramp`、任意 `IRChild` sample 与呈现布局；Plot/Table 只把各自领域解析结果转换为该输入，不把 channel、scale、Cell selector、formatter 函数或 interaction state 注入 Standard schema
- Surface 只保存单一任意 `IRChild`、box appearance 与完整 Scope props；Chart / Table 负责把领域 token 和内容解析为 Surface 输入，Standard 不读取 IRPlot、Chart presentation 或 Table 语义
- 即使某个组件可以同步展开，只要其角色需要跨 JSON 持久化、工具链处理或 LLM 编辑保留，就不能仅作为 React / Vanilla Sugar
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
    surface/               # 任意 child Surface schema、definition 与 layout-aware lowering
    shared/                # 跨 composite 的 JSON-safe Path style schema
  index.ts                 # 只聚合稳定公开入口
```

- `arrows/`、`shapes/` 等目录是能力 owner；目录内部再按复杂度增量创建 `schema.ts`、`types.ts`、`define.ts`、`definitions.ts`、`registry.ts`、`pipeline.ts`、`factory.ts` 等文件。它们仍遵守 `shared → schema / contract → provider → pipeline` 的依赖方向，但不把这些层提升为 Standard 根目录 owner
- 每个 Standard composite 各自拥有 JSON-safe schema、composite definition、factory 与 lowering。轻量、无布局能力通过 Core structured expand result 输出 `IRChild` contribution；需要测量或 artifact 的能力通过 Core layout-aware compile 输出 Core children、typed artifact 与适用的 spatial declarations。两条分支都不得构造平行 Standard Scene 或 renderer descriptor
- `composites/shared/` 只拥有跨 composite 的 JSON-safe 样式 schema；格点枚举等无状态纯函数仍在 `shared/grid/`，不得让任一 composite owner 成为另一个可选 capability 的前置依赖
- 没有 v0.1 实现的机制目录不应预建；上图表达稳定 owner 位置，不是本版必须创建的空目录清单

两个 adapter 按宿主职责组织：

```text
packages/library/standard-react/src/
  grid/                   # React props -> Standard Grid composite input
  axes/                   # React props -> Standard Axes composite input
  frame/                  # React children -> Standard Frame composite input
  legend/                 # React props -> Standard Legend composite input
  surface/                # React child -> Standard Surface composite input
  index.ts

packages/library/standard-vanilla/src/
  grid/                   # Vanilla builder -> Standard Grid composite input
  axes/                   # Vanilla builder -> Standard Axes composite input
  frame/                  # Vanilla builder -> Standard Frame composite input
  legend/                 # Vanilla builder -> Standard Legend composite input
  surface/                # Vanilla child -> Standard Surface composite input
  preset/                 # 当前版本全量 Vanilla adapter 数组便利入口
  index.ts
```

adapter 不持有 Standard schema、几何 helper、provider table 或 lowering；对等规则由 Standard 包测试锁定。

## 测试与文档基线

- `standard`：Grid、Axes、Frame、Legend 与 Surface 的 schema、JSON round-trip、输入错误、identity / Target、Legend artifact、Surface allocation / visual bounds / spatial handle、composite compile、Layout composition 消费与直接 Definition 选择不变量
- `standard-react` / `standard-vanilla`：同一 composite input 的 IR 与 lowering 结果等价；同图多 capability 的稳定 roots / providers、React 静态按需贡献、Vanilla 部分 / 全量 adapter 数组与直接 IR Definition 接线；无副作用、重复 definition、dataset 与 provider key 冲突的诊断
- Kernel 回归：`Path` / `Step`、Core compile 与 renderer 不因未安装 Standard 改变；`@retikz/react` 不再导出 Grid
- Docs：zh/en 同步 Standard 包说明、组件页面、React / Vanilla 示例与从 `@retikz/react` 迁移 Grid 的指引；Diagram/Graph 单独维护图式元素、recipe、source preview 与 Schema 发现

每个 alpha ADR 必须另附测试契约矩阵，并在实现前通过 Architecture Gate。

## 不在 v0.1 范围

- 迁移 `Circle`、`Ellipse`、`Draw`、`EdgeLabel`、Pattern、`parabola` 或其它未经独立 ADR 确认的 Kernel 内容
- 新增 Core IR、Scene primitive、renderer 特判、Core 到 Standard 的反向依赖，或自动全局注册
- Standard 专有运行时、DOM / editor 状态、selection / history / viewport
- GraphModel、全局 nodes / edges 集合、Port / Group 关系语义、拓扑校验、算法布局、自动路由或避障
- Table / Plot datum、scale、channel / visual encoding、数据 formatter、Legend 领域解析、provenance / interaction 与业务工作流；对应 owner 负责先解析为 Standard Legend 等可绘制输入
- 从 lowering 后的 Kernel IR 或 Scene 反向推断原始 Standard Tier 2 语义
- LLM prompt、模型调用、agent runtime 或自然语言解析器；v0.1 只提供稳定、带描述、可生成的语义契约
- 对外导出 ProcessBlock、ClassBlock、DataBlock 或把 docs recipe 固化为新的 Standard discriminator
- `RadialLayout`、Tree / Layered / Force 等算法布局；由图关系与算法布局 owner 评估，不进入 Standard
- subgrid、masonry 等排版能力；按真实消费证据进入 Layout 后续版本评估
- Dimension / BraceLabel 等绘图拓展；按真实消费证据进入 Standard v0.2 或后续版本评估
- 为兼容旧 import 保留 `@retikz/react` 的 Grid alias；迁移以 v0.x 的正确 owner 为准，并提供文档迁移说明

## ADR 约定

每个 milestone 在对应目录内从 `01` 编号。ADR 从 `Proposed` 开始，完成 Architecture Gate 与人工确认后才能进入实现。
