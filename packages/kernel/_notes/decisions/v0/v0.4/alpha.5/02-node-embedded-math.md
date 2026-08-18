# ADR-02：带框公式

- 状态：Accepted（已实现；最终随 ADR-03 收敛）
- 决策日期：2026-06-16
- 关联：[ADR-01 tex](./01-tex-package-and-node-math.md) · [ADR-03 行内混排](./03-inline-math-runs.md)

## 背景

带框公式本质是“文本内容 + Node shape”。独立 math 字段会复制节点尺寸、样式和渲染模型，而既有 Node 链路已经能够使用内容 bbox circumscribe shape。

## 决策

- 公式放在 Node text 中，以单个 $$...$$ display run 或显式 runs 表达
- Node 有 shape 时，shape 根据 glyph bbox 与 padding 自动 circumscribe；fill、stroke、cornerRadius、shadow、blendMode、zIndex 等仍是普通 Node 语义
- glyph 输出为 PathPrim，容器输出为既有 shape primitive，renderer 不增加公式专用 primitive
- lowerTex 缺失或公式无效时沿 ADR-01/03 warning 降级，容器仍按普通节点处理，不使 renderer 崩溃

## 兼容性与实现结果

rectangle、circle、ellipse、star、contour 等普通 shape 可复用带框公式模型；React/Vanilla 不提供 TexNode。

## 遗留风险

多内容块堆叠、自动换行、公式内部断行和非矩形容器高级排版仍未定义。
