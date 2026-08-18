# ADR-01：Scene 图元级 drop shadow

- 状态：Accepted（已实现）
- 决策日期：2026-06-16
- 关联：[ADR-02 blend mode](./02-blend-mode.md)

## 背景

drop shadow 是 SVG、浏览器 Canvas 和 Node Canvas 的共同原生能力，不需要 backend-only 的 blur filter。它适合作为第一个 renderer-agnostic effect，并应沿 opacity 的 IR → Scene → renderer 管线实现。

## 决策

IRNode 和 IRPath 增加 shadow，支持预设字符串或统一对象：

- 预设为 sm、md、lg、xl、2xl、none；字符串等价于 { preset }
- 对象可含 preset、offsetX、offsetY、blur、color、opacity。preset 提供默认值，显式字段逐项覆盖；无 preset 时 offsetX 与 offsetY 必须同时给出
- compile 将输入解析为 canonical DropShadow；字段优先级为显式字段 > preset > schema 默认。默认 color 为 rgba(0,0,0,0.5)，opacity 与颜色 alpha 相乘，blur 是 user-units 的可诊断近似半径
- effect 只跟随元素主几何图元：Node 的 shape，Path 的主路径及端点箭头；不继承到 text、label、pin、step label、GroupPrim 或 Scope 子树
- 单个 outer shadow；none 等价于当前省略但保留显式语义。三端使用原生 shadow 能力，不静默降级

## 兼容性与实现结果

shadow 为可选字段，缺省时 Scene 与渲染逐字不变；预设、canonical resolve、SVG filter 和 Canvas shadow 已落地。

## 遗留风险

多重/内阴影和 group/scope 级整体投影未定义；group 级能力还需处理 SVG isolation 与 Canvas 离屏合成。
