# v0.5.0-alpha.5 Stroke Path 标签断线

- 状态：Proposed
- 目标版本：`0.5.0-alpha.5`
- 前置：现有 Geometry Label 测量、Stroke Path 最终命令、端点箭头与 Canvas hit-test 契约保持稳定
- 关联：[v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 目标

alpha.5 让无填充 Stroke Path 的居中标签默认产生真实描边断口，避免路径穿过标签正文。断口在 Core 编译阶段确定并下沉为既有 Scene 路径几何，因此 SVG、Canvas、静态输出与命中测试共享同一结果，不依赖背景色、宿主 CSS 或 renderer mask

单个标签可以用 `interrupt` 覆盖居中默认策略。非居中标签默认保持连续；Ribbon、其它 Path kind、填充拓扑与全局标签碰撞避让不进入本 milestone

## ADR

| ADR                                              | 状态     | 主题                 | 交付                                                     |
| ------------------------------------------------ | -------- | -------------------- | -------------------------------------------------------- |
| [ADR-01](./01-stroke-path-label-interruption.md) | Proposed | Stroke Path 标签断线 | 条件默认、真实几何断口、装饰连续性与不支持组合的失败语义 |

## 交付边界

- `GeometryLabel` 增加可选布尔字段 `interrupt`
- 无填充内置 Stroke Path 上，省略字段时仅 canonical `side` 为 `'center'` 自动断线
- `interrupt: true` / `false` 分别强制启用 / 禁用断线
- `Path.label` 与 `step.label` 使用同一行为，不建立平行入口
- 断口保持逻辑路径 identity、标签与 mark 定位、端点箭头和 dash 相位语义
- 通用曲线参数采样、距离反解和保形切片下沉到 `@retikz/math`；Core 只映射并组合其数值结果
- 不支持的 Path kind 或显式请求与有效填充冲突时 fail-loud

## 不在 alpha.5 范围

- Ribbon、custom Path kind 或其它面状 path-like host 的标签断口
- 对填充轮廓、shadow、blend 或 renderer compositing 建立新语义
- 标签背景框、描边、自动避让、跨 Path 碰撞检测或文字环绕
- 在 SVG、Canvas、React 或 Vanilla 中建立独立切断算法
- 新的 Scene primitive、renderer mask、DOM 测量或宿主背景色采样
