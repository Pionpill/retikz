# ADR-04：Vanilla 命令式 builder API

- 状态：Accepted（已实现）
- 决策日期：2026-05-31
- 关联：[ADR-01 SVG descriptor](./01-svg-descriptor-contract.md) · [ADR-03 Vanilla runtime](./03-vanilla-runtime-and-dependency-graph.md) · [ADR-05 renderer 重打包](./05-renderer-repackage.md)

## 背景

Vanilla 原先只能接收 IR 或 Scene。用户需要一种带类型的程序化 authoring API，但它必须产出同一份 core IR，并复用 core schema、compile 和 renderer，而不是维护第二套 DSL。

## 决策

Vanilla 同时提供 hyperscript 核与可选 fluent 糖：

- `figure(options, [node(...), draw(...), coordinate(...), scope(...)])` 与 React 元素结构一一对应；`figure()` 无 children 时进入链式 builder。两种写法都只返回 `Figure`，其 `.ir` 相同且可混用
- 必要参数前置，其余收在 config；`node(config)` / `node(id, config)` 支持可选 id，`draw` 的 `way` 和 `coordinate` 的 id 保持必填，不用数组探测等歧义重载
- 配置类型由 core IR 类型派生。`ScopeConfig` 只有与 `IRScope` 一致的 `transforms?`；`Way` 使用 core `DrawWay` 全集并调用同一 `parseWay`，不另造弱化 path DSL
- 独立 `mountSvg`、`renderToSvgString` 和 `Figure` 方法都接受 `Figure | IR | Scene`；Figure 保存的 `idPrefix`、`measureText` 等配置与调用时 options 冲突时，以调用时 options 为准
- `Figure` 可通过 `toCanvas` 复用现有 Canvas renderer。SVG builder 只产生 viewBox；Vanilla adapter 负责将 `width`/`height` 写到根 SVG，缺省时只保留 viewBox，由 CSS/容器决定显示尺寸
- 输入 IR 时沿用确定性 `fallbackMeasurer`；精确测量只能通过 `measureText` 注入，Vanilla 不内置 DOM measurer，以保持 SSR 导入安全

## 兼容性与实现结果

能力作为 Vanilla additive API 落地，不修改 React、core schema 或 renderer；自定义 shape 和非法配置继续分别由注册表与 core schema 的既有校验处理。

## 遗留风险

活更新、局部 patch、Vue/Svelte 适配器和 Canvas-only 专属语义不属于本 API；这些能力必须继续复用现有 IR/Scene 边界。
