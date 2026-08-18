# ADR-04：Node label inside placement

- 状态：Accepted
- 决策日期：2026-06-26
- 关联：[plot alpha.13 ADR-07](../../../../../../viz/_notes/decisions/plot/v0/v0.1/alpha.13/07-mark-label-surface.md)

## 背景

Bar、cell、sector 等 node-like 图元需要把文字放在图元内部，并稳定表达顶部中点、右侧比例等边界位置；把该语义留在 Plot 会复制 Core 的 label 几何和 provenance

## 决策

`Node.label` 增加 `placement` 与边界位置能力：

- `placement` 支持 `outside` 与 `inside`，默认 `outside`
- `position` 继续支持既有锚点，也支持 box-like boundary 上的 `{ boundary, fraction }`
- `position: "center"` 始终表示几何中心，不受 placement 改写
- `inside` 不与 `pin` 混用；pin 保持外部引线语义
- `{ boundary, fraction }` 首版只承诺 box-like boundary，后续 shape 扩展须遵循同一 Node host contract

Plot mark label 通过 Node host 投递，Core 继续是 label 几何、anchor 与 provenance 的唯一 owner

## 行为、失败语义与兼容性

省略 placement 保持外部标签行为；非法 boundary position 由 Node label schema / compile 诊断。该能力不新增 renderer primitive、Plot 专用 label 字段或独立 pin 语义

## 最终结果与遗留边界

Node label 已可表达 inside/outside placement 并由 Node host 统一消费。任意非 box-like boundary、内部引线或领域 label 布局策略仍需后续契约
