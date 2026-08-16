# ADR-01：以 Standard Surface 包装任意 Core child

- 状态：Accepted（2026-08-11，Architecture Gate 与 Plan Gate 通过并经人工确认）
- 决策日期：2026-08-11
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.4 roadmap](./roadmap.md) · [Standard 拓展库设计](../../../../../architecture/standard-library-design.md) · [Core Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md) · [Core ADR-19](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/19-qualified-spatial-handles.md) · [Chart ADR-03](../../../../../../../viz/_notes/decisions/chart/v0/v0.1/alpha.1/03-presentation-standard-layout.md)

## 背景与目标

Chart 需要一个 renderer-neutral canvas，把完整 Plot 与 title、subtitle、source、note 的 Layout composition 放在统一背景、padding、边框、圆角与 Scope 语义下。Table panel 和一般信息面板也需要同类能力。现有 Standard Frame 只接受非空 Core Node 数组，并用 Node anchor / synthetic bbox 组织 title、description 与 body；它不能包装 Plot、FlexLayout、Table 或任意 `IRChild`，也不应被扩张成同时拥有语义 Node frame 与通用 surface 的混合组件。

Core 已提供 layout-aware composite 的 proposal / probe / replay 与完整 authored Scope output，Layout 已提供 padding、overflow、content box、placement 与 artifact 的公共 composition 原子。缺口不是新的 renderer primitive 或布局 solver，而是一个跨领域可复用的 Standard presentation composite：接收单一任意 child，使用正式 Layout 能力确定最终 allocation，再绘制与该 allocation 一致的背景和边框。

## 决策：新增 `standard.surface` layout-aware composite

`@retikz/standard` 新增 canonical `standard.surface`。它只拥有任意 child 的 box presentation，不拥有 Chart、Plot、Table 或领域 header / footer 语义。

```ts
// 等价契约形状；实际公开类型由同一个 SurfaceSchema 推导
type SurfaceInput = Readonly<{
  namespace: 'standard';
  type: 'surface';
  child: IRChild;
  padding?: number | IRBoxSpacing;
  overflow?: 'visible' | 'clip';
  background?: Readonly<{
    fill: IRPaintValue;
    fillOpacity?: number;
  }>;
  border?: Omit<IRStandardPathStrokeStyle, 'zIndex'>;
  cornerRadius?: number;
}> &
  IRScopeProps;

type IRSurface = Readonly<{
  namespace: 'standard';
  type: 'surface';
  child: IRChild;
  padding: Readonly<BoundsInsets>;
  overflow: LayoutOverflowValue;
  background?: Readonly<{
    fill: IRPaintValue;
    fillOpacity?: number;
  }>;
  border?: Omit<IRStandardPathStrokeStyle, 'zIndex'>;
  cornerRadius: number;
}> &
  IRScopeProps;
```

公开 schema 从 Core `CompositeBase`、`Child`、`ScopeProps`、paint / opacity / rectangle corner 原子，以及 Layout 的 spacing / overflow 公共契约组合；border 由 Standard 共享 Path stroke schema 仅移除 `zIndex` 后派生，不复制字段。`child` 恰好一个且可以是任意合法 `IRChild`，包括其它 Standard / Layout composite 与 Plot composite。

公开 `SurfaceInput = z.input<typeof SurfaceSchema>`，`IRSurface = z.output<typeof SurfaceSchema>`；代码块只展示二者的等价契约形状，不建立手写平行类型。`SurfaceInput` 是 schema input / authoring 类型，允许 optional defaults 与 `number | IRBoxSpacing` padding shorthand。`IRSurface` 是 `SurfaceSchema` 解析后的 canonical output：padding 通过 Core `resolveBoxSpacing(..., 0)` 归一为显式 `top / right / bottom / left`，overflow 物化为 `visible`，corner radius 物化为 `0`；其它 Scope props 与可选 appearance 不被改写。React、Vanilla 与手写 JSON 可以使用不同 input shorthand，但 parity 比较的是解析后的同一个 JSON-safe `IRSurface`。compile callback 只接收 `IRSurface`，不重复解析 shorthand 或 default。

Surface 直接承接父级 layout proposal，不新增 `size`、alignment、gap、header、items 或任意 layout 配置：

- intrinsic proposal：probe child 的同轴 intrinsic contribution，并以 child `slotSize + padding` 形成 Surface resolved slot
- range proposal：每轴把父 `min / max` 扣除对应两侧 padding，child min 下限为 `0`；以 child `slotSize + padding` 形成 Surface resolved slot
- exact proposal：每轴把父固定尺寸扣除对应两侧 padding后以 exact proposal 交给 child，Surface resolved slot 保持父固定尺寸
- Surface `allocationBounds` 固定为从 `[0, 0]` 开始、尺寸等于 resolved slot 的 border box；不能用 child `allocationBounds` 或 `visualBounds` 代替 slot size
- child translation 为 `[padding.left - child.allocationBounds.x, padding.top - child.allocationBounds.y]`，把任意非零或负 allocation origin 精确对齐 content box 起点；Surface 不在剩余空间内额外居中、拉伸或分布

若 finite range max / exact 小于必须保留的对应轴 padding，或 child 无法满足扣除 padding后的 proposal，沿 Core layout failure fail-loud。range min 小于 padding时只把 child min clamp 为 `0`，不产生负 content size。Surface 不缩小 padding或切换 intrinsic 作为 fallback。

理由：

1. 任意 child 的通用 box presentation 去除 Chart / Table 词汇后仍成立，并已有两个独立消费场景，符合 Standard 准入边界
2. 单 child、直接 proposal 与 canonical content origin 能满足当前 Surface 需求，同时避免复制 Flex / Grid 的 sizing 和 alignment 配置
3. 背景与边框必须依据 layout settle 后的真实 allocation 绘制，layout-aware composite 比 Frame 的同步 Node expand 或 renderer CSS 外壳更符合现有主链

## Box、绘制顺序与几何

Surface 的 allocation box 是 `[0, 0, width, height]`；content box 由 allocation box 扣除 resolved padding。padding 只影响 child proposal 与 placement，不修改 child 自己的 allocation / visual bounds，也不成为 margin。

最终输出分成固定三层：

1. 可选 background，覆盖完整 allocation box
2. 隔离 content Scope，内部只含 replay 后的唯一 child，并按 child allocation origin 平移到 content box 起点
3. 可选 border，沿 allocation box 边界绘制并位于 child 之上

background 与 border 使用同一非负 corner radius，最终按 allocation 较短边的一半 clamp；缺少 `background` 时不生成透明填充，缺少 `border` 时不生成描边。Surface 不提供默认颜色、默认边框或阴影；Chart、Table 或主题 owner 解析自己的 token 后把 renderer-neutral paint 值传入 Surface。padding 默认为 `0`，overflow 默认为 `visible`，corner radius 默认为 `0`。

background 与 border 不接受独立 `zIndex`，固定绘制顺序不能被 appearance 改写。child 自身及其后代的 `zIndex` 只在隔离 content Scope 内参与排序，不能穿透到 Surface 三层并越过 background / border。Surface 根 `ScopeProps.zIndex` 仍控制整个 Surface 在外部 siblings 中的顺序。

border stroke 以 allocation 边界为中心绘制。stroke 的外半部只增加 Surface `visualBounds`，不增加 allocation，也不反向改变 child proposal。background 只贡献 allocation 内的视觉区域。child 的 allocation / visual bounds 继续由 Core layout result 保真记录。

`overflow='clip'` 只作用于隔离 content Scope，把平移后的 child visual output 裁剪到 allocation boundary；background 与 border 不被该内部 overflow clip 截断。corner radius 非零时，content clip 使用与背景 / 边框同一 rounded rectangle path；零面积轴使用 Core 合法的退化 path clip。Surface 的 authored `ScopeProps.clip` 属于外层完整 Scope，仍对 background、content Scope、border 的整体结果生效；内部 overflow clip 与 authored clip 不互相覆盖或改写。

Surface 的 `allocationBounds` 是最终 resolved slot border box。child 的 `allocationBounds`、`visualBounds` 与 `slotSize` 保持三套独立事实：translation 只改坐标，不把 allocation / visual 包络扩成 slot。Surface `visualBounds` 是 background、平移并应用 overflow 后的 child 可见视觉包络与 border visual overflow 的并集。它不从 Scene 或 renderer 回读 bbox。

## Scope、identity 与 spatial handle

Surface 完整复用 Core `IRScopeProps`：`id`、local namespace、theme、transforms、placement、四通道 style default、resetStyle、zIndex、clip、boundingShape、meta 与 animations 都沿普通 Scope orchestration 消费。Surface 不复制、裁剪或在 compile-local replay wrapper 中重新实现这些字段。

Surface 以 authored Scope 作为最终 output root；内部 background、content replay 与 border 只承担绘制与布局职责。显式 `id` 仍注册为 Surface 外层 identity，placement / transform / theme / clip 作用于完整结果。生成的内部路径使用 owner-local identity，不抢占 authored child id，也不把 child 的 namespace、locator 或 provenance 改写成 Standard。

Surface 通过 Core ADR-19 声明一个 owner-local `surface` spatial handle，bounds 为 allocation box，role 为 `surface`。嵌套 child 的 handles 由 Core owner path 自动加上 Surface 前缀，Surface 不复制或重命名 descendant handles。若 Core ADR-19 尚未实现，Surface 不能以 artifact、透明 Node 或 renderer metadata 建立临时空间旁路。

## Definition 与 authoring

Surface 继续使用 Core `CompositeDefinition` 和 Standard 的直接 Definition loading：

- `@retikz/standard` 从根入口导出 schema、IR type、factory 与单项 `SurfaceDefinition`
- `@retikz/standard-react` 提供 `<Surface>`，children 恰好一个可被 Core / Tier 2 builder 下沉的 drawable child；adapter 递归使用 `@retikz/react` 的公开 builder 获取该 child 的 IR 与 provider contributions，再把 Surface root/provider 与 child roots/providers按出现顺序组合成一个 contribution。Surface 不扫描 child IR 猜 provider
- `@retikz/standard-vanilla` 提供等价 plain helper / embed adapter。其嵌套输入是显式 `{ node: IRChild, providerDependencies?: CoreProviderContribution }` authoring result；普通 Core child只带 `node`，Tier 2 child同时带自身 contribution。adapter 把 Surface root/provider 放在前面并原样追加 child roots/providers
- 直接 JSON 作者把 `SurfaceDefinition` 与 child 所需 definitions 一起放入 compile environment

Surface 自身依赖 Layout 的公开 composition capability，但不转手导出 Layout API。跨 capability definition 装配使用 Core provider graph；Standard 不发布 Surface bundle、all preset、内置白名单或 module-level registry。

React/Vanilla 的嵌套 authoring result 只存在于 adapter runtime，不进入 `IRSurface`、Scene 或序列化 JSON。child provider 缺失、重复或冲突仍由 Core provider graph同步诊断；Surface adapter只保留 authored order并拼接 contribution arrays，不自行去重、拓扑排序或合并 datasets。

## 行为、失败语义与兼容性

- 默认行为：零 padding、visible overflow、无 background、无 border、零 corner radius，Surface allocation 尺寸等于 child `slotSize`
- schema：零个或超过一个 child、非法 paint、负 padding / radius、非法 overflow、未知字段与非 JSON 输入均 fail-loud
- layout：padding 无法放入 finite proposal或 child probe 失败时通过 Core failure 报告；resolved slot、allocation 与 visual bounds 分离，不缩放 child、不吞掉 failure
- geometry：background / border 始终使用最终 allocation；border overflow 只影响 visual bounds；clip 使用同一 rounded boundary
- identity：外层 Scope 与 child identity 分离；嵌套 handles 只增加 qualified owner prefix
- breaking：这是新增 Standard capability；不修改 Frame，也不提供 Frame alias 或从 Frame 自动迁移
- React / Vanilla 等价性：相同 Surface props、child、definitions 与 theme 产生相同 `IRSurface`、layout、Scene、artifact / spatial sidecar 和诊断

## 功能与包边界

- 所属能力域与解决的问题：Standard 通用 presentation；解决任意 renderer-neutral child 的背景、padding、边框、圆角与完整 Scope 包装
- 主责包与协作包：Standard 拥有 Surface schema / definition / appearance / lowering；Layout 提供 proposal、box 与 replay 原子；Core 提供 IR child、Scope、paint、Path、compile 与 spatial handle；adapter 只 authoring 接线
- 拥有：单 child box contract、Surface appearance、最终 allocation 对齐绘制、Surface spatial role
- 不拥有：Flex / Grid solver、Chart title / source、Plot canvas / scale、Table cell、领域 theme token、renderer DOM / CSS、交互状态
- 外部扩展与下游闭环：第三方 child 只要通过 Core composite contract 可编译，就能被同一 Surface 包装；所需 definitions 走 Core provider graph
- 不支持边界：不接受 DOM node、ReactNode 或 renderer object 进入 IR，不提供多 child arrangement、header / footer slot、scroll container 或 responsive state

## 架构验证

- 是否可由现有能力组合：Core 与 Layout 已能测量和 replay 任意 child，但没有拥有通用 appearance 与 JSON schema 的 Surface composite；Frame 的 Node-only 语义不能安全扩张
- math / core / render / adapter 责任切分：Layout / Math 计算 box；Core 提供 Scope、Path 与 compile；Standard 组合成 Surface；Render 执行普通 Scene；adapter 只构造相同 IR
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：新增 Standard Tier 2 IR 与单项 CompositeDefinition，不新增 Core IR、Scene primitive或 Standard registry；appearance 是闭合数据契约
- Scene / manifest / renderer / diagnostics 如何闭环：Surface lowering 只产生普通 Core Path / Scope / replay output；空间 handle 进入 Core sidecar；现有 renderer 等价执行
- provenance / locator / Interaction Readiness 是否适用：适用；Surface 外层 identity 与 child owner path 必须保留，具体领域 payload 仍由 child owner 提供
- 结论：扩展 Standard 当前 presentation composite 域

## 同类设计验证

[CSS Box Model Level 3](https://drafts.csswg.org/css-box-3/) 把 content、padding、border 与 margin 分成可组合但不同的 box，并明确 border 不等于 content sizing。本 ADR 采用 content / padding / border box 的分层、border visual overflow 不反向增加 allocation 以及 overflow 的显式边界；但 Surface 仍是 renderer-neutral Composite，不引入 DOM、CSS cascade、margin collapse、scroll container 或浏览器 intrinsic sizing。

该验证也支持把 Surface 与 Frame 分开：通用 box presentation 应围绕任意 content 和 settled allocation 建模，而不是继承 Node header / anchor 语义。

## 被否决方案

- 扩张 Frame 接受任意 child：会混合 Node anchor frame、header 语义与通用 layout-aware surface，并改变既有 Frame 输入和 bbox 行为
- 在 Chart adapter 使用 `<div>` / CSS 包裹：无法进入 JSON IR、SSR SVG、Canvas、inspection 或 Core spatial 主链
- 在 Chart 包内实现私有 canvas：Table 与其它 panel 会重复 box / border / clip，且 Standard 不再是通用 presentation owner
- 让 renderer 根据 child bbox 自动画背景：renderer 不拥有 layout proposal、领域 appearance 或 authored Scope，也会造成 SVG / Canvas 分叉
- 首版加入 width / height、alignment、gap、多 child 或 slot：当前单 child Surface 不需要，已有 Layout containers 承担这些能力
- 以 artifact 或透明 Node 暂存 Surface bounds：不能替代 Core qualified spatial sidecar，并会制造过渡双轨

## 测试策略摘要

测试契约必须覆盖 `SurfaceInput -> IRSurface` default / padding 归一、任意 Core child 与嵌套 composite schema、JSON round-trip、intrinsic / range / exact 混合轴 proposal、child `slotSize` 与非零 / 负 allocation origin、轴向 padding 扣除、finite proposal 小于 padding的失败、background / isolated content / border 顺序、child zIndex 隔离、border visual overflow、rounded clip、authored Scope 全字段、外层与 child identity、Surface 与 descendant qualified handles。Definition evidence 必须覆盖直接 IR、React、Vanilla、SSR、SVG / Canvas parity、缺失 child dependency 与第三方 child；Frame 回归必须证明其 Node-only schema、header 与 expand 语义不变。

## 不在本 ADR 范围

- 修改或替代 Standard Frame
- 多 child arrangement、header / footer、overlay、alignment、gap、scroll、responsive 或 host chrome
- Chart title、subtitle、note、source、IRPlot、Table panel 数据或领域 theme token
- 新 Core primitive、renderer CSS box、DOM container 或 Canvas 私有 surface
- shadow / filter 等新 appearance 能力；已有 Core style 原子若后续有真实跨领域需求再单独评估
