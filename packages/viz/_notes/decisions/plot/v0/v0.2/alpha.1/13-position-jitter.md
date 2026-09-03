# ADR-13：Mark Placement 管线与 Position Adjustment

- 状态：Accepted
- 决策日期：2026-09-03
- 关联：[plot v0.2-alpha.1 roadmap](./roadmap.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md) · [Chart ADR-08 Strip](../../../../chart/v0/v0.1/alpha.1/08-strip.md)

## 背景

Mark 的最终位置不总能由 Data transform 或 position scale 独立决定。Jitter 依赖离散 scale 的实时刻度间距；Polar 角向偏移必须先与 angle 合成，再按每条 datum 的 radius 投影；collision、beeswarm 等集合算法则依赖已经投影的屏幕位置与 glyph 范围。这些逻辑既不应散落在各 Mark lowering 中，也不能下沉到缺少数据、scale、coordinate scope 与 provenance 的 renderer。

Vega-Lite、G2、Observable Plot 与 ggplot2 均在位置编码和图元几何之间提供偏移或 Position 扩展，但执行空间不同。Plot 因此建立统一 Mark Placement 管线，并明确区分投影前的 role-space 与投影后的 screen-space。

## 决策

具备 placement 能力的 Mark 按以下顺序解析最终位置：

```text
position scale
  -> role-space adjustment
  -> coordinate projection
  -> screen-space initializer
  -> mark geometry
  -> Core IR / renderer
```

- role-space adjustment 消费 scale 映射后的 coordinate role，适合 jitter 与沿 role 的 nudge
- screen-space initializer 消费整组投影位置、plot dimensions 与已解析视觉通道，适合像素偏移、collision 与 beeswarm
- 两阶段由同一 Position Adjustment Definition / registry 治理；Definition 通过 `space` 声明阶段，pipeline 不按 operation 名称或 Mark type 猜测
- Mark Definition 只声明稳定 position targets、可选 glyph normal extent，以及如何消费统一 resolution；未声明 placement 能力的 Mark 遇到 placement Source 时 fail-loud
- Data transform 继续拥有会改变 rows、字段、区间基线与 lineage 的计算；Core 与 renderer 只消费最终几何，不识别 adjustment、step、role 或随机种子

Point 是首个内置消费者，但公共管线不赋予其它 Mark 默认 jitter 语义。后续 Mark 只有在能定义稳定 target identity 与位置消费方式时才加入。

## 公开契约

Placement Source 保持 JSON-safe，adjustment 按声明顺序保存：

```ts
type IRPlotMarkPlacement = {
  adjustments?: Array<IRPlotPositionAdjustmentOperation>;
};

type IRPlotJitterPositionAdjustment = {
  kind: 'jitter';
  role?: DimensionRole;
  span?: number | { kind: 'ratio'; value: number };
  seed?: number;
};
```

运行时 Definition 不进入 IR。Plot 通过 `definePositionAdjustment` 和 runtime definitions 按 schema 的 `kind` 建立唯一 registry key；内置与自定义 operation 共用注册、解析、执行和诊断链路。未知、重复或与内置冲突的 key 均 fail-loud。

Role-space context 提供稳定 target identity、frame roles、对应 PositionScale 与 mapped-role tuples；screen-space context 提供同一批 projected positions、plot dimensions 与已解析视觉通道。Initializer 输出必须保持 target 数量、顺序、identity、空位置和非目标 role，且结果必须有限。Adjustment 在各自阶段内保持声明顺序，所有 role-space operation 整体早于 screen-space operation；跨阶段协作必须拆成两个 operation。

需要自动 containment 的 Definition 声明 `containment.policy: 'contain'`，并在自身空间返回有限、保守的 envelope。Plot 将 envelope、coordinate boundary metric 与 Mark 的 glyph normal extent 合成净空；已有 edge clearance 可抵扣，循环 role 不制造人为接缝。省略 containment 表示不要求扩边，renderer 不得事后 clamp。

Coordinate Frame 将 raw role value 的 scale mapping 与 mapped-role projection 分开，并保留组合入口。支持 placement 的自定义 coordinate 必须提供同源的两段投影；禁止从屏幕坐标反解 role。PositionScale 同时暴露最终 range 下的 `step`：band 与 point 为正值，continuous 为 `0`，自定义离散 scale 必须提供稳定 step。

## 内置 jitter

Jitter 是 role-space adjustment：

- 数值 `span` 表示 role 输出单位下的总宽，offset 位于 `[-span / 2, span / 2)`
- ratio `span` 的范围为 `0–1`，表示离散 `step` 的比例；只能用于正 step 的离散 position scale
- 默认 `span` 为 `{ kind: 'ratio', value: 0.8 }`，默认 `seed` 为 `0`
- 省略 `role` 时，仅在当前 targets 恰有一个离散 role 时自动选择，否则 fail-loud
- 相同 effective target 顺序、role、span、seed 与 step 产生相同结果；不可投影 target 仍占据稳定随机序列位置

Polar angle offset 先以角度合成，再由 frame 投影。`polar` 按 datum radius 形成圆弧位移；离散 `chord` 在同一 radius 的相邻 angular skeleton 顶点间线性投影，因此沿雷达多边形直边移动；连续角轴仍按真实角度投影。两种模式的屏幕位移都随 radius 缩放。

## 失败语义与兼容性

非法 role、ratio 用于非离散或零 step scale、非有限 envelope / resolution、target 数量或 identity 改变、coordinate 缺少两段投影、以及请求 containment 却缺少 glyph extent 或 coordinate boundary metric，均在 Plot owner 边界 fail-loud，并定位到对应 Mark placement 与 operation。

省略 placement 时保持既有 scale → coordinate → mark 输出。现有 Data `jitter` transform 的数据与 lineage 语义不变，不会被静默迁移。React、Vanilla 与 JSON IR 表达同一个 operation；adapter 只组装 Source 并转发 runtime definitions，不计算 offset、step、projection 或 containment。离散 `polar2D + chord` 的 angle jitter 改为与多边形 Grid 一致的直线边；`polar`、连续角轴与原始类别顶点保持不变。
