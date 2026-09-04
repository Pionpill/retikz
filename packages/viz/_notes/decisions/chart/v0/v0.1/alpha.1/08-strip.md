# ADR-08：独立 Strip recipe 与离散角色 Jitter

- 状态：Accepted
- 决策日期：2026-09-03
- 关联：[alpha.1 roadmap](./roadmap.md) · [Plot ADR-13 Mark Placement](../../../../plot/v0/v0.2/alpha.1/13-position-jitter.md) · [Chart 封装完备设计](../../../../../architecture/chart-encapsulation-complete.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Strip Chart 用一个离散位置角色和一个连续位置角色展示逐条观测分布。标准 Strip 不以 facet 划分空间，也不应要求用户改写位置字段或手工构造抖动数据；省略高级配置时，应由 Chart 直接生成 Point、位置尺度、guide 与离散刻度间的确定性 jitter。

现有 Scatter 可以组合离散与连续位置字段，但 Plot Data `jitter` transform 在 scale 前改写连续字段，不能表达依赖最终离散 step 的展示偏移，也会让 scale domain、ticks 与 lineage 观察到抖动值。Plot ADR-13 已把 scale 后、coordinate projection 前的 role-space adjustment 建立为统一 Mark Placement 能力；Strip 应只声明这项能力的 Chart recipe 意图，不再拥有 Point 私有 offset、coordinate 投影或随机算法。

## 决策：Strip 保留 x / y，由 Plot 解析唯一离散 role

Strip 属于 `point` family，使用全局唯一的 `recipe.chartType: 'strip'`。它保留与 Scatter 一致的必需 `x` / `y` encoding，不建立 `category` / `value` 别名，也不需要 `orientation`。最终位置配置必须恰好包含一个 discrete position scale 与一个 continuous position scale；band 和 point 都是有效离散 scale，只要最终 `step` 为正。

Chart 只把 Strip 的 `jitter` shorthand 下沉为内建 Point semantic mark 的 placement operation。在完整 Plot scaffold 合并后，Chart 通过最终 x / y 绑定的 Scale Definition `continuity` 验证位置拓扑，并让默认 grid 只跟随 continuous role；它不读取 step、不替 Plot 决定 adjustment role，也不计算 offset。Plot 在解析 Mark position targets 与 PositionScale 后选择唯一 discrete role，并沿 ADR-13 的 role-space adjustment → coordinate projection 主链执行。Core、renderer、Chart adapters 与 Plot adapters 都不增加 Strip 或 jitter 的计算分支。

理由：

1. x / y 是 Chart 与 Plot 已有稳定位置角色；重复引入 category / value 和 orientation 会制造第二套映射语言
2. scale continuity 是 Scale Definition 的正式语义，可供 Chart 验证 recipe 拓扑与选择 guide 默认；step、adjustment role 与 coordinate projection 仍是 Plot resolve 后的事实，Chart 不能从 authored scale 名称或字段类型提前猜测
3. band 与 point 都有离散刻度间距；以 step 为比例基准可以覆盖两者，而 bandwidth 会错误排除 point scale
4. Strip 复用统一 Position Adjustment registry，使直接 Plot、自定义 coordinate 与后续 Mark placement 能力共享同一路径

## 基础数据结构与公开契约

Strip 使用 Chart 公共 strict Source shell，并拥有独立的精确 recipe：

```ts
type PositionJitterSpan = number | { kind: 'ratio'; value: number };

type IRStripChartRecipe = {
  chartType: 'strip';
  encodings: {
    x: StripDirectPositionMapping;
    y: StripDirectPositionMapping;
    color?: StripDirectColorMapping;
    size?: StripDirectSizeMapping;
    opacity?: StripDirectOpacityMapping;
    shape?: StripDirectShapeMapping;
  };
  properties?: StripPointProperties & {
    jitter?: {
      span?: PositionJitterSpan;
      seed?: number;
    };
    domainPadding?: PointPositionDomainPadding;
  };
  marks?: Array<IRStripMark>;
};

type IRStripMark = {
  kind: 'strip';
  override?: boolean;
  encodings?: IRPointMarkEncoding;
  properties?: StripPointProperties & {
    jitter?: {
      span?: PositionJitterSpan;
      seed?: number;
    };
  };
};
```

recipe 的 `x` 与 `y` 只接受保持逐行观测的 direct field mapping 及对应 scale binding；聚合、bin、normalize 和数据字段 jitter 不进入这两个角色。authored Strip mark 的 `encodings` 只接受可选字段名覆盖，不声明或替换 position scale；scale binding 只属于 recipe encodings 或显式 `plotExtension.scales`。Chart 下沉的 jitter operation 省略 `role`，由 Plot 验证并选择唯一 discrete role。

数值 `span` 表示离散 role 输出单位下的总散布宽度，Point 中心 offset 落在 `[-span / 2, span / 2)`；ratio 形态要求 `0 <= value <= 1`，表示最终离散 tick `step` 的比例，offset 落在 `[-value × step / 2, value × step / 2)`。默认 `span` 为 `{ kind: 'ratio', value: 0.3 }`，默认 `seed` 为 `0`。`span` 描述总宽度而不是单侧最大值，避免把 ratio 误解为向左右两侧各偏移该比例。

`domainPadding` 继续控制连续 position role 的 Point-family range / ratio domain 留白。离散 role 不伪造 categorical domain padding；Plot 根据 jitter 与实际 glyph 自动计算等价的 scale boundary clearance，并落实为离散 range inset / outer clearance。该自动净空不需要 Chart 暴露第二个 padding 参数。

React 与 Vanilla 分别提供与其它 Point chartType 对齐的 `StripChart`、owner-scoped declarations、`normalizeStripChart` 与 `createStripChart`；它们只组装同一个精确 Source。

## 行为、失败语义与兼容性

- 默认行为：Chart 从最终 x / y Scale Definition continuity 验证一个 discrete 与一个 continuous，并让两个 guide 默认显示、grid 只跟随 continuous role；Plot 从最终 PositionScale 中选择唯一正 step discrete role，另一个 continuous role 保持真实观测值。Point 外观、颜色 / 尺寸图例与 continuous role 的 domain padding 沿用 Point family 规则
- 离散边界净空：每一端必须满足 `requiredClearance = maximumJitterOffset + glyphNormalExtent`。当 ratio 为 `1` 且 glyph 是半径为 `size` 的圆形 Point 时，目标净空是 `step / 2 + size`；有 stroke 时还要计入 `strokeWidth / 2`。Plot 从中扣除 scale 已有的 edge clearance，只补 `max(0, requiredClearance - existingEdgeClearance)`，并以最终 range 下的实时 step 重新成立该约束，避免重复 padding 或使用调整前的旧 step
- glyph extent：非圆形 shape、数据驱动 size、rotation 与 stroke 使用其沿对应 coordinate 边界法向的最大实际 extent；同一 scope 取足以覆盖全部有效 Strip points 的保守值。可用范围不足以同时满足两端净空时 fail-loud，不通过裁剪、clamp jitter 或缩小 glyph 静默降级
- Cartesian：离散 x 的净空落实为左右边界，离散 y 落实为上下边界；jitter 只改变目标 role，continuous role、domain、ticks 与 guides 不变
- Polar angle：angle offset 以 degree 在投影前合成，因此相同 ratio 在不同 radius 上产生不同屏幕弧长。360° 完整 sweep 把 angle 视为循环 role 并 wrap，不制造 seam padding；partial sweep 对每条有效 datum 计入角向 jitter 半宽 `Jθ` 与 glyph 角净空，圆形 glyph 的角净空为 `asin(G / r)`，其中 `G` 是含 stroke 的屏幕法向 extent、`r` 是该 datum 的屏幕半径。`r < G` 时单靠角度 inset 无法保证 containment，必须 fail-loud 或由作者改变内半径 / glyph，而不能伪造统一 `dx`
- Polar radius：离散 radius role 以径向 user units 计算 jitter 与 glyph 净空；inner / outer radius 边界分别校验。自定义 coordinate 只有能提供 ADR-13 所需的 mapped-role projection 与边界度量时才支持自动 containment，否则在 Plot owner 边界 fail-loud
- 数据与确定性：jitter 不改变 Source rows、x / y、scale domain、ticks、guide、lineage 或 datum identity。相同的 effective ordered data view、字段绑定、seed、span 与最终 step 必须得到相同结果；同一次 lowering 的 position resolution 是 renderer、provenance、locator、SSR 与 hydration 的共同事实源
- mark 继承：内建和 authored Strip mark 都继承 recipe 的 x / y、视觉 encodings、Point properties 与 jitter；mark 显式字段只覆盖自身继承结果，mark encoding 只能替换字段名，不能替换 scale。普通 mark 按 authored 顺序追加，`override: true` 原位替换内建 `strip` semantic group；coordinate 与 scale-level padding 不能由 mark 改写
- 结构边界：Strip recipe 不提供 series、row、column 或 facet encoding，也不隐式分组、分面、聚合、碰撞避让或 beeswarm。需要屏幕空间避碰时使用 Plot ADR-13 的 screen-space initializer，而不是改变 Strip 数据或把 collision 塞进 jitter
- 失败与诊断：缺少或使用空白 x / y、最终 scales 不满足“一个正 step discrete + 一个 continuous”、非法 span / seed、Plot 无法唯一选择离散 role、placement definition 缺失、coordinate 不具备 adjustment 或 containment 能力、未知 encoding / property / mark、重复 override、provider 缺失或依赖不闭合，均在对应 Chart schema、Chart resolve 或 Plot owner 边界 fail-loud；空数据可以产生空 mark，不因没有可消费 datum 而误报 scale compatibility
- 兼容性：本决策取代“Strip 不设独立 chartType”的旧结论，新增 `strip` exact Source 并依赖 Plot ADR-13；不改变现有 Scatter、Plot Data `jitter` transform 或底层 renderer 的输入和行为，不提供旧组合写法的自动识别、别名或迁移层
- React / Vanilla 等价性：JSON、Vanilla、React 与 SSR 生成或消费同一个 `IRStripChart`，沿同一 package-internal Definition、provider、Chart resolve 与 Plot Mark Placement 主链执行；adapter 不计算随机数、step、role offset、projection 或 containment

## 最终实现与遗留风险

Strip 已形成 exact Source、Chart recipe、React / Vanilla authoring、Plot placement、Cartesian / Polar 投影、边界净空与双语文档闭环。内建 point / band 及声明离散 continuity 的自定义 Scale Definition 共用同一路径；默认与显式 jitter、mark 覆盖、空数据、确定性和 provider closure 均可观察验证

屏幕空间避碰、beeswarm、facet 与多离散角色不属于 Strip；需要这些能力时应进入独立 Plot placement operation 或其它 chartType，而不改变本 ADR 的逐行数据与唯一离散角色契约
