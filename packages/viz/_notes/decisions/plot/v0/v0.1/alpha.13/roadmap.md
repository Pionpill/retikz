# plot v0.1-alpha.13 Roadmap：Relation ribbon + Statistics 进阶最小闭环

> 上游：[plot v0.1 roadmap](../roadmap.md)「Statistics 进阶 + stat-geom」行。
> 主题：先补齐 `RelationMark kind="ribbon"`，让关系 rows 能下沉为 core `Path kind="ribbon"`；再收敛实现高级统计的三条可渲染薄片：`quantile-band → boxplot`、`density → density-area`、`smooth/regression → trend path`。统计能力仍遵守 alpha.12 已落地的统计代数：先进入 transform / reducer / selector 层，mark 只消费派生 rows，不新增平行 chart IR。

## 定位

alpha.12 已把 `RelationMark` 的 source-target path、anchor id contract 与 mark-local transform 跑通；kernel 侧也已有 `Ribbon` 能力。alpha.13 先把两者接起来：relation rows 仍由 `RelationMark` 管，几何输出可从默认 path 切到 ribbon，用于 Sankey / alluvial 这类有面积的关系流带。

alpha.12 也把 Statistics 地基从零散 transform 收敛为 `summarize` / `select` / `annotate` / `relate` / `bin` 等统计代数，并开放 `defineTransform`、`defineStatReducer`、`defineRowSelector`。alpha.13 不再继续扩一批业务动词，而是验证这套地基能承载更接近真实图表的高级统计。

本 milestone 的目标是“关系几何补洞 + 统计 transform 到抽象 mark 的闭环”，不是 chart preset 层，也不以用户 API 舒适度为首要目标。Plot 在 v0.1-alpha.13 只交付底层语法能力：IR / schema / registry / lowering / 三包薄适配保持一致；更顺手的 chart 级 API 留给后续 chart 分区。Relation ribbon 只处理 source / target / width rows 到 core `Path kind="ribbon"` 的下沉，不做 Sankey layout。箱线图、密度图、回归线都应能被拆成：

1. 数据经 root 或 mark-local transform 派生统计 rows。
2. 派生 rows 被现有 `PointMark` / `PathMark` / `IntervalMark` / `ReferenceMark` 消费；密度面积走 `PathMark closure={{ kind: 'baseline' }}`。
3. React / Vanilla 只提供薄适配与结构性等价表达，把能力映射到同一份 IRPlot，不新增与 IR 平行的 chart 语义。

## 收敛边界

本轮按收敛版执行，避免把 alpha.13 扩成“统计算法库 + chart preset + 极坐标样式”三线并行：

- **先补关系流带**：RelationMark 支持 `kind="ribbon"`，复用 source / target / anchorId / transform；不新增独立 `RibbonMark`，不做 Sankey 自动布局。
- **必须闭环**：quantile-band / density / smooth 三条统计薄片各自要有 transform、三包 authoring 表面、docs demo 与测试。
- **算法先保守**：KDE 与回归都选 deterministic、JSON-safe、可测试的最小形态；复杂算法作为后续扩展点。
- **几何不造新 mark**：boxplot / density-area / regression line 都由抽象 mark 组合表达。
- **sector explode / pull 不阻塞统计主线**：作为最后 ADR 决策。若牵涉 per-datum 偏移、anchor 语义或交互命中，就明确顺延。

## ADR 索引

| ADR    | 主题                                               | 目标                                                                                                                                                                    | 状态                                      |
| ------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| ADR-01 | **RelationMark ribbon geometry kind**              | 在 `RelationMark` 内新增 `kind="ribbon"`，复用 source / target / anchorId / transform，把关系 rows 下沉为 core `Path kind="ribbon"`；Sankey layout 不进入本轮           | [Accepted](./01-relation-ribbon.md)       |
| ADR-02 | **quantile-band statistics + boxplot composition** | 新增参数化 quantile-band reducer 与 outside-quantile-band selector；boxplot 只是 0.25/0.75 band + 0.5 point + spread fence 的组合实例                                   | [Accepted](./02-quantile-band-boxplot.md) |
| ADR-03 | **density transform + density-area**               | 新增内置 `density` transform，KDE 输出采样 rows；几何消费走 `PathMark` baseline closure，不新增 density mark                                                            | [Accepted](./03-density-transform.md)     |
| ADR-04 | **smooth / regression transform**                  | 新增内置 `smooth` transform，首轮只做 deterministic linear regression；输出预测线采样 rows，置信区间顺延                                                                | [Accepted](./04-smooth-regression.md)     |
| ADR-05 | **stat-geom structural surface + docs**            | 收敛 React / Vanilla 薄适配、docs 信息架构与示例，证明三条统计薄片都能按 transform + abstract marks 表达；不做 chart 级便利 API                                         | [Accepted](./05-stat-geom-surface.md)     |
| ADR-06 | **sector explode / pull decision**                 | 新增 `IntervalMark.pull` 作为 polar sector 静态径向偏移；anchor / locator 跟随同一几何，交互 explode 顺延                                                               | [Accepted](./06-sector-explode-pull.md)   |
| ADR-07 | **mark label surface follows core label hosts**    | 让 Point / Interval / Path / Reference / Relation 共用 `MarkLabelSchema`，按 node 或 geometry host 投递到 core label；同步 mark demos 不再用纯文字 PointMark 绕开 label | [Accepted](./07-mark-label-surface.md)    |

> 建议文件名：`01-relation-ribbon.md`、`02-quantile-band-boxplot.md`、`03-density-transform.md`、`04-smooth-regression.md`、`05-stat-geom-surface.md`、`06-sector-explode-pull.md`、`07-mark-label-surface.md`。

## 依赖与顺序

1. **ADR-01 独立优先**：RelationMark ribbon 是关系几何补洞，直接服务 docs 关系页面 Sankey demo；不依赖统计主线，但应先做，避免 demo 绕开 viz 层。
2. **ADR-02 → ADR-05**：boxplot 是最小 stat-geom 验收。它复用 alpha.12 的 `quantile` 算法，把固定 q1 / q3 提升为可配置 quantile band，不要求先有 density / smooth。
3. **ADR-03 → ADR-05**：density 需要新增 transform kind，输出采样 rows；docs demo 用 density area 验收 `PathMark` baseline closure 消费统计 rows。
4. **ADR-04 → ADR-05**：smooth / regression 需要新增 transform kind，输出趋势线 rows；首轮不承诺多算法矩阵。
5. **ADR-05 依赖 02–04**：统一三包薄适配、docs 章节和示例命名，防止每条统计能力各自发明表面；不追求 chart 级易用封装。
6. **ADR-06 独立且最后**：只在统计主线闭环后处理 sector backlog；不得反向阻塞 01–05。
7. **ADR-07 独立优先于 mark demo 清理**：依赖 core 已有 node / geometry label 能力，不依赖统计主线；应在更新 `viz/grammar/mark` demo 前完成，避免 demo 继续用文字 PointMark 绕开宿主 label。

## 关键设计约束

- **transform 是统计入口**：KDE、回归、箱线图统计量都应先产生 plain data rows；mark 不在 lowering 期临时算统计。
- **relation 是关系入口**：source-target 关系的 path / ribbon 几何都应复用 `RelationMark` 的 target resolving、anchor registry 与 mark-local transform；不要为同一批关系 rows 新增平行 `RibbonMark`。
- **IR 100% JSON-safe**：算法选择、带宽、采样数、whisker 策略都必须是可序列化字段；函数只允许存在于 runtime definition / options 中。
- **AI 友好字段命名**：使用完整词，如 `bandwidth`、`sampleCount`、`whisker`、`outside`、`confidence`，避免缩写和位置敏感数组。
- **内置与自定义同机制**：内置 density / smooth 若进入 transform registry，就要与自定义 transform 共用 `defineTransform` 分派；若只是 reducer / selector 子语义，则走对应 registry。
- **抽象 mark 不退化**：不得新增 `BoxPlotMark` / `DensityMark` / `RegressionMark` 之类底层 IR。若 adapter 提供结构性便捷入口，也必须能还原成手写 transform + abstract mark。
- **label 是图元附件**：纯说明文字优先落到已有 mark 的 node / geometry host label；不要为了写文字新增平行 `PointMark`。只有当 PointMark 本身表达数据点、锚点或文本点时才保留。
- **三包 lockstep，但 plot 优先抽象**：`@retikz/plot`、`@retikz/plot-react`、`@retikz/plot-vanilla` 与 docs 同步设计、同步验收；React / Vanilla 不另造更顺手但平行的 chart API。

## ADR 草案要点

### ADR-01：RelationMark ribbon geometry kind

目标是让 `RelationMark` 在默认 path 之外支持 `kind="ribbon"`，把每一行 source-target-width 关系降低为 core `Ribbon`，用于 Sankey / alluvial 的流带几何。

设计倾向：

- 顶层 `type` 仍是 `relation`；内部几何子类型使用 `kind: 'path' | 'ribbon'`，省略等价 `path`。
- 复用 `source` / `target` / `anchorId` / `project` / mark-local `transform` / `encoding.color`。
- ribbon 专属配置放入 `ribbon` 对象，首轮至少包含 `width`、`endWidth`、`fill`、`fillOpacity`、`opacity`、`stroke`、`strokeWidth`、`curvature`。
- `kind="ribbon"` 第一版不支持 `via` / `route` / `routing` / `label` / `path`，避免把 path step 语义硬套到面积几何。

不在本 ADR 范围：Sankey / alluvial 自动布局、节点堆叠 slot 分配、crossing reduction、edge bundling、独立 `RibbonMark`。

### ADR-02：quantile-band statistics + boxplot composition

目标是定义从原始 rows 得到每组 quantile band 统计行的底层能力，并用 boxplot 作为第一个验收组合：箱体、须线、中位数与区间外点都由现有 mark 表达。

设计倾向：

- 新增 `quantile-band` reducer：`lowerP` / `upperP` 可配置，`outputs.points[]` 可声明任意额外分位点；boxplot 只是 `0.25` / `0.75` + `p=0.5`。
- whisker 策略先支持 `minMax` 与 `spread` 两类；`spread` 用 `lower - factor * (upper - lower)` / `upper + factor * (upper - lower)` 判断。
- 区间外 rows 输出用 `outside-quantile-band` selector / mark-local transform 派生，避免在单个 summarize row 里塞数组。
- 几何组合：箱体用 `IntervalMark`，中位数 / 须线用 `ReferenceMark`，离群点用 `PointMark`。

不在本 ADR 范围：小提琴图、notched boxplot、复杂分组 dodging、交互 tooltip。

### ADR-03：density transform + density-area

目标是从一维连续字段生成 KDE 采样行，让 `PathMark` 可直接画密度面积或密度曲线。

设计倾向：

- 新增内置 `density` transform：输入 `field`、可选 `groupBy`、`bandwidth`、`sampleCount`、`extent`、输出 `xAs` / `densityAs`。
- 首轮 kernel 只选一种确定性默认，如 Gaussian kernel + Silverman / Scott 之一；具体默认在 ADR 中拍板。
- 输出 rows 保留组字段与 provenance。空组、单点组、全相同值要 fail-loud 或给出明确退化策略。
- geometry 不新增专用 mark：面积图用 `PathMark closure={{ kind: 'baseline' }}`，曲线用普通 `PathMark`。

不在本 ADR 范围：二维 KDE、加权 KDE、自适应带宽、FFT / 大数据性能优化。

### ADR-04：smooth / regression transform

目标是给散点或时间序列添加确定性趋势线，首轮验证 regression 统计 rows 可被 path / region 消费。

设计倾向：

- 新增内置 `smooth` transform，首轮 `method: 'linear'`。`loess`、`polynomial`、`movingAverage` 只作为后续扩展点。
- 输入 `x` / `y`、可选 `groupBy`、`sampleCount`、`extent`、输出 `xAs` / `yAs`。
- 置信区间顺延；首轮只输出 `xAs` / `yAs` 并由 `PathMark` 消费趋势线。
- 非 finite 输入、样本不足、垂直线等退化必须 fail-loud 或有稳定策略。

不在本 ADR 范围：非线性模型、时间窗口平滑、预测外推、模型诊断指标展示。

### ADR-05：stat-geom structural surface + docs

目标是把 02–04 的能力收敛成三包一致的结构性表面：adapter 只证明能力可表达、可组合、可验证，不负责把 API 打磨成最终用户最顺手的 chart preset。

设计倾向：

- React 表面只做薄适配：组件 / props 必须能直接映射到 IRPlot，不绕开 `@retikz/plot` lowering。
- Vanilla SSR 继续消费同一 spec；如果提供 helper，也只生成同一 IRPlot，不引入独立 builder 语义。
- docs 按 Statistics 心智模型组织：先讲 transform 产出 rows，再讲 boxplot / density / smooth 是 stat + geom 的组合。
- demo 以暴露底层组合关系为主；可读性服务于解释抽象，不承担 chart 级“少写代码”目标。

不在本 ADR 范围：v0.2 `<Chart>` preset、自动标题 / 自动默认轴恢复、tooltip。

### ADR-06：sector explode / pull decision

目标是处理 v0.1 roadmap backlog 里的 sector 间隔和单片高亮归宿，但不得拖住统计主线。

设计倾向：

- `padAngle` 已有基础能力，本 ADR 只评估是否补 `pull` / `explode`。
- 若设计为视觉偏移，必须说明对 `anchorId`、locator、boundaryPoint 与 label placement 的影响。
- 若无法在不破坏语义的情况下做轻量实现，则明确顺延到交互 / highlight 轴。

不在本 ADR 范围：动画式 explode、hover highlight、per-datum interactive state。

### ADR-07：mark label surface follows core label hosts

目标是消费 core 已经具备的 `Node.label`、`Path.label` 与 `Path kind="ribbon"` label 能力，让 plot 内置 mark 共用一套可数据绑定的 label schema，并把 docs demo 里的纯文字说明收回到对应图元附件上。

设计倾向：

- 新 `MarkLabelSchema` 使用 `kind: 'node' | 'geometry'` 判别宿主类型，`content` 走 TextChannel 风格的 field / value / displayFormat 绑定，常量值对齐 core label text。
- `PointMark` / `IntervalMark` 投递 node label；`PathMark` / `RelationMark path` / `RelationMark ribbon` 投递 geometry label；`ReferenceMark` 根据 line 或 band / region 宿主选择 geometry 或 node。
- `RelationMark.ribbon.label` 是共享 schema，不新增 ribbon-only label schema；lowering 后写到 `IRPath.kind='ribbon'` 的顶层 label。
- `label` 支持单个对象或数组，数组顺序稳定；不做自动避让、自动隐藏或 chart 级便利封装。

不在本 ADR 范围：新增 TextMark / LabelMark、自动避让、tooltip、hover highlight、core label schema 改动。

## 文件 scope 预估

后续各 ADR 可按自身范围细化，初步 scope 如下：

- `packages/viz/plot/src/schemas/mark/**`
- `packages/viz/plot/src/schemas/encoding/**`
- `packages/viz/plot/src/schemas/transform/**`
- `packages/viz/plot/src/contract/transform.ts`
- `packages/viz/plot/src/contract/statistics.ts`
- `packages/viz/plot/src/providers/transform/**`
- `packages/viz/plot/src/providers/statistics/**`
- `packages/viz/plot/src/providers/mark/features/**`
- `packages/viz/plot/src/providers/mark/shared/**`
- `packages/viz/plot-react/src/components/**`
- `packages/viz/plot-react/src/components/build-plot-spec.ts`
- `packages/viz/plot-vanilla/src/**`
- `packages/viz/plot/tests/**`
- `packages/viz/plot-react/tests/**`
- `packages/viz/plot-vanilla/tests/**`
- `apps/docs/src/modules/docs/contents/viz/**`
- `apps/docs/src/data/**`

## 测试 case 规则

延续 plot alpha milestone 放宽口径：不硬凑每 ADR 9 个 case，但必须覆盖真实有意义的 accept / reject、数据断言、几何断言与三包表面等价性。

建议分布：

- **relation geometry 断言**：`RelationMark kind="ribbon"` 复用 anchor / project / transform，并下沉为 core `Ribbon`。
- **transform 数据断言**：quantile-band / density / smooth 输出字段、行数、分组、provenance、稳定排序。
- **schema reject**：非法 bandwidth、sampleCount、unknown method、冲突字段、非 JSON-safe external operation。
- **mark label 断言**：node / geometry label kind 与 Point / Interval / Path / Reference / Relation host 匹配；错误 kind fail-loud；field/value content 被解析到 core label text。
- **lowering / geometry**：boxplot 组合下沉成 interval / reference / point；density area 下沉成 region；regression 下沉成 path。
- **交互点**：locator 与 render 共用 transform registry；mark-local transform 与 root transform 组合一致。
- **三包等价**：React 薄适配、Vanilla spec helper 与手写 IRPlot 产物等价。
- **docs demo**：示例数据、MDX import、双语页面与 API 表同步。

## 本轮不做

- 不做完整 chart preset 层；`BoxPlot`、`DensityPlot`、`RegressionPlot` 这类开箱组件留 v0.2 chart 或后续便利轴。Plot 本轮只提供底层语法能力。
- 不做二维 KDE、LOESS、多项式回归、移动平均、窗口函数、预测模型。
- 不做 violin plot，除非 density-area 与 mirror 布局能在不增加新 IR 的情况下自然表达；否则顺延。
- 不做交互 tooltip / hover highlight / animated explode。
- 不新增底层专用 `BoxPlotMark` / `DensityMark` / `RegressionMark` / `RibbonMark` / `TextMark` / `LabelMark`。

## 验收口径

alpha.13 封口时应满足：

- ADR-01–05 全部 Accepted，ADR-06 Accepted 或明确顺延且不阻塞主线，ADR-07 Accepted 或其 demo 清理范围明确顺延。
- `@retikz/plot` / `@retikz/plot-react` / `@retikz/plot-vanilla` 三包版本面一致。
- 至少四组端到端 demo：sankey ribbon、boxplot、density-area、regression path。
- `viz/grammar/mark` demo 中纯文字说明优先使用 mark label，而不是新增仅用于文字的 PointMark。
- 统计 transform 渲染与 locator 使用同一 registry / rows 产物。
- docs 能让用户理解“stat 是 transform，geom 是抽象 mark 消费统计 rows”。
