# plot v0.1-alpha.11 Roadmap：Geometry 基础

> 上游：[plot v0.1 roadmap](../roadmap.md)「Geometry 基础」行 + 表后「区间几何下沉」决策备注。
> 主题：补 mark（rect / rule / text / ribbon）+ 落地**区间类几何的坐标系无关下沉**（interval / rect / sector 共用 `projectCell` 契约，曲线 / 自定义坐标系走 core `contour` shape 兜底）。

## ADR 索引

| ADR | 主题 | 状态 |
| --- | --- | --- |
| [01](./01-cell-geometry-projection.md) | 区间类几何投影契约：`frame.projectCell` + `CellGeometry`（rect / sector / contour），闭式快路零行为变化；坐标系须实现 `projectCell` 才支持 cell 类 mark，曲线坐标系经自身 `projectCell` 出 contour（无引擎自动兜底） | Accepted |
| [02](./02-rect-mark.md) | **rect** mark（heatmap 格，双维 band cell，消费 ADR-01 契约；v1 仅 cartesian2D） | Accepted |
| [03](./03-rule-mark.md) | **rule** mark（参考 / 阈值线；定为 mark、非 guide） | Accepted |
| [04](./04-text-mark.md) | **text** mark（datum label，下沉 core Node 带 text） | Accepted |
| [05](./05-ribbon-mark.md) | **ribbon** mark（sankey / alluvial 流带几何；v1 字段端点，node-id 跨 scope 后置） | Accepted |

## 三包 lockstep

本 milestone 遵守 v0.1「三包 lockstep」硬原则（[plot v0.1 roadmap](../roadmap.md)「拆分策略」）：每个新 mark（rect / rule / text / ribbon）的 ADR 02–05 **同时**交付——

- **@retikz/plot**：IR schema（`ir/mark.ts`）+ lowering（`lower/`）。
- **@retikz/plot-react**：`<XxxMark>` 声明组件（`components/marks.tsx`，扁平 props，与 `<BarMark>`/`<PointMark>` 同风格）+ `build-plot-spec.ts` 的 `collectInto` 分支 + barrel 导出（`components/index.ts` 与 `src/index.ts`）。
- **@retikz/plot-vanilla**：`renderPlot(spec, data)` **mark 无关、纯 spec 驱动**，新 mark 经 IR + lowering 自动可渲染，**无需 vanilla 代码改动**；交付物 = 一条 vanilla SSR 测试 + docs SSR demo（证明新 mark 渲染成立）。
- **docs**：每个 mark 的 mdx 页 + `.demo.tsx` / `.data.ts`（zh/en 同步）。

> ADR-01 例外：纯 lowering 内部契约重构（`projectCell` 不进 IR、无 spec/props 表面），不涉三包绑定面，仅 @retikz/plot。

## 依赖

- **core `contour` shape**（[core ADR](../../../../kernel/v0/v0.4/alpha.3/03-core-contour-shape.md)，已实现）—— 曲线 / 自定义坐标系下区间几何的可连接 Node 载体。ADR-01 gate 于此，现已就绪。

## 测试 case 规则

延续 plot alpha milestone 放宽口径：按复杂度适量、覆盖真实有意义的 accept / reject 与几何断言即可，不硬凑 9（见 [`plot _template.md`](../../../_template.md) § 测试象限）。
