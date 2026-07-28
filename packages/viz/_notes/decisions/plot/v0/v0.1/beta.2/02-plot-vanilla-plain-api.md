# ADR-02：Plot Vanilla plain authoring 与 Tier2 adapter 边界

- 状态：Accepted
- 决策日期：2026-07-12
- 完成日期：2026-07-27
- 关联：[plot v0.1 roadmap](../roadmap.md) · [plot v0.2 roadmap](../../v0.2/roadmap.md) · [kernel vanilla plain spec ADR](../../../../../../../kernel/_notes/decisions/v0/v0.4/beta.2/01-vanilla-plain-spec-api.md) · [plot-design.md §13.4 / §16](../../../../../architecture/plot-design.md)

## 背景

`@retikz/plot-vanilla` 曾以 `plotBuilder(config).mark(...).axis(...).build()` 作为主要 authoring 入口。builder 最终仍返回 plain `IRPlotSpec`，却把可变收集过程和规范化隐藏在链式对象中，不利于结构化生成、diff、序列化与直接审查。

axis、facet、scaffold 与 track binding 还分别在 Vanilla builder 和 React `buildPlotSpec()` 内实现，继续演进 composition 会扩大默认值、错误语义与边界校验的漂移。Kernel Vanilla 已提供 `VanillaTier2Adapter`；Plot 应复用该协议，而不是维护独立作者模型或 renderer。

## 决策

### 共享 framework-neutral authoring

`@retikz/plot` 的 `contract/authoring` owner 提供 `normalizePlotBindings()`、`createPlotSpec()` 与对应输入类型。它只依赖 Plot schemas；React 负责 JSX 与 style sugar，Vanilla 负责 plain helper，两侧把收集后的 marks、guides、scales、coordinate、composition、facets 与 scaffolds 交给同一纯规范化路径。

`createPlotSpec()` 会展开并移除 `facets`、`scaffolds`、axis / topology binding 等 authoring-only 字段，再以 `PlotSpecSchema` 返回 canonical `IRPlotSpec`，且不修改调用方对象或数组。关键规则：

- `xAxisId` / `yAxisId` 只对 path、point、interval 开放；其它 mark 即使显式传 `undefined` 也 fail-loud。
- facets 与 scaffolds 不混用，topology sugar 与显式 composition 不混用。
- 多轴派生保留显式 coordinate scale name 与完整 base scale 配置。
- scaffold view 按 `track.view`、`viewIdTemplate`、`track.id` 顺序解析，mark、guide 与 default view 复用同一结果。
- 核心错误统一使用 `plot authoring:` 前缀。

### Vanilla 改为 plain helper 与 Tier2 adapter

`@retikz/plot-vanilla` 公开：

- `plot(input)`：委托 `createPlotSpec()`，返回无方法的 canonical `IRPlotSpec`。
- `embedPlot(id, spec)`：返回标准 `VanillaEmbedSpec`，不执行 lowering。
- `createPlotAdapter(datasets, options?)`：把 PlotSpec 接入 Kernel Vanilla figure / layer；datasets 与 options 保留在 runtime 闭包，不进入 IR。
- `renderPlot(spec, datasets, options?)`：继续作为独立 DOM-free SSR 与 lineage 入口，签名和返回重载不变。

删除 `plotBuilder`、`PlotBuilder` 与 `PlotBuilderConfig`，不保留 legacy alias。adapter 会重新校验嵌入 spec，以 embed id 派生 root identity，并让同一 adapter 的多个 embed 共享 datasets 与稳定 composite maker。

### v0.2 优化边界

本 ADR 只稳定 authoring、identity 与 owner 分层。cache、patch、invalidate、增量 lowering / compile、依赖失效、按需 mark 物化、SVG DOM diff 与 Canvas 局部重绘进入 plot v0.2；v0.1 的 `VanillaView.update()` 仍整图重渲染。

## 迁移

```ts
// 旧
const spec = plotBuilder(config).path(pathMark).point(pointMark).axis(xAxis).axis(yAxis).build();

// 新
const spec = plot({
  ...config,
  marks: [pathMark, pointMark],
  guides: [xAxis, yAxis],
});
```

普通 SSR 继续使用 `plot()` + `renderPlot()`；与其它 Tier1 / Tier2 内容组合时使用 `embedPlot()` + `createPlotAdapter()`。两条路径消费同一 `IRPlotSpec`，datasets 始终与 Plot IR 分离。

## 被否决选项

- **保留 builder 或兼容 alias**：会继续暴露第二套可变作者模型，并扩大 0.x 公共面。
- **React / Vanilla 各自维护 normalization**：相同 Plot binding 会继续产生漂移。
- **让 `renderPlot()` 包装 `figure(embedPlot(...))`**：lineage side output 尚不属于 Kernel Tier2 contribution，强行统一会扩大 Kernel API 或重复 lowering。
- **在 beta 冻结 cache / patch API**：依赖失效和增量物化尚未验证，应留给 v0.2 单独设计。

## 兼容性与遗留风险

这是 Vanilla authoring 的 breaking 迁移；Plot IR schema、lowering 几何、Scene schema、React JSX API 与 `renderPlot()` 行为不变。外部 Vanilla 消费方必须把链式 builder 改为 plain `plot({ marks, guides, facets, scaffolds })`。增量更新与 lineage 重复 lowering 是已明确延期的性能能力，不构成 v0.1-beta.2 契约。

## 验证

- Plot contract 锁定 canonical schema 输出、输入不变性、显式 scale、多轴、facet / scaffold、非法字段存在性与统一错误语义。
- React / Vanilla 锁定 facet、scaffold、多轴和冲突输入 parity；Vanilla 另覆盖 plain object、SSR / lineage、Tier2 adapter、identity 与缺失 dataset。
- Plot、Plot React、Plot Vanilla 与 docs 的类型检查、定向测试和文档迁移在实现收尾时通过。

## 不在本 ADR 范围

- 不修改 Plot IR、Core IR 或 Scene schema。
- 不新增 mark、guide、scale、coordinate 或 transform 能力。
- 不实现增量 compile / lowering、dependency graph、cache、patch、invalidate 或 scheduler。
- 不实现 renderer diff、dirty rectangle、batching 或 GPU 后端。
- 不把 datasets 或 lineage 写入 Plot IR。

## 实现指针

- 共享 authoring：`packages/viz/plot/src/contract/authoring/`
- React adapter：`packages/viz/plot-react/src/components/build-plot-spec.ts`
- Vanilla plain / adapter / runtime：`packages/viz/plot-vanilla/src/{spec,adapter,runtime}/`
- 用户说明：Plot 总览、runtime reference、三包 README 与 viz v0.1 changelog
- 完成提交：`89a56d7d7`、`e30d5ec69`、`87fcd3c66`、`429ef8d2f`

> 本 ADR 已在 plot v0.1-beta.2 收尾时压缩；完整施工契约保留在该 ADR 的 Proposed 历史版本中。
