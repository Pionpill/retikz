# ADR-09：Axis grid 包含值域端点

- 状态：Accepted
- 决策日期：2026-08-10
- 关联：[plot v0.2 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [v0.1 Axis grid ADR](../../v0.1/alpha.15/09-axis-grid-source-and-style.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Axis grid 已经能够复用可见轴刻度，或通过独立 tick source 与 density 生成主网格位置。但是连续与时间 scale 的常规 tick 由 scale 决定，最终 effective domain 的首尾值不保证进入 tick set；显式提供 `grid.ticks.values` 又会替换常规网格来源，无法表达“保留常规网格，同时保证值域两端有网格线”。

本决策为主网格增加一个显式、JSON-safe 的端点包含策略。用户能够在不复制推断、padding、nice 或自定义 scale domain 逻辑的情况下，让网格覆盖最终 scale domain 的首尾位置；默认网格、轴刻度、次网格和主题语义保持不变。

## 决策：主网格可显式包含 effective domain 端点

`AxisGridOptions` 增加 `includeDomainEndpoints?: boolean`。字段省略或为 `false` 时保持既有行为；为 `true` 时，主网格在常规位置解析完成后保证包含绑定位置 scale 的首尾 domain 值。

理由：

1. 值域端点属于 scale-bound grid source 语义，应由 Plot guide 消费 effective scale domain，不应由 Theme、Chart、demo 或 renderer 推断。
2. 独立布尔策略可以与默认轴刻度、显式 `grid.ticks` 和 `grid.density` 正交组合，不需要建立新的 grid 类型或平行 lowering。
3. 端点通过现有 PositionScale 与 coordinate provider 投影；自定义 scale 继续走同一 PositionScale 契约，coordinate definition 仍须显式选择并消费既有 guide helper。

## 基础数据结构与公开契约

```ts
type AxisGridOptions = AxisGridProjection &
  AxisGridLineStyle & {
    ticks?: GuideTickSource;
    density?: AxisTickDensity;
    includeDomainEndpoints?: boolean;
    bandPosition?: number;
    minor?: false | AxisMinorGridOptions;
  };
```

`includeDomainEndpoints` 只属于主网格配置，不进入 `AxisMinorGridOptions`。次网格继续要求显式 tick source，避免底层自动生成新的 minor 语义。

## 行为、失败语义与兼容性

- 默认行为：字段省略或为 `false` 时，主网格继续复用可见轴刻度或消费显式 `grid.ticks`，输出不变。
- effective domain：字段为 `true` 时，读取绑定 PositionScale 在 domain 推断、padding、nice 与显式 domain 处理完成后的首尾值，不读取原始数据 extent。
- 组合顺序：先解析主网格的常规 tick source 与 density，再补入尚未出现的 domain 端点。因此端点不被 density 移除，最终最多比 density 结果多两条网格线。
- 去重：端点与常规网格、两个端点之间按最终投影坐标去重。单值 domain、循环极坐标或不同 domain 值映射到同一位置时不重复描边。
- 显式来源：`grid.ticks` 仍决定常规主网格候选；开启本字段只追加缺失端点，不改写显式来源。
- 分类位置：band / point scale 使用 domain 的首尾类别及既有 `bandPosition` 投影；该字段不表示绘图区外边框。
- 隔离性：本字段不改变 axis tick mark、tick label、title、minor grid、grid projection target、layer 或 provenance。
- Theme：该字段是动态结构语义，Plot Theme token 与结构化 theme 均不得提供默认值或覆盖入口。
- 失败语义：字段只接受 boolean；PositionScale 必须维持 domain 值可由自身 coordinate 投影的既有契约，本决策不增加 renderer 降级或 adapter 私有错误路径。
- 兼容性：纯新增可选字段，既有 JSON、React、Vanilla 与主题输出保持兼容。
- React / Vanilla 等价性：React `<Axis>`、Vanilla spec 与手写 JSON 继续表达同一份 `IRPlotAxisGuide.grid`，不增加 adapter 专用配置。

## 功能与包边界

- 所属能力域与解决的问题：Visualization Complete 的 Guide 能力面，解决 scale-bound 主网格不能声明式包含 effective domain 端点的问题。
- 主责包与协作包：`@retikz/plot` 拥有 schema、PositionScale 消费与 guide lowering；plot-react / plot-vanilla 只等价暴露同一 IR；Core 与 renderer 继续执行既有 Path。
- 拥有：Axis grid 的端点选择、投影去重和确定性 lowering。
- 不拥有：原始数据 extent 计算、Chart preset、绘图区 border、reference line、renderer clipping 或主题结构默认。
- 外部扩展与下游闭环：自定义 scale 通过既有 PositionScale 参与同一 guide lowering；自定义 coordinate 只有在 definition 已选择既有 guide helper 时获得相同行为，本决策不自动创建 custom coordinate grid surface；Core IR 与 renderer 无新增契约。
- 不支持边界：独立端点样式、端点 label、minor grid 自动端点、按单端选择、绘图区外框与 custom coordinate grid surface。

## 架构验证

- 是否可由现有能力组合：显式 `grid.ticks.values` 可以替换网格来源，但不能在不知道 effective domain 的情况下追加端点，因此现有公开组合不足。
- Data / Plot / Table / Chart / Standard / Core 责任切分：只有 Plot 读取 position scale domain 并生成 grid；其它能力域不新增字段或分支。
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：需要一个新的 Axis grid IR 字段；不需要 definition / registry，因为这是既有闭合 Axis grid source 的正交策略，不引入可替换算法族或命名 provider。
- pipeline / lowering / renderer / diagnostics 如何闭环：schema 接受显式策略，guide lowering 消费 effective PositionScale domain 并输出既有 grid Path，Core 与 renderer 无感执行。
- provenance / lineage / locator 是否适用：继续复用既有 axis grid scope provenance；端点线不是独立 datum，不新增 lineage 或 locator identity。
- 结论：扩展当前 Visualization / Guide 能力域。

## 被否决方案

- 要求用户把最值写入 `grid.ticks.values`：会替换常规网格，且用户无法可靠复现推断、padding、nice 后的 effective domain。
- 把字段放入共享 `GuideTickSource`：会无差别扩散到 axis ticks、legend 等不需要该语义的消费者。
- 把字段做成 Theme token：Theme 只控制视觉默认，不能读取动态 scale domain 或改变 grid source。
- 把端点画成 plot area border：border 是绘图区表面语义，不能替代 scale-bound grid，也无法表达非矩形坐标投影。
- 新建 boundary grid 类型：当前能力只需要复用主网格样式与层级，独立类型会复制投影、composition 与 provenance 语义。

## 测试策略摘要

需要 schema 证据证明字段只接受 boolean 且保持 strict object；需要 guide lowering 证据覆盖默认关闭、常规 ticks、显式 grid ticks、density 后追加、投影坐标去重、分类与极坐标；需要 adapter 等价性证据证明 React、Vanilla 与手写 IR 使用同一字段；需要双语文档与真实预览证明端点网格可见且不改变 axis ticks、minor grid 或主题优先级。

## 最终结果与遗留边界

`includeDomainEndpoints` 已贯通 Axis major grid schema、guide lowering、React / Vanilla authoring 与双语文档。实现固定在常规 source 与 density 之后读取 effective PositionScale domain，按最终网格投影坐标追加并去重端点；默认关闭，minor source、axis ticks、Theme、Core 与 renderer 契约保持不变。

空 domain 不追加，单值 domain 最多追加一次，非有限投影会被跳过；循环坐标和分类坐标继续服从既有 coordinate 与 `bandPosition` 语义。端点与 minor grid 重合时仍沿用既有 major-over-minor overlap 规则，不引入第二套网格优先级。

## 不在本 ADR 范围

- 为 domain start / end 分别提供开关或样式。
- 把端点计入 `density.maxCount`，或改变既有 density 抽稀结果。
- 自动为 minor grid 增加端点。
- 新增 grid line 的 value-based style、label、interaction、locator 或独立 layer。
- 将分类 band 的首尾类别转换为绘图区外边界。
