# ADR-03：Canvas 动画播放——`drawScene(ctx, scene, { time })` 逐帧求值 + 共享插值引擎 + 自定义 property 插值器注册表

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[v0.3-alpha.5 roadmap](./roadmap.md) · **前置**：[ADR-01 IR 契约](./01-timeline-animation-ir.md)（Scene 带 tracks + settled 不变量 + 降级契约 + 自定义动画扩展口）· **姊妹**：[ADR-02 SVG 播放](./02-svg-playback.md)（同一份 tracks 的 SVG 后端实现，本 ADR 是 Canvas 后端）· **机制先例**：[v0.3-alpha.1 ADR-02 Canvas renderer](../v0.3-alpha.1/02-canvas-renderer-and-react-canvas-mode.md)（`drawScene` / `renderToCanvas`、meet-fit 坐标映射）

## 背景

Canvas 是**即时模式**——画完即忘，没有 SVG 那种 retained DOM 可挂 CSS/WAAPI 动画。要让 ADR-01 的 tracks 在 Canvas 动起来，唯一路径是**逐帧重绘**：给一个时刻 `time`，算出每条 track 当下的值，应用到该帧绘制。

本 ADR 只定 **Canvas 后端的「单帧求值 + 应用」**（纯函数）；驱动它的 **rAF 时钟循环留 runtime（ADR-04）**——保持 `@retikz/render` 纯、无副作用（与 alpha.1「drawScene 收已编译 Scene、不自己测量/不起循环」一致）。

## 决策：`drawScene` 加可选 `time` 逐帧求值；抽共享 `evaluateTrack` 插值引擎；落 ADR-01 的自定义 property 注册表

### `drawScene(ctx, scene, options?)` 加可选 `time`

- `options.time`（毫秒，绝对时间轴）给定时：drawScene 绘制**该时刻的一帧**——每个 primitive 绘制前，对其 `animations` 每条 track 调 `evaluateTrack(track, time)` 求出当下值，应用到该帧的 ctx 状态 / 几何。
- **无 `time` → 渲染 base 静态图**（additive，**完全兼容现状**：现有 `drawScene(ctx, scene)` 行为零变化）。
- drawScene 仍是**纯单帧函数、无副作用、不起 rAF**；连续动画由 runtime（ADR-04）的 rAF 循环反复调它、推进 `time`。

### 共享插值引擎 `evaluateTrack`（renderer 无关、纯数学，新建 `render/src/animation/`）

`evaluateTrack(track, timeMs) → value`：给绝对时间，算 track 当下值——

1. 减 `delay`、按 `duration` 求第几次迭代 + 迭代内归一化进度 `p∈[0,1]`；
2. `iterations` 到顶后按 `fill`（forwards 停末帧 / none 回 base）取值；`direction`（alternate/reverse）翻转 `p`；
3. `p` 经 easing（具名 / cubic-bezier / 注册函数）映射；
4. 定位 `p` 所在 keyframe 段，段内按 property 类型插值：数值线性、**颜色 oklch 真 lerp**、viewBox 4 元组分量线性。

**为什么抽共享**：Canvas 逐帧、SVG 的**静态截帧 `{at:t}`**（ADR-04）、SVG WAAPI 的 JS fallback 都要「给 t 求值」；一份引擎三处复用，避免漂移。放 `@retikz/render`（不放 core——ADR-01 定 core 不解释 tracks）。

### property → Canvas 应用

| property | Canvas 应用 |
|---|---|
| `opacity` | `ctx.globalAlpha` 乘 |
| `fill` / `stroke` | 覆盖该 prim 的填充 / 描边色（oklch lerp 出的色） |
| `strokeWidth` | `ctx.lineWidth` |
| `translateX/Y` / `rotate` / `scale` / `scaleX` / `scaleY` | 绘制前 `ctx.translate/rotate/scale`（支点取 track `origin`——命名 anchor 折算成 prim boundary 点 / `[x,y]` 直用，缺省几何中心；scaleX/scaleY 传非均匀 `ctx.scale(sx,sy)`） |
| `pathDraw`（0..1） | 按路径总弧长截 `0..p` 段绘制（几何 lerp 部分路径；`setLineDash` 或 sub-path 重建） |
| `viewBox`（scene 根·镜头） | 时刻 t 的 `[x,y,w,h]` 替换静态 layout 取景 → 重算 meet-fit 映射矩阵（复用 alpha.1 的 meet-fit） |

### 自定义 property 插值器注册表（落地 ADR-01 预留的口）

`RenderOptions.animationProperties?: Record<string, AnimationPropertyDefinition>`，
`AnimationPropertyDefinition = { interpolate(from, to, p): value; applyCanvas(ctx, prim, value): void }`：

- 内置 property 有内置 interpolate + applyCanvas；
- **自定义 property** 查注册表：命中 → 用其 interpolate（喂 evaluateTrack）+ applyCanvas；
- **未注册自定义 property → `warn`（可诊断）+ skip 该 track（渲染 base）**——兑现 ADR-01 契约。
- `RenderOptions.easings`（与 ADR-02 同）：自定义 easing 名 → `(t)=>number` 函数，喂 evaluateTrack。

Canvas 是 JS 插值的天然落点（vs SVG 受限于 CSS/WAAPI），故**自定义 property 的通用插值在本 ADR 落地**（ADR-02 SVG 对未映射自定义 property 只能 warn+skip）。

### 降级（Canvas 能力 = full）

- 无 `time` → 静态 base；runtime 的 `{animate:false}` / reduced-motion（ADR-04）= 不起 rAF、只 drawScene 一帧 base。
- warn+skip 仅限：未注册自定义 property、`pathDraw` 挂无描边、未注册自定义 easing。

理由：

1. **即时模式的唯一正解**——逐帧求值；`drawScene` 加可选 `time` 是最小 additive 改动，静态路径零回归。
2. **共享引擎防漂移**——`evaluateTrack` 一份喂 Canvas / SVG 截帧 / WAAPI fallback。
3. **Canvas 兑现自定义 property 口**——JS 插值天然，补齐 ADR-01 预留的扩展接口（SVG 端做不到的部分在此补上）。

## 不在本 ADR 范围

- **rAF 时钟循环 / trigger 落地 / reduced-motion / `{at:t}` 截帧入口**：runtime ADR-04（vanilla / react）。
- **SVG 播放**：ADR-02。
- **sugar 动词**：react + 共享 parser，后续。
- **数据过渡 / morph**：runtime + Tier 2。


> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / 改动 / 测试象限 / 依赖现有元素）见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 08deaa80:notes/decisions/core/v0/v0.3/v0.3-alpha.5/03-canvas-playback.md`（封板全文）。
