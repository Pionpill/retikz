# ADR-14：RelationMark derived data and routing strategy

状态：Accepted
决策日期：2026-06-26

## 背景

ADR-13 解决了“已有 relation rows 如何画成 source-target Path”的问题，但很多关系并不预先存在为 edge table，而是可从图表数据中计算出来，例如最低点到最高点、两个 interval 的差值、某组代表点之间的箭头。

这些计算属于 Statistics 层，不应塞进 `RelationMark.source` / `target` 的 target 解析里；几何 routing 也不应读取原始数据字段做统计。

## 决策

RelationMark 获得两组能力：

- mark-local data transform：先从 root transform 后的 canonical rows 出发，再运行只服务当前 relation mark 的 transform pipeline，产出 relation rows。
- routing strategy：在 source / target / via 解析为 plot-space target 后，生成 core Path steps。

第一版设计新增内置 `derive-relation` transform，用 JSON-safe selector 从 rows 中选择 source / target row，并可计算 pair measure，如 difference。selector 支持 min、max、first、last、groupBy、tie 与字段投影；output fields 必须通过 transform definition 登记，参与 strict model。

`routing` 与显式 `route` 互斥。内置 routing 包含：

- `line`：默认 source -> via -> target。
- `bend`：生成 core bend step。
- `orthogonal`：生成正交折线，可选择主段或末段挂 label。

`via` 可以与 routing 组合；route 是完全显式的 core step 结构，routing 是快捷算法。

## 最终形态

本 ADR 的 mark-local transform 入口后来被 [ADR-15](./15-mark-local-transform.md) 提升为所有 mark 的公共字段。`derive-relation` 的私有统计语法后来被 [ADR-16](./16-statistical-transform-algebra.md) 收敛为通用 `relate` transform 与共享 selector / pair measure 代数。

因此本 ADR 保留的长期决策是：relation 的数据派生走 transform 管线，几何路径走 routing / route，二者分层；RelationMark 不拥有私有统计 callback。

## 最终形态

- mark data view 的 rows 必须同时服务 scale domain、channel domain、lowering 与 locator。
- relation projected target 的字段来自 relation view rows，并参与 position scale domain；纯 anchor / node target 不贡献 domain。
- routing 只处理已解析 target，不做统计、不生成 anchor id。
- core fold label 若存在渲染缺陷，orthogonal routing 可先降低为显式 line steps，但行为契约仍是 label 位于主正交段。

## 影响

- RelationMark 可以从当前数据派生 relation rows，而不要求用户总是预先准备 edge table。
- 数据派生复用 transform registry，未来自定义 relation derivation 通过 `defineTransform` 注入。
- routing 复用 core Path step 能力，不在 plot 里重写箭头、曲线或 label。

## 长期边界

- 不新增 named dataset、join 或独立 relation table 数据源。
- 不做 obstacle avoidance、edge bundling 或 graph layout。
- 不把函数写入 IRPlot。
- 不修 core fold label；plot 可在 lowering 策略上避开。
