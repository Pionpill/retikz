# ADR-01：Ribbon 可变宽度路径

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-25
- 关联：[ADR-07](./07-path-kind-registry.md)

## 背景

Sankey、alluvial、flow map 等图形需要同时表达关系走向和可变宽度。若由 Plot 或 renderer 私有实现，宽度采样、边界闭合、label 与 provenance 会分叉，无法形成统一的后端无关绘图契约

## 决策

Core 拥有 renderer-agnostic 的 variable-width band path 能力。输入保持 JSON-safe，由中心线与宽度 profile 或显式上下边界生成闭合轮廓，最终下沉为普通 Scene path primitive；renderer 不理解 ribbon 或上层布局语义

ADR-07 将公开形态收敛为 `type: "path", kind: "ribbon"`，因此本 ADR 保留的长期结论是能力归属和几何边界，不再保留独立 `IRRibbon` / `type: "ribbon"` 公共实体

## 兼容性与最终结果

Ribbon 作为 Path 的 path-like kind 由统一 registry、schema、compile、label 与 renderer 输出链路消费。旧的独立 Ribbon 形态被 ADR-07 替代，不提供并行兼容入口

## 遗留边界

宽度、采样、边界、端点 cap 与 label 语义以 ADR-02、ADR-03、ADR-05、ADR-06 和 ADR-07 为准；Sankey/alluvial 布局仍由领域包拥有
