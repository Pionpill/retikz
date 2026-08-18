# ADR-05：Node label 视觉盒间距

- 状态：Accepted
- 决策日期：2026-07-23

## 背景

旧 `NodeLabel.distance` 表示边界到 label 中心的距离，长文本会穿入节点，上下净距也随字体高度变化；pin、Scene measured height、bbox 与 viewBox 使用不同近似，无法共享视觉几何

## 决策

`distance` 改为 Node 边界与旋转后 label 视觉盒沿放置方向的净间距。默认链保持 `label.distance ?? CompileOptions.labelDistance ?? 12`；position 默认 top，placement 默认 outside，rotate 默认 none，keepUpright 默认 false。center 忽略 distance；outside offset 为 `distance + projectedHalfExtent`，inside offset 为其负值，不 clamp 或碰撞求解

投影半径由最终 label 旋转角和放置方向 `(ux, uy)` 计算：

```text
extent = |ux cosθ + uy sinθ| × width / 2
       + |ux (-sinθ) + uy cosθ| × height / 2
```

八方向、数字角度和 `{ boundary, fraction }` 使用确定的 attachment unit vector；radial 为该向量角，tangent 为 radial + 90°。Node rotate 只在最终 layout 投影阶段应用一次

Node label 路径统一规范 text / TeX metrics：width、height、ascent、descent 必须 finite 且 nonnegative；缺失 ascent / descent 时从 visualHeight 补全，并保证 `ascent + descent === visualHeight`。TeX 的 width / height / depth 必须合法且 `depth <= height`，非法 run 按既有 `TEX_INVALID` 跳过

布局分两阶段：先测量内容与样式，待 Node provisional rect、padding、shape 和 circumscribe 确定后再求 attachment、centerOffset、rotation 和 pin。`NodeLabelLayout.centerOffset` 相对最终 Node rect，center、pin、emit、bbox 和 auto viewBox 全部消费同一 resolved geometry。label OBB 四角经过 Node rotate 与 Scope transform 投影；Scope bbox 仍只收集 child outerRect，不把 label / pin 改入 Scope target bbox

`NodeLabelSchema.distance` 与 `CompileOptions.labelDistance` 为 finite nonnegative number；0 合法，NaN / Infinity / negative 在布局前 fail-loud。React / Vanilla 无新 authoring 字段

## 行为、失败语义与兼容性

IR 仍使用数值 distance，默认值链与 center placement 不变；plain、multiline、mixed、TeX label 的 center、baseline、pin、Scene bounds 和 auto viewBox 共享 resolved visual box。Node 正文与 path/edge/ribbon label 的既有 metrics 不变

## 最终结果与遗留边界

label visual box 已成为 spacing、pin、emit、bbox 和 viewBox 的单一真源。未提供全局 label 碰撞避让、自动 fit、独立 label observer 或领域标注布局
