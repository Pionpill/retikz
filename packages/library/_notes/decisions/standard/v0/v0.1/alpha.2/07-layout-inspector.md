# ADR-07：以内置 Layout Inspector 可视化布局求解结果

- 状态：Accepted
- 日期：2026-07-31
- 范围：Core inspection contract、Render frame、React / Vanilla authoring、Standard Flex / Grid / Overlay inspector
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-06](./06-layout-artifacts-capabilities-adapters.md) · [Kernel ADR-12](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/12-extensible-inspector-content.md)

## 后续演进

[Kernel ADR-12](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/12-extensible-inspector-content.md) 进一步取代本 ADR 中由 Core、Render 与基础 adapter 内置 Inspector 的归属。Core 只保留最终 occurrence 观测与隔离片段编译；Inspector contract、选择策略、辅助平面和宿主接线迁入可选 `@retikz/inspect`，Layout 实现迁入 `@retikz/standard/inspect`

本 ADR 冻结的运行时选择、最终 occurrence、最终 replay、独立辅助平面、主 Scene 不受辅助内容影响以及完整帧原子提交语义继续有效。它们由可选 Inspect 编译驱动和 Render 的普通只读图层能力实现，不再要求 `CompileResult`、基础 adapter 或 Render 公共面包含 inspection 专用字段

## 背景

布局容器同时存在父级分配的 slot、子图形真实占用和视觉包络。只观察最终 Scene 很难判断尺寸来自哪一级，也无法直接解释换行、轨道、间距、锚点和溢出。

在编译后根据 artifact 猜测根坐标也不可靠。Standard artifact 使用容器局部坐标，而 nested layout 的最终 transform、probe 选择与 replay placement 由 Core occurrence 掌握。若 inspector 重新运行 solver、读取 renderer 或复制一份根矩阵，辅助层就可能与实际提交结果漂移。

因此 alpha.2 需要一套 runtime-only 的开发辅助能力：布局组件可局部开启，宿主可按整张图或 authored 子树开启，SVG 与 Canvas 都能显示，同时不改变持久化 IR、主 Scene、布局边界、资源、命中测试或水合身份。

## 决策

### 1. 三层 authoring，组件局部能力是基础

Layout Inspector 支持三个入口：

| 范围            | React                                 | Vanilla                            | 语义                                           |
| --------------- | ------------------------------------- | ---------------------------------- | ---------------------------------------------- |
| 整张图          | `<Layout inspect={{ layout: true }}>` | mount / SSR options 的 `inspect`   | 选择所有已注册且带 inspector 的布局 occurrence |
| authored 子树   | `<Scope inspect={{ layout: true }}>`  | `VanillaScopeSpec.inspect`         | 只作用于该 Scope 的 authored 后代              |
| 当前 occurrence | `<FlexLayout inspect>` 等             | `flexLayout('id', input, true)` 等 | 只选择当前容器，不传播给 nested layout         |

求值顺序固定为 Layout → 最近的 Scope → 当前组件。对象字段逐项稀疏合并，nested `bounds` 也逐字段合并；canonical 默认值只在最终求值时填充一次。

`enabled: false` 是 authored 子树的硬屏障，后代不能重新开启。组件 `inspect={false}` 只关闭当前 occurrence，不形成子树屏障。省略全部入口时不运行 inspector，输出为 `null`。

这些声明均为 runtime authoring sidecar：

- 不进入 `IRScene`、`IRScope` 或 Standard Layout schema
- 不参与 JSON 持久化、diff 或 AI 生成契约
- React StrictMode、probe 或 replay 不得造成重复注册

### 2. 固定通用两级选项

Core 拥有所有布局家族共享的 Base profile：

```ts
type BaseLayoutInspectOptions = {
  bounds?:
    | boolean
    | {
        container?: boolean;
        content?: boolean;
        slot?: boolean;
        allocation?: boolean;
        visual?: boolean;
      };
  overflow?: boolean;
  alignmentGuides?: boolean;
  labels?: boolean;
};
```

唯一 canonical 默认值为：

| 选项                | 默认值  |
| ------------------- | ------- |
| `bounds.container`  | `true`  |
| `bounds.content`    | `true`  |
| `bounds.slot`       | `true`  |
| `bounds.allocation` | `true`  |
| `bounds.visual`     | `false` |
| `overflow`          | `true`  |
| `alignmentGuides`   | `true`  |
| `labels`            | `false` |

Standard definition 只拥有 family-local profile：

| 家族    | 专属选项与默认值                                        |
| ------- | ------------------------------------------------------- |
| Flex    | `lines=true`、`gaps=true`                               |
| Grid    | `tracks=true`、`cells=false`、`gaps=true`、`spans=true` |
| Overlay | `placements=true`、`anchors=true`、`stacking=false`     |

authoring schema 全部是无 default、无 transform 的 strict sparse object。Core 最终解析完整 Base profile，definition 最终解析完整 local profile；unknown key、错误类型、Base/local 重名或不能从空对象得到 canonical local profile 均 fail-loud。

### 3. Inspector 依附现有 CompositeDefinition

Core 在同一 `CompositeDefinition` 上提供可选 `inspector`，不新增 registry。只有 layout-aware、能返回且声明 typed artifact schema 的 definition 可以注册 inspector。

inspector callback 只接收：

- 同次最终 replay 发布的 typed artifact
- occurrence locator
- Core 已求值的 Base profile
- definition 已求值的 local profile

最终 occurrence transform 不暴露给 callback，由 Core 在封装 inspection plane entry 时统一附加。child forest 与 opaque child handle 只属于 layout compile / `layoutChild()` 的 authored sidecar remap，不进入 inspector 公共 context。

callback 只返回 renderer-neutral 的 rect、line、label DTO。Core 再以 strict schema 校验有限数值、深冻结，并拒绝 id、target、resource、paint、animation、path 或其它主 Scene 语义。

Standard 三个 inspector 只读取 typed artifact，不读取 authored props、主 Scene primitive，也不重新调用 Flex line、Grid track/placement 或 Overlay solver。Overlay artifact 为此补充 positioned item 的 `position.target` 与 `position.slotAnchor`；aligned item 不携带该字段。

### 4. Core 拥有 occurrence 绑定与独立 inspection plane

`CompileOptions.inspection` 是 Core 唯一编译入口，包含整图 root policy 与 authored roots。React / Vanilla 只负责把 sidecar 映射为 authored locator；Core 负责把它 remap 到最终动态 occurrence。

nested layout 通过 `layoutChild()` 的 opaque child handle 绑定相对子树。handle 只能在当前 callback / compile 使用；child index 必须是 dense 的非负安全整数，越界、稀疏、重复 locator 或跨 callback 使用均 fail-loud。继承策略会自动穿过没有读取 handle 的 custom layout；component-local 策略不会传播。

Core 只为最终选中的 replay 生成一次辅助层。rejected probe、失败候选和空输出不占 inspection entry。entry 使用现有 occurrence 比较规则与最终提交顺序形成稳定顺序，primitive 保持 definition 返回顺序。

`CompileResult` 增加：

```ts
inspection: InspectionPlane | null;
```

inspection plane 与主 Scene、artifact 属于同一 compile revision，但不进入 `IRScene` 或 Scene identity topology。开启 inspector 不改变主 Scene、viewBox、资源表、动画、目标、边界或 patch 语义。

### 5. Render 以完整 frame 原子物化两个平面

静态 renderer 接收：

```ts
type StaticRenderFrame = {
  primary: Scene;
  inspection: InspectionPlane | null;
};
```

retained renderer 接收：

```ts
type RenderFrameSnapshot = {
  primary: SceneRuntimeSnapshot;
  inspection: InspectionPlane | null;
};
```

custom retained renderer 必须声明 `inspectionCapability`。不支持 inspection 的 renderer 在 prepare 前 fail-loud；支持的 renderer 在同一个 prepared token 中提交或回滚完整 frame，`read()` 只暴露最近一次 committed frame。

后端行为固定为：

- SVG 在 primary 之后追加独立的 `pointer-events="none"` group，不生成 hydration id
- Canvas 在同一 fit / DPR transform 下先画 primary、再画 inspection，辅助图元不进入 hit-test index
- Scene-only API 等价于 `inspection: null`
- SSR SVG seed 包含相同 inspection plane；hydration 仍只读取主 Scene identity

### 6. React 与 Vanilla 共享同一 Core 语义

React `<Layout>`、`<Scope>` 和 Standard Layout component 只构造 sidecar。static、retained、SVG SSR 与 Canvas 均把 Core 输出交给 Render frame API，不在 adapter 中解释或绘制 primitive。

Vanilla 顶层 `inspect` 是唯一公开根入口；`compile` 明确排除 `inspection`，避免调用方提交两份互相冲突的 Core policy。`VanillaScopeSpec.inspect` 控制 authored 子树，`VanillaEmbedSpec.inspect` 由 adapter 的第二泛型精确约束 family-local options，且不进入 props、IR 或 runtime metadata。

预编译 Scene 缺少 artifact、definition 与 authored occurrence，React / Vanilla 在配合 `inspect` 使用时同步 fail-loud，不从 Scene 反推布局。

retained 中修改 inspection options 可以完整重新 compile，但单次 compile 只运行一轮布局求解。React 重建使用新 frame 的 session；Vanilla 原子建立新 session 后再退休旧 session。新 session 失败时保留旧 committed frame；旧 session cleanup 失败会保留并重试，诊断独立排队消费。

## 公开 API 与兼容性

新增的主要公开契约包括：

- Core：`InspectOptions`、`BaseLayoutInspectOptions`、resolved 类型、inspection primitive / plane schema 与类型、`CompileOptions.inspection`、`CompileResult.inspection`、`CompositeDefinition.inspector`
- Render：`StaticRenderFrame`、`RenderFrameSnapshot`、`inspectionCapability`
- React：`LayoutProps.inspect`、`ScopeProps.inspect`、三种 Standard Layout 的 `inspect`
- Vanilla：顶层 `inspect`、`VanillaScopeSpec.inspect`、`VanillaEmbedSpec.inspect`
- Standard：三种 family inspect input / resolved schema 与类型；Overlay artifact 的 resolved `position`

本 ADR 不修改 authored Core / Standard IR schema。`0.x` 阶段不为旧 custom renderer 或手写 `CompileResult` 保留别名：它们需要补 `inspectionCapability` 和 `inspection` 字段。Scene-only renderer 调用继续可用，语义等价于 `inspection: null`。

## 被否决的方案

- **只提供全局入口**：无法单独观察一个组件，也不能表达 Scope 子树边界
- **把 `inspect` 写入 IR**：开发状态会污染持久化、diff 与 AI 生成契约
- **Standard 或 adapter 自己叠一层 Scene**：会复制 Core occurrence / transform 语义，并让 SVG、Canvas、SSR 和 retained 分叉
- **从最终 Scene 反推布局**：无法可靠区分 slot、allocation、visual、track、line 与 anchor
- **让 inspector 重跑 solver**：辅助层可能与最终 replay 漂移，也会让 option-only 更新产生第二轮布局
- **用 renderer callback 或 CSS 主题注入**：破坏 renderer-neutral 契约，并把命中与水合隔离交给调用方
- **建立独立 inspector registry**：内置与自定义会走两条注册和解析路径

## 遗留边界

- Plot、Table、Gantt 与其它 Tier 2 的 inspector 或布局适配由各自 milestone 决定
- 本轮不提供 selection、hover、drag handle、布局修改、history、viewport toolbar 或 DevTools 面板
- 不提供用户主题、CSS 注入、持久化 inspect 配置、跨 compile inspector cache 或 inspection 增量 patch
- option-only 更新允许完整 compile；后续只有在 profiling 证明必要时再设计 solver / artifact cache
- Vanilla LayoutItem 内直接嵌套 embed 仍需独立的递归 lowering 与贡献合并设计；自动示例转换也不承诺展平这类 nested component-local inspection sidecar
