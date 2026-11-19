---
description: Plot 将可连接的 id 与记录数据来源的 meta 分离，高基数 datum 不默认逐点注册。
keywords: 'scope-aware、meta、plotId、plot、Scope、provenance、sourceIndex、Scope.id'
---

# ADR-026：scope-aware id 绑定 + meta 透传——下沉元素绑 `<plotId>.` 命名 id + 写来源 meta，让 plot 不再是丢了来源的几何黑盒

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.5 roadmap](./roadmap.md) · [plot-design.md §7 anchor / §8.1 id 绑定与可连接性](../../../../architecture/plot-design.md) · [core v0.3-ADR-016 meta provenance](../../../../../../kernel/_notes/decisions/v0/v0.3/016-meta-provenance.md) · [plot v0.1-ADR-001 根节点](./001-plot-spec-root.md)

## 决策

整图、mark 层与 series 可拥有结构句柄；显式命名不依赖 provenance 开关。局部 id 不自动穿透 Scope；未命名的 plot 不虚构带前缀的公共句柄。meta 只描述来源，不参与连接、几何或渲染。

默认不生成来源元数据或逐点 id。开启结构来源记录不等于开启逐行记录；datum 元数据区分变换后行序和可选的原始行序，派生行没有唯一来源时不伪造索引。只有独立图元能直接携带自身的 datum 元数据，一条 series Path 不因此拆成逐点图元。

显式指定 `datumIdField` 时，缺字段或值重复是配置错误。若只需定位而非连接，使用[按需定位](./027-datum-locator.md)，不为整份数据注册 id。
