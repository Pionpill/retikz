# ADR-01：时间轴动画 IR 契约——`AnimationTrack` 声明式进 IR，沿 meta/id-stamp 通路透传进 Scene，renderer 播放、可降级

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[v0.3-alpha.5 roadmap](./roadmap.md) · **范式先例**：[v0.3-alpha.4 ADR-08 meta](../v0.3-alpha.4/08-meta-provenance.md)（「IR 元素携带可选数组 → compile 沿 id-stamp 同款落点透传进 `ScenePrimitive`」完全同构）· [v0.3-alpha.3 水合](../v0.3-alpha.3/01-hydration.md)（runtime rAF / 事件基建，播放控制复用）· 参照：[core-design.md §4.4 JSON 可序列化 / §7 AI 友好](../../../../architecture/core-design.md)

## 背景

动画是「时间 → 属性插值」的**纯数据**，与水合的「事件 → handler 函数」正交：声明式动画可序列化、SSR 能纯 CSS 自播、AI 可声明，故**进 IR 持久化**；播放控制 / 回调函数留 runtime（与水合同源，函数不进 IR）。

本 ADR 只定 **core 侧的 IR 契约 + 编译期透传 + 降级语义**。renderer 实际播放（SVG WAAPI/CSS、Canvas rAF）、sugar 动词（`fadeIn` 等）、静态截帧 `{at:t}` 求值都是后续阶段 / 其它包，不在此。

**关键先例（决定本 ADR 几乎是 ADR-08 meta 的结构性复用）**：meta 已建好「IR 元素加可选字段 → compile 沿 `id`-stamp 同款落点（纯几何 Node 平铺图元 / 文本·rotate Node 的 GroupPrim / Path 的 PathPrim / Scope 的 GroupPrim）透传进 `ScenePrimitive`」的通路。`animations` 就是沿同一通路再加一个**数组**字段——载体相同、stamp 落点相同、renderer-agnostic 相同。区别仅在：meta 是不透明 provenance（renderer 忽略），animations 是 renderer **要消费**的播放数据（能播则播、不能播则降级）。

## 决策：`AnimationTrack[]` 进元素 + scene 根，compile 透传进 Scene，静止-终态不变量 + 能力 warn 降级

### 静止-终态不变量（degradation 的地基）

**keyframe value 是播放时该属性的绝对展示值（不是相对 base 的 delta / overlay）；元素 base = compile 已产出的静态属性值；renderer 不播时渲染 base。** 配套作者约定：

- **intro 动画令末帧（`at:1`）= base**，于是「动画终态 = base = 静态图」、降级后见**完整最终图**（`fadeIn` = `opacity 0→1`，末帧 `1` = 元素 base opacity；`drawOn` = `pathDraw 0→1`，末帧全画出 = base）。绝不把降级态画成 t=0 那个可能 `opacity:0` 全透明的起点。
- **循环 / 无终态 track**（`spin` `rotate 0→360`、`pulse`）末帧不必等于 base——它们本就回到起点 / 无「终态」语义；base = track 之外该属性的静止值，降级 = 渲染静止值。
- **viewBox（镜头）**：scene 静态 `layout` = 静止取景（IR 显式 viewBox 或自动 AABB）；camera track 末帧应等于它（作者约定，core 不强制、不回写）。
- 三事一路：**不支持动画的后端 / `prefers-reduced-motion` / 静态截帧 `{at: settled}`** 走同一条「渲染 base、跳过 tracks」路径。
- 推论：**`compileToScene` 产出的 Scene 本身就是 base 静态图**（compile 不解释 tracks、不插值、不施加任何关键帧）；tracks 只是挂在图元上的播放数据。layout / bbox / viewBox 按静止态算，动画可瞬态溢出（不影响 bbox）。

### 降级契约（**本 ADR 只定契约；warn / `{animate:false}` / 实际播放由后续 renderer ADR 落地，本批 core 不实现 renderer**）

本批 core 的可验证职责只有一条——**保证 Scene 自身就是 base 静态图**（compile 不插值），这样任何「不播」路径都有现成的完整图可渲染。renderer 侧未来须遵守的契约（写在此供后续 render ADR 落地）：

- renderer 声明动画能力（**all-or-nothing per-renderer**：能播全时间轴 / 完全不能；per-property 能力表留接口位，未来 WebGL 可能「transform 行、pathDraw 不行」）。
- 不支持（PDF 等）或 `{ animate:false }` / `prefers-reduced-motion` → **`warn`（可诊断、不静默，沿用 canvas 范式）+ 渲染 base 静态图**，**绝不 throw、绝不丢图**。
- **IR / Scene 永远 renderer 无关、永远带完整 tracks**；`compileToScene` 不知道目标后端、不剥 tracks。降级只发生在各 renderer 消费端。

### IR 侧

```ts
// packages/core/core/src/ir/animation.ts（新建）

/** 内置可动画属性通道（renderer 无关；DrawWay 风格，裸字面量第一形态）。property 字段开放（见下），这里只是内置集 + 自动补全锚 */
export const AnimationProperty = {
  Opacity: 'opacity', Fill: 'fill', Stroke: 'stroke', StrokeWidth: 'strokeWidth',
  TranslateX: 'translateX', TranslateY: 'translateY', Rotate: 'rotate',
  Scale: 'scale',         // 均匀缩放
  ScaleX: 'scaleX', ScaleY: 'scaleY',  // 非均匀缩放（柱状图从基线长出等）；支点见 track.origin
  PathDraw: 'pathDraw',   // 0..1 路径画出进度（SVG→pathLength+dashoffset、Canvas→几何 lerp）
  ViewBox: 'viewBox',     // 镜头：仅 scene 根级，value 为 [x,y,w,h]
} as const;
export type BuiltinAnimationProperty = ValueOf<typeof AnimationProperty>;
/** 属性名：内置 ∪ 任意自定义字符串（`& {}` 保内置自动补全，同 NodeShape 范式）；自定义属性由后续 renderer 注册插值器解释 */
export type AnimationPropertyRef = BuiltinAnimationProperty | (string & {});

/** 缓动具名预设（CSS 同名）；easing 字段 = 具名 ∪ cubic-bezier 四元组 ∪ 自定义注册名（开放） */
export const AnimationEasing = { Linear:'linear', Ease:'ease', EaseIn:'ease-in', EaseOut:'ease-out', EaseInOut:'ease-in-out' } as const;

/** 重复方向 / 填充模式（抄 WAAPI / CSS，闭合枚举、不扩展） */
export const AnimationDirection = { Normal:'normal', Reverse:'reverse', Alternate:'alternate', AlternateReverse:'alternate-reverse' } as const;
export const AnimationFill = { None:'none', Forwards:'forwards', Backwards:'backwards', Both:'both' } as const;

// EasingSchema = z.union([ z.string().min(1), z.tuple([num,num,num,num]) ])  // 具名/自定义名 ∪ cubic-bezier
// KeyframeSchema = { at: 0..1, value: JsonValue, easing? }   // value 基础类型 = 任意 JSON（兑现自定义通道）；内置 property 由下方 superRefine 收窄
// TriggerSchema = z.union([ z.enum(['load','visible','manual']), z.object({ onEvent: z.string().min(1) }) ])
//   load=渲染即播(SSR 友好) / visible=runtime IntersectionObserver / manual=runtime API / {onEvent}=桥水合；回调函数绝不进 IR
// AnimationTrackSchema = {
//   property: z.string().min(1),            // 开放（内置 ∪ 自定义）；类型 AnimationPropertyRef
//   keyframes: Keyframe[]（min 1；at ∈[0,1] 且升序，.refine 校验）,
//   duration: number（>0，毫秒）,
//   delay?: number（≥0，毫秒；group stagger 由后续 sugar 编译成 per-track delay）,
//   easing?: 具名 | cubic-bezier 四元组 | 自定义名（缺省 linear；逐关键帧 easing 优先）,
//   iterations?: number（>0，可小数）| 'infinite'（**总**播放次数，抄 WAAPI iterations；缺省 1 = 播一次）,
//   direction?: AnimationDirection（缺省 normal）,
//   fill?: AnimationFill（缺省 forwards——停在末帧，配合 settled 不变量）,
//   trigger?: Trigger（缺省 load）,
//   origin?: 命名 anchor（复用 node 词汇 center/north/.../south-west）| [x,y] 局部点
//            —— transform 支点（scale/scaleX/scaleY/rotate 用），缺省几何中心；非 transform 通道忽略,
// }
// + .superRefine 校验 property↔value 类型（仅**内置** property）：
//     viewBox → value 必须 number[] 且 length 4；fill/stroke → string；
//     其余内置数值通道（opacity/scale/scaleX/scaleY/rotate/translateX|Y/strokeWidth/pathDraw）→ finite number；
//     **自定义 property（非内置名）→ value 任意 JSON（含对象 / 嵌套，base = JsonValueSchema），由 renderer 注册的插值器解释**。
// IRAnimationTrack = z.infer<typeof AnimationTrackSchema>
```

- **载体（与 meta 一致）**：`Node` / `Path` / `Scope` 各加 `animations?: Array<AnimationTrack>`；`Coordinate` 不加（产 0 图元）。
- **镜头**：`SceneSchema` 根加 `animations?`（`viewBox` property 挂这里）。
- **校验分两层**：① **zod**（`AnimationTrackSchema.superRefine`，上下文无关）管 property↔value 类型 + keyframes 升序 + duration>0 + iterations>0——不符即 parse reject。② **compile**（上下文相关，schema 分不清元素 vs 根）管 **viewBox ⇔ 根**：元素级 track 带 `viewBox` / 根级 track 带非 `viewBox` → `warn`（code `ANIMATION_INVALID_PROPERTY`，可诊断）+ **drop 该 track**（不丢图、不影响其余 track），与「可诊断降级、不静默」一致。
- **不进 every-X 默认 / 不跨 scope 继承**：与 meta 同——从 `NodeDefaultSchema` / `PathDefaultSchema` 的 `.omit()` 排除；scope 的 `animations` 落 scope 自己的 GroupPrim、不下传子元素。
- **100% JSON 可序列化、无函数**：回调（onComplete / onEvent 的 handler）绝不进 IR，留 runtime（`trigger.onEvent` 只存事件名字符串）。

### Scene 侧（沿 meta/id-stamp 同款通路）

5 个 `ScenePrimitive` 成员各加 `animations?: Array<IRAnimationTrack>`（与既有 `id?` / `meta?` 并列）；`Scene` 顶层加 `animations?`（镜头）。compile 在既有「stamp `id` / `meta`」处紧贴着多 stamp `animations`：

| 载体 | `id` / `meta` 落点 | `animations` 落点（同点） |
|---|---|---|
| 纯几何 Node | 每个平铺 shape 图元 | 同（多 shape 各一份；transform/opacity 复制后视觉等价于动 group） |
| 文本 / rotate Node | 单层 GroupPrim | 同 GroupPrim |
| Path | PathPrim | 同 PathPrim |
| Scope | GroupPrim | 同 GroupPrim |
| scene 根（镜头） | —（id/meta 无根级） | `Scene.animations`（viewBox property） |

compile 不解释 tracks、不施加关键帧——产出的 Scene 即 settled 静态图 + 挂着的播放数据。**纯透传，零新增遍历**（在 meta stamp 旁加一行）。

理由：

1. **结构性复用 ADR-08 meta 通路**——同载体、同 stamp 落点、同 renderer-agnostic；实现面 = meta 旁加一个数组字段 + 一个 IR schema 文件。
2. **降级优雅**——settled 不变量让「不能播」= 渲染 base = 完整图，三事一路；能力 warn 沿用既有范式。
3. **守 JSON 铁律 + AI 友好**——track 全 JSON、无函数；property/easing/direction 用 `as const` 派生，裸字面量第一形态。
4. **layout 中立**——compile 不动 layout，动画瞬态溢出不影响 bbox / viewBox。

## 本批形态（IR JSON；authoring DSL 留后续）

本批只定 **IR 契约**——下面是 IR 节点上的 `animations` 形态（手写 IR / AI 生成 / Tier 2 lowering 直接产出）。`<Node animations>` / `<Layout animations>` 这类 **react / vanilla authoring prop 是后续 ADR**（react `NodeProps` / `LayoutProps`、vanilla `FigureConfig` 都要各自加字段，非 core schema 自动暴露），`fadeIn` 等 sugar 动词同属后续。

```jsonc
// 元素级（fadeIn + scaleIn 组合；末帧 = base，降级见完整图）
{ "type": "node", "id": "a", "position": [0, 0], "fill": "tomato", "animations": [
  { "property": "opacity", "keyframes": [{ "at": 0, "value": 0 }, { "at": 1, "value": 1 }], "duration": 400, "trigger": "load" },
  { "property": "scale",   "keyframes": [{ "at": 0, "value": 0.6 }, { "at": 1, "value": 1 }], "duration": 400, "easing": "ease-out" }
] }
// 循环 spin（无终态，base = 静止 rotate 值）
{ "type": "node", "id": "loader", "shape": "arc", "animations": [
  { "property": "rotate", "keyframes": [{ "at": 0, "value": 0 }, { "at": 1, "value": 360 }], "duration": 1000, "iterations": "infinite", "easing": "linear" }
] }
// 柱子从基线长出（scaleY 0→1，支点底边中点；末帧 1 = base）
{ "type": "node", "id": "bar", "shape": "rectangle", "animations": [
  { "property": "scaleY", "keyframes": [{ "at": 0, "value": 0 }, { "at": 1, "value": 1 }], "duration": 500, "origin": "south", "easing": "ease-out" }
] }
// 镜头 cameraTo（scene 根，viewBox property）
{ "version": 1, "type": "scene", "animations": [
  { "property": "viewBox", "keyframes": [{ "at": 0, "value": [0,0,200,200] }, { "at": 1, "value": [40,40,80,80] }], "duration": 800, "easing": "ease-in-out" }
], "children": [ /* … */ ] }
```

## 自定义动画接口（留扩展位，本批只开 IR 口）

与 shape / arrow / pattern / pathGenerator 同哲学——**core 不写死动画能力集，允许用户注册自定义**：

- **属性通道开放**：`property` 是开放字符串（内置 ∪ 任意名），类型 `AnimationPropertyRef = BuiltinAnimationProperty | (string & {})`。内置通道走 zod 强校验 value 类型；**自定义通道 value 宽松（任意 JSON），由 renderer 侧注册的插值器解释**——core IR 不拦、原样透传进 Scene。
- **缓动开放**：`easing` 接受具名预设 / cubic-bezier 四元组 / **自定义注册名**（如 spring）；core 只存字符串，曲线求值在 render（播放期）。
- **预留 render-side 注册接口（本批不实现，接口形状写在此供后续 render ADR 落地）**：
  ```ts
  // 后续 @retikz/render 侧（非 core）：
  // type AnimationPropertyDefinition = { interpolate(from, to, t): value; applySvg/applyCanvas(...) }
  // RenderOptions.animationProperties?: Record<string, AnimationPropertyDefinition>
  // RenderOptions.easings?: Record<string, (t:number)=>number>
  ```
  —— 与 `CompileOptions.shapes` / `arrows` / `patterns` 注册表对称：未注册的自定义 property/easing → renderer `warn`（可诊断）+ 该 track 降级到 base，不丢图。
- **core 本批的「口」**：①`property` / `easing` 开放字符串不拒未知名；② 自定义 property 的 value 不做内置类型校验；③ 自定义 track 原样进 `ScenePrimitive.animations`。够让用户/Tier 2 现在就写自定义动画进 IR，渲染能力随后续 render 注册接口补齐。

## 不在本 ADR 范围

- **renderer 播放**：SVG WAAPI/CSS（`trigger:'load'` emit `@keyframes` 零 JS）、Canvas `drawScene(…,{time})` + rAF、多 track 共享时钟编排——render 包后续 ADR。
- **sugar 动词**：`fadeIn` / `scaleIn` / `slideIn` / `drawOn` / `pulse` / `spin` / `loop` / `cameraTo` 别名 + group `stagger` 糖——`@retikz/react` + 共享 parser 后续 ADR（配 Sugar=Kernel 等价性测试）。
- **静态截帧 `{at:t}` 求值**：按时刻插值出一帧——render / runtime。
- **`prefers-reduced-motion` 判断**：runtime；core / render 只留 `{animate:false}` 入参走 settled。
- **along-path 运动（`moveAlong`）/ clip 动画（`wipeIn`）**：需路径采样 / clip 关键帧几何，另案 ADR。
- **数据过渡 / 形变（enter/update/exit + `pathMorph`）**：runtime + Tier 2（plot），core 不背（[v0.3 roadmap §动画 B](../roadmap.md)）。
- **per-property 能力表**：本批 all-or-nothing per-renderer，能力表接口留位。


> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / 改动 / 测试象限 / 依赖现有元素）见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 08deaa80:notes/decisions/core/v0/v0.3/v0.3-alpha.5/01-timeline-animation-ir.md`（封板全文）。
