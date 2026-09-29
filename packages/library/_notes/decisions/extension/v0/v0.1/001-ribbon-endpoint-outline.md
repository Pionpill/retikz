---
description: Ribbon 以显式或自动端面方向约束端部，采样边界默认使用 Math 过点曲线，并以统一的方向感知端帽契约闭合轮廓。
keywords: Ribbon、端面方向、端帽、CatmullRom、采样、判别联合、宽度、Extension
---

# ADR-001：Ribbon 端面约束与采样曲线轮廓

- 状态：Accepted
- 决策日期：2026-09-29
- 关联：[Extension 包边界](../../../standard/v0/v0.1/032-extension-package-boundary.md) · [Ribbon Path Kind](../../../standard/v0/v0.1/024-ribbon-as-standard-path-kind.md) · [Drawing Complete](../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景与目标

流带需要以确定的首尾截口连接其它图形，并支持随中心线自动确定截口方向。截口方向、中心线切线和端帽形状是不同的几何事实，不能共用一个含混的方向参数。

现有 direction 同时覆盖端点横截面和部分中心线控制柄：Bézier 与直线、圆弧的处理不同。边界也同时存在控制点偏移与采样折线两种默认行为。端面改变后，端帽及标签缺乏清晰独立的约束。

本决策统一端面方向、采样边界与端帽的关系。Ribbon 继续由 Extension 提供，使用 Core Path Kind、路径物化、标签服务及普通 Scene path，复用 Math 的曲线能力。

## 决策：端面约束、两侧曲线与端帽独立组合

首尾方向表示端面线段的方向，不表示流动方向。水平端面对应水平截口；通常所说的水平 Sankey 流动对应竖直截口。端面仅约束该端的横截面，不旋转、重写或混合输入中心线的切线。需要水平进入或离开的中心线，作者通过已有 Path 曲线能力表达。

左右边界分别由中心线采样横截面产生，默认使用 Math 的 centripetal Catmull–Rom 过点曲线连接。端帽独立连接两侧接点。闭合轮廓不整体平滑，边界与端帽连接处不强制切线连续；端帽内部仍可为圆弧或任意合法曲线。这里的角点表示保留连接处的几何方向变化，不要求所有接角均小于 90°。

端面方向必须影响内置和自定义端帽的接点、局部坐标系及外向方向。端帽不能作为与 Ribbon 无关的 renderer 描边属性处理。

## 端面方向与公开输入

centerline 模式保留端点 `direction` 属性名，将其含义由切线方向替换为端面方向，不新增同义字段。其取值为 `'auto'` 或既有 `IRRibbonDirection`（角度、非零向量、无命名 origin 的极坐标向量），缺省为 `'auto'`。角度使用 Path 局部坐标系，0° 表示平行 x 轴。

```ts
kindOptions: {
  width: { kind: 'fixed', value: 24 },
  start: { direction: 0, cap: { name: 'butt' } },
  end: { direction: 'auto', cap: { name: 'round' } },
  sampling: { kind: 'fixed', samples: 64 },
}
```

自动模式取中心线端点切线的法线作为端面方向。显式方向固定端面轴线；轴线无正反之分，反向向量产生同一轮廓。左右侧沿中心线前进方向定义，端面单位轴选择与当地左法线同侧的符号。显式端面与当地切线平行时截口退化，编译报几何错误，不偷偷翻转、混合或修改中心线。

centerline 的端点位置仍来自输入路径。`align` 与宽度规则共同决定左右接点：center 向两侧各分配半宽，left 全部分配到左侧，right 全部分配到右侧。端帽局部原点是两个接点的中点，因此非居中对齐也拥有确定的端帽坐标系。

标签沿输入中心线取位置与局部切线，包括首尾位置；端面方向和端帽形状均不修改标签方向。外侧标签的偏移由所在横截面的实际左右边界决定，不能在 left/right 对齐时统一使用半宽。

## 宽度与模式的结构化输入契约

宽度策略必须由输入结构表达，不能将所有候选字段设为可选，再仅靠跨字段 refinement 区分合法组合。每种宽度拥有独立公开 Schema，使用严格对象拒绝其它分支字段；`RibbonWidthSchema` 按 `kind` 组成判别联合。

| 独立 Schema                | `kind`    | 必填字段                              | 可选字段与语义                                                                                   |
| -------------------------- | --------- | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `FixedRibbonWidthSchema`   | `fixed`   | `value`：非负宽度                     | 无                                                                                               |
| `TaperRibbonWidthSchema`   | `taper`   | `start`、`end`：非负宽度              | `interpolation`：`linear` 或 `smooth`，默认 `linear`                                             |
| `StopsRibbonWidthSchema`   | `stops`   | `stops`：至少两个 `{ offset, value }` | `interpolation`：`linear`、`smooth` 或 `step`，默认 `linear`；offset 为 0–1 弧长比例，value 非负 |
| `ProfileRibbonWidthSchema` | `profile` | `name`：注册名称                      | `params`：由对应 Definition 校验的 JSON 参数                                                     |

Schema 是唯一契约真源；各分支对应 `IRFixedRibbonWidth`、`IRTaperRibbonWidth`、`IRStopsRibbonWidth`、`IRProfileRibbonWidth`，联合为 `IRRibbonWidth`。允许省略默认字段的作者输入从 Schema 的 input 派生，已物化结果从 output 派生，不维护平行手写宽度结构或用 `Partial` 抹去必填字段。默认值定义在所属分支 Schema 中，解析和编译复用该默认值。

```ts
// 四种合法的 width 输入形态
{ kind: 'fixed', value: 24 }
{ kind: 'taper', start: 16, end: 44, interpolation: 'smooth' }
{ kind: 'stops', stops: [{ offset: 0, value: 16 }, { offset: 1, value: 44 }] }
{ kind: 'profile', name: 'bulge', params: { base: 16, peak: 44 } }
```

`start` / `end` 端点配置只拥有 `direction` 与 `cap`。删除端点的 `width` 及顶层 `interpolation`，也不接受数值 `width` 简写。渐变统一写入 `width: { kind: 'taper', start, end, interpolation? }`。宽度模式的选择、必填项与分支局部字段因此可以被类型提示与机器可读结构直接发现。

宽度 `smooth` 使用三次 smoothstep：`u = t²(3 − 2t)`，宽度为 `from + (to − from)u`。taper 的 t 是整条中心线弧长比例，stops 的 t 是相邻节点区间内的弧长比例；每个区间两端宽度变化率为零。这与连接空间侧边采样点的 Math Catmull–Rom 是两个独立步骤，选择 `linear` 也仍使用相同的侧边连接算法。

构造模式同样分为独立的 `CenterlineRibbonPathOptionsSchema` 与 `BoundaryRibbonPathOptionsSchema`，由 `RibbonPathOptionsSchema` 按 `mode` 组成判别联合：

- centerline：`width` 必填；可配置 `start`、`end`、`sampling`、`align`；不接受 `upper/lower`。保留作者省略 `mode` 时默认 centerline 的语义，解析结果物化 `mode: 'centerline'`
- boundary：必须显式设置 `mode: 'boundary'`，`upper/lower` 必填；不接受 `width/start/end/sampling/align`。完整 Path subject 同时禁止中心线 `children`，而 centerline 要求开放中心线 `children`

采样继续按 `kind` 区分 fixed/adaptive 严格对象。分支选择、必填与未知字段校验由 Schema 结构负责；refinement 仅补充结构无法表达的数值关系或几何不变量，不承担隐藏的模式选择。TypeScript 判别联合不等于精确对象类型，跨变量传入的多余字段仍由严格 Schema 在输入边界拦截。

## 作者 API 与机器可读契约

React、Vanilla 与直接 JSON 复用上述同一结构。共享 Path 保持开放的 Path Kind 扩展边界，Core 不硬编码 Ribbon 分支。作者可以用 Schema 派生的 `IRRibbonPathOptions` 对 `kindOptions` 做 `satisfies` 检查；公开示例使用该方式呈现分支补全与必填约束，不声称通用 Path 的 JSON 对象类型会根据 `kind: 'ribbon'` 自动收窄。不为本能力新增独立 Ribbon adapter 或平行输入 Schema。

机器可读投影必须保留判别字段、必填项、默认值与严格分支边界，不能将联合摊平成全部可选属性。用于 LLM 的 profile/cap 可用名称与参数形态，以当前实际装配的 Definition registry 及各自 `paramsSchema` 为真源；内置与自定义采用同一投影规则，不另建白名单或复制参数定义。该投影描述当前装配的能力，不改变持久化名称引用契约。无法由目标格式表达的自定义校验必须报告限制，并继续由运行时权威 Schema 校验，不能把投影通过当成完整几何验证。

## 默认采样与边界连接

所有 centerline 路径类型使用同一采样轮廓语义，不再按输入阶数或宽度类型选择控制点偏移分支。保留固定及按长度选择数量的 adaptive 采样策略；adaptive 的 tolerance 是目标段长，不承诺曲线拟合误差上界。缺省使用 64 个基础样本。

`sampling` 是唯一采样字段，删除 `samples` 简写。基础样本沿中心线累计弧长分布；offset、宽度及标签位置使用同一弧长语义。必要的段连接点和宽度 stops 额外保留，固定 samples 与 adaptive.maxSamples 限制基础样本数量，不删除必要特征点。

每一条连续侧边以 Math `curve.catmullRomToCubic` 连接，α=0.5，tension=1，不增加 Ribbon 专用插值器或公开 tension 配置。曲线严格经过采样点；两个点退化为直线，连续重合点合并。采样点间为插值近似，不承诺精确等距偏移，也不承诺任意宽度与曲率下没有自交。

中心线不连续转角处，入段与出段分别保留各自横截面，同侧接点用直线连接，形成 bevel 接角；不跨角点做 Catmull–Rom 平滑。反向折返导致截面无法确定时失败。宽度的离散跳变同样按两侧极限分段，不用平滑插值抹去跳变。宽度为零允许边界汇合，不产生非有限坐标。

boundary 模式保留作者提供的 upper/lower 路径几何，不再次采样和平滑作者曲线，首尾直接封口。该模式不接受 sampling、direction 或端帽配置，因为作者已经直接拥有两条边界及其端点；需要方向和端帽约束时使用 centerline 模式。

## 方向感知的端帽扩展契约

端帽引用统一为 `{ name: string, params?: JsonObject }`，缺省为 `{ name: 'butt' }`。`butt`、`square`、`round`、`arc` 与第三方端帽使用同一 `RibbonCapDefinition`、`defineRibbonCap`、名称 registry、参数解析及几何消费路径。函数只存在于运行时 Definition，不进入 IR。

`createRibbonPathKindDefinition({ profiles, caps })` 和 `createRibbonProviderContribution({ profiles, caps })` 接受相同的可选 Definition 集合。两种入口由同一装配语义构成完整 ribbon Path Kind；端帽不成为 Core 顶层 provider family。owner-local datasets 按 profile/cap 分类键区分，同名 profile 与 cap 可以共存。重复端帽名称或覆盖内置名称失败，不采用 last-wins。

公开运行时契约的必要形态如下；坐标与命令直接复用 Core/Math 类型：

```ts
type RibbonCapContext<TParams extends JsonObject = JsonObject> = Readonly<{
  endpoint: 'start' | 'end';
  center: IRPosition;
  sectionAxis: Vector2;
  outward: Vector2;
  width: number;
  params: TParams;
}>;

type RibbonCapGeometry = Readonly<{
  extension: number;
  commands: ReadonlyArray<PathCommand>;
}>;

type RibbonCapDefinition<TParams extends JsonObject = JsonObject> = Readonly<{
  name: string;
  paramsSchema: ZodType<TParams>;
  resolve: (context: RibbonCapContext<TParams>) => RibbonCapGeometry;
}>;
```

`sectionAxis` 从右侧指向左侧，`outward` 与其垂直，选择 start 背离中心线前进方向、end 顺着前进方向的一侧。局部点 `(x, y)` 对应 `center + x * outward + y * sectionAxis`。二者由最终端面推导，不直接使用尚未适配截口的原始切线。该基底在首尾可有不同手性，端帽不能假设固定旋转矩阵。

`extension` 是沿 outward 的有限有符号位移，确定两侧最终接点为 `center + extension * outward ± width / 2 * sectionAxis`。端帽返回位于 Path 局部坐标系的开放命令链：必须由 move 起始，end 从左接点走到右接点，start 从右接点走到左接点；不含多子路径或 close。Ribbon 的侧边命中这些最终接点，再由宿主统一闭合。端帽只能决定自己的外形和同量端部延伸，不能改写中心线、宽度或其它端帽。

内置 butt 的 extension 为 0，直接连接两接点；square 为 width/2，直接连接延伸后的两接点；round 为 0，生成朝 outward 外凸的半圆。零宽时这三种端帽退化为同一点。

arc 的 params 为 `{ center: [x, y], radius, sweep?: 'short' | 'long' }`，center 使用上述端帽局部坐标系，radius 必须为正，sweep 缺省 short，extension 为 0。圆弧必须经过两个接点；半圆等长时选择朝 outward 的一支。局部圆心随端面旋转和平移，不能把旧的全局圆心当作局部参数直接复用。零宽 arc 不定义扫掠，报几何错误。

自定义端帽可产生 Core 支持的任意开放 PathCommand 链，并遵守同样的接点、方向和有效几何约束。边界范围必须包含侧边及完整端帽曲线的极值；bounds、命中与渲染均消费同一条完整轮廓，不能只记录采样点。

## 行为、失败语义与兼容性

未知端帽、非法参数、名称冲突、零方向向量、退化端面、非法端帽链、接点不闭合或非有限几何均 fail-loud。错误由 Extension 标识端点、端帽名及字段路径；用户 Definition 抛出的异常保留为 cause。接点比较采用同次编译精度，圆弧半径采用已有 Ribbon 的绝对/相对容差规则，不以自动连线掩盖错误。

React、Vanilla 和直接 JSON 使用同一 Path kindOptions 及显式注入的 Definition，得到相同几何。输出仍是普通 Scene path 与 Core host labels；Path id、meta、transform、provenance 和动画宿主行为继续复用 Core，不引入 Ribbon renderer 分支。

本决策是有意的 0.x 行为变更：数值 width、start.width/end.width、顶层 interpolation、samples、字符串 cap、世界坐标 arc cap 及 provider 的 profiles 数组参数不保留别名或兼容分支。宽度统一改用带 kind 的分支对象；旧 RibbonWidthStopsSchema / RibbonWidthProfileSchema 由 StopsRibbonWidthSchema / ProfileRibbonWidthSchema 取代，不保留旧名别名。默认控制点偏移/折线输出由统一过点曲线替代，boundary 保留原曲线；旧图形可能改变外观。`direction` 保留字段名但不保留旧切线语义；旧数据需要按端面方向重新解释和调整取值，不能原值照搬。端面约束与中心线切线约束必须分别表达。

本 ADR 被接受后，取代既有 Ribbon ADR 中与本决策冲突的方向、轮廓连接、采样和端帽条款；Path Kind 与 Extension 所有权保持不变。实现须同步包契约、消费方与中英文文档。
