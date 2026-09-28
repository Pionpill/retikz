---
description: 所有点图通过 autoPadding 选择最大半径或逐点紧凑留白，支持 clearance 外缘净空，由 Plot 在渲染前有界求解
keywords: 点图、autoPadding、max-radius、point-aware、domainPadding、clearance、逐点留白、Mark、Scale
---

# ADR-012：依据逐点外缘计算自动留白

- 状态：Accepted（2026-09-27 用户确认实施计划）
- 决策日期：2026-09-27
- 关联：[roadmap](./roadmap.md) · [Domain padding 单位](./008-domain-padding-units.md) · [Mark Placement](./010-position-jitter.md) · [Chart 最大半径留白](../../../chart/v0/v0.1/014-point-radius-domain-padding.md) · [Plot 可视化完备设计](../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Point Chart 当前读取最终 semantic marks 的常量 size 或 size scale range 上限，将最大半径用作连续位置轴两端的默认留白。它不扫描逐条观测，成本低，但没有考虑大点是否接近边缘。中央的大点会使四边产生不必要的空白；显式 domain 已经提供的空间也不能抵扣该默认值。

目标是在生成图元之前，依据实际参与绘制的点位置和尺寸计算留白。不能只检查位置极值点：稍靠内的大点也可能越界。自动留白必须考虑所有有效点的外缘，同时保持数据、画布尺寸及点尺寸不变。

## 决策：Plot 求解逐点约束，Chart 选择自动策略

Plot 拥有转换后的 data view、位置与尺寸映射、coordinate scope 和绘图区尺寸，负责逐点边缘约束及最终比例尺。Chart 只声明参与自动留白的 semantic marks 和显式覆盖；React、Vanilla 与 renderer 不计算留白。

所有 Point chartType 的 properties 统一增加 `autoPadding`，Bubble 默认 `point-aware`，按各气泡实际半径求解；其它图类型默认 `max-radius`，保留最大半径策略。两种策略均可显式选择。包括 Scatter、Bubble、Regression、Connected Scatter、Ranged Dot 和 Strip，不按图类型另起策略字段。

`point-aware` 支持二维笛卡尔与二维极坐标的内置连续位置尺度（linear、time、log、pow、sqrt、symlog、radial）及分类位置尺度（band、point）。极坐标包括整圆、环形及扇形，净空始终以屏幕绘图单位度量。选中图元的 role-space placement 在最终范围上执行，逐点约束使用调整后的实际位置；不再叠加同一角色的 placement 包络留白。screen-space placement 若未提供可转换的角色位置则明确失败。

分类域不增加虚拟类别，保留类别顺序，通过压缩输出范围留白；既有 paddingInner、paddingOuter、padding 和 align 形成的空间可以抵扣逐点约束。分类尺度显式 range 留白同样压缩输出范围，ratio 使用范围跨度比例；未声明 domainPadding 时保留原有分类映射行为。

采用最终坐标约束求解，不把一次预估的溢出量直接当成最终 padding，不依赖 DOM、SVG 或 Canvas 测量。位置 scale 先有不含自动留白的基准 domain；逐点约束确定后才冻结最终位置映射、guide 和 mark 几何。尺寸映射不得依赖此次待求解的位置留白。

以沿轴视觉起点到终点的归一化位置 `t`、有效长度 `W`、两端留白 `L / R` 、点半径 `r` 与净空 `c` 为例，最终位置必须满足：

```text
x = L + t × (W − L − R)
r + c ≤ x ≤ W − r − c
L ≥ 0，R ≥ 0，L + R < W
```

在满足所有有效点约束和显式端点配置的前提下，以减少不必要留白为目标进行紧凑求解，不要求严格最小化 `L + R` 或求全局最优解。求解使用明确的输出空间误差容限和固定计算轮数上限；容限用于停止继续压缩留白，不能用于接受自动端越界。达到上限时，若已有通过最终约束验证的保守可行解，则返回该解；没有可行解时明确报错。相同输入产生确定结果，数据行顺序不应影响几何结果，轴向反转只改变端点对应关系。

## 基础数据结构与公开契约

所有点图的 properties 共享以下策略字段，React Properties 组件、Vanilla Input 和 recipe.properties 使用同一名称与取值：

```ts
autoPadding?: 'max-radius' | 'point-aware' | {
  kind: 'max-radius' | 'point-aware';
  clearance?: number | { default?: number; x?: number; y?: number; top?: number; right?: number; bottom?: number; left?: number };
};
```

Bubble 省略时等价于 `point-aware`，其它点图省略时等价于 `max-radius`。`autoPadding` 只决定未被显式覆盖的自动留白策略；`domainPadding` 决定作者指定的数值，优先于策略。数字覆盖全部边；range 对象未覆盖的边采用所选策略；ratio 对象未覆盖边仍为 `0`。若显式配置已覆盖全部相关端点，不启动逐点扫描，也不因未消费的 `point-aware` 检查坐标能力。

Plot 的 `domainPadding` 在既有数字、range 和 ratio 之外增加 mark 约束分支：

```ts
{
  kind: 'mark';
  clearance?: number | { lower?: number; upper?: number };
  marks: Array<string>;
  lower?: number;
  upper?: number;
}
```

`marks` 是非空、无重复的 Plot mark identity 集合。它明确指定约束来源，不隐式扫描所有图层；每个引用都必须存在并使用当前 position scale。`lower / upper` 是非负的 range 单位固定留白，省略的一端自动求解；显式 `0` 表示该端关闭自动保护，作者可以允许该端裁切，另一端仍独立求解。两端都显式时应使用既有 range 分支。自动端约束全部有效点，固定端不再追加保护。

Mark Definition 通过可选 `domainPadding` capability 提供与最终有效 datum 集合一致的 targets、位置值和有限非负的逐轴外缘 extent；消费已解析的尺寸通道，不执行 renderer；有 placement 时提供与其 targets 一致的稳定 key，Plot 复用同一 placement 管线得到最终角色位置。该 capability 是现有 Mark Definition / registry 的一部分，不增加第二套 mark registry。内置 Point 的 extent 只表示 size 半径，与原 Chart 自动留白的尺寸含义一致；不隐式计入描边、阴影、标签或自定义形状的精确轮廓。Relation endpoint 按 source / target 各自最终位置与 size 提供独立 target，以支持 Ranged Dot；路径和连线本身不参与 Point 自动留白。其它 mark 可通过同一 capability 显式提供范围。

Position Scale Definition 通过可选 `domainPadding` capability 提供基准 domain 的归一化参数映射及从两端参数留白重建位置 scale 的能力。普通连续尺度在其数据变换空间求解；radial 的输出空间使用有符号平方参数，以保持面积映射。对非负定义域的 sqrt / 非整数 pow，不通过负值扩域伪造可绘 domain；抵达零边界后的剩余留白由输出范围承担，刻度仍保留合法定义域。

Coordinate Definition 的 `domainPadding` capability 声明支持的角色，并可提供将屏幕尺寸及净空换算为各角色边界距离的度量。笛卡尔轴直接使用长度，极坐标复用现有边界几何：外圈保留径向距离，环形内圈同样保护，扇形侧边按半径转换角向距离；实心整圆的圆心不是边界，循环角轴不制造首尾接缝。扇形靠近圆心的点需同时满足两条侧边，允许保守增加径向距离以形成可行解，不追求全局最小留白。

内置与自定义定义经现有 registry 和同一求解路径消费，不能通过类型名称白名单赋予能力。没有 capability 的自动求解报错，完整显式配置仍跳过自动求解。

Point Chart Source 只保存作者选择的策略，不新增派生 padding、坐标缓存或逐点半径数组。选择 `point-aware` 且存在未被作者覆盖的自动端时，Chart 生成 mark 分支，引用 override 解析之后的 Chart-owned Point marks 及 Relation endpoints；`plotExtension.marks` 不自动纳入。`properties.domainPadding` 的数字与 ratio 语义保持不变；range 对象中显式指定的边固定，未指定边使用 `autoPadding` 选择的策略，具体边、轴向值、default 的优先级保持不变。encoding scale 的显式 padding 和 extension scale 仍优先于 Chart 默认。

## 行为、失败语义与兼容性

下列逐点数据、domain、分面与布局约束适用于 `point-aware`；`max-radius` 保留既有行为。

- 有效数据：沿用数据转换、mark 局部 transform、分面筛选和缺失值处理。没有可绘制点时不产生自动留白；被 override 移除的 mark 不参与；opacity 为零不等同于数据被过滤。
- domain：基准 domain 遵循现有显式值、数据推断、单值展开与 nice 规则；显式 domain 外的点不参与自动留白约束；绘制与裁切沿用 Plot 原有语义，扩展 domain 后部分原域外点可能进入绘图区，不额外过滤数据。显式 domain 内已有距离可抵扣自动留白；自动留白可以扩展基准 domain，与现有 domainPadding 相同。
- 分面：独立比例尺按各面板求解；共享比例尺必须得到同一最终 domain，并同时满足所有消费面板的约束，不能各自修改共享 domain。不同面板尺寸参与约束，数据 identity 和 lineage 不变。
- 布局：依据实际 plot area 求解；guide 占位若随最终刻度改变，应在渲染前执行有上限的布局协调并验证最终约束。不得建立 renderer 回读或无限重排循环。最终 guide、locator 和 mark 必须使用同一比例尺。
- 失败：未知 mark、跨 scale 引用、缺少 capability、无法度量的 screen-space placement、尺寸映射存在位置依赖、非有限 extent、无正长度可行绘图区、共享 domain 约束无解或布局未收敛，无可行解时达到求解上限也视为失败。上述错误在 Plot owner 报错并定位到 scale / mark / scope；不静默裁切自动保护的一端或回退旧算法。
- 成本：`max-radius` 保持现有 mark 级计算，不引入逐点扫描。`point-aware` 复用已解析的尺寸通道结果；位置调整与坐标边界度量随当前映射更新，固定约束内求解复用数值结果；每轮 O(N)，总成本 O(KN)，K 有固定上限，不承诺一次遍历。内部求解不得每轮重复生成 guide 或图元，外层布局协调单独受限。不得做点对点比较、排序全部点来寻找四边或生成两套完整 Scene；不把数据规模本身视为启用另一套视觉默认的条件。
- 兼容性：本提案增加所有点图的可选策略，扩展 Chart ADR-014 的默认规则；Bubble 省略 `autoPadding` 时采用逐点策略；其它图类型的默认策略不变。Plot range / ratio 不变。Accepted 表示设计获批，实施和验证状态由镜像计划记录。
- 跨入口：React JSX、React IR、Vanilla API 和 Vanilla IR 表达同一 Source 意图，尺寸变化或数据变化均由 Plot 重新解析，不由 adapter 私有缓存改变结果。

## 自动留白净空

`autoPadding` 同时接受策略字符串和策略对象。对象的 `kind` 必填；`clearance` 使用有限非负绘图坐标长度，支持数值或 Kernel 的四边间距对象，默认 `0`；字符串等价于相应策略且净空为零。两种形式在 React、Vanilla 与 JSON IR 中表达同一语义。

`clearance` 表示受保护图元外缘到绘图区边界的最小净空，只作用于自动端。最大半径策略使用最大半径加净空作为自动留白；逐点策略将净空纳入每个有效点的外缘约束，已有空间可以抵扣。净空不改变点尺寸，不包含描边、阴影和文字，不改变域外点的筛选与裁切语义。

Plot 的 `domainPadding` mark 分支同样提供可选 `clearance`，采用相同值域与单位，由 Plot 统一求解并校验最终净空。共享尺度在各自最终绘图区上同时满足约束；空有效点集不因净空产生自动扩域。净空导致无正长度可行域时明确报错，不缩减净空或回退策略。

显式 `domainPadding` 优先：固定端不叠加净空；range 缺省端采用所选自动策略，ratio 缺省端仍为零。全部端显式指定时跳过逐点求解。尺度自身配置与 extension scale 的优先级不变。

方向净空复用 Kernel 的 BoxSpacing 契约：`clearance: n` 等价于 `{ default: n }`；对象按具体方向、`x` / `y`、`default`、`0` 依次取值，显式零覆盖更宽层级，空对象等价于零净空。`left` / `right` / `top` / `bottom` 表示视觉方向，仅用于笛卡尔坐标；`x` / `y` 跟随位置角色。两种策略均支持该结构。

Plot mark 分支的 `clearance` 支持数值或 `{ lower?, upper? }`，遗漏的端为零，数值同时作用于两端；lower/upper 对应 domain 起止端，不是固定的视觉左右。Chart 将四边净空按位置角色和 range 方向映射到各轴，反向 range 不会颠倒用户指定的视觉净空。Chart 的四边间距结构不进入 Plot 单轴契约。

## 设计依据

D3 连续尺度在数据变换与输出插值之间分层，并提供 inverse；band / point 保留离散域而通过 range 与 padding 调整间距。逐点留白沿用这一分工，不把 log 当线性数据，也不向分类域追加占位类别。radial 的输出平方插值与普通连续尺度不同，须在对应参数空间建立约束。极坐标复用 Plot 已有 placementBoundary 的角色法向与 glyph 尺寸度量，不另建 renderer 测量路径。
