# ADR-01：Chart 基础设施与封闭 recipe 主链

- 状态：Superseded（2026-08-22，由 [ADR-09](./09-family-recipe-chart-schema.md) 替代；Chart → Plot 正式主链与精确 schema 原则已由 ADR-09 重述）
- 决策日期：2026-07-31
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-03](./03-presentation-standard-layout.md) · [Chart 总设计](../../../../../architecture/chart-design.md)

## 背景与目标

Chart 是 Plot 之上的 Tier 3 类型封装，不是新的绘图引擎。它需要把封闭的常用图表类型确定性地解析为完整 IRPlot，同时保留 Plot 的扩展、诊断和追溯能力，并让 JSON、React、Vanilla 共享同一语义。

Plot 已拥有 GoG schema、definition / registry、lowering、provenance 与 locator。Chart 消费这些正式能力，不复制 Plot IR、数据执行、registry 或 renderer 路径。

## 核心决策

Chart type 是官方维护的封闭目录，不提供 `defineChart`、Chart registry 或运行时 recipe 注入。每个 type 由严格 IRChart variant 与静态 recipe 定义；未知 type 必须 fail-loud。需要自定义图形时直接使用 Plot，自定义 Mark、Scale、Coordinate 等横向能力继续通过 Plot definition / registry 扩展。

每个 recipe 声明完整 Plot 配方、不可撤销的核心成员、可调整的表现性默认和稳定语义目标；统一 resolver 负责应用覆盖与扩展、复验核心不变量、生成最终 IRPlot、结构化诊断和 inspection。不同 type 不得各自发明 merge、错误或 adapter 语义。

## 基础数据结构与公开契约

所有 variant 共享 Plot-compatible 的 `data`、`transform`、`scales`、`coordinate` / `composition`、`guides`、`marks`、`theme`、`layout`、`size` 与 `meta` 能力轴，并各自冻结核心 `encoding`、`mark` 与 `components` 形态：

- `coordinate` 与 `composition` 互斥
- type-specific patch 只能修改 recipe 明确开放的表现性字段，不能删除或替换核心成员
- 顶层 Plot collections 表达显式替换或追加，但不得破坏 type identity
- Chart IR 始终 100% JSON-safe；函数型 runtime 不进入 IRChart
- 公开 IR 类型由最终 strict schema 推导，不维护平行 interface

统一 inspection 至少观察 Chart / Plot identity、最终成员的稳定语义目标、成员种类、核心性、最终 JSON 值及其来源；来源区分 type default、用户 override 与 Plot extension。style / presentation 只能扩展这份 inspection。

## 行为、失败语义与兼容性

- type 核心配方始终先成立；用户覆盖和 Plot extension 只能在 recipe 授权边界内增强它
- root transform 先于 type 必需 transform；显式 mark 按声明顺序追加，不能替换隐式核心 mark
- scale、空间根、guide 与 type patch 使用稳定语义目标解析，不依赖数组下标或内部声明偶然性
- 表现性 guide defaults 可被显式 guides 替换；核心 transform、mark、数据角色和结构性 composition 不可撤销
- 保留 ID 与用户 ID 冲突、重复目标、重复 scale、空间根冲突、缺失 capability 或核心配方破坏均 fail-loud
- Chart `id` 只标识外层 Chart Surface，不隐式派生内部 Plot `id`；内部 Plot 由 compile occurrence 区分实例，不使用全局计数器
- resolver 错误提供稳定 code、结构化 path 与适用的 target / conflicting identity / cause

React 支持 spec 与 DSL authoring，Vanilla 支持 spec factory 与 runtime；两者调用同一 Chart schema / resolver，并生成与手写 JSON 等价的 IRChart 与 IRPlot。JSX children 只是 JSON-safe Plot extension 的 authoring sugar，不成为 adapter 私有能力。

## 功能与包边界

- `@retikz/chart` 拥有封闭 type catalog、IRChart variants、recipe contract、统一 resolution 与 inspection
- `@retikz/plot` 拥有 GoG schema、definition / registry、coordinate / guide / mark 语义、lowering 与领域 trace
- `@retikz/standard` 拥有领域无关 presentation layout 与 surface composite
- Kernel / Core 拥有 composite dependency assembly、Scene 编译和 renderer-neutral spatial handle / selector 基础
- chart-react / chart-vanilla 只拥有 authoring、依赖注入与 runtime 接线，不拥有 defaults 或平行 IR

Chart type 在 Core compile 前统一归一为 canonical `IRChart`；Chart 只发布完整 key 为 `chart.chart` 的单一静态 composite definition，不发布逐类型 Core definitions。宿主沿正式依赖协议组装 Chart、Plot、Layout 与 Standard definitions，并让它们共享 datasets 与 Plot lowering options；缺失或冲突依赖必须在 compile 前 fail-loud。

Chart 保持空间透明：Plot 的 view、track、facet、plotArea、axis、series、datum 等内部 handle 与 provenance / locator / lineage 不被吞掉、复制或重命名；qualified selector 可以从 Chart 进入 Plot body 后委托给 Plot / Core。

## 当前实现结果与遗留风险

typed recipe 基础仍由本 ADR拥有；基础 Chart、canonical `IRChart`、单一 `chart.chart` root 和公开 authoring 统一由 [ADR-03](./03-presentation-standard-layout.md) 取代，避免两套 Chart root contract 并存。

长期风险是 Chart 的封装必须继续复用 Plot 的正式扩展与诊断链，并保持 Chart 包裹前后的 Plot 内部 handle、provenance、locator 与 lineage 连续；任何新的 type 不能借此建立 Chart 私有 registry 或 renderer 分支。
