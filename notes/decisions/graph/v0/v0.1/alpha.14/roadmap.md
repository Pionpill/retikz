# plot v0.1-alpha.14 Roadmap：Coordinate composition 坐标复合

> 上游：[plot v0.1 roadmap](../roadmap.md)「Coordinate composition 坐标复合」行。
> 主题：把 plot 内部从“单 coordinate scope”推进到“多个 coordinate scope 可布局、可叠加、可共享坐标骨架、可被 mark / guide / locator 明确引用”。Facet 小多图、same-panel dual-axis、radial rings / cartesian lanes 都是这套地基的不同用例。

## 定位

alpha.14 不是跨域组合容器，也不是 chart preset 层。它只处理 `@retikz/plot` 内部的坐标复合：一个 PlotSpec 可以生成多个局部坐标空间，这些空间可以按 facet grid 排开，可以叠在同一个 plot area 上，也可以共享一部分坐标基底后分成多个 track / ring / lane。

分面（facet）回答“按哪个字段把数据拆成多个小图”；双轴 / overlay 回答“同一个小图里，不同 mark 用哪套位置 scale / coordinate”；shared scaffold / track 回答“多个局部图层共享哪些坐标基底、哪些 range 自己管理”。三者共享底层机制，但用户语义不同，必须拆成不同 ADR，避免把 facet schema 写死成唯一的多坐标入口。

这里的 shared scaffold 必须保持坐标系无关：极坐标可以共享 center / angle 并按 radius 分 ring；笛卡尔可以共享 x 并按 y 分 lane；混合场景可以只共享 anchor / bbox / data / guide identity。后续 v0.3 composite / chart preset 可以把常见复合结构封装成更顺手的高层组件，但必须展开成本 milestone 定义的 plot primitive，不另造平行语义。

本 milestone 继续遵守三包 lockstep：`@retikz/plot` 定义 IR / schema / lowering 真源；`@retikz/plot-react` 与 `@retikz/plot-vanilla` 只提供同构 authoring 表面；docs demo 同步解释 facet、dual-axis 与 shared scaffold tracks 的区别。

## ADR 索引

| ADR | 主题 | 目标 | 状态 |
| --- | --- | --- | --- |
| ADR-01 | **coordinate composition registry + guide binding** | 给 PlotSpec 内部 coordinate scope / composition 建立统一 identity、registry、layout slot 与 guide 绑定契约，为 facet、overlay、track 共用；不新增跨域容器 | [Proposed](./01-coordinate-composition-registry.md) |
| ADR-02 | **facet grid data routing** | 按字段生成 facet panels，拆分 rows，确定 panel key / 排序 / 空 panel 策略；支持共享或独立 position scales；每个 panel lower 成 core `Scope` | [Proposed](./02-facet-grid-data-routing.md) |
| ADR-03 | **same-panel multi-axis overlay** | 支持同一 panel 内多个位置 scale / coordinate 叠加，例如左右 y 轴；mark 可显式选择自己的 coordinate / y scale；guide 绑定对应 axis | [Proposed](./03-same-panel-multi-axis.md) |
| ADR-04 | **shared scaffold tracks** | 定义坐标系无关的共享骨架 + 局部 track：polar rings（共享 center / angle，不同 radius band）、cartesian lanes（共享 x，不同 y band）、混合 coordinate scope 的共享 anchor / bbox | [Proposed](./04-shared-scaffold-tracks.md) |
| ADR-05 | **composition guides, axes, grid, spacing** | 定义 facet panel、overlay axis、track guide 的轴 / 网格 / 间距 / 标题策略，先取可解释的最小形态；统一轴与 per-scope guide 的取舍在 ADR 内拍板 | [Proposed](./05-composition-guides-layout.md) |
| ADR-06 | **locator, provenance, and adapters surface** | 让 locator / provenance 带上 coordinate scope / facet key / track key；收敛 React / Vanilla 表面与 docs 示例，证明 facet、dual-axis、shared scaffold 都映射到同一 PlotSpec | [Proposed](./06-scope-provenance-surface.md) |

> 建议文件名：`01-coordinate-composition-registry.md`、`02-facet-grid-data-routing.md`、`03-same-panel-multi-axis.md`、`04-shared-scaffold-tracks.md`、`05-composition-guides-layout.md`、`06-scope-provenance-surface.md`。

## 依赖与顺序

1. **ADR-01 先行**：坐标复合能力的共同地基。facet、双轴、track 都不能各自发明 scope id / guide binding / layout slot。
2. **ADR-02 形成 facet 数据闭环**：先能拆 panel 和训练共享 / 独立 scale。
3. **ADR-03 独立于 facet 数据拆分**：它复用 ADR-01 的 registry，但不按字段拆数据、不生成多个 panel。
4. **ADR-04 抽象 shared scaffold / track**：它不能写死 polar rings，必须同时覆盖 cartesian lanes 与混合 coordinate scope 的共享语义。
5. **ADR-05 收敛 guide / spacing**：facet、overlay、track 都需要 guide，但表现不同，集中拍板避免三套轴语义漂移。
6. **ADR-06 收口三包与 locator**：避免 render 输出与 hit-test / provenance 在多 scope 下漂移。

## 关键设计约束

- **coordinate composition 是上位抽象**：facet、dual-axis、radial rings、cartesian lanes、mixed overlay 都必须落到同一套 scope / scaffold / guide 机制。
- **facet 不是 dual-axis，也不是 track**：facet 拆数据与 panel；dual-axis 不拆 panel，只让 mark 选择不同位置 scale / coordinate；track 共享某些坐标基底、局部管理 range。
- **coordinate scope 是共同抽象**：每个 scope 有自己的 local range、clip、guide、anchor 与 provenance。scope 可以布局成 grid，也可以叠在同一 panel，还可以挂到共享 scaffold 的某个 track。
- **shared scaffold 必须坐标系无关**：不得只为 polar rings 设计字段。字段应表达“共享哪些 basis / 哪些 range 局部化”，让 cartesian2D、polar2D、custom coordinate 与混合 scope 都能复用。
- **内置与扩展同机制**：新增 scope / guide / scale 选择逻辑不得成为内置白名单；应复用现有 coordinate / scale / guide registry 思路。
- **复用 core `Scope`**：plot 不自建容器、不做跨域排版系统。跨域组合仍属 core / 更上层。
- **纯 lowering 无文字度量**：facet 轴标题、panel label、外侧统一轴必须在无测量前提下给出稳定布局策略。
- **IR JSON-safe**：facet key、scope id、track key、scale sharing 策略、shared basis、mark 选择 coordinate / track 的字段都必须是可序列化配置。

## 文件 scope 预估

- `packages/graph/plot/src/schemas/plot/**`
- `packages/graph/plot/src/schemas/coordinate/**`
- `packages/graph/plot/src/schemas/guide/**`
- `packages/graph/plot/src/schemas/mark/**`
- `packages/graph/plot/src/pipeline/**`
- `packages/graph/plot/src/features/guide/**`
- `packages/graph/plot/src/features/interaction/**`
- `packages/graph/plot-react/src/components/**`
- `packages/graph/plot-vanilla/src/**`
- `packages/graph/plot/tests/**`
- `packages/graph/plot-react/tests/**`
- `packages/graph/plot-vanilla/tests/**`
- `apps/docs/src/contents/graph/**`
- `apps/docs/src/data/**`

## 测试 case 规则

延续 plot alpha milestone 放宽口径：不硬凑每 ADR 9 个 case，但必须覆盖真实有意义的 accept / reject、数据断言、几何断言与三包表面等价性。

建议分布：

- **scope registry**：多个 coordinate scope id 稳定、guide 引用合法 / 非法、mark 引用缺失 fail-loud。
- **facet data routing**：单字段 facet、二维 facet、空 panel、panel 排序、共享 scale 与独立 scale domain 差异。
- **facet geometry**：panel bbox / gap / clip / axis / grid 输出稳定，core `Scope` id 与 anchor 可引用。
- **same-panel dual-axis**：两个 y scale / guide 叠在同一 plot area，不同 mark 选择不同 y 轴，左右 axis 输出不互相覆盖语义。
- **shared scaffold tracks**：polar rings 共享 center / angle 且 radius band 独立；cartesian lanes 共享 x 且 y band 独立；混合 coordinate scope 共享 anchor / bbox 但投影各自独立。
- **locator / provenance**：同一 datum key 出现在不同 panel、coordinate scope 或 track 时可区分；render 与 locator 使用同一 scope identity。
- **三包等价**：React / Vanilla 产物与手写 PlotSpec 等价。
- **docs demo**：facet 小多图、dual-axis、shared scaffold tracks 示例各至少一组，明确三者概念边界。

## 本轮不做

- 不做跨域组合容器；plot 只保证自身 lower 进可引用 core `Scope`。
- 不做 chart preset；更顺手的开箱 chart 留 v0.2 `<Chart>`。
- 不做 tooltip / hover / brush / linked highlighting。
- 不做自动文字测量驱动的 facet label / axis label / track label 避让。
- 不做完整 dashboard layout、自由拖拽 inset、任意业务组件混排。
- 不把 dual-axis 或 tracks 归入 facet schema；三者共享 coordinate composition 地基，但 API 语义分开。
- 不在本轮做高层 composite / chart preset；后续封装必须展开成本轮 plot primitive。

## 验收口径

alpha.14 封口时应满足：

- ADR-01～06 全部 Proposed 并经人工确认可进入实现；实现后再按 wrapup 翻 Accepted。
- `@retikz/plot` / `@retikz/plot-react` / `@retikz/plot-vanilla` 三包版本面一致。
- 至少三组端到端 demo：一个 facet grid，一个 same-panel dual-axis，一个 shared scaffold tracks（polar rings 或 cartesian lanes，优先选择能说明坐标系无关性的例子）。
- 多 coordinate scope / scaffold / track 下 guide、mark lowering、locator / provenance 使用同一 scope identity。
- docs 能让用户理解“分面”“双轴 / overlay”“shared scaffold tracks”不是同一概念，但都属于 plot 内坐标复合能力。
