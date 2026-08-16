# Standard v0.1 alpha.4 Roadmap

> 状态：Layout owner 迁移与 ADR-01～05 均已完成，Standard v0.1 alpha.4 milestone 已收口。关联：[Standard v0.1 roadmap](../roadmap.md) · [ADR-01](./01-arbitrary-child-surface.md) · [ADR-05](./05-standard-clip-shapes.md) · [Standard 拓展库设计](../../../../../architecture/standard-library-design.md) · [Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md) · [Core ADR-18](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/18-composite-dependency-provider-graph.md) · [Core ADR-19](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/19-qualified-spatial-handles.md) · [Core ADR-21](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/21-extensible-clip-shapes.md)

## 目标

本 milestone 首先让 Standard 回归横向绘图拓展边界：配合 Layout v0.1 alpha.1 移除 FlexLayout、GridLayout、OverlayLayout、LayoutItem、Layout artifact、Layout Inspector 与对应 adapter / docs owner，并让仍需排版的 Legend 只组合 Layout 公共 capability。

在当前 `0.1.0-alpha.4` 版本内继续新增 renderer-neutral `standard.surface`，让 Chart canvas、Table panel 与一般信息面板可以用同一 JSON-safe composite 为任意 Core child 提供背景、padding、可选 border / corner radius、overflow 和完整 Scope 语义。Surface 只组合 Core layout-aware composite 与 Layout 公共 box / replay capability，不复制 solver，不改变 Standard Frame，也不在 Chart adapter 或 renderer 建立私有 surface。

本 milestone 已收敛 Core 的官方内置集合：Core 继续拥有 Drawing IR、Definition / registry 契约、编译消费与诊断，只保留支撑基础绘图闭环的最小内置实现；可选官方 Shape、Arrow、Clip 与 Ribbon 实现迁入 Standard，并按 `@retikz/standard/<capability>` 子入口独立消费。Plot 等 Tier 2 通过显式 provider contribution 闭包获得所需定义，不依赖全局注册或副作用导入。

ADR-05 进一步完成 ClipShape 实现迁移：Core 在 ADR-21 中把 operation 与 shape 拆为两级 Definition 并只保留 `rect`，Standard `/clip` 完整拥有 `circle`、`ellipse`、`polygon`、`path`、`compound` 的 spec、shape、lowering 与 provider。

## ADR 索引

| ADR                                                                             | 状态     | 主题                                         | 交付                                                                         |
| ------------------------------------------------------------------------------- | -------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| [ADR-01](./01-arbitrary-child-surface.md)                                       | Accepted | 任意 child Surface                           | 冻结单 child box、appearance、Scope、layout、Definition 与 spatial 边界      |
| [Layout ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md) | Accepted | Layout package family 迁移                   | 冻结现行布局 owner、canonical namespace、公共入口与兼容性                    |
| [ADR-02](./02-core-minimal-builtins-and-standard-provider-entrypoints.md)       | Accepted | Core 最小内置集合与 Standard provider 子入口 | 冻结 Core / Standard provider 所有权、最小内置边界、能力子入口与显式装配契约 |
| [ADR-03](./03-ribbon-as-standard-path-kind.md)                                  | Accepted | Ribbon 作为 Standard Path Kind 的完整迁移    | 冻结 Ribbon schema、Definition、profile、lowering、Tier 2 依赖与跨入口闭环   |
| [ADR-04](./04-sector-shape-unification.md)                                      | Accepted | Sector 统一弧形与扇形 Node shape             | 删除独立 Arc shape，以 Sector 厚度表达开放弧、扇形与环楔                     |
| [ADR-05](./05-standard-clip-shapes.md)                                          | Accepted | Standard ClipShape 完整迁移                  | 冻结五种 Clip spec/shape、两级 Definition、provider dependency 与跨入口闭环  |

ADR-02～05 均已按其公开契约完成并进入 `Accepted`。ADR-05 演进 ADR-02 的 Clip 行：Core 默认从 rect/circle/ellipse 收敛为 rect，Standard 完整接管其余五种 ClipShape；ADR-02 的子入口和显式装配原则不变。

## 后续定义拓展方向

- 在 provider 迁移与子入口边界稳定后，以独立 ADR 横向补充 Standard 官方定义集合，不把内容扩充混入迁移 ADR
- 箭头定义优先参考 TikZ 等成熟绘图系统，提炼可复用的 marker 语义、几何约束与命名边界，再决定进入 `@retikz/standard/arrow` 的具体集合
- Shape、pattern、path generator 等能力沿用同一原则：Core 保持统一 contract / registry / compile 机制，Standard 子入口提供按需引入的官方扩展
- 新定义不从 `@retikz/standard` 根入口聚合导出，不使用全局注册、动态包发现或副作用导入

## 已完成迁移边界

- Standard 三包不保留 Layout re-export、alias、Definition、adapter 或 `standard.*Layout` namespace
- `@retikz/standard/layout` 与 Standard `/inspect` 中的 Layout 能力移除
- Legend、Axes、Grid、Frame 等 Standard presentation 继续属于 Standard；其中只有 Legend 按需依赖 `@retikz/layout/compose`
- Standard alpha.2 ADR-01～07 原地标记 Superseded；ADR-08 保持既有历史状态；ADR-09～10 继续 Accepted
- Standard alpha.3 ADR-06 的直接 Definition loading 原则继续生效
- 文档站进入 Library 顶级模块的 `Standard · 拓展` 分组，并与 `Layout · 布局` 分别维护 changelog
- Standard Shape 收敛为 `cross`、`sector`、`star`、`contour`，不保留独立 Arc shape；Kernel React `<Arc>` Path Sugar 不变
- `@retikz/standard/shape`、`@retikz/standard/arrow`、`@retikz/standard/clip` 与 `@retikz/standard/ribbon` 是已发布可选 provider 的唯一公共子入口，不发布空的 Path Generator 入口

## Surface 依赖 Gate

- Core ADR-18 冻结跨 namespace Composite provider graph，确保 Surface 及其任意 child definitions 在 React、Vanilla 与直接工具链中统一装配
- Core ADR-19 冻结 qualified spatial handle sidecar，确保 Surface 包裹后 descendant identity、geometry 与 provenance 不丢失
- 两项 Core ADR 与本 milestone ADR-01 均已完成 Architecture Gate、Plan Gate 与人工确认，Surface 已按冻结契约完成跨入口闭环

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
- Core 默认 provider 集合符合 ADR-02 及 ADR-05 的后继边界，只保留 rect Clip；Standard 可选 Shape、Arrow、五种 ClipShape 与 Ribbon 只从四个能力子入口显式装配
- provider contribution 在直接 Core、React、Vanilla、SSR 与官方 Tier 2 中形成完整依赖闭包，缺失、冲突和循环在 dispatch 前 fail-loud

## 当前进度与执行顺序

1. Layout owner 迁移已经完成，现行代码版本为 `0.1.0-alpha.4`
2. ADR-01 Surface 已 Accepted，并在 Standard、React、Vanilla、文档、Chart 与 Table consumer 中闭环
3. ADR-02 已 Accepted：Core provider graph、最小内置集合、三个 Standard provider 子入口与 Tier 2 显式依赖闭包均已完成
4. ADR-04 已 Accepted：Standard 不再维护独立 Arc shape，Sector 统一表达开放弧、扇形与环楔
5. ADR-03 已 Accepted：Ribbon 的 schema、Path Kind、profile、几何编译、公开入口与跨入口闭环已完成
6. Core ADR-21 与 Standard ADR-05 均已 Accepted：两级 ClipShape 扩展、canonical Scene path、Standard 五种 ClipShape、Core `rect` 最小内置与 Layout Core-only allocation clip 已形成最终闭环
7. 后续新增 Shape、Arrow、Clip 或其它官方定义时，继续按能力归属与真实复用需求独立决策，不恢复全局注册或根入口全集
