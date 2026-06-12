# ADR-02：一维坐标系族——cartesian1D（直线）+ polar1D（圆周）+ 1D 轴 guide

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot-design §3.5 CoordinateSystem](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 frame 角色泛化](./01-coordinate-frame-roles.md)（projectRoles + 必填角色校验 + 维度校验）· 复用：[alpha.4 polar 投影 / 角向 guide](../v0.1-alpha.4/01-coordinate-polar.md)

## 背景

ADR-01 把 frame 泛化成 N 通道角色后，一维坐标系（单一位置通道）是第一批 1 通道消费者。一维坐标有对称两种，空间载体为直线或圆周：

- **cartesian1D（直线）**：单位置维落一条轴线、塌缩的第二屏幕维取固定基线。用例 rug / timeline / 1D strip。
- **polar1D（圆周）**：单角向位置维落半径 r 圆周（角度编码值、半径固定）。用例周期 / 循环数据（24h 钟面、星期轮）/ 环形 rug。

二者是降维的一对：cartesian1D = cartesian2D 去一维，polar1D = polar2D 去 radius、只留 angle。共享「单位置通道 + 1D guide」骨架，只在投影载体（直线 vs 圆）分叉。一维坐标**不是 histogram**（分箱是 alpha.11 transform，本轮只出一维空间底座）。

**命名 = 空间几何、非 scale**：取 `cartesian1D`（非 `linear1D`）——坐标系 scale-agnostic，其单轴可配 log / sqrt / time / band（log rug、时间 timeline 合法）；`linear1D` 错误暗示「仅线性 scale」，弃用（plot-design §3.5 已同步改名）。

## 决策

新增两个一维坐标系，frame 均 1 通道（roles 长度 1）：

- **cartesian1D**：角色 `x`（复用、不引新名）；`projectRoles([v])` → 水平 `[xScale(v), baseline]` / 垂直 `[baseline, yScale(v)]`，`orientation` 控轴向。1D 轴 = 沿基线直线轴。合法 guide 维度集 `{x}`。
- **polar1D**：角色 `angle`（复用 polar2D x→angle 别名）；`projectRoles([v])` → `projectPolar(angleScale(v), R)`，R = 固定半径（可用半径占比，默认 1=外圆）；`startAngle` / `endAngle` 控角向区间（默认整圆，可半环）。1D 轴 = 角向轴（复用 alpha.4）。合法维度集 `{angle, x 别名}`。

polar1D 复用 alpha.4 `createPolarFrame` / `projectPolar` + 角向轴，不重造（≈「cartesian1D 把轴弯成圆」）。

**mark 支持矩阵**（决策 ⑥）：本轮 **point** 为主——cartesian1D + point = 直线 rug 刻记、polar1D + point = 圆周点 / 环形 rug。`line` 顺延需求驱动；`interval` / `sector` / `area` 在一维 **fail-loud**（无对应几何，ADR-01 验收口径②）。

> 起草期决策点已定：cartesian1D 塌缩维基线**默认贴边**（水平→底、垂直→左，rug 沿轴边缘惯例）；polar1D `radius` 取**可用半径占比**（与 polar2D innerRadius 同口径），圆周方向顺 alpha.4 polar 约定；整圆周期量角向 band 首尾不重叠均布（同 alpha.4）；rug 渲**短刻记**（垂直基线 / 沿半径方向），dot plot 圆点顺延；line 顺延（point 覆盖主用例）。

## 影响

- **Plot IR**：`PlotCoordinate` 加 `Cartesian1D` / `Polar1D` + `Cartesian1DSchema` / `Polar1DSchema` + `Cartesian1DOrientation`，`CoordinateSchema` union 扩；纯增量。
- **core**：无新依赖（刻记 / 圆周点下沉 core Node/Path）。
- **对外 API**：`coordinate="cartesian1D"|"polar1D"`（ADR-04）；纯新增。

## 不在本 ADR 范围

- histogram / 分箱 → alpha.11（一维只出空间底座）。
- 1D + line / area / interval / sector → fail-loud（point 为主）；line 需求驱动。
- dot plot 堆叠 / beeswarm / 环形堆叠 → 顺延。
- ternary2D → [ADR-03](./03-ternary2d.md)。

## 实现指针

最终形态见 `packages/plot/plot/src/ir/coordinate.ts`（`Cartesian1DSchema` / `Polar1DSchema` / `Cartesian1DOrientation`）、`src/lower/project.ts`（cartesian1D 直线+基线 frame、polar1D 复用 createPolarFrame/projectPolar）、`src/lower/layout.ts`（1D 直线 / 圆周占位）、`src/lower/guide.ts`（1D 直线轴 + 角向 1D 轴）；测试 `tests/lower/coordinate-1d.test.ts` + `tests/ir/coordinate.schema.test.ts`。

> 🔖 本文件压缩前完整施工蓝图 = `git show 329fb8b7:notes/decisions/plot/v0/v0.1/v0.1-alpha.9/02-cartesian1d.md`（封板全文）。
