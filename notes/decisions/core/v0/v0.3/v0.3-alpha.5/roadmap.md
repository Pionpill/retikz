# v0.3-alpha.5 实施待办：时间轴动画（声明式进 IR，renderer 播放，可降级）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`v0.3 roadmap §动画`](../roadmap.md)（A 时间轴动画转正本里程碑）· 前置复用：[`v0.3-alpha.3 水合`](../v0.3-alpha.3/01-hydration.md)（rAF / 事件绑定 runtime 基建）· [`v0.3-alpha.4 ADR-08 meta`](../v0.3-alpha.4/08-meta-provenance.md)（同款「IR 携带 → compile 沿 id-stamp 通路进 Scene」范式）

## 目标

让固定元素**按时间打关键帧**——入场（fadeIn / scaleIn / slideIn / drawOn）、循环（pulse / spin）、镜头（cameraTo 动 viewBox）。动画是「时间 → 属性插值」的**纯数据、声明式进 IR 持久化**（可序列化、SSR 可纯 CSS 自播、AI 可声明）；**播放控制 / 事件触发留 runtime**（与水合同源，函数不进 IR）。

数据模型抄 **WAAPI**（keyframes + timing options），多端范式抄 **Lottie**（一份描述、多后端各自播），高层词汇抄 **Manim / Framer / Tailwind**，时间轴词汇参照 **TikZ `animate`**——但**不绑 SMIL**（Canvas 上不存在，IR 保持 renderer 无关）。

## 已定设计（2026-06-07 讨论拍板）

1. **静止-终态不变量**：元素 base 属性 = 动画结束后的稳定态；动画是叠加在其上、随时间的偏移。intro 动画从瞬态起点 →base（如 fadeIn = `opacity 0→1`，`1` 即 base）。「忽略动画」= 渲染 base = **看到完整最终图**（不是 t=0 那个可能全透明的起点）。
2. **降级 = 三事一路**：不支持动画的后端 / `prefers-reduced-motion` / 静态截帧 `{at: settled}` 走**同一条**「渲染 base、跳过 tracks」路径。
3. **能力声明 + 可诊断降级**：renderer 声明动画能力；不支持 → **`warn`（沿用 canvas「可诊断降级、不静默」）+ 退化到 base**，绝不 throw、绝不丢图。本批先 **all-or-nothing per-renderer**，per-property 能力表留接口位。
4. **IR / Scene 永远 renderer 无关、永远带完整动画数据**；降级只在各 renderer 消费端，`compileToScene` 不剥 tracks。
5. **`prefers-reduced-motion` 不进 core schema**；core / render 留 `{ animate: false }` 入参走 settled 路径，偏好判断在 runtime。
6. **编排**：core 本批只有 **per-track `delay`**（+ 全局共享时钟语义）；**group 级 `stagger` 是后续 sugar**（编译成 per-track delay，不进 core 本批），完整 timeline/sequence DSL 不做。
7. **数据过渡 / 形变（enter/update/exit + morph）不进 core** → runtime + Tier 2（[`v0.3 roadmap §动画 B`](../roadmap.md)）；`pathMorph` 算法在 plot 包，core 只认 track 类型。

## 动画清单（推荐系数 ★1–5；本批只实现 core IR 通道，sugar 动词别名 + renderer 播放属后续阶段）

| 动画 | 家族 | 底层 core 通道（property） | 推荐 | 本批 core IR |
|---|---|---|---|---|
| `fadeIn` / `fadeOut`† | 入场/退场 | `opacity` | ★★★★★ | ✅ 就绪 |
| `drawOn` | 入场 | `pathDraw`（0..1 进度） | ★★★★★ | ✅ 就绪 |
| `scaleIn` / `grow` | 入场 | `scale`（均匀） | ★★★★ | ✅ 就绪 |
| `growUp` / 柱子从基线长出 | 入场 | `scaleX` / `scaleY`（非均匀）+ `origin` 支点 | ★★★★ | ✅ 就绪 |
| `slideIn` | 入场 | `translateX` / `translateY` | ★★★★ | ✅ 就绪 |
| `cameraTo` / zoom·pan | 镜头 | `viewBox`（scene 根级） | ★★★★ | ✅ 就绪 |
| `pulse` | 循环 | `scale` / `opacity` + `iterations` | ★★★ | ✅ 就绪 |
| `spin` | 循环 | `rotate` + `iterations` | ★★★ | ✅ 就绪 |
| `loop`（通用循环包装） | 循环 | 任意 + `iterations:'infinite'` + `direction` | ★★★ | ✅ 就绪 |
| `colorShift`（描边/填充变色）| 强调 | `fill` / `stroke`（oklch 插值） | ★★★ | ✅ 就绪 |
| `wipeIn` / reveal | 入场 | clip 动画（需 clip 关键帧） | ★★ | ⬜ 未实现（本批） |
| `flash` / `blink` | 强调 | `opacity` + repeat（预设） | ★★ | ✅ preset（flash 闪 N 次 / blink 无限） |
| `wiggle` | 强调 | `rotate` 抖动预设 | ★★ | ✅ preset |
| `moveAlong`（沿路径运动） | 运动 | along-path 派生位置（需路径采样几何） | ★★★★ | ⬜ 未实现（几何待 ADR） |
| `morph`（数据过渡/形变） | 数据 | `pathMorph`（重采样插值） | ★★★★★ | ⛔ 不进 core（runtime + Tier 2） |

> † `fadeOut` 等退场只在「元素消失」时有意义，依赖数据过渡（enter/update/exit），归 runtime + Tier 2；core 本批只做不依赖消失语义的 intro/loop/camera。
> **「✅ 就绪」= core 的 `AnimationTrack` 通道本批可表达该动画**（手写 raw track / IR / AI 可直接产出）；其 **sugar 动词别名**（`fadeIn` 等命名，react + 共享 parser）与 **renderer 播放**（SVG WAAPI/CSS、Canvas rAF）是本里程碑后续阶段，不在「只 core」本批。

## 动画配方（raw `AnimationTrack` 模板）

> 把上表 ✅ 动画落成**确切的 raw track 模板**——core IR 本批已就绪，下面这些**今天即可手写 / AI / Tier 2 直接产出**（零新代码）。同时这是日后 **sugar 动词的规格底稿**：`fadeIn(opts)` 等只是按下表填模板 + 套默认（产出的 IR 必须**逐字段等于**手写下表，配 Sugar=Kernel 等价测试）。`opts` 默认值即「默认 timing」列；可调项即「参数」列。
>
> **末帧约定（settled 不变量）**：intro 系列末帧（`at:1`）= 元素 base ⇒ 降级见完整图；loop 系列无终态（base = track 外静止值）。挂点：元素动画进 `node/path/scope.animations[]`，`cameraTo` 进 `scene.animations[]`（根级）。多动画 = 同元素挂多 track（如 fadeIn + scaleIn 组合）。

| 动画 | track 核心字段（property + keyframes） | 默认 timing | 参数（默认） |
|---|---|---|---|
| `fadeIn` | `opacity`: `[{0,0},{1,1}]` | duration 400, ease-out | duration, delay, easing |
| `drawOn` | `pathDraw`: `[{0,0},{1,1}]` | duration 600, ease-in-out | duration, delay, easing |
| `scaleIn` | `scale`: `[{0, from},{1,1}]` + `origin` | duration 400, ease-out | from(0.8), duration, delay, easing, origin('center') |
| `grow` | = `scaleIn` 的 `from:0` 别名 | 同 scaleIn | 同 scaleIn（from 锁 0） |
| `growUp` | `scaleY`: `[{0,0},{1,1}]` + `origin:'south'` | duration 500, ease-out | duration, delay, easing, origin('south') |
| `slideIn` | `translateX`\|`translateY`: `[{0, offset},{1,0}]` | duration 400, ease-out | axis(x), offset(-20), duration, delay, easing |
| `colorShift` | `fill`\|`stroke`: `[{0, fromColor},{1, toColor}]` | duration 400, ease-in-out | channel(fill), fromColor(base), toColor*, duration, easing |
| `cameraTo` | (scene 根) `viewBox`: `[{0, from},{1, to}]` | duration 800, ease-in-out | from(当前 layout), to*, duration, easing |
| `pulse` | `scale`: `[{0,1},{0.5, peak},{1,1}]`, `iterations:'infinite'` | duration 1000, ease-in-out | peak(1.1), duration, iterations, origin |
| `spin` | `rotate`: `[{0,0},{1,360}]`, `iterations:'infinite'`, `easing:'linear'` | duration 1000 | duration, iterations, direction, origin |
| `loop` | 包装任意上表 track：补 `iterations:'infinite'`（+按需 `direction:'alternate'`） | 继承被包 track | 被包 track + iterations, direction |

> `*` = 必填无默认（`cameraTo.from`+`to` / `colorShift.from`+`to`——纯工厂取不到当前 layout / base 色，两端均须显式）。`from`/`offset`/`peak` 等是「起点偏移」，intro 系列**起点偏移、终点=base**（`scaleIn.from<1→1`、`slideIn.offset→0`）。`pulse` 对称关键帧（1→peak→1）、`spin` 整圈回原点，故无须末帧=base。
>
> **具体例子**见 [ADR-01 §本批形态](./01-timeline-animation-ir.md)（fadeIn+scaleIn 组合 / spin / growUp / cameraTo 的完整 IR JSON）。

## 本批（core only）范围

**做**：`AnimationTrack` IR schema（renderer 无关 property —— 内置集 + **开放字符串可扩展**；easing 具名 ∪ bezier ∪ 自定义名；property↔value zod 校验 + viewBox⇔根 compile 校验）+ 元素 `animations?`（Node / Path / Scope）+ scene 根 `animations?`（镜头）+ 编译期沿 id/meta-stamp 同款通路透传进 `ScenePrimitive.animations?` / `Scene.animations?` + 静止-终态语义（layout / viewBox 按静止态算，compile 不解释 tracks）。**留自定义动画扩展口**：property/easing 开放、自定义 value 宽松透传，render-side 插值器注册接口形状在 ADR 写明、留后续落地。

**不做（后续阶段 / 其它包）**：sugar 动词（`fadeIn` 等，`@retikz/react` + 共享 parser）；renderer 播放（`@retikz/render` SVG WAAPI/CSS + Canvas `drawScene(…, {time})` + rAF）；静态截帧 `{at:t}` 求值（render/runtime）；`prefers-reduced-motion` runtime 判断；along-path 几何、clip 动画、数据过渡 morph。

## ADR 清单

| ADR | 主题 | 内容 | 状态 |
|---|---|---|---|
| [01](./01-timeline-animation-ir.md) | 时间轴动画 IR 契约（core） | `AnimationTrack` schema（keyframes 归一化时间 + duration/delay/easing/iterations/direction/fill/trigger）；renderer 无关 `AnimationProperty`（开放可扩展）；元素 + scene 根 `animations?`；静止-终态不变量 + 降级契约（能力声明 + warn + settled）；编译期透传进 Scene（沿 meta/id-stamp 通路）+ viewBox⇔根 校验 | Accepted |
| [02](./02-svg-playback.md) | SVG 动画播放（render/svg） | 按 `trigger` 分流：`load`→纯 CSS `@keyframes`（SSR 零 JS 自播）、交互→WAAPI 描述（runtime 应用）；property→SVG 映射；camera 用 group transform；oklch CSS 预采样；`{animate:false}` 降级；`RenderOptions.easings` 自定义 | Accepted |
| [03](./03-canvas-playback.md) | Canvas 动画播放（render/canvas） | `drawScene(…,{time})` 逐帧 + 共享 `evaluateTrack` 插值引擎（含 pathDraw 部分路径、oklch 真 lerp）；**自定义 property 的 JS 插值器注册表**（`RenderOptions.animationProperties`，兑现 ADR-01 口） | Accepted |
| [04](./04-runtime-control.md) | runtime 播放控制（vanilla / react） | rAF 时钟（共享时钟）+ `trigger` 落地（IntersectionObserver / API / 事件桥水合）；`{animate:false}` + `prefers-reduced-motion`；静态截帧 `{at:t}`（复用 `evaluateTrack`） | Accepted（react canvas rAF / SVG `{at:t}` / 命令式动画句柄 `<Layout animationRef>` 均已补） |

| [05](./05-animation-presets.md) | 具名动画 sugar（core preset + react/vanilla re-export） | 11 个 preset 工厂（`fadeIn` / `drawOn` / `scaleIn` / `grow` / `growUp` / `slideIn` / `colorShift` / `cameraTo` / `pulse` / `spin` / `loop`）+ `stagger` helper，产 `AnimationTrack`、按配方表实装；`<Layout animations>` prop（cameraTo 镜头）；Sugar=Kernel 等价测试 | Accepted |
| [06](./06-hydration-context.md) | 水合 handler runtime 上下文（render/vanilla/react） | handler 升 `(event, ctx)`：ctx 带 id / meta(provenance) / 几何 / DOM element / scenePoint / 动画控制 / scene（LangChain config 式单 runtime，只增不破）；回调读 meta + 命令式触发动画；renderer 无关（canvas element=null；动画 per-id 双后端均已补：svg getAnimations、canvas 虚拟时钟登记表） | Accepted |

> along-path / clip / morph 各自后续 ADR，本里程碑随阶段补。

## 后续待办（核心交付已闭环；里程碑尾巴 + 预设已补，余为后续 ADR / 不进 core）

> 状态记于 2026-06-07：ADR-01～06 全 Accepted 且已实装（IR → SVG/Canvas/runtime 播放 → presets → 水合 context → 文档），核心闭环。各 ADR 标注的「里程碑尾巴」与强调预设**已全部补齐**；下表只剩需另起 ADR / 明确不进 core 的项。

**已补（原尾巴，2026-06-07）**：SVG `{at:t}` 静态截帧（`<Layout at>` / `renderToSvgString({at})` / canvas 单帧）· canvas per-id 动画控制（虚拟时钟登记表 `IdClockRegistry` + `resolvePrimAnimation`）· react 命令式动画句柄（`<Layout animationRef>`）· 强调预设 `flash` / `blink` / `wiggle`。

| 项 | 类型 | 出处 | 说明 |
|---|---|---|---|
| `wipeIn` / reveal | 后续 ADR | 动画清单 | clip 关键帧动画（需 clip 通道动画化） |
| `moveAlong` / along-path | 后续 ADR | 动画清单 | 沿路径运动，需路径采样几何 |
| `morph`（数据过渡 / 形变） | 不进 core | 动画清单 | Tier 2 / runtime（`pathMorph` 重采样在 plot 包） |

## 贯穿原则

- **IR 自描述铁律**：track 字段全 `.describe(...)`（英文）；`AnimationTrack` 100% JSON 可序列化（值为数/字符串/颜色串，**无函数**——回调留 runtime）。
- **AI 友好**（core-design §7）：property / easing / trigger 用 `as const` 对象 + 派生类型（`DrawWay` 风格，裸字面量第一形态）。
- **layout 中立**：动画可瞬态溢出 viewBox，但 **layout / bbox / viewBox 按静止态算**（否则布局不可定）。
- **非破坏**：`animations` 全可选；省略时 IR / Scene 逐字段等价现状。
