# ADR-02：Scene 图元级 blend mode

- 状态：Accepted（已实现）
- 决策日期：2026-06-16
- 关联：[ADR-01 drop shadow](./01-scene-drop-shadow.md)

## 背景

SVG mix-blend-mode 与 Canvas globalCompositeOperation 对 W3C 分离式 blend mode 有共同交集。element 级效果可在扁平 Scene 中保持 renderer-agnostic；嵌套 group isolation 则属于另一层语义。

## 决策

IRNode 和 IRPath 增加可选 blendMode，使用包含 normal 在内的 16 个闭集值：normal、multiply、screen、overlay、darken、lighten、color-dodge、color-burn、hard-light、soft-light、difference、exclusion、hue、saturation、color、luminosity。缺省或 normal 不改变结果，非法值在 schema 边界拒绝。

blendMode 只作用于主几何图元和 Path 端点箭头，不作用于 text、label、pin、step label，不级联到 GroupPrim/Scope。语义是该图元与同一 Scene 中此前已绘制的 accumulated backdrop 按 W3C 分离公式混合；SVG 不额外引入 isolation，Canvas 在绘制前设置 globalCompositeOperation、完成后恢复。扁平场景中两端 backdrop 和公式一致。

## 兼容性与实现结果

blendMode 是 optional additive 字段，已有图形和 renderer 行为不变；compile、SVG 和 Canvas 已完成 element 级实现。

## 遗留风险

group/scope 级 isolation、非分离/Porter-Duff 全集、自定义合成和 mask/clip composition 不属于本 ADR，不能以 element 级字段近似。
