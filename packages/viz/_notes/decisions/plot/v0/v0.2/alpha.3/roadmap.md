# plot v0.2-alpha.3：交互优化

> milestone 执行路线。长期决策放同目录的 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.2 roadmap`](../roadmap.md) · [`plot v0.2-alpha.2 roadmap`](../alpha.2/roadmap.md) · [`交互与增量运行时设计`](../../../../../../../../notes/architecture/interaction-design.md) · [`_template.md`](../../../../_template.md)
> ⚠️ 暂定：本 milestone 需等待 Kernel 提供并 Accepted headless interaction 的底层能力后进入实现。

## 目标

在 alpha.2 的 Plot 增量边界和 Kernel headless interaction 能力稳定后，补齐 Plot 领域交互语义，使交互反馈与持久化更新沿同一 identity、ownership、presentation 和 transaction 链路运行：

1. **消费 Kernel 交互底座**：使用 Kernel / Render 提供的 target、事件归一化、ownership routing、behavior、presentation 和 domain intent 通用契约，不在 Plot、Plot React 或 Plot Vanilla 内复制事件系统或状态机。
2. **定义 Plot 交互对象**：围绕 datum、series、view、panel、layer、guide 和 locator 建立 Plot 领域可寻址对象、选择映射和交互意图边界。
3. **区分瞬时反馈与持久更新**：hover、drag preview、zoom 等高频反馈进入 Kernel presentation；selection、brush、filter 或其它领域变化通过 Plot owner transaction 更新 Plot snapshot，具体语义按 ADR 冻结。
4. **保持空间一致性**：交互 target、locator、provenance、映射结果、画面、geometry 和 hit-test 使用同一已提交 revision；映射重构和增量优化不能造成交互定位漂移。
5. **响应 Chart 通用需求**：Chart 只有在实际迭代中提出可抽象为 Plot 领域交互的需求时，才作为候选能力插入本 milestone；Chart-specific tooltip、presentation、默认行为和业务状态仍归 Chart / adapter / 上层 runtime。

## 前置

- **alpha.1**：Spatial Mapping、局部坐标、locator 和 provenance 的空间语义稳定。
- **alpha.2**：Plot incremental program、依赖传播、revision 和 fallback 边界稳定。
- **Kernel**：提供并 Accepted identity、ownership、retained renderer、事件 target、事件归一化、presentation 与 domain intent 的 headless interaction 链路；Plot 不绕过 Kernel 直接读取 DOM 或 renderer 对象。
- **adapter / renderer**：React、Vanilla、SVG、Canvas 能消费同一 framework-neutral 交互契约，差异通过 capability 表达。

## ADR 清单

| ADR | 主题                                                                                                                           | Level  | 依赖                                 | 状态   |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------ | ------ |
| 01  | **Plot interaction target 与 selector**：datum、series、view、panel、layer、guide 的空间寻址、locator forwarding 与 owner 边界 | red    | alpha.1、Kernel target / ownership   | 待规划 |
| 02  | **Plot interaction intent**：selection、brush、zoom、filter 等 Plot 领域变化的 intent、snapshot 更新与失败语义                 | red    | ADR-01、alpha.2 Plot program         | 待规划 |
| 03  | **Plot presentation 协作**：hover、drag preview、overlay、动画或高频反馈与 Kernel presentation 的分工和一致性                  | yellow | ADR-01 / ADR-02、Kernel presentation | 待规划 |

## 不在本 milestone 范围

- Kernel 的事件归一化、behavior 状态机、ownership registry、presentation engine 或 renderer hit-test 实现。
- React / Vanilla 私有交互语义、DOM 事件读取、SVG / Canvas 后端分叉。
- Chart-specific tooltip UI、图表默认交互、dashboard filter / scroll / responsive state 和 workspace history。
- 依赖未经 Accepted Kernel 能力的 Plot 私有 fallback runtime。
- 用交互层绕过 Plot owner 直接修改 IRPlot、Data snapshot 或 Core Scene。

## 退出条件

- Plot 领域实体可以通过稳定 identity、locator 和 qualified selector 被命中、查询和路由。
- 瞬时 presentation 与持久化 Plot intent 的边界清楚，持久变化始终回到 Plot owner transaction。
- 画面、geometry、hit-test、locator、provenance 和 interaction target 在同一 revision / materialization state 下保持一致。
- React / Vanilla、SVG / Canvas 具有等价的 Plot 交互语义，未声明的 renderer capability 可以明确诊断或回退。
- 至少贯通一个 Plot 领域交互闭环；Chart 需求只有在能形成通用 Plot 契约时才计入退出条件。

## 执行顺序

```text
Kernel headless interaction Accepted
  → Plot target / selector
  → Plot domain intent
  → Plot presentation 协作
```

具体事件集合、默认手势、状态机细节、文件 scope 和测试矩阵放入对应 ADR 确认后的 plan；本 roadmap 不冻结 Chart UI 或业务交互默认值。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` 是 ADR，Accepted 后只增补状态 / supersede。模板见 [`../../../../_template.md`](../../../../_template.md)。
