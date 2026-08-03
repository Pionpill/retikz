# ADR-01：Chart 基础设施与封闭 recipe 主链

- 状态：Accepted（公开入口仍受上游 capability gate 阻塞）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [Chart 总设计](../../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md)

## 背景与目标

Chart 是 Plot 之上的 Tier 3 类型封装，不是新的绘图引擎。它需要把封闭的常用图表类型确定性地解析为完整 PlotSpec，同时保留 Plot 的扩展、诊断和追溯能力，并让 JSON、React、Vanilla 共享同一语义。

Plot 已拥有 GoG schema、definition / registry、lowering、provenance 与 locator。Chart 必须消费这些正式能力，不能复制 Plot IR、数据执行、registry 或 renderer 路径。完整 Chart 还会递归包含 Plot 与 Standard presentation，因此公开入口必须等待宿主能够正式组装跨 namespace 依赖并保持空间透明。

## 决策：封闭 recipe 目录与统一 resolution

Chart type 是官方维护的封闭目录，不提供 `defineChart`、Chart registry 或运行时 recipe 注入。每个 type 由严格 ChartSpec variant 与静态 recipe 共同定义；未知 type fail-loud。需要自定义图形时直接使用 Plot，自定义 Mark、Scale、Coordinate 等横向能力继续通过 Plot definition / registry 与正式 pipeline 扩展。

每个 recipe 负责声明该 type 的完整 Plot 配方、不可撤销的核心成员、可调整的表现性默认和稳定语义目标；统一 resolver 负责应用覆盖与扩展、复验核心不变量、生成最终 PlotSpec、结构化诊断和 inspection。不同 type 不得各自发明 merge、错误或 adapter 语义。

ADR-04 加入首批 `scatter` / `bubble` Canonical Types 且上游 gates 满足时，才原子公开 ChartSpec、type definitions 与 React / Vanilla authoring。在此之前不得公开没有 Canonical Type 的空 Chart surface。

## 基础数据结构与公开契约

所有 variant 共享 Plot-compatible 的 `data`、`transform`、`scales`、`coordinate` / `composition`、`guides`、`marks`、`theme`、`layout`、`size` 与 `meta` 能力轴，并各自冻结核心 `encoding`、`mark` 与 `components` 形态。

- `coordinate` 与 `composition` 互斥
- type-specific patch 只能修改 recipe 明确开放的表现性字段，不能删除或替换核心成员
- 顶层 Plot collections 表达显式替换或追加，但不得破坏 type identity
- Chart IR 始终 100% JSON-safe；函数型 runtime 不进入 ChartSpec
- 公开 IR 类型由最终 strict schema 推导，不维护平行 interface

统一 inspection 至少能观察 Chart / Plot identity、最终成员的稳定语义目标、成员种类、核心性、最终 JSON 值及其来源。来源区分 type default、用户 override 与 Plot extension；后续 style / presentation ADR 只能扩展这一份 inspection，不得另建平行真源。

## 行为、失败语义与兼容性

- type 核心配方始终先成立；用户覆盖和 Plot extension 只能在 recipe 授权边界内增强它
- root transform 先于 type 必需 transform；显式 mark 按声明顺序追加，不能替换隐式核心 mark
- scale、空间根、guide 与 type patch 使用稳定语义目标解析，不依赖数组下标或内部声明偶然性
- 表现性 guide defaults 可被显式 guides 替换；核心 transform、mark、数据角色和结构性 composition 不可撤销
- 保留 ID 与用户 ID 冲突、重复目标、重复 scale、空间根冲突、缺失 capability 或核心配方破坏均 fail-loud，不静默覆盖或降级为另一 type
- Chart 有 `id` 时，Plot identity 与 Chart identity 保持稳定关联；无 `id` 时由 compile occurrence 区分实例，不使用全局计数器
- resolver 错误提供稳定 code、结构化 path 与适用的 target / conflicting identity / cause，使用户能定位可修改输入

React 支持 spec 与 DSL authoring，Vanilla 支持 spec factory 与 runtime。两者必须调用同一 Chart schema / resolver，并生成与手写 JSON 等价的 ChartSpec 与 PlotSpec；JSX children 只是 JSON-safe Plot extension 的 authoring sugar，不成为 adapter 私有能力。

## 功能与包边界

- `@retikz/chart` 拥有封闭 type catalog、ChartSpec variants、recipe contract、统一 resolution 与 inspection
- `@retikz/plot` 拥有 GoG schema、definition / registry、coordinate / guide / mark 语义、lowering 与领域 trace
- `@retikz/standard` 拥有领域无关 presentation layout 与 surface composite
- Kernel / Core 拥有 composite dependency assembly、Scene 编译和 renderer-neutral spatial handle / selector 基础
- chart-react / chart-vanilla 只拥有 authoring、依赖注入与 runtime 接线，不拥有 defaults 或平行 IR

每个公开 Chart type 形成独立静态 composite definition。Chart definition bundle 只包含 Chart-owned definitions；宿主负责沿正式依赖协议组装 Chart、Plot 与 Standard definitions，并让它们共享同一 datasets 与 Plot lowering options。缺失或冲突依赖必须在 compile 前 fail-loud。

公开 Chart 还必须保持空间透明：Chart 可以增加外层 identity，但 Plot 的 view、track、facet、plotArea、axis、series、datum 等内部 handle 与 provenance / locator / lineage 不得被吞掉、复制或重命名；qualified selector 必须能从 Chart 进入 Plot body 后继续委托给 Plot / Core。

## 架构验证

- 归属结论：Chart 是 Encapsulation Complete 的主责包，不新增独立能力域
- 内部表达：封闭 recipe + 统一 resolver 能组合现有 Plot schema、registry 与 lowering
- 外部扩展：Chart type 层不开放 registry；横向可视化能力继续沿 Plot define-registry 同路扩展
- 下游闭环：Chart 解析完整 PlotSpec，presentation 交 Standard，最终编译交 Core / Render
- adapter 等价：React / Vanilla / JSON 共用同一 IR 与 resolver，不允许 adapter-only 默认或 renderer 特判
- capability gate：跨 namespace dependency preflight、Vanilla identity 与 qualified spatial delegation 由其 owner 提供；首个 Canonical Type 与这些能力同时到位前不公开完整 Chart authoring

## 被否决方案

- 开放 `defineChart` / Chart registry：会复制 Plot 的扩展问题并破坏封装层的低学习成本边界
- Chart 直接 lower Plot 或复制 Plot registry：会形成平行可视化 pipeline
- adapter / renderer 补齐 Chart defaults 或 presentation：会破坏 JSON、React、Vanilla 与 renderer parity
- 用数组下标定位隐式成员：无法形成稳定 patch、inspection 与兼容契约

## 测试策略摘要

需要 schema、resolution、composite、dependency / spatial gate、authoring parity 与 trace 六层证据。关键不变量是封闭 dispatch、核心配方不可撤销、扩展同路进入 Plot、结构化错误稳定、Chart 包裹前后 Plot identity / provenance / locator / lineage 连续，以及上游 gates 到位后三个入口生成等价 canonical result。

## 不在本 ADR 范围

- 任何具体 Canonical Type variant
- style preset、palette 与 presentation
- Kernel dependency assembly、Vanilla identity 或 Core selector 的具体 API 与实现
- Chart registry、`defineChart` 与自定义 type
