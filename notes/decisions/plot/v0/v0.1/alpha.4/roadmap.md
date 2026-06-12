# plot v0.1-alpha.4 实施待办：polar 坐标系 + 径向 / 角向 guide + 新 mark（area / sector）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md) · [`plot-design.md §3.5 coordinate / §3.7 mark / §3.9 guide / §8.3 投影分层`](../../../../../architecture/plot-design.md) · [`_template.md`](../../../_template.md) · 上个 milestone：[`v0.1-alpha.3`](../alpha.3/roadmap.md)

## 目标

把 alpha.1~alpha.3 打通的 **cartesian2D 纵向闭环**横向扩到**第二套坐标系 polar2D**，落定 [plot-design §8.3](../../../../../architecture/plot-design.md) 的 **(i) 投影整形**决策（mark 保持坐标系无关、由 coordinate 做投影整形）。产出从「带轴折线 / 柱状（笛卡尔）」扩到「**径向柱 / 玫瑰图 / 饼图 / 环图 / 极坐标折线 / 雷达**」，并新建两种 mark（**area / sector**）。

alpha.4 的核心不是「再加一个坐标系」那么简单——是**逼出 coordinate 抽象**：alpha.1~alpha.3 全链路把 cartesian 假设写死在 projector / layout / mark 几何 / guide 几何里，polar 落地必须先把这些写死处抽象成「坐标系可替换的中间层」。若 polar 接入要大改 mark 内部，说明抽象没做对——ADR-01 的职责就是把这道缝切干净。

随之引入前三个 milestone 没有的能力：

- **第二套坐标系（polar2D）**：coordinate IR 从单成员 union 升为多坐标系；引入极坐标投影几何（归一化 angle / radius → 屏幕 2D 点，绕圆心）。
- **mark 几何 × coordinate 投影分层**：同一 mark 在不同坐标系产出不同几何——interval 在 polar 成 **sector**（径向柱 / 玫瑰）、line / area 在 polar 投影成弯弧 Path、point 经重投影自动适配。line / area 支持 **`closed`**（首尾相连）：polar + closed line = **雷达**、closed area = **填充雷达**（plot-design §3.7：line + polar2D + closed → 雷达）。下沉走 core 参数化可连接 `sector` shape（core v0.3-alpha.4 已就绪）+ Path 两条路。
- **两种新 mark（area / sector）**：area = 线与 baseline 间的区域（笛卡尔 + 极坐标）；sector = 角度 / 半径区间（pie / donut / rose）。**累积角是 transform 阶段职责**——饼图的「value → 累积角界」由 cumulative transform 派生（复用 / 泛化 alpha.3 的 stack，产出 start/end 角界字段），sector mark 只读派生字段（与堆叠 interval 读 y0/y1 同构），**不在 mark 内建 transform**（守 plot-design §3.3 transform 先于 scale/coordinate/mark）；玫瑰图角度由 band 切分。
- **径向 / 角向 guide**：angular axis（刻度绕圆周）、radial axis（刻度沿一条辐条）、polar grid（同心环 + 角向辐条）。与 cartesian 的直线轴 / 网格是两套几何。

不在 alpha.4（沿用 / 顺延）：scope/anchor 接通与 datum locator（alpha.5）、ternary / linear1D 坐标系、log / pow / quantize scale、size / opacity / shape 等非位置通道、legend、facet、交互（tooltip / hover，留 v0.3）、dual-axis。

## 执行模式

**单条串行**：每条 ADR 走完 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾）、人工 review 后再开下一条。本 milestone 的 ADR 草案先一次性起草为 `Proposed`，用户 review ack 后逐条进实现（沿用 alpha.3）。

**三包 lockstep（milestone 粒度）**：alpha.4 的 ADR-01~04 只做 `@retikz/plot` 核心内部能力（IR + lowering），**不出 react / vanilla / docs**——polar 在 DSL 层有意义须等 coordinate + mark + guide 都就位，逐 ADR 露出无意义。authoring 表面（`@retikz/plot-react` / `@retikz/plot-vanilla` 两套 + docs demo）集中到 ADR-05 收口。整个 milestone 完成时三包 + 文档同步落地——lockstep 在 **milestone 而非单 ADR** 粒度成立（与 alpha.1~alpha.3 每 ADR 露出的差异：本 milestone 是单坐标系纵向加宽、内部强依赖）。

**设计阶段多 LLM 评估**：红色 ADR（本 milestone 全红）按 [`develop-design`](../../../../../../.agents/skills/develop-design/SKILL.md) 要求贴给至少一个外部 LLM 跑挑刺 / 替代方案视角，意见合进 ADR 的「决策」/「待决策点」/「不在范围」段。

## 实现顺序（编号 ≠ 实现顺序，依赖叶子优先）

```
01 coordinate 抽象通用化 + polar2D 投影 (唯一真叶子)
 ├─ 02 sector 几何   (interval→sector 径向柱/玫瑰 + sector mark 饼图/环图)
 ├─ 03 连续 mark     (area mark 新建 + line/area polar 投影, 直边采样弯弧 Path)
 └─ 04 polar guide   (angular/radial axis + 同心环/辐条 grid)
       └─ 05 三包 DSL + 文档露出 (dep 01–04)
```

- **只有 01 是真叶子**：它把 projector / scale 解析 / range·layout / guide frame 从「写死 cartesian」抽象成「坐标系可插拔」，并补 polar2D 投影。**02 / 03 / 04 都不能在 01 之前实现**，否则各自重造投影逻辑、抽象切不干净。
- **02 / 03 / 04 互不依赖**，可任意先后（都只 dep 01）：02 = sector 家族（下沉 core `sector` Node）、03 = 连续家族（下沉 Path）、04 = polar guide 几何。按下沉目标分，避免一条 ADR 装 3+ 独立特性。**真并行的前提是 ADR-01 定完整 `ResolvedCoordinateFrame`（圆心 / 半径 range / 角度 range / clip / frame）——02·03·04 共用同一帧，不各造临时投影框架；04 只做 guide 几何、消费该 frame，不定 layout。** 否则 02/03 会先于 04 造一套 layout，沦为伪并行。
- **05 依赖全部**（DSL 装配 + 端到端 polar 渲染验收：径向柱 / 饼图 / 极坐标折线 + 极坐标轴网格）。
- 实现顺序：`01 → 02·03·04 → 05`。

> **测试 case 规则**：plot alpha milestone 放宽为「按复杂度适量，覆盖真实有意义的 accept/reject 与几何断言（极坐标投影点、sector 参数、弧采样），不硬凑每 ADR ≥ 9」。此放宽已写进 [`develop-design`](../../../../../../.agents/skills/develop-design/SKILL.md) SKILL 与 [plot `_template.md`](../../../_template.md)（测试象限段），与「≥9」硬约束的冲突已消解。

## 前置 setup

无新包（三包脚手架 alpha.1 已建）。alpha.4 主要在 `src/ir/{coordinate,encoding,mark}.ts` 与 `src/lower/{project,expand,mark,guide,scale,layout}.ts` 改 / 加。

- **core 依赖**：消费 core v0.3-alpha.4 的参数化可连接 `sector` / `arc` shape（`packages/core/core/src/shapes/`，params `{ innerRadius, outerRadius, startAngle, endAngle }`，角度 0°=+x / 90°=+y 屏幕 y 向下）；node `shape: { type:'sector', params }`（`ir/shape.ts`）。plot 只消费、不改 core 内部。
- **d3 依赖**：极坐标投影是自有几何（无需 d3-shape，弧由 core sector 发射）；饼图累积角用自有 transform。**预计无新增 d3 子依赖**——若 02 的 cumulative-angle 复用 `d3-shape` 的 `pie` / `arc`，在对应 ADR 评估后于 catalog 登记。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| 01 | coordinate 抽象通用化 + polar2D 投影（coordinate IR 升多成员 union；projector / scale·range 去 cartesian 写死；**定完整 `ResolvedCoordinateFrame` 契约：圆心 / 半径 range / 角度 range / clip / frame，供 02·03·04 共用**；极坐标投影几何） | red | 前置无 | Accepted |
| 02 | sector 几何（polar interval→sector 径向柱 / 玫瑰 + sector mark 饼图 / 环图；**累积角走 transform 派生 start/end 角界、sector mark 只读派生字段**，不在 mark 内建 transform；下沉 core `sector` Node） | red | ADR-01（+ transform 泛化） | Accepted |
| 03 | 连续 mark（area mark 新建：线↔baseline 区域，cartesian + polar；line / area polar 投影直边采样弯弧 → Path；**line / area 支持 `closed`：polar + closed = 雷达 / 填充雷达**） | red | ADR-01 | Accepted |
| 04 | polar guide（angular axis 刻度绕圆周 + radial axis 刻度沿辐条 + polar grid 同心环 / 辐条；**只做 guide 几何、消费 ADR-01 的 `ResolvedCoordinateFrame`**，不定 layout） | red | ADR-01 | Accepted |
| 05 | 三包 DSL + 文档露出（`coordinate="polar"`、新 mark / guide 表面；react + vanilla 两套 + docs demo；端到端 polar 验收） | red | ADR-01~04 | Accepted |

> 起草阶段全部 `Proposed`；逐条实现 + 自测（对抗 Bug Hunter）+ 文档 + 审计后改 `Accepted`，落在 `next-plot`。
>
> ✅ **2026-06-06 alpha.4 封口**：ADR-01~05 全部 `Accepted`；绿灯关（`@retikz/plot` / `plot-react` / `plot-vanilla` 三包 tsc + 390 测试 + eslint）全过；changelog（polar，三包）已入库。暂不发版。

## 待 ADR-01 拍板的头号设计决策

> 这些是 alpha.4 最吃设计、且会级联影响 02~05 的点，集中在 ADR-01 的「决策」/「待决策点」里定，定下来下游不再猜：

- **位置通道：已定为 hybrid（默认复用 x/y + 可选显式 angle/radius）**：位置通道按坐标系「角色」解析，`x` / `y` 是通用别名、角色名通道是可选显式覆盖。coordinate 声明角色 + 各角色绑定 scale（cartesian2D 角色 (horizontal, vertical)；polar2D 角色 (angle, radius)，约定 x→angle / y→radius，对齐 ggplot `coord_polar` 默认）。解析：`angle ← encoding.angle ?? encoding.x`、`radius ← encoding.radius ?? encoding.y`——默认复用 x/y（cartesian spec 改 coordinate 即跨坐标系、零改 encoding，正中 §8.3 (i)），需要可读性时显式写 angle/radius。scale 绑定仍挂 coordinate（`polar2D: { angle, radius }`），encoding 只给字段。**进 ADR-01「决策」段**；遗留小决策（x 与 angle 同设的优先级 / cartesian 下出现 angle 是否 reject / theta 翻转）留 ADR-01「待决策点」。
- **polar2D 配置面**：极坐标系除 angle / radius scale 绑定外，还需哪些字段——`origin`（圆心，缺省 plot area 中心）、`startAngle` / `endAngle`（缺省整圆）、`direction`（顺 / 逆时针）、`innerRadius`（环图缺省 0）。字段名 / 默认值 ADR-01 定。
- **projector 抽象形态**：现 `Projector` 暴露 `xScale` / `yScale` + `bandwidth`，mark / guide 直接取。泛化成什么契约（统一 `project(channelValues) → [x,y]` + 坐标系元信息？bandwidth 在 polar 的角向语义？），决定 02~04 改动量。
- **polar layout（归 ADR-01，不下放 04）**：cartesian 的 `computePlotArea`（矩形 margin 缩进）在 polar 不适用——极坐标按可用半径 + 角向标签留白定圆心 / 半径 range。**ADR-01 须产出完整 `ResolvedCoordinateFrame`（圆心 / 半径 range / 角度 range / clip / frame），02·03·04 共用同一帧**（否则 02/03 先造临时投影框架、伪并行）。frame 字段名 / 留白策略 ADR-01 定。
- **sector mark vs interval→sector 的边界**：02 同时含「interval 在 polar 下成 sector（半径编码 value、角度=band）」与「独立 sector mark（角度编码 value 累积，pie/donut）」。两者都下沉 core `sector`，但 IR 表面 / 角度来源不同——02 内部分清。
- **累积角 = transform（归 ADR-02，不进 mark）**：饼图 / 环图的「value → 累积角界」是 transform 阶段职责（plot-design §3.3 transform 先于 scale/coordinate/mark；§13.1 把 pie cumulative sum 列为 transform）。子决策：复用 alpha.3 stack transform（已产 y0/y1，泛化成通用累积产 start/end 界）vs 新增 cumulative/normalize transform 变体。倾向复用 / 泛化 stack——sector mark 读派生 start/end 角界字段，与堆叠 interval 读 y0/y1 同构。ADR-02 拍板，必要时拆出 transform 子条目。
- **radar 填充语义（归 ADR-03）**：雷达 = closed line（多边形轮廓）；填充雷达 = closed line + fill，或 area 在 polar 下 baseline = 圆心（radius 0）。ADR-03 定 `closed` 落点（line / area mark 布尔字段）与「closed area」「area-to-center」是否等价路径。

## 贯穿原则落点

[plot v0.1 roadmap](../roadmap.md) 的贯穿原则在 alpha.4 的体现：

- **(i) 投影整形决策落地**：alpha.1~alpha.3 的 lowering 已守「不把笛卡尔假设写死进 mark」；alpha.4 是 §8.3 (i) 的验收点——polar 接入若需重写 mark 内部，即证明抽象未达标，ADR-01 必须把坐标系投影做成可替换中间层。
- **anchor / scope 预留**：sector / area / 极坐标折线延续 `id` 句柄字段位就位、解析留 alpha.5；polar 下沉出的 sector Node 自带 core 锚点（apex / centroid / outer-arc-mid 等），为 alpha.5「按 datum 命中扇区」预留；多系列（径向多环 / 多雷达线）下沉子 Scope 同 alpha.3 内部埋点、不承诺外部可引用。
- **coordinate 作为可替换中间层**：scale（值→归一化，坐标系无关）→ coordinate（归一化→2D，cartesian vs polar 差在此）→ mark（投影点 + 区间/带概念→几何）三层分离（plot-design §8.3），加坐标系 O(1)、mark 自动适配。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede，不改历史决策。模板见 [`../../../_template.md`](../../../_template.md)。
