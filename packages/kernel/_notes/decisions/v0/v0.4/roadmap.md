# v0.4 路线总计划

> 状态：alpha.1-alpha.8、beta.1-beta.2、rc.1 已完成并 Accepted。
>
> 本文件只保存 v0.4 的范围、里程碑执行索引和当前状态。未排期方向见 [`backlog.md`](./backlog.md)，早期 brainstorm 与已完成方向的讨论快照见 [`history.md`](./history.md)。
>
> 关联：[`v0 roadmap`](../roadmap.md) · [`core 底座对比分析`](../../../analysis/core-compare-analysis.md) · [`Drawing Complete`](../../../architecture/core-drawing-complete.md)

## 范围边界

v0.4 只做**纵向底座深化（机制 / 引擎 / 契约）**；具体 shape、图表、装饰和编辑器属于横向能力，交由 domain / sugar 包。core 只补这些成品背后的通用表达、计算、扩展或编译机制。

每个 milestone 必须保持：能力归属明确、内部表达通用、内置与自定义同路、React / Vanilla / renderer 闭环。上层包遇到 core 无法表达的通用需求时，先补 core，不在 adapter 或 renderer 建立平行机制。

## 里程碑索引

| milestone | 目标                                                   | 文档                            | 状态        |
| --------- | ------------------------------------------------------ | ------------------------------- | ----------- |
| alpha.1   | `@retikz/math` 与 core 纯几何下沉                      | [roadmap](./alpha.1/roadmap.md) | ✅ Accepted |
| alpha.2   | 可嵌入 Tier 2 + Scope 多态 bounding shape              | [roadmap](./alpha.2/roadmap.md) | ✅ Accepted |
| alpha.3   | 路径圆角、平滑曲线与 contour shape                     | [roadmap](./alpha.3/roadmap.md) | ✅ Accepted |
| alpha.4   | Scene shadow + blend                                   | [roadmap](./alpha.4/roadmap.md) | ✅ Accepted |
| alpha.5   | `@retikz/tex` 与行内 text + math                       | [roadmap](./alpha.5/roadmap.md) | ✅ Accepted |
| alpha.6   | Path kind / Ribbon 关系路径                            | [roadmap](./alpha.6/roadmap.md) | ✅ Accepted |
| alpha.7   | Provider contract、key、Boundary 与 Clip 收敛          | [roadmap](./alpha.7/roadmap.md) | ✅ Accepted |
| alpha.8   | Drawing Complete 收口、`dashOffset` 与剩余通用能力补齐 | [roadmap](./alpha.8/roadmap.md) | ✅ Accepted |
| beta.1    | 编译期契约与 compile 文件结构收敛                      | [roadmap](./beta.1/roadmap.md)  | ✅ Accepted |
| beta.2    | Adapter 作者 API、包根公共面与动画宿主策略收敛         | [roadmap](./beta.2/roadmap.md)  | ✅ Accepted |
| rc.1      | 公开 API 冻结、Boundary 收口、文档与发布产物验收       | [roadmap](./rc.1/roadmap.md)    | ✅ Accepted |

## 当前状态

- Alpha 已完成通用底座扩展：math、可嵌入 Tier 2、路径补强、Scene 视觉、TeX、Ribbon / Path kind、provider contract 与 Drawing Complete 收口。
- Beta 已完成 compile owner、Node 布局度量、Vanilla plain spec、React 包根、Tier 2 反向转换和动画宿主策略检查。
- RC 已完成候选发布验收。2026-07-19 人工裁决允许把已在 rc.1 调整过的 boundary 拟合行为一次收口为 shape-aware `fit` / `gap` contract；该例外之外的公开 API 继续保持冻结。
- 未排期问题不再写入本执行索引；达到启动条件后，从 [`backlog.md`](./backlog.md) 提升到新版本 roadmap 或 ADR。

## 追溯规则

- milestone 的目标、ADR 列表和最终状态以各自 `roadmap.md` 为准。
- 决策原因以 Accepted ADR 为准；本文件不复制实现契约或讨论过程。
- 早期路线讨论只用于解释历史取舍，不作为当前 API 或排期依据。
