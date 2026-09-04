# ADR-01：Stroke Path 标签自动断线

- 状态：Proposed
- 决策日期：2026-09-02
- 关联：[alpha.4 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Core 绘图完备设计](../../../../architecture/core-drawing-complete.md)

## 背景与目标

`Path.label` 与 `step.label` 已能在路径或单段的归一化位置完成文字测量、定位和旋转，但标签与宿主描边仍作为彼此独立的 Scene 内容输出。标签位于路径中心时，描边会穿过正文；依赖不透明背景覆盖只能在已知纯色表面上近似隐藏路径，也不会同步改变 Canvas 命中几何

目标是让无填充的内置 Stroke Path 在居中标签处产生真实、renderer-agnostic 的描边断口。作者可以在单个标签上覆盖默认策略；标签定位、路径 identity、dash、mark、箭头与命中仍从同一条逻辑路径派生。Ribbon、其它 Path kind 与填充拓扑不进入本能力

## 决策：Geometry Label 声明 interrupt，Core 切断无填充 Stroke Path 的描边

`GeometryLabel` 增加可选布尔字段 `interrupt`。Core 在标签位置、方向、字体与文字视觉盒已经确定后解析有效断线策略：字段显式值优先；省略时，仅 canonical `side` 为 `center` 且宿主是无填充内置 Stroke Path 的标签自动启用。现有 `sloped: true` 且未显式设置 `side` 的标签会得到 canonical `center`，因此默认断线

断线围绕标签原始采样锚点建立局部区间。区间长度由已测量文字视觉盒在该处路径切线方向上的投影决定，并包含实际描边与线帽不会侵入文字视觉盒所需的确定性余量。Core 从最终 Stroke Path 几何移除该区间的描边，但不改变逻辑路径的参数域、采样位置或身份。多个有效区间重叠时取并集，不生成相互覆盖的碎片

`interrupt: true` 对非居中标签使用同一切断规则，断口仍以该标签在宿主路径上的采样锚点为中心；`interrupt: false` 保持连续。该布尔字段只选择是否切断，不提供第二套间距、碰撞或路由配置

曲线的纯数值计算下沉到 `@retikz/math`：公开的 `CurveSegment` 与 `curve` 操作只描述 line、二次 / 三次贝塞尔、圆弧和椭圆弧的参数采样、近似弧长反解与保形切片。Core 把最终 `PathCommand` 映射为这些 plain geometry data 后消费结果；`@retikz/math` 不认识 PathCommand、标签、断口、文字度量、Scene、dash、箭头或 renderer。这样同一套曲线算法可被其它绘图或领域包复用，而 Core 继续是所有 Drawing 语义的唯一 owner

理由：

1. 标签位置与文字度量在 Core 编译阶段已经确定，只有 Core 能用同一事实源生成 SVG、Canvas、静态输出和命中测试一致的真实断口
2. canonical `side: 'center'` 是标签位于宿主中心线的稳定语义，适合作为自动默认；显式布尔覆盖允许作者保留连续路径或为偏置标签主动请求断口
3. 断口继续使用既有 Scene 路径表达，renderer 只执行几何，不需要背景色、反向 clip、mask 或标签专用分支
4. 参数求值、距离反解和曲线切片不依赖 Core IR 或 Scene；作为零依赖的 Math 原子能力公开后，Core 不再维护平行公式实现

## 基础数据结构与公开契约

`GeometryLabel` 增加以下字段：

```ts
type IRGeometryLabel = {
  // existing fields
  interrupt?: boolean;
};
```

有效策略等价于：

```ts
const shouldInterrupt =
  label.interrupt ?? (path.kind === 'stroke' && pathHasNoFill && canonicalLabel.side === 'center');
```

`pathHasNoFill` 只在有效 `fill` 缺省或为 `none` 时成立；透明颜色、`fillOpacity: 0` 或其它视觉上不可见但仍存在的 fill 不视为无填充。`interrupt` 同时适用于 `Path.label` 与 Stroke Path children 上的 `step.label`，React props、Vanilla Input 与直接 JSON 表达同一字段

`@retikz/math` 额外公开 `CurveSegment`、`CurveSegmentSample` 和 `curve`。`curve.sampleAt()` 以参数位置返回点与单位切线；`curve.approximateLength()` 与 `curve.parameterAtDistance()` 在固定采样预算内把距离映射回参数；`curve.slice()` 对贝塞尔使用 De Casteljau、对弧使用有向参数扫描，返回同种 curve segment。它们接收和返回 plain geometry data，不创建 Path、IR 或 Scene

字段的 JSON 形态由 Geometry Label schema 校验；是否允许中断需要同时知道最终 Path kind 与有效 fill，因此由 Path resolve 按标签字段路径确定并诊断。`interrupt: false` 在内置 Stroke Path 上始终是合法的禁用覆盖；其它 Path kind 显式携带任一布尔值都不合法

该能力不新增 Scene primitive、renderer option、Definition 或 registry。一个逻辑 Path 可以下沉为多个既有路径片段；这些片段共同保留原 Path 的 identity 和元数据，断口端不产生新的语义端点

## 行为、失败语义与兼容性

- 默认行为：无填充内置 Stroke Path 的 canonical `side: 'center'` 标签自动断线；其它 side 保持连续。显式 `interrupt` 覆盖 side 默认
- 标签定位：`Path.label` 继续按整条未切断路径定位，`step.label` 继续按所属原始段定位。断线不重新参数化后续标签或 mark，不改变 `position` 的含义
- 曲线与倒角：直线、Bezier、圆弧、椭圆弧、折线、倒角结果和 generator 下沉结果均按最终描边几何切断；片段保持原路径形状，不以折线近似替换公开几何
- 多标签：每个有效标签先产生自己的局部断线区间；重叠或相接区间合并。标签仍按声明顺序输出
- 描边样式：颜色、宽度、opacity、line cap、line join 和 blend 继续来自原 Path。断口尺寸必须计入有效描边与线帽外延，不能让片段重新侵入文字视觉盒
- 虚线：dash pattern 与 dash offset 按未切断逻辑路径连续推进；断口只抑制对应区间的描边，不让每个可见片段重新从 dash pattern 起点开始
- 装饰：端点箭头只属于原 Path 的首尾，不出现在断口端。中段 mark、标签与端点装饰继续按未切断路径采样；断线不负责隐藏与标签重叠的 mark 或箭头
- identity 与命中：所有可见片段属于同一个逻辑 Path id / meta。SVG 与 Canvas 命中只覆盖实际可见描边，断口不命中 stroke；标签本身是否可交互仍沿用既有 Text / Group 契约
- 端点区间：断线区间在路径有效域内裁切；原始端点及其装饰语义保持不变，不把断口端升级为新的路径端点
- 填充边界：省略 `interrupt` 时，有效 fill 会禁用居中自动断线。无论 side 如何，显式 `interrupt: true` 与有效 fill 冲突并按标签字段路径 fail-loud；Core 不猜测是否可以拆分填充拓扑
- Path kind 边界：Ribbon、custom Path kind 与其它非内置 Stroke Path 显式携带 `interrupt` 时 fail-loud，不静默忽略，也不要求 provider 或 renderer 猜测支持能力
- 失败与诊断：不支持的 host、有效 fill 冲突、无法形成有限标签视觉盒或无法确定有限切断几何时，由 Core 产生带 IR locator 的结构化编译失败；不回退到背景遮盖或连续描边
- animation：不增加标签专用动画契约。断线作用于既有 Path 的 settled 几何；已有动画仍属于逻辑 Path，不改变时间、触发或 ownership 语义
- 兼容性 / breaking：`interrupt` 字段是 additive；但无填充 Stroke Path 上既有居中标签会从连续描边改为默认断线，属于有意的视觉行为变更。非居中标签、填充 Path、Ribbon 与未携带居中标签的既有输入保持原行为，不提供旧行为 alias 或兼容模式；需要连续描边时显式写 `interrupt: false`
- React / Vanilla 等价性：React 与 Vanilla 只透传已类型化布尔字段，最终默认、限制、诊断和 Scene 几何统一由 Core 决定；直接 JSON 使用同一 schema 与 compile 路径
- Math 兼容性：新增曲线数值 API 是 additive；Core 映射后得到的 Scene 几何、标签锚点和断口规则保持相同。调用方若需要标签断口仍应使用 Core `Path` 与 `interrupt`，不能直接用 Math API 创建 Drawing 语义
