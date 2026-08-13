# Standard v0.1 alpha.4 Roadmap

> 状态：Layout owner 迁移已完成；ADR-01 Surface Accepted，当前 alpha.4 继续收敛 Surface 的实现与跨领域消费证据。关联：[Standard v0.1 roadmap](../roadmap.md) · [ADR-01](./01-arbitrary-child-surface.md) · [Standard 拓展库设计](../../../../../architecture/standard-library-design.md) · [Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md) · [Core ADR-18](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/18-composite-dependency-provider-graph.md) · [Core ADR-19](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/19-qualified-spatial-handles.md)

## 目标

本 milestone 首先让 Standard 回归横向绘图拓展边界：配合 Layout v0.1 alpha.1 移除 FlexLayout、GridLayout、OverlayLayout、LayoutItem、Layout artifact、Layout Inspector 与对应 adapter / docs owner，并让仍需排版的 Legend 只组合 Layout 公共 capability。

在当前 `0.1.0-alpha.4` 版本内继续新增 renderer-neutral `standard.surface`，让 Chart canvas、Table panel 与一般信息面板可以用同一 JSON-safe composite 为任意 Core child 提供背景、padding、可选 border / corner radius、overflow 和完整 Scope 语义。Surface 只组合 Core layout-aware composite 与 Layout 公共 box / replay capability，不复制 solver，不改变 Standard Frame，也不在 Chart adapter 或 renderer 建立私有 surface。

## ADR 索引

| ADR                                                                             | 状态     | 主题                       | 交付                                                                    |
| ------------------------------------------------------------------------------- | -------- | -------------------------- | ----------------------------------------------------------------------- |
| [ADR-01](./01-arbitrary-child-surface.md)                                       | Accepted | 任意 child Surface         | 冻结单 child box、appearance、Scope、layout、Definition 与 spatial 边界 |
| [Layout ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md) | Accepted | Layout package family 迁移 | 冻结现行布局 owner、canonical namespace、公共入口与兼容性               |

## 已完成迁移边界

- Standard 三包不保留 Layout re-export、alias、Definition、adapter 或 `standard.*Layout` namespace
- `@retikz/standard/layout` 与 Standard `/inspect` 中的 Layout 能力移除
- Legend、Axes、Grid、Frame 等 Standard presentation 继续属于 Standard；其中只有 Legend 按需依赖 `@retikz/layout/compose`
- Standard alpha.2 ADR-01～07 原地标记 Superseded；ADR-08 保持既有历史状态；ADR-09～10 继续 Accepted
- Standard alpha.3 ADR-06 的直接 Definition loading 原则继续生效
- 文档站进入 Library 顶级模块的 `Standard · 拓展` 分组，并与 `Layout · 布局` 分别维护 changelog

## Surface 依赖 Gate

- Core ADR-18 冻结跨 namespace Composite provider graph，确保 Surface 及其任意 child definitions 在 React、Vanilla 与直接工具链中统一装配
- Core ADR-19 冻结 qualified spatial handle sidecar，确保 Surface 包裹后 descendant identity、geometry 与 provenance 不丢失
- 两项 Core ADR 与本 milestone ADR-01 均已完成 Architecture Gate、Plan Gate 与人工确认，Surface 按冻结的实现计划与测试契约推进

## Surface 交付边界

- `@retikz/standard`：`IRSurface` schema / type、factory、layout-aware definition、普通 Core lowering 与 Surface handle declaration
- `@retikz/standard-react`：单 child `<Surface>` authoring，与直接 JSON 形成同一 canonical IR
- `@retikz/standard-vanilla`：等价 plain helper / embed adapter
- Layout：只消费既有公开 proposal、padding、overflow、content geometry 与 replay capability；若公共 barrel 缺少本 ADR 已使用的稳定原子，只做最小公开面补齐
- Docs：双语 Surface 组件页、React / Vanilla 示例、API 表与 Chart / Table 复用说明

## 非目标

- 修改 Frame、复制 Flex / Grid / Overlay 或增加 Standard 私有 layout solver
- Chart / Plot / Table 领域字段、token、数据、guide、title、source 或交互状态
- DOM / CSS surface、renderer 特判、新 Scene primitive 或私有空间索引
- 多 child、slot、header / footer、alignment、gap、scroll、responsive sizing 或 dashboard chrome

## 完成标准

- Standard 与 Layout release group、package export、schema registry、adapter、tests 和文档 owner 保持分离，不恢复旧 namespace 或兼容层
- 任意合法 `IRChild` 可在 intrinsic / range / exact proposal 下被 Surface 测量、padding、replay 与绘制
- background、child、border、overflow、corner radius、allocation / visual bounds 和完整 Scope 语义由同一 canonical contract 决定
- React、Vanilla、直接 JSON、SSR、SVG 与 Canvas 等价，且第三方 composite child 不走内置白名单
- Surface 外层 handle 与 descendant qualified handles 同时存在，包裹前后的 child identity、payload、locator 与 provenance 连续
- Frame 现有 Node-only 输入与行为不变；Standard 不新增 bundle、全局 registry、兼容 alias 或 renderer side channel

## 当前进度与执行顺序

1. Layout owner 迁移已经完成，现行代码版本为 `0.1.0-alpha.4`
2. ADR-01 Surface 已 Accepted，单 child box、appearance、Scope、layout、Definition 与 spatial 边界已经冻结
3. Core provider graph 与 qualified spatial sidecar 已作为 Surface 的跨 namespace definition 与空间查询基础；Surface 的测试契约与实现计划保留在 ignored plan mirror
4. Surface 在 Standard、React、Vanilla、文档与 Table consumer 中闭环；Chart 的独立实现计划负责补足第二个真实 consumer，再评估 alpha.4 完成状态与 release notes
