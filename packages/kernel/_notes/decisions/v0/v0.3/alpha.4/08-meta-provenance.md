# ADR-08：IR meta provenance 透传到 Scene

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[alpha.3 hydration](../alpha.3/01-hydration.md)

## 背景

Tier 2 lowering 将 root/series/mark 等领域结构下沉为 Scope、Node、Path 后，用户需要的 datum/series/layer 来源信息会丢失。交互层命中图元后必须能读到来源，但 core 不应理解领域语义。

## 决策

meta 是与 id 并列的不透明 provenance 对象：

- Node、Scope、Path 各有可选 meta: JsonObjectSchema；它必须是 JSON 可序列化对象，core 不解释、不参与 layout、连接、样式、bbox，也不进入 every-X 默认或跨 scope 继承
- Coordinate 不增加 meta，因为它不产生 Scene primitive；meta 不会创造或保留不可命中的空图元
- 五种 ScenePrimitive（RectPrim、EllipsePrim、TextPrim、PathPrim、GroupPrim）可承载 meta，与 id 并列。compile 沿既有 id stamp 点透传：平铺 Node 的每个主图元复制同一 meta，文本/rotate Node 落 GroupPrim，Path 落 PathPrim，Scope 落 GroupPrim
- renderer 忽略 meta；它不输出为 SVG/DOM 属性，也不改变 Canvas 绘制。runtime、检查器和交互层从 Scene 对象读取

meta 是随行数据，不是命名句柄，不可被引用；id 仍负责引用和空 scope 的保留。仅有 meta 的空 scope、没有子图元/transform/id/clip 时照常 prune。

## 兼容性与实现结果

meta 为可选 JSON 字段，既有 IR 和 Scene 行为不变；透传已与 hydration 的 id stamp 通路完成，领域包可用它保留来源信息。

## 遗留风险

具体 datum/series 结构、外部 manifest 和 progressive 按 meta 分块更新不属于 core；这些能力必须继续由消费层定义。
