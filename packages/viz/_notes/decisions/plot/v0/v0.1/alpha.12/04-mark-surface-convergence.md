# ADR-04：mark 公开表面收敛

状态：Accepted
决策日期：2026-06-17
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-03 mark abstraction](./03-mark-abstraction-registry.md) · [plot v0.1 roadmap](../roadmap.md) · [docs-doc-principle skill](../../../../../../../../.agents/skills/docs-doc-principle/SKILL.md)

## 背景

ADR-03 把引擎层 mark 从图表形状名收敛为抽象数据几何 mark。若 React、Vanilla 和 docs 仍暴露 `<BarMark>`、`<RectMark>`、`<TextMark>`、`<LineMark>` 等旧形态，用户会按旧文档写出无法匹配新 IR 的 spec。

v0.1 的 viz 三包采用 lockstep 发布，plot 本体、React adapter、Vanilla adapter 与文档必须作为同一个用户可见表面一起收敛。

## 决策

公开 authoring 表面对齐抽象 mark，而不是旧图表形状：

| 新表面            | 取代                         | 说明                                                        |
| ----------------- | ---------------------------- | ----------------------------------------------------------- |
| `<PointMark>`     | `<PointMark>` + `<TextMark>` | `text` / `format` / `dx` / `dy` 表达文本 point              |
| `<PathMark>`      | `<LineMark>` + `<AreaMark>`  | 一维轨迹；closure 表达填充区域                              |
| `<IntervalMark>`  | `<BarMark>` + `<RectMark>`   | 统一柱、饼、环、histogram、heatmap、stack、dodge 等区间形态 |
| `<ReferenceMark>` | `<RuleMark>`                 | 参考线 / 参考带                                             |
| `<RelationMark>`  | `<RibbonMark>`               | source-target path / ribbon 关系几何                        |

`build-plot-spec` 负责把 React 便捷 props 展开为抽象 IRPlotSpec：`angle`、`stack`、`series`、`x0/x1`、双 band 等都编译为标准 transform + interval `bounds`，不引入平行 IR。

文档按抽象数据几何重组 grammar：point / path / region / interval / reference / custom / relation 等作为概念入口，bar / pie / heatmap / line / area 等保留为示例与解释。

## 最终状态

自定义 mark 与 relation mark 分别成为 viz grammar 的扩展与关系入口。旧 mark 组件与旧 IR 形态不保留兼容壳；React 与 Vanilla 都生成同一个 canonical `IRPlotSpec`。

## 最终形态

- React mark components 与 `build-plot-spec` 的目标产物必须是抽象 IRPlotSpec。
- Vanilla `renderPlot` 继续消费同一 spec，不另建 builder 体系。
- docs 更新需同步 contents、data、i18n 与双语页面。
- 便捷 props 属于 Sugar：展开后必须能用手写 transform + abstract mark IR 等价表达。

## 影响

- ⚠️ BREAKING：旧组件名 / 旧图表形状入口删除或改名，不保留 0.x alias。
- React / Vanilla / docs 与 plot IR 同步到抽象 mark 心智模型。
- v0.2 chart 层的价值转向 axes / legends / grid / theme / layout / presets，而不是补底层 mark 的平行能力。

## 不在本 ADR 范围

- IR 与 lowering 的抽象重写由 ADR-03 负责。
- chart preset 层不在本里程碑内。
- 自定义 mark 文档与 relation 文档按 ADR-08、ADR-13/14 后续补齐。
