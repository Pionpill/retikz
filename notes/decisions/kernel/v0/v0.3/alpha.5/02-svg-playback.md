# ADR-02：SVG 动画播放——`trigger:'load'` 出纯 CSS `@keyframes`（SSR 零 JS 自播）+ 交互触发出 WAAPI 描述（runtime 应用）

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[v0.3-alpha.5 roadmap](./roadmap.md) · **前置**：[ADR-01 时间轴动画 IR 契约](./01-timeline-animation-ir.md)（Scene 带 tracks + 静止-终态不变量 + 降级契约——本 ADR 在 SVG 后端兑现该契约）· **机制先例**：[v0.3-alpha.1 ADR-01 SVG descriptor](../alpha.1/01-svg-descriptor-contract.md)（`SvgNode` descriptor + `buildSvgDocument` / `renderToSvgString`）· [v0.3-alpha.3 水合](../alpha.3/01-hydration.md)（runtime DOM 挂载 + 事件基建，WAAPI 触发复用）

## 背景

ADR-01 把 `AnimationTrack[]` 放进 Scene（`ScenePrimitive.animations` / `Scene.animations`），约定 compile 产出的 Scene 即 **base 静态图 + 挂着的播放数据**，并定下「能力声明 + warn + settled 降级」的 **future renderer 契约**。本 ADR 让 SVG 后端**真正播放**这些 tracks，并兑现该契约（SVG 能力 = `full`）。

SVG 后端的特殊性：它有**两套互斥的播放载体**——**CSS `@keyframes`**（声明式、随 SVG 字符串内联、零 JS、SSR 自播）与 **WAAPI**（`element.animate()`，命令式、需 DOM + JS）。二者能力不同（CSS 加载即播、无法被 runtime 暂停/seek/事件触发；WAAPI 可控但要 JS）。本 ADR 的核心决策就是**按 `trigger` 把每条 track 分流到这两套载体**。

## 决策：按 `trigger` 分流——load 走 CSS、交互走 WAAPI；property 映射到 SVG；颜色 CSS 预采样、WAAPI 真 oklch

### 两种 emit 模式（按 `track.trigger`）

| trigger | 载体 | SSR 字符串 | 说明 |
|---|---|---|---|
| `'load'`（缺省） | **CSS `@keyframes`** | ✅ 自播、零 JS | `buildSvgDocument` 收集所有 load-track → 一个 `<style>`：per-track `@keyframes` + 给目标元素挂 `animation: <name> <dur> <easing> <delay> <iter> <dir> <fill>` |
| `'visible'` / `'manual'` / `{onEvent}` | **WAAPI 描述** | ❌（需 JS） | descriptor 上挂结构化 animation 规格；runtime（`mountSvg` / react）读它调 `element.animate(keyframes, timing)` + 按 trigger 接 IntersectionObserver / API / 事件 |

- **能力边界（明确写进文档）**：`renderToSvgString`（SSR）只把 **load-track** 编进 CSS 自播；`visible`/`manual`/`onEvent` 的 track 在 SSR 字符串里**不播**（descriptor 仍带规格，等 runtime 挂载后 WAAPI 接管）。交互触发器必须走 DOM 挂载路径。
- 同一元素可混挂多条 track（部分 load→CSS、部分交互→WAAPI），互不干扰。

### property → SVG 映射

| AnimationProperty | SVG 落点 |
|---|---|
| `opacity` | `opacity` |
| `fill` / `stroke` | `fill` / `stroke`（颜色，见下 oklch） |
| `strokeWidth` | `stroke-width` |
| `translateX` / `translateY` / `rotate` / `scale` / `scaleX` / `scaleY` | `transform`（合成；支点取 track `origin`——命名 anchor 折算成元素 boundary 上的点 / `[x,y]` 直用，缺省几何中心；映射成 `transform-box` + `transform-origin` 或绕支点的 translate-scale-translate 复合） |
| `pathDraw`（0..1） | `pathLength=1` + `stroke-dasharray` + `stroke-dashoffset`（1→0 画出）；仅对有描边的 path/shape 有效，无描边 → warn+skip |
| `viewBox`（scene 根·镜头） | **包一层 `<g transform>` 动 transform**（不动 `<svg viewBox>` 属性——CSS/WAAPI 都能动 transform、动不了 viewBox 属性）：每关键帧的 `[x,y,w,h]` 相对静态 `layout` 折算成 `scale + translate`，动这个合成 transform |

### oklch 颜色插值（roadmap 定）

- **CSS 模式**：CSS `@keyframes` 默认按 sRGB 插值、`color-mix(in oklch)` 兼容性不稳，故 **编译期在两端点间按 oklch 预采样 N 个中间帧**（N≈8，可配）写进 `@keyframes`——把真 oklch 路径退化成 sRGB 分段折线近似，肉眼无差、兼容性满分。
- **WAAPI 模式**：runtime 算真 oklch lerp 喂 `element.animate`。

### easing

- 内置具名（linear / ease / ease-in/out…）→ CSS `animation-timing-function` 同名 / WAAPI 同名。
- cubic-bezier 四元组 → CSS `cubic-bezier(...)` / WAAPI 同。
- **自定义 easing 名** → `RenderOptions.easings?: Record<string, [x1,y1,x2,y2] | (t)=>number>`（兑现 ADR-01 预留口）：CSS 用其 cubic-bezier 形式（函数形式无法进 CSS → 该 track 退 WAAPI 或 warn+linear）；未注册名 → warn + linear 兜底。

### 降级（兑现 ADR-01 契约，SVG 能力 = full）

- `renderToSvgString(scene, { animate:false })` / `buildSvgDocument(... , { animate:false })` → **不 emit `<style>` / 不挂 WAAPI 描述**，渲染 base 静态图（settled 不变量保证它完整）。
- SVG capability 声明 `full`；**warn + skip（该 track 降级到 base）** 仅在：① `pathDraw` 挂到无描边元素；② 自定义 property 无内置 SVG 映射且无注册；③ 自定义 easing 函数形式进不了 CSS。其余正常播。
- `prefers-reduced-motion` 判断不在本 ADR（runtime ADR-04 读 media query → 传 `{animate:false}`）。

理由：

1. **物尽其用**：load 动画走 CSS = SVG 路线最大卖点（SSR 静态文件自播、零运行时）；交互动画走 WAAPI = 可控。按 trigger 分流让两者各取所长。
2. **兑现 ADR-01 契约**：settled 不变量让 `{animate:false}` / 降级直接渲染 base 完整图；能力 warn 沿用 canvas 范式。
3. **camera 用 group transform 而非 viewBox 属性**：与元素 transform 动画同一套 CSS/WAAPI 机制，免去「动 SVG 属性」的特例与 SMIL 依赖。
4. **颜色 CSS 预采样**：不赌 `color-mix(in oklch)` 兼容性，编译期把 oklch 路径采样进 keyframes，稳。

## 不在本 ADR 范围

- **Canvas 播放**：`drawScene(…,{time})` 逐帧 + 几何插值 + 自定义 property 的 JS 插值 → ADR-03。
- **runtime 播放控制**：rAF 时钟、`trigger` 落地（IntersectionObserver / API / 事件桥水合）、`{animate:false}` 与 `prefers-reduced-motion` 接线、静态截帧 `{at:t}` → ADR-04（vanilla / react）。
- **自定义 property 的插值器**：SVG 只认内置 property→CSS/SVG 映射；自定义 property 的通用插值（JS 算）在 Canvas（ADR-03）/ runtime 更自然，本 ADR 对未映射自定义 property 一律 warn+skip。
- **sugar 动词**（`fadeIn` / `drawOn` …）：`@retikz/react` + 共享 parser，后续 ADR。
- **多 track 共享时钟编排的 runtime 实现**：本 ADR 只保证 CSS/WAAPI 各 track 用同一 t0（load 时刻）+ per-track delay；跨元素显式 sequence 由 runtime（ADR-04）。


> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / 改动 / 测试象限 / 依赖现有元素）见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 08deaa80:notes/decisions/core/v0/v0.3/alpha.5/02-svg-playback.md`（封板全文）。
