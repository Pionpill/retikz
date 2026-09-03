# v0.5.0-alpha.5 Path 标签与端点箭头

- 状态：Proposed
- 目标版本：`0.5.0-alpha.5`
- 前置：现有 Geometry Label 测量、Stroke Path 最终命令、NodeTarget 边界裁剪、端点箭头与 Canvas hit-test 契约保持稳定
- 关联：[v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 目标

alpha.5 补齐 Path 上两个相邻但独立的描边几何缺口：无填充 Stroke Path 的居中标签默认产生真实描边断口；端点箭头可以按自身几何比例跨过逻辑端点，用于空心圆连接点居中压在节点边界等画法。两项能力都由 Core 下沉为既有 Scene 路径几何，因此 SVG、Canvas、静态输出与命中测试共享同一结果

单个标签可以用 `interrupt` 覆盖居中默认策略；单个端点 arrow mark 可以用 `endpointOverlap` 声明 `0..1` 的重叠比例，`0` 保持默认放置，`1` 让按最终尺寸解析的箭头视觉后缘与逻辑端点对齐。React / Vanilla 的 `arrowPlacement` 提供等价 authoring；逻辑 Path、NodeTarget 裁剪、标签 / 中段 mark 采样与 renderer 契约保持不变

## ADR

| ADR                                              | 状态     | 主题                  | 交付                                                                    |
| ------------------------------------------------ | -------- | --------------------- | ----------------------------------------------------------------------- |
| [ADR-01](./01-stroke-path-label-interruption.md) | Proposed | Stroke Path 标签断线  | 条件默认、真实几何断口、装饰连续性与不支持组合的失败语义                |
| [ADR-02](./02-path-endpoint-arrow-overlap.md)    | Accepted | Path 端点箭头重叠比例 | 视觉后缘完整进入、实例级归一化重叠、Core 统一几何与 definition 失败语义 |

## 交付边界

- `GeometryLabel` 增加可选布尔字段 `interrupt`
- 无填充内置 Stroke Path 上，省略字段时仅 canonical `side` 为 `'center'` 自动断线
- `interrupt: true` / `false` 分别强制启用 / 禁用断线
- `Path.label` 与 `step.label` 使用同一行为，不建立平行入口
- 断口保持逻辑路径 identity、标签与 mark 定位、端点箭头和 dash 相位语义
- 通用曲线参数采样、距离反解和保形切片下沉到 `@retikz/math`；Core 只映射并组合其数值结果
- 不支持的 Path kind 或显式请求与有效填充冲突时 fail-loud
- `PathMarkPlacement.endpointOverlap` 只作用于整条 Path 的起点 / 终点箭头，省略或 `0` 保持现有默认放置
- `0.5` 位于默认位置与视觉后缘完全进入位置的中点，`1` 让最终视觉后缘与逻辑端点重合；起末方向对称
- `ArrowDefinition` 分别声明基础几何的 `backX`、线路接合的 `lineContactX` 与尖端 `tipX`；缺失或顺序非法时 fail-loud
- `backX` 与现有外轮廓补偿按解析后的 `length × scale` 换算，箭头放大、缩小或自定义长度后仍保持同一比例语义
- React / Vanilla 用 `arrowPlacement` 配置 `arrow` sugar 创建的端点，直接 marks 使用同一 Core IR 字段
- NodeTarget、anchor / boundary / offset、逻辑 Path 参数域、label / inline mark 采样与 Path identity 不变
- 内置与自定义 ArrowDefinition 复用同一 back / contact / tip 几何、registry、resolve 和 compile 链路；Scene 与 renderer 不新增字段
- inline 或未被选为端点箭头的重复 mark 携带 `endpointOverlap` 时 fail-loud

## 不在 alpha.5 范围

- Ribbon、custom Path kind 或其它面状 path-like host 的标签断口
- 对填充轮廓、shadow、blend 或 renderer compositing 建立新语义
- 标签背景框、描边、自动避让、跨 Path 碰撞检测或文字环绕
- 在 SVG、Canvas、React 或 Vanilla 中建立独立切断算法
- 新的 Scene primitive、renderer mask、DOM 测量或宿主背景色采样
- 移动 NodeTarget、给 target 增加 marker 专属 offset，或改变自动边界裁剪
- 通用 Path 负 shorten / extend、无箭头路径延伸或曲线外推
- 绝对 user-unit 的箭头重叠距离、Scope 级 placement 默认或 renderer 专属 marker 位移
- Ribbon、自定义 Path kind 与其它 path-like host 的端点箭头重叠
- 借端点重叠修复既有 arrow length / width 单位语义或曲线 shrink 方向缺口
- 从 marker primitive bounds 猜测 definition 后缘、为缺少 `backX` 提供 fallback，或保留旧 tip-contact overlap mode
