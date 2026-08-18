# ADR-05：Ribbon host label

- 状态：被 ADR-07 收敛
- 决策日期：2026-06-26
- 关联：[ADR-07](./07-path-kind-registry.md) · [plot alpha.13 ADR-07](../../../../../../viz/_notes/decisions/plot/v0/v0.1/alpha.13/07-mark-label-surface.md)

## 背景

Ribbon 需要沿中心线或带状区域承载标签。额外叠加 Text / Node 会丢失 relation host、provenance、命中区域和后续交互边界

## 决策

Ribbon 不拥有独立 label schema；最终公开形态 `type: "path", kind: "ribbon"` 与普通 Path 共用 `Path.label` 和 `GeometryLabelSchema`

Path-like label 属于 geometry host，沿路径投递并复用 `position`、`side`、`sloped`、`placement` 等字段。Ribbon boundary 专用 label 不进入本契约；若未来需要按 upper/lower 独立放置，须另立 ADR。Plot relation ribbon label 仍通过 Core Path label surface 投递

## 兼容性与最终结果

ADR-07 将 Ribbon label 与 Path kind registry、共享 style/meta 和普通 Scene path 输出统一；不保留 `Ribbon.label` 独立入口或 sibling text 兼容语义

## 遗留边界

Boundary-specific label positioning、领域 label 内容和交互策略不属于 Core
