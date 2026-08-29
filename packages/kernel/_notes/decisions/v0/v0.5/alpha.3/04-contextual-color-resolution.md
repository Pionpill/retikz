# ADR-04：Foundation 颜色原子、上下文颜色权重与 Tier 2 Theme 适配

- 状态：Accepted
- 决策日期：2026-08-25
- 关联：[alpha.3 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Core 绘图完备设计](../../../../architecture/core-drawing-complete.md) · [Foundation 基础包设计](../../../../../../../notes/architecture/foundation-design.md) · [视觉 Theme 设计](../../../../../../../notes/architecture/visual-theme-design.md)

## 背景与目标

Core 的 `color` 已经承担图形主色，`fill`、`stroke`、文字和箭头等槽位可以继承它；但作者若要表达“同一主色的浅背景、实色边框和原生 `currentColor` 文字”，仍需提前计算并重复写入多个颜色字符串。Graph、Plot、Table 等 Tier 2 Theme 也只能各自物化这些颜色，容易复制算法，并在 Scope、Theme 与实例覆盖改变最终主色时产生漂移。

目标是在 JSON-safe Core IR 中提供一种紧凑的上下文颜色写法：字符串继续表达精确 CSS/SVG 颜色，归一化数值表达最终主色在当前 Theme 模式基准底色上的权重。静态颜色解析与不透明预合成由 Foundation 作为无领域原子统一提供；上下文颜色确定化仍由 Core 在完整样式级联后完成。Tier 2 只声明主色来源并把兼容槽位下沉到 Core，不拥有第二套颜色算法。

## 决策：Foundation 提供颜色原子，Core 在最终样式级联后确定化

Core 为具有明确主色来源的颜色槽位提供 `ContextualColor` 契约。字符串保持原值；数值必须位于闭区间 `[0, 1]`，并表示有效 `color` 的预合成权重。Light 模式使用不透明白色作为基准底色，Dark 模式使用不透明黑色作为基准底色。结果是确定的不透明颜色，不携带 alpha。

Foundation 统一把静态颜色解析为归一化 sRGB 通道，并提供不依赖 Theme、IR、renderer 或宿主环境的不透明 source-over 预合成。对每个前景通道 `foreground`、基准底色通道 `backdrop`、前景自身 alpha 与数值权重 `weight`，预合成固定为：

```text
effectiveAlpha = foregroundAlpha × weight
output = round(255 × (foreground × effectiveAlpha + backdrop × (1 - effectiveAlpha)))
```

三个输出通道格式化为不透明小写 `#rrggbb`。本能力不改用 linear-sRGB、Lab、OKLab 或其它插值空间；颜色空间升级必须作为新的公开决策处理。

解析顺序固定为：

```text
Theme / Scope / element cascade
  → effective color 与各颜色槽位
  → contextual color resolution
  → Canonical / Scene 普通颜色字符串
```

数值颜色不是 opacity。`opacity`、`fillOpacity`、`strokeOpacity` 与其它透明度字段继续独立作用；`currentColor` 也继续保持 CSS/SVG 原生语义，不改指向 Retikz 的 `color` 字段。

Foundation 是静态 CSS 颜色解析、归一化 sRGB 表达和不透明预合成算法的唯一 owner；它不知道 Theme mode、样式槽位、字段路径或领域主色链。Core 是 Contextual Color schema、Theme 模式基准底色、最终主色选择、调用时机与绘图诊断的唯一 owner。Graph、Plot、Table 等 Tier 2 Theme 可以在最终 lower target 具有确定主色时接受并透传数值颜色，但不得提前计算颜色。renderer 只接收已经确定的普通颜色字符串。

理由：

1. 只有在 Scope、Theme、领域默认和实例覆盖全部完成后，才能知道数值槽位应跟随的最终主色。
2. Foundation 统一纯颜色计算，Core 统一上下文调用，可保证 SVG、Canvas、React、Vanilla 与直接 JSON 使用同一结果，不依赖宿主 CSS 计算能力，也不让 Tier 2 复制算法。
3. 数值只表达主色权重，透明度继续由既有 opacity 字段表达，避免一个值同时承担颜色与合成状态。

## 基础数据结构与公开契约

```ts
type IRContextualColor = CssColorValue | number;

type IRPaintValue = IRContextualColor | IRPaint;
```

Foundation 从包根公开无领域的静态颜色原子：

```ts
type ParsedCssColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const parseStaticCssColor: (input: string) => ParsedCssColor | null;

const compositeOpaqueColor: (foreground: string, backdrop: string, weight: number) => `#${string}`;
```

`parseStaticCssColor` 只处理 Retikz 可确定化的静态 CSS 颜色子集；动态宿主颜色返回 `null`。`compositeOpaqueColor` 要求 `weight` 位于 `[0, 1]` 且 `backdrop` 不透明，并返回小写不透明十六进制颜色。该接口不接受 Theme mode；Light / Dark 基准色由 Core 选择后作为 `backdrop` 传入。

Foundation 颜色原子失败统一使用 `RetikzFoundationErrorCode.Color = 'FOUNDATION_COLOR_ERROR'`，`details` 至少包含失败输入角色 `input: 'foreground' | 'backdrop' | 'weight'` 与原始 `value`。该错误只描述原子输入，不携带 Core 字段路径或 Theme 上下文。

`IRContextualColor` 的数值分支由 schema 约束为 `[0, 1]`。`color` 本身仍为 `CssColorValue`，不能使用数值；否则主色来源会递归依赖自身。

适用槽位必须具备明确的有效主色链，包括：

- 图形的纯色 `fill` 与 `stroke`；
- Node、Label 与文本层级中从宿主或上层文字主色派生的前景色；
- Path 箭头与 marker 中从 Path 或 marker 主色派生的颜色；
- Tier 2 Theme 最终映射到上述 Core 槽位的 appearance token。

数值分支只表示一个派生的纯色，不进入 `IRPaint` 对象内部。Gradient stop、pattern 内部颜色、Drop Shadow 独立颜色、Core shared colors、categorical / sequential / diverging palette、scale range 及其它独立颜色事实源继续使用 CSS 颜色字符串。

最小示例：

```ts
{
  type: 'node',
  position: [0, 0],
  color: 'darkorange',
  stroke: 1,
  fill: 0.08,
  textColor: 'currentColor',
}
```

在 Light 模式下，`stroke: 1` 解析为不透明 `darkorange`，`fill: 0.08` 解析为主色与白色预合成后的浅色；Dark 模式改为与黑色预合成。`textColor` 保持字面量 `currentColor`。

Tier 2 Theme 遵循同一分类，并固定以下主色链：

- Graph Entity 的 Node paint、正文和 label 从最终 Entity `color` 派生；Graph Relation 的 stroke、label 与 marker color 从最终 Relation `color` 派生，marker fill 再从有效 marker color 派生。
- Plot 的 `plot.typography.foreground` 保持字符串主色；plot area、axis、grid、tick / title 和 legend 的派生 paint / foreground token 从该主色派生。mark、series、sector、categorical、sequential 与 diverging 数据颜色不参与。
- Table Cell 与 Column Header 的 content color 保持各自字符串主色，background 从同一区域的有效 content color 派生。border contribution 保留来源区域的有效 content color；冲突消解后的 winning contribution 决定最终 Path `color`，Column Header 专属边框使用 Header content color，其余 Table / Cell 边框使用对应 Cell content color。

Theme token 使用字符串时仍是精确颜色覆盖，不因上述主色链被重新混合。没有唯一主色来源的 palette 或数据颜色不得使用数值。

## 行为、失败语义与兼容性

- 默认行为：既有字符串颜色、paint object、Theme preset 与 opacity 语义保持不变；缺省值不自动生成数值颜色。
- 确定化：数值槽位按最终有效 `color`、当前位置 Theme mode 和固定基准底色解析；即使主色字符串自身含 alpha，输出仍为不透明颜色。
- 失败与诊断：超出 `[0, 1]` 的数值在 schema 边界拒绝。直接调用 Foundation 颜色原子时，非法权重、不支持的静态颜色或非不透明底色抛出 `RetikzFoundationErrorCode.Color`；静态解析探测仍以 `null` 表示不支持。数值槽位缺少有效主色，或主色为 `currentColor`、CSS variable、宿主相关颜色及其它无法静态解析的字符串时，Core 按字段路径 fail-loud，不读取宿主 CSS，也不使用 Theme foreground 猜测替代值；需要转换 Foundation 失败时保留原始 `cause`。
- 特殊关键字：`currentColor` 与 Node 文字的 `contrast` 等既有字符串语义保持不变，不进入数值颜色算法。
- Scene 与 renderer：Canonical 和 Scene 不保留数值颜色；renderer 不新增数值颜色分支或 fallback。
- 兼容性 / breaking：Source IR 与 Tier 2 Theme token 的数值分支是向后兼容扩展，全部既有合法输入保持原行为。既有 Core 颜色原子公开面迁移到 Foundation，Core 不保留转发别名；直接调用方必须改从 `@retikz/foundation` 导入。旧 API 不增加 alias、migration 或双轨解析。
- React / Vanilla 等价性：React props、Vanilla Input 与直接 JSON 表达同一字符串或数值契约；adapter 只传递已类型化输入，最终结果统一由 Core resolve 决定。

## 结果

Foundation 已成为静态 CSS 颜色解析与不透明预合成的唯一 owner，Core 在完整样式级联后统一确定 Contextual Color。Graph、Plot、Table 只下沉各自的字符串主色与数值派生槽，Canonical、Scene 与 renderer 继续只接收字符串颜色或既有 paint object。

动态宿主颜色仍不可作为数值派生槽的主色；这类输入按字段路径 fail-loud。感知色彩空间插值、宿主 CSS 求值以及没有唯一主色来源的 palette / scale / paint 内部颜色不属于本决策。
