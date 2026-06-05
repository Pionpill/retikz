# ADR-06：最薄 lowering 纵向闭环（lowerPlots：Plot IR + 数据 → core IR）

- 状态：Accepted（已实现）
- 决策日期：2026-06-03
- 关联：[plot v0.1-alpha.1 待办](./roadmap.md) · [plot-design.md §8 / §8.1 / §8.2 / §8.3](../../../../../architecture/plot-design.md) · 依赖：[ADR-01](./01-plot-spec-root.md) · [ADR-02](./02-plot-data.md) · [ADR-03](./03-plot-scale.md) · [ADR-04](./04-plot-coordinate.md) · [ADR-05](./05-plot-encoding-mark.md)

## 背景 / 约束

ADR-01~05 定了 Plot IR（配置）但**零行为**。本 ADR 落「逻辑」层（plot-design §8.2）：把 `(Plot IR + 外部数据)` 下沉成 core IR（`Scope` / `Node` / `Path` / `Step`），跑通最薄端到端——单 mark（point / line）· linear scale · cartesian2D，产出无轴散点 / 折线（plot-design §13.1「最薄纵向闭环」的收口）。硬约束：数据不进 IR（§3.1）——`lowerPlots(datasets)` 闭包 `datasets`，经 core `CompileOptions.composites` 注册，`compileToScene` 第一步 `lowerComposites` 调展开；renderer 后端只见 lowered core IR。

## 决策：`lowerPlots(datasets, options?)` → `CompositeDefinition[]`，expand 投影下沉

`lowerPlots(datasets, options?)` 返回 `defineComposite({ schema: PlotSpecSchema, expand })`，`expand(node)` 步骤：

1. `rows = datasets[node.data.ref]`；缺则抛含 ref 名的清晰错。
2. 建 scale 求值：对 cartesian2D 的 `coordinate.x` / `coordinate.y` 找对应命名 scale；
   - domain：用 `scale.domain`，否则从「绑到该轴的 mark 字段值」求 `[min, max]`（绑定期推断）；
   - range：x = `[0, width]`，y = `[height, 0]`（screen y-down，数据大值在上）；`scale.range` 覆盖；
   - 线性映射 `v ↦ r0 + (v - d0)/(d1 - d0) * (r1 - r0)`（d1=d0 时取区间中点防除零）。
3. 字段取值：`field` 路径 `a.b.c` 对 row 解析；`value` 取常量。位置通道结果须为有限数。
4. 投影每行 → `[xScale(xv), yScale(yv)]`。
5. mark 下沉：**point** → 每行一个 circle `Node`（`{ type:'node', shape:'circle', position, minimumSize, fill }`）；**line** → 一条 `Path`，steps = `move`(首点) + `line`(后续点)，点序按 `order` 字段升序、否则数据数组序。
6. 用一个 `localNamespace` `Scope` 包裹所有 mark 产物；`Scope.id` = `node.id`（§8.1：root id → 外层 Scope.id 外部句柄）；mark `id` alpha.1 仅埋、不解析。
7. 返回该 Scope（`IRChild`）。

理由：

1. **复用 core 既有通道**：`CompositeDefinition` + `CompileOptions.composites`，零 core 改动（§8.2）。
2. **尺寸是渲染选项、不进 IR**：`LowerPlotsOptions.width/height` 带默认（480 / 300）；保持 IR 纯数据-配置，未来要进 IR 可非破坏迁移。
3. **alpha.1 笛卡尔不写死**：投影走 `coordinate` 分发的小函数，point/line 产几何时只依赖「已投影的点」——为 alpha.4 polar（§8.3）留接口，本 ADR 不引入 polar 但不堵通用投影路线。
4. **id 绑定**（§8.1）：root id → 外层 Scope.id，使整图可被连接 / 组合。

### 设计细节（具体决策）

- **散点 glyph** 用 circle `Node` + `minimumSize`（默认半径 ~3），非画小 Path 圆——最简、可被 anchor。
- **point/line 默认样式**：alpha.1 给最简默认（黑色描边/填充、strokeWidth 1）；主题 / config 层留后续。
- **domain 推断含 null / 非数**：跳过 null；非有限值经 `onWarn` 警告并丢弃该点，不抛断编译。

## 不在本 ADR 范围

- **guide（轴 / 网格）** → alpha.2；本 ADR 产「无轴」散点 / 折线。
- **band / time scale、bar / area mark、polar** → alpha.3 / alpha.4。
- **anchor / scope 解析、datum locator** → alpha.5（本 ADR 仅按 §8.1 绑 id）。
- **绘图区尺寸进 IR** → 暂作 lowerPlots 选项；后续如需进 IR 非破坏迁移。
- **主题 / config 默认层** → 后续。

---

> **实现指针**：level `red`（动 `plot/src/lower/**` + `plot/src/index.ts`）、无 IR schema 改动（尺寸是 `lowerPlots` 运行时选项、不进 IR）。真源以代码为准——`lowerPlots` / `LowerPlotsOptions`（编排 + 入口 + `defineComposite`）及 `field`（路径解析 / 取值 / 排序）/ `scale`（线性映射 + domain·range 求解）/ `project`（坐标系投影）/ `mark`（point→Node / line→Path）helper，均在 `plot/src/lower/`，barrel `plot/src/lower/index.ts`；仅消费 core `compileToScene` / `defineComposite` / `CompositeDefinition` / IR 类型，不改 core。测试在 `packages/plot/plot/tests/lower/`。完整施工契约（文件 scope / 测试象限 / 依赖现有元素）见本文件 git 历史。

> 🔖 封板压缩 commit `9115e6b4`；压缩前完整施工蓝图 = `git show 9115e6b4^:notes/decisions/plot/v0/v0.1/v0.1-alpha.1/06-plot-lowering.md`。
