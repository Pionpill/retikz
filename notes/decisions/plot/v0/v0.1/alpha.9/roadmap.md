# plot v0.1-alpha.9 实施待办：Coordinates 坐标系统（1D 族 cartesian1D / polar1D + ternary2D + 维度校验）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md)（阶段二 alpha.9）· [`plot-design §3.5 CoordinateSystem / §8.3 投影分层 / §3.9 Guide`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.8`](../alpha.8/roadmap.md) · 坐标系前身：[`v0.1-alpha.4`](../alpha.4/roadmap.md)（polar 逼出 frame 抽象）

## 目标

**阶段二第四轮**（GoG「**Coordinates**」补全）：在 alpha.4 用 polar 逼出 coordinate frame 抽象（[plot-design §8.3](../../../../../architecture/plot-design.md) (i) 投影整形：scale → coordinate → mark 三层分离）之后，本轮把坐标系族补到 **一维坐标系族**（**cartesian1D** 直线：rug / timeline / 1D strip；**polar1D** 圆周：环形 / 周期数据，复用 alpha.4 角向投影）与 **ternary2D**（重心坐标 a+b+c=1 投影到二维三角），并补 **guide 维度校验**（按坐标系拒非法 dimension，修 cross-review P2）。

alpha.9 的结构性核心与 alpha.4 同构——**再逼一次 frame 抽象**：alpha.4 的 `CoordinateFrame` 把投影做成「scale 归一化 → coordinate 投影 → mark 几何」可替换中间层，但 `project(primary, secondary)` 形态**写死恰好 2 个位置通道**。cartesian1D 只有 **1 个**位置通道（另一屏幕维塌缩）、ternary2D 有 **3 个**输入通道（a/b/c → 重心 → 2D），两者都顶破「2 通道」假设。本轮 ADR-01 的职责是把 frame 从「2 通道」泛化成「N 通道角色」，cartesian / polar 零回归，cartesian1D / ternary 各自接入。**若加 1D / ternary 要重写 mark 内部或 polar/cartesian 回归，说明泛化没切干净**。

现状（alpha.1~8 + 代码核验）：

- **坐标系仅 2 套**：`PlotCoordinate` = `cartesian2D` / `polar2D`（`ir/coordinate.ts`），`CoordinateSchema` 双成员 union。
- **frame 写死 2 通道**：`CoordinateFrame = CartesianFrame | PolarFrame`，`project: (primaryValue, secondaryValue) => [x, y] | null`（`lower/project.ts`）——恰好两个位置入参。
- **位置 encoding 双必填 x/y、无角色通道**（评审 P1）：`PositionEncodingSchema` 仅 `x` / `y` 且**都必填**（`ir/encoding.ts:27`），polar 靠 coordinate 把 x→angle / y→radius 角色映射（未往 encoding 加 angle/radius 通道）；React `PointMark` 同样 x/y 必填（`marks.tsx`）。ternary 需绑 3 字段（a/b/c）、cartesian1D 需 y 可省——现 schema 装不下。
- **guide 维度不按坐标系校验**（cross-review P2）：`GuideDimension` = X/Y/Angle/Radius；`lowerCartesianGuide` 凡非 `x` 一律当 y 轴——`<Axis dimension="angle" />` 在 cartesian 下不被拒，渲出空刻度杂散轴线。
- **mark × coordinate**：alpha.4 已落 (i) 投影整形（interval→sector、line/area→弧 Path、point 重投影）；1D / ternary 下各 mark 怎么投影未定。

四块（对齐 [v0.1 roadmap](../roadmap.md) line 42「Coordinates 坐标系统」，延续「纵向薄片 + 三包 lockstep（milestone 粒度，同 alpha.4）」）：

- **frame N 通道泛化 + 位置 encoding 角色化 + 维度角色契约 + guide 维度校验（ADR-01，唯一真叶子）**：
  - **frame**：把 `CoordinateFrame` 从 2 通道泛化成「N 通道角色」（cartesian1D / polar1D=1、cartesian/polar=2、ternary=3）。
  - **位置 encoding 角色化（评审 P1，关键）**：当前 `PositionEncodingSchema` **x/y 双必填、无其它角色通道**（`ir/encoding.ts`），ternary 要绑 **3** 个字段（a/b/c）x/y 装不下、cartesian1D 要 y 可省——**光改 PlotCoordinate/GuideDimension 数据进不了 frame**。本 ADR 把位置 encoding 从「固定 x/y」泛化为 **role-based 绑定**：x/y 改可选 + 新增角色通道（ternary 的 a/b/c），按坐标系**校验必填角色集**（cartesian2D 需 x+y、cartesian1D 需单维、ternary2D 需 a/b/c，缺即 fail-loud）。**cartesian/polar 现状零回归**（x/y 仍是它们的角色，沿 alpha.4 x→angle/y→radius 映射）。React/vanilla 的 mark props 对等扩（见 ADR-04 表面，但 schema 契约在此定）。
  - **每个坐标系声明合法 dimension 集**：cartesian2D: x/y；polar2D: angle/radius (**+ x/y 别名**，alpha.4 已有，勿删)；cartesian1D: x；polar1D: angle (+x 别名)；ternary2D: a/b/c。guide 据此校验、非法 dimension fail-loud（修 cross-review P2）。
- **一维坐标系族 + 1D 轴 guide（ADR-02，dep 01）**：单位置通道，空间载体分两种——**cartesian1D（直线）**：投影到一条线、另一屏幕维塌缩到固定基线，rug / timeline / 1D strip；**polar1D（圆周）**：单角向通道投影到半径 r 的圆周（角度编码值、半径固定），环形 rug / 周期数据（24h 钟面、星期轮），**复用 alpha.4 极坐标角向投影 + 角向轴**。二者是降维的一对（cartesian1D = cartesian 降维、polar1D = polar 去 radius），共享「单通道 + 1D guide」骨架、只在直线 vs 圆周分叉。**histogram 不在本轮**——它是一维分箱（alpha.11 transform）+ count 第二维，本轮只出一维空间底座。
- **ternary2D 坐标系 + 三角轴 guide（ADR-03，dep 01）**：三个连续通道 a/b/c 经重心坐标投影到等边三角内（a+b+c 归一化到常量）；三角轴 guide（三条边各一刻度轴 + 三向网格）。**`proportion` 已于 alpha.6 并入 `continuous`**（父 roadmap「消费 proportion」措辞过时）——ternary 取三个 continuous 字段、自行归一化，不依赖独立 proportion 类型。
- **三包 DSL + 文档露出（ADR-04，dep 01–03）**：`coordinate="cartesian1D"` / `"polar1D"` / `"ternary2D"` 表面、1D / 角向 1D / 三角轴 guide 表面；react + vanilla 两套 + docs demo（rug / timeline / 环形周期 / 三元图）；端到端验收。

## 待调研 + 待决策（ADR 起草前定，列表供决策）

> 沿用 alpha.4/6/7/8 流程：临近开发先调研同类库（**ggplot2 `coord_*` / ternary 包、Vega-Lite、Observable Plot、D3、PlotPy/python-ternary**）+ 外部 LLM 评审，再拍板进 ADR。以下为已识别、需在 ADR 起草前定的关键决策点。

- **① frame N 通道泛化形态**：`project(primary, secondary)` 改成什么契约——`project(values: ReadonlyArray<unknown>)` 按角色序、还是 `project(byRole: Record<DimensionRole, unknown>)`？倾向**按坐标系声明的角色序传值数组**（cartesian1D 1 元、cartesian/polar 2 元、ternary 3 元），frame 自带 `roles: Array<DimensionRole>` 元信息；cartesian/polar 现有 2 元投影包装成新签名、零行为回归。bandwidth / clip / range 等 `ResolvedCoordinateFrame` 字段如何随通道数泛化一并定。
- **①b 位置 encoding 角色绑定契约（评审 P1，关键）**：x/y 改可选后如何保 cartesian/polar 必填校验 + 给 ternary 加 a/b/c？倾向 **`PositionEncodingSchema` 全角色可选（x?/y?/a?/b?/c?）+ 按 coordinate 校验必填角色集**（cartesian2D 缺 x 或 y → fail-loud、ternary2D 缺 a/b/c 任一 → fail-loud、cartesian1D 缺单维 → fail-loud）——纯增量、cartesian/polar 现有 x/y 必填语义靠 coordinate 级校验保住，不破存量 spec。a/b/c 通道仅 ternary 用（ADR-03 加）、cartesian1D 复用 x（ADR-02）。React/vanilla mark props 对等（x/y 转可选 + 加 a/b/c），文档同步。**这条牵动 `ir/encoding.ts` + `ir/mark.ts` + React `marks.tsx` + vanilla**，须在 ADR-01 定 schema 契约、ADR-02/03 各自落角色、ADR-04 落表面。
- **② 一维坐标系族（cartesian1D + polar1D）命名与几何（命名已定）**：**坐标系按空间几何命名、不按 scale 命名**——`cartesian1D`（一维笛卡尔直线，**非 `linear1D`**）。plot-design §3.5 曾草拟 `linear1D`，但该名错误暗示「仅线性 scale」：一维直线轴与 cartesian2D 的轴一样 **scale-agnostic**，可配 log / sqrt / time / band（log rug、时间 timeline 合法）；且与 cartesian2D / polar2D / polar1D 的「空间+维度」命名一致、不误导。cartesian1D（塌缩维取固定基线、orientation 水平/垂直、单维复用 `x` 角色）+ **polar1D**（单角向落半径 r 圆周、复用 polar2D 的 x→angle 别名、radius 占可用半径比 0<r≤1 默认外圆、startAngle/endAngle 支持半环、整圆周期量首尾相接）。二者同 ADR（1D 族），polar1D 复用 alpha.4 `projectPolar` + 角向轴。细节（基线位置 / rug 刻记几何 / 圆周方向 / 周期 band 绕圆）见 [ADR-02](./02-cartesian1d.md) 待决策点。
- **③ ternary 归一化策略**：a/b/c 三连续字段 → 重心坐标，要求 `a+b+c` 为常量。**自动按行归一化**（每行除以 a+b+c）还是**要求已归一 + 越界 fail-loud**？倾向**自动归一化**（容忍任意正值三元组，更 AI 友好；a+b+c≤0 或含负 fail-loud），归一化是 coordinate 投影内职责（非 transform，因它是几何而非数据聚合）。三角朝向（哪个顶点 = a/b/c，顶点朝上 vs 朝下）默认。
- **④ ternary 维度角色 + 三角轴 guide**：`GuideDimension` 加 `A`/`B`/`C` 成员；三角轴 = 三条边各一刻度轴 + 三向网格线。guide 维度校验里 ternary 合法集 = {a,b,c}。三角轴刻度方向 / 标签摆位（沿边 vs 顶点旁）默认。
- **⑤ guide 维度校验的别名处理**：polar2D 当前 `GuideDimension` 同时有 angle/radius **与** x/y（alpha.4 留的别名）。校验时 polar 合法集含别名吗（x→angle、y→radius）？倾向**坐标系声明合法集（含本系别名）**，cartesian2D={x,y}、polar2D={angle,radius,x,y}、cartesian1D={x}、polar1D={angle,x}、ternary2D={a,b,c}；不在集内即 fail-loud（清晰错误：该坐标系不支持此 dimension）。
- **⑥ mark × 新坐标系支持矩阵**：cartesian1D / polar1D / ternary 下哪些 mark 有意义、哪些 fail-loud？倾向**本轮 point 为主**（cartesian1D point=直线 rug 刻记、polar1D point=圆周点 / 环形 rug、ternary point=三角内点散点）；line/area 在 ternary（连成三角内折线 / 区域）按需；interval/sector 在 1D/ternary **fail-loud**（无对应几何）。明确支持矩阵，未支持组合给清晰错误，不静默出怪图。
- **⑦ 1D / ternary 的 layout 占位**：cartesian1D 单轴留白（类 cartesian 但只一维）；polar1D 圆心 + 半径（复用 alpha.4 polar layout，去 radius 维）；ternary 三角形需正三角内接画布 + 三边标签留白（类 polar 的圆心/半径 layout）。均归 ADR-01 的 `ResolvedCoordinateFrame`，02/03 共用、不各造。

## 不在 alpha.9（顺延）

- **histogram / bin transform** → alpha.11 Statistics（cartesian1D 只出空间底座，分箱是 transform 职责）
- **地图坐标**（geo projection）→ **永不进 plot**（plot-design §2 独立 domain）
- **3D 坐标系**（cartesian3D / polar3D 等）→ **gating 于 core 三维坐标**——plot 只消费 core 能力、不自造几何（AGENTS.md「子组遇 core 能力不足先补 core」），core 没有三维坐标前不在 plot 做
- **其它 2D 坐标变体**（如 cartesian 对数复合系、双轴 dual-axis）→ 需求驱动
- **ternary line/area/区域 mark**（若 ⑥ 定本轮 point 为主）→ 顺延需求驱动
- 更多 mark / transform / stat → alpha.10+

## core 依赖

**预计无新 core 依赖**——cartesian1D / ternary2D 投影是 **plot 内几何**（值 → 归一化 → 2D 屏幕坐标），下沉到 core 现有 Node（点 / 刻记）+ Path（轴线 / 三角边 / 网格），与 cartesian/polar 同路、只是投影函数不同。1D 轴线 / 三角轴 / 网格都是 plot 计算几何 → core Path/Node。**3D 坐标系**才需 core 三维支持（本轮不做，见上）。若实现期发现某几何 core 表达不足，按 AGENTS.md 走 `next-core`，不在 plot 自造。

## 执行模式

**单条串行 + 三包 lockstep（milestone 粒度，同 alpha.4）**：ADR-01~03 只做 `@retikz/plot` 核心内部（IR + lowering），**不逐条出 react/vanilla/docs**——新坐标系在 DSL 层有意义须等 coordinate + encoding 角色 + guide 都就位，逐 ADR 露出无意义；authoring 表面 + docs demo 集中到 ADR-04 收口，整 milestone 完成时三包 + 文档同步落地。每条 ADR 走 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾），人工 review 后开下一条。红色 ADR 按 [`develop-design`](../../../../../../.agents/skills/develop-design/SKILL.md) 先调研 + 外部 LLM 评审、人工签字后进实现。

> **lockstep 粒度澄清（评审 P1）**：milestone 粒度 lockstep 不违反 [v0.1 roadmap](../roadmap.md) 的「能力级 lockstep」——区别在 **ADR-01~03 的 schema/lowering 改动是 milestone 内部 WIP，不作为独立用户可交付物**：它们 commit 进 `next-plot` 但**不 bump 版本、不对外发布、不声称用户可用**，直到 ADR-04 把三包表面 + 文档一次性同步、milestone 才「可交付」。这正是 alpha.4 的成例（polar 的 coordinate/mark/guide 经 ADR-01~04 内部落地、ADR-05 才出 DSL+docs）。即「schema 已变、用户表面/文档暂缺」的中间态被限制在**未发布的 milestone 分支内**，封口时四方一致——既守 AGENTS.md「用户可见改动同改动集带文档」（以 milestone 为改动集单元），又避免对单坐标系纵向加宽逐 ADR 造无意义的半成品表面。

## 实现顺序（编号 ≠ 依赖，结构叶子优先）

```
01 frame N 通道泛化 + 维度角色契约 + guide 维度校验 (唯一真叶子：泛化 project + 每坐标系合法 dimension 集 + 校验)
 ├─ 02 1D 坐标系族 cartesian1D + polar1D + 1D/角向轴 guide  (dep 01：1 通道投影，直线基线 / 固定半径圆周)
 └─ 03 ternary2D 坐标系 + 三角轴 guide        (dep 01：a/b/c 重心投影 + 归一化 + 三角轴 / 三向网格)
       └─ 04 三包 DSL + 文档露出              (dep 01–03)
```

> 同 alpha.4：**只有 01 是真叶子**——它把 frame 从 2 通道泛化成 N 通道、定每坐标系合法 dimension 集 + 校验，并产出 1D / ternary 共用的 `ResolvedCoordinateFrame`（含 layout 占位）。**02 / 03 不能在 01 前实现**，否则各自重造投影 / layout、抽象切不干净。02（1D 族 cartesian1D/polar1D，1 通道）与 03（ternary，3 通道）互不依赖、可并行起草与实现。04 依赖全部（DSL 装配 + 端到端验收：rug / timeline / 环形 / 三元图）。

> **测试 case 规则**（沿用 alpha milestone 放宽）：按复杂度适量，覆盖真实有意义的 accept/reject 与几何断言（1D 投影点落轴线、ternary 重心投影点、归一化、三角轴刻度、维度校验 fail-loud、mark×坐标系矩阵），不硬凑每 ADR ≥ 9。

## 前置 setup

无新包。alpha.9 主要在：

- `plot/src/ir/{coordinate,guide,encoding,mark}.ts`：`PlotCoordinate` 加 cartesian1D/polar1D/ternary2D 成员（Cartesian1DSchema/Polar1DSchema/Ternary2DSchema）、`CoordinateSchema` 扩 union；`GuideDimension` 加 ternary a/b/c（cartesian1D 复用 x、polar1D 复用 angle，无新增）；**`PositionEncodingSchema` x/y 转可选 + 加 a/b/c 角色通道**（评审 P1，ADR-01 定契约、ternary 的 a/b/c 由 ADR-03 落）；mark schema 若直接引用位置必填项一并放宽。
- `plot/src/lower/{project,expand,guide,layout,mark}.ts`：frame N 通道泛化、cartesian1D/ternary 投影 + layout 占位、1D/三角轴 guide 几何、**按 coordinate 校验必填角色集 + guide 维度集**（fail-loud）、mark×坐标系支持矩阵。
- react/vanilla 表面（ADR-04）：`coordinate` 入口扩 cartesian1D/ternary2D；**`PointMark` 等的 x/y props 转可选 + 加 a/b/c**（对等 schema 角色化）；1D/三角轴 guide 表面；docs demo。

## ADR 清单

> ADR-01~04 **Accepted + 已实现**（Spec-First TDD：tests-first → 实现 → adversarial bug hunt + contract audit；BLOCKING「ternary 和上溢」已修并升回归）。三包 + 文档四方一致、坐标系族 milestone 可交付。决策点 ①~⑦ + ①b 已在各 ADR「决策」段落定。
> **ADR-05（Proposed，follow-on 扩展）**：把 alpha.9 时段做的实验性 custom coordinate（next-plot spike）正式化，并立**单 role 轴标架契约 `frameAlong`**——曲线轴现在就用、3D / 多 plot 组合 / 法丛只留缝。同 alpha.4/9 的 coordinate-frame 结构线；经一轮 develop-design 多 LLM 评审（P0×2 / P1×2 / P2×1 全采纳）。状态待 develop-wrapup 翻 Accepted。

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-coordinate-frame-roles.md) | coordinate frame N 通道泛化 + **位置 encoding 角色化**（x/y 转可选 + 按 coordinate 校验必填角色集，评审 P1）+ 每坐标系合法 dimension 集契约 + guide 维度校验（修 cross-review P2） | red | — | Accepted |
| [02](./02-cartesian1d.md) | **一维坐标系族**：cartesian1D（直线，单维 + 塌缩维基线；rug/timeline）+ **polar1D（圆周，单角向 + 固定半径；环形/周期，复用 alpha.4 角向投影）**+ 1D 轴 / 角向 1D 轴 guide；histogram 留 alpha.11；mark 矩阵 point 为主 | red | ADR-01 | Accepted |
| [03](./03-ternary2d.md) | ternary2D 坐标系 + 三角轴 guide（**加 a/b/c 位置角色通道** + 重心投影 + 自动归一化 + 三角轴 / 三向网格；取 continuous 字段，proportion 已并入 continuous；mark 矩阵 point 为主） | red | ADR-01 | Accepted |
| [04](./04-dsl-docs.md) | 三包 DSL + 文档露出（`coordinate="cartesian1D"`/`"ternary2D"`、PointMark x/y 可选 + a/b/c、1D/三角轴表面；react + vanilla + docs demo；端到端验收） | red | ADR-01–03 | Accepted |
| [05](./05-coordinate-chart-frame.md) | **坐标系 = 可报局部标架（`frameAlong`）的 chart**：正式化实验性 custom coordinate + 立单 role 轴标架契约（曲线轴吃 `frameAlong`、缺则数值回落）；`createCustomFrame` 定稿 options 对象；3D / 多 plot 组合 / 法丛只留缝 | red | ADR-01 | Proposed |

## 贯穿原则落点

- **(i) 投影整形再验收（验收口径，评审 P2）**：alpha.4 把 mark 做成坐标系无关、由 coordinate 投影整形；alpha.9 是第二个验收点。验收口径**不是「所有 mark 自动适配新坐标系」**（alpha.4 polar 因与 cartesian 同为 2 通道、各 mark 确实自动适配；但 1D/ternary 通道数不同、几何语义差异大，本轮按支持矩阵 point 为主、其它顺延/fail-loud，见决策 ⑥）。正确口径是两条：① **frame 角色泛化不得让 cartesian/polar 回归**（既有 mark×既有坐标系逐字不变）；② **新坐标系先声明 mark 支持矩阵，未支持组合 fail-loud**（不静默出怪图）。即「加坐标系的成本集中在 frame + 各坐标系投影/guide，不散进每个 mark 内部」，而非「每个 mark 立即支持每个坐标系」。
- **判别串含维度命名**：`cartesian1D` / `polar1D` / `ternary2D` 延续 `cartesian2D` / `polar2D` 的「语义 + 维度」命名（裸字面量可写、LLM 友好）；`polar1D` 与 `polar2D` 同族（去 radius 通道即降维）。
- **fail-loud 不静默**：guide 维度校验（修 cross-review P2 的杂散轴线）、ternary 归一化越界、mark×坐标系未支持组合——全 fail-loud 给清晰错误，不静默出怪图。
- **anchor / scope 预留**：1D 刻记 / ternary 点延续 `id` 句柄字段位，下沉 Node 自带 core 锚点，为后续按 datum 命中预留（同 alpha.4 sector）。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede。模板见 [`../../../_template.md`](../../../_template.md)。
