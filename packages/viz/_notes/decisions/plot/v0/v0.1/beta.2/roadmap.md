# @retikz/plot v0.1-beta.2 roadmap

> 状态：Done · 关联：[plot v0.1 roadmap](../roadmap.md)

beta.2 收敛 Plot 的 runtime provenance 与无框架 authoring 公共面，并在 stable 前移除与开放 coordinate registry 重复的内置 `ternary2D`。Core IR、Scene schema 以及其它 mark / guide / scale / coordinate / transform 能力保持不变；breaking 迁移不保留 legacy alias。

## 阶段边界

- ADR-01 完成 runtime-only 图元链路，不把完整 lineage 写入 IRPlot 或 Scene meta
- ADR-02 以 plain `plot()` 取代链式 `plotBuilder()`，并让 React / Vanilla 共用 `@retikz/plot` 的 authoring normalization
- ADR-02 同时通过 `embedPlot()` / `createPlotAdapter()` 接入 Kernel Vanilla Tier2 协议；该公开增量由本 milestone 明确特批，不作为其它 Beta 新功能的先例
- ADR-03 删除内置 `ternary2D` 的 IR、definition、专用 guide / mark lowering 与三包表面；三变量投影仍可通过统一 `CoordinateDefinition` 扩展链表达
- `renderPlot()` 调用签名、lineage 返回重载与整图渲染语义保持不变
- cache、patch、invalidate、增量 lowering / compile、依赖失效、SVG DOM diff 与 Canvas 局部重绘进入 plot v0.2

## ADR

- [x] [ADR-01：plot 提供图元链路](./01-plot-mark-lineage-trace.md) — Accepted
- [x] [ADR-02：Plot Vanilla plain authoring 与 Tier2 adapter 边界](./02-plot-vanilla-plain-api.md) — Accepted
- [x] [ADR-03：移除内置 ternary2D 并保留自定义坐标扩展路径](./03-ternary2d-removal.md) — Accepted

## 实现记录

- `89a56d7d7`：收敛 `@retikz/plot` 共享 authoring normalization
- `e30d5ec69`：让 `@retikz/plot-react` 复用共享 normalization
- `87fcd3c66`：迁移 `@retikz/plot-vanilla` plain helper、Tier2 adapter 与 runtime
- `429ef8d2f`：同步三包 README、双语 docs 与 Vanilla 迁移示例
- `e775a6946`：beta.2 收尾修正 datasets / fieldMaps 的 own-key 读取
- `bbfc6dfcb`：移除内置 ternary2D 并保留自定义坐标角色扩展路径

## 完成条件

1. `@retikz/plot` 拥有 framework-neutral authoring normalization，React 与 Vanilla 对 axis / facet / scaffold binding 产出一致且共享 `plot authoring:` 错误语义。
2. `@retikz/plot-vanilla` 删除 `plotBuilder`、`PlotBuilder`、`PlotBuilderConfig`，公开 `plot()`、`embedPlot()`、`createPlotAdapter()` 与原签名 `renderPlot()`。
3. Tier2 adapter 重新校验 IRPlot、保持调用方输入不变、从 embed id 派生 root identity，并让同一 adapter 的多个 embed 共享 datasets 与稳定 composite maker。
4. Plot / Plot React / Plot Vanilla 测试覆盖 plain object、输入不变性、adapter parity、错误路径、SSR 与 lineage；既有断言不因迁移而弱化。
5. package README、docs zh/en、demo、BREAKING changelog 与 plot v0.2 deferred optimization 边界同步。
6. 受影响包 lint、`tsc --noEmit`、测试和 docs 校验通过；与本 milestone 无关的既有基线失败单独记录，不伪装成 ADR 回归或完成。
7. 内置 coordinate 集只保留 cartesian / polar 的一维与二维形态；特殊投影统一通过 `CoordinateDefinition` 注册、诊断并下沉，不在 adapter 或 renderer 保留 ternary 特判。

## 下一阶段 RC

- beta.2 收尾后进入 RC；届时冻结 Plot IR、Definition / registry、authoring、lowering、lineage、locator 与三包 adapter 公共面，只接收兼容性 bug、诊断、文档和发布修正。
- cache、patch、invalidate、增量 lowering / compile、依赖失效、按需物化与 renderer diff 进入 plot v0.2，不在当前 beta.2 或后续 RC 扩展公共面。
