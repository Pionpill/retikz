# v0.5.0-alpha.1 Roadmap：Node 锚点对齐定位

> 状态：Accepted，implementation / adversarial test / docs / changelog 与人工确认均已完成。

## 目标

为 `@retikz/core` 增加 Node anchor-to-anchor 定位，使上层 composite 可以基于 core 的真实文本、shape、padding、margin、scale 与 rotate 布局结果排列普通 Node，而不复制或预估 Node 几何。

## 决策列表

| ADR                                    | 状态     | 主题              | 说明                                                              |
| -------------------------------------- | -------- | ----------------- | ----------------------------------------------------------------- |
| [ADR-01](./01-node-anchor-position.md) | Accepted | Node 锚点对齐定位 | Node-only position 变体、两阶段布局、namespace 生命周期与错误契约 |

## 范围

- `IRAnchorPosition` 与 `Node.position` additive schema。
- Node 自身布局完成后的 anchor-to-anchor 平移。
- Node、Coordinate、resolved Scope 目标。
- Scope placeholder 与已解析零尺寸 Scope 的显式生命周期区分。
- React / Vanilla 等价 authoring、schema / compile / adapter 测试与中英文文档。

不在本 milestone 范围：

- Scope 自身 anchor / transform pivot。
- Coordinate 自身 anchor 对齐。
- forward reference、拓扑排序、循环约束求解与增量布局。
- renderer 或 Scene 新字段。

## Gate

- [x] ADR-01 Architecture Gate PASS。
- [x] 人工确认 ADR-01 可以进入实现。
- [x] Spec-First schema / compile tests 先失败、后实现。
- [x] adversarial BLOCKING 清空。
- [x] Node overview 与 placement reference 中英文同步。
- [x] ADR / changelog / roadmap 收尾并获得 commit 授权。
