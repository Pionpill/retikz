# ADR-011：Flow 单折角路由

- 状态：Accepted
- 决策日期：2026-09-12
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Flow Layout Definition](./004-flow-layout-definition-registry.md) · [Flow 结果交付](./005-flow-orchestration-result-artifact.md)

## 背景与目标

Flow 已提供直线与由布局方向决定的正交路由，但作者无法明确指定一条关系先水平还是先垂直。分支与汇合图需要这种可预测的单折角连接，同时仍由 Flow 确定节点位置，不要求作者填写坐标或 Core 路径。

## 决策

Flow 在现有 routing 契约中增加 `-|` 与 `|-`，分别表示从 authored source 到 target 先水平后垂直、先垂直后水平。它们是确定的路由意图，不是自动避障策略，不因图的方向、箭头反转或平行关系而改变转折顺序。

能力由 Diagram Flow 拥有，沿现有 Flow Layout Definition、registry、resolve 与输出验证链路消费。Graph/Core 继续负责实际路径、节点边界裁剪、圆角和绘制；不新增独立 routing registry 或 renderer 分支。

## 基础数据结构与公开契约

```ts
type FlowRouting =
  | { kind: 'straight' }
  | { kind: 'orthogonal'; cornerRadius?: number }
  | { kind: '-|'; cornerRadius?: number }
  | { kind: '|-'; cornerRadius?: number };
```

根级、Group 与单条 Relation 原有 routing 入口均可使用新模式。Relation 的 `source`、`target` 仍为 element id 字符串；不引入 anchor、port 或手写 route 输入。Direct IR、Vanilla 与 React 表达同一契约。

Layout Definition 的 `capabilities.routingKinds` 增加这两个合法值，内置 layered 声明支持全部四种。自定义 Definition 只有声明对应能力才能接收该意图；不支持时按既有 capability 错误拒绝，不静默退回其他模式。

`defaults.routing.orthogonalCornerRadius` 是三种轴对齐路由共享的末端圆角默认值：至少支持其中一种时必须提供，仅支持 straight 时不得提供。字段名称保持不变；`cornerRadius` 的有效值依次取实例、祖先轴对齐 routing、Definition 默认。显式 `0` 禁用圆角，内置末端值保持 `8`。

Provider 仍返回已存在的 relation `points` 与可选 `labelBounds`，不新增输出字段。新模式的未裁剪参考点链从 source bounds 中心到 target bounds 中心；非对齐时恰好经过一个由转折顺序确定的拐点。Artifact 的 `route.kind` 保留 `-|` 或 `|-`，并携带有效 `cornerRadius` 与参考点链；它不是圆角、边界裁剪后的最终描边轮廓。

## 行为、失败语义与兼容性

- 两轴均不相等时，`-|` 的拐点为 `[target.x, source.y]`，`|-` 为 `[source.x, target.y]`；正负方向均遵循同一顺序
- 两端水平或垂直对齐时，退化为两个不同参考点组成的直线，不保留零长度段
- 两端中心重合时无法构成有效单折角路由，沿用 `FlowLayoutOutputInvalid`；内置 layered 仍不支持 self-loop
- 输出验证检查参考端点、单折角形状与轴顺序；自定义 provider 返回反向折角、额外绕行或对角线时，以同一输出错误报告 relation 位置和关联 id
- 圆角和边界裁剪复用 Core；可见线段可能被裁剪缩短，但不通过改变转折方向、增大 gap 或添加绕行修复重叠节点
- 平行关系允许重叠，路径与其他节点相交不自动绕行；标签沿用现有测量与位置规则，不保证全局避碰
- 现有 straight、orthogonal、默认路由、排列方向和所有默认 gap 保持原有行为；新增枚举值只影响显式选择新模式的输入和相应 provider 能力声明

本决策扩展 ADR-004/005 的路由值域与新模式输出约束，其余布局、结果和错误契约保持不变。
