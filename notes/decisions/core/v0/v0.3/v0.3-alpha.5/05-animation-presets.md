# ADR-05：具名动画 sugar——`fadeIn` / `spin` / `growUp` … preset 工厂（产 `AnimationTrack`，Sugar=Kernel 等价）

- 状态：Proposed
- 决策日期：2026-06-07
- 关联：[v0.3-alpha.5 roadmap](./roadmap.md)（§动画配方表是本 ADR 的规格单一真源）· **前置**：[ADR-01 IR 契约](./01-timeline-animation-ir.md)（`AnimationTrack` 原语 + settled 不变量）· [ADR-02 SVG](./02-svg-playback.md) / [ADR-03 Canvas](./03-canvas-playback.md) / [ADR-04 runtime](./04-runtime-control.md)（播放，已 Accepted）· **规则**：[AGENTS.md §抽象分层](../../../../../AGENTS.md)（Sugar=Kernel 等价性硬规则）

## 背景

ADR-01 定了 `AnimationTrack` 原语，02/03/04 让它在 SVG/Canvas/runtime 真能播。但用户现在要写动画仍得手敲 raw track（`{ property:'opacity', keyframes:[{at:0,value:0},{at:1,value:1}], duration:400 }`）——冗长、易错、不可读。roadmap §动画配方表已把 11 个常用动画落成确切 raw track 模板；本 ADR 把这些模板**实装成具名工厂函数**（`fadeIn()` / `spin()` / `growUp()` …），让用户写 `animations={[fadeIn(), scaleIn()]}`。

**这是 Sugar**（[AGENTS.md 判定](../../../../../AGENTS.md)）：可逆（`fadeIn()` 展开成 opacity 0→1 track，删名仍能 1:1 反推）、无决策算法、无结构参数。故遵守 **Sugar=Kernel 等价性硬规则**：preset 产出的 IR 必须**逐字段等于**手写 track，每个 preset 配一条等价性测试。preset **不引入任何新能力**——只是 raw track 的便捷构造，降级 / 播放全走 02/03/04 既有通路。

## 决策：纯 factory 函数（非组件），落 core、react/vanilla re-export

### 形态：函数而非组件

preset 是**纯函数** `fadeIn(opts?) → IRAnimationTrack`，用于填 `animations` 数组：

```tsx
<Node animations={[fadeIn(), scaleIn({ from: 0.6 })]} />     // react
node('a').animations([fadeIn(), spin()])                      // vanilla builder（如支持）
{ type:'node', animations:[fadeIn()] }                        // 直接 IR（fadeIn() 求值进 JSON）
```

不做组件 / JSX（动画是挂在元素上的数据数组，不是子树）；函数组合进数组最自然，且天然 framework-agnostic。

### 归属：pure preset 落 **core**（`packages/core/core/src/presets/animation.ts`），react + vanilla re-export

- preset 是**纯数据构造**（无 React、无 DOM、无新依赖），且 react / vanilla **两个 runtime 都要用**。落 core 单一真源、两 adapter 各 `export { fadeIn, ... } from '@retikz/core'` re-export，避免重复实现。
- 符合 AGENTS.md「Sugar 共享 pure 部分」的精神（该规则原文指 `core/src/parsers/`，但 preset 是**构造器**不是**解析器**，故新开 `core/src/presets/` 目录、不混进 parsers）。
- core 运行时依赖仍只 zod（preset 零依赖、纯对象字面量），不破坏 core 底座约束。
- **备选（已否决）**：① 在 react + vanilla 各写一份 → 违 DRY、漂移风险；② 落 `core/parsers/` → 命名误导（非解析）。

> ⚠️ **待评审确认点**：preset 落 core 是否可接受（core = kernel，加 authoring sugar 略微扩边界）？若倾向 core 保持极简，备选是落各 adapter 或新建极小共享包——请评审定夺。

### preset 清单与签名（规格 = roadmap §动画配方表，单一真源）

公共 options：`type AnimationPresetOptions = { duration?: number; delay?: number; easing?: EasingName | CubicBezier; trigger?: AnimationTrigger | { onEvent: string } }`。各 preset 在此基础上加专有项；**默认值 = 配方表「默认 timing」列**：

| preset | 签名 | 产出 track（核心） | 默认 |
|---|---|---|---|
| `fadeIn` | `(opts?) ` | `opacity` `[0→1]` | duration 400, ease-out |
| `drawOn` | `(opts?)` | `pathDraw` `[0→1]` | duration 600, ease-in-out |
| `scaleIn` | `(opts?: {from?; origin?} & base)` | `scale` `[from→1]` + origin | from 0.8, ease-out, duration 400 |
| `grow` | `(opts?)` | = `scaleIn({ from: 0, ...opts })` | from 0 |
| `growUp` | `(opts?: {origin?} & base)` | `scaleY` `[0→1]`, origin | origin 'south', duration 500, ease-out |
| `slideIn` | `(opts?: {axis?:'x'|'y'; offset?} & base)` | `translateX\|Y` `[offset→0]` | axis 'x', offset −20, ease-out, duration 400 |
| `colorShift` | `(opts: {to; from?; channel?:'fill'\|'stroke'} & base)` | `fill\|stroke` `[from→to]` | channel 'fill', ease-in-out, duration 400 |
| `cameraTo` | `(opts: {from; to} & base)` | `viewBox` `[from→to]`（scene 根） | duration 800, ease-in-out |
| `pulse` | `(opts?: {peak?; origin?} & base)` | `scale` `[1→peak→1]`, iterations ∞ | peak 1.1, duration 1000, ease-in-out |
| `spin` | `(opts?: {origin?} & base)` | `rotate` `[0→360]`, iterations ∞, linear | duration 1000 |
| `loop` | `(track, opts?: {iterations?; direction?})` | 包装：`{...track, iterations:'infinite', direction?}` | iterations ∞ |

补充约定：
- **必填无默认**：`colorShift.to`、`cameraTo.from` / `cameraTo.to`（factory 纯函数拿不到「当前 layout」，故 `cameraTo` 两端都须显式；不像配方表写「from 默认当前 layout」——那是后续 `<Layout>` 层若注入才可能，本 ADR 先要求显式，见下）。
- intro 系列**末帧 = base**（settled 不变量）：`fadeIn` 末帧 opacity 1、`scaleIn` 末帧 scale 1、`growUp` 末帧 scaleY 1——降级即见完整图。`pulse`/`spin` 用 `alternate`/整圈，无须末帧=base。
- `easing` 缺省由各 preset 给（非全局 linear），与配方表一致。

### `cameraTo` 的挂载点：`<Layout animations>` 新 prop + vanilla 根 animations

`cameraTo` 产 `viewBox` track，属 **scene 根镜头**（ADR-01：viewBox 只在根合法）。需让用户把它挂到根：

- **react**：`<Layout>` 加 `animations?: Array<IRAnimationTrack>` prop（注入构造出的 IR 根 `animations`）。`<Layout animations={[cameraTo({ from:[0,0,200,200], to:[40,40,80,80] })]}>`。
- **vanilla**：直接 IR 根已支持 `animations`；builder `figure` 若要支持，加 `figure().animations([...])`（可选，留实现期定）。

### stagger（错峰编排，companion helper）

roadmap §6 定 group `stagger` 是 sugar。本 ADR 附带一个**纯数组 helper**：

```ts
stagger(tracks: Array<IRAnimationTrack>, stepMs: number, startMs = 0): Array<IRAnimationTrack>
// 给每条 track 叠加 delay = startMs + i*stepMs（保留各自原有 delay 之上的偏移由实现定，建议覆盖）
```

用于「N 个元素依次入场」：`elements.map((e,i)=> ({...e, animations:[fadeIn()]}))` 再 `stagger`，或对单元素多 track 错峰。完整 timeline/sequence DSL 不在本 ADR。

### Sugar=Kernel 等价性测试（硬规则）

每个 preset 配一条 `expect(fadeIn({duration:400})).toEqual({ property:'opacity', keyframes:[{at:0,value:0},{at:1,value:1}], duration:400, easing:'ease-out' })` 形态的等价测试——preset 输出**逐字段等于**手写 track。再配「默认值正确」「opts 覆盖生效」「必填缺失 throw（colorShift.to / cameraTo）」用例。

理由：

1. **可读 + 防错**：`fadeIn()` 胜过手敲 keyframes；默认值集中、改配方一处生效。
2. **零新能力、零新风险**：preset 只产既有 `AnimationTrack`，schema 校验 / 播放 / 降级全复用 01–04；Sugar=Kernel 测试钉死等价。
3. **single source of truth**：默认值 = roadmap 配方表；preset 实装即把配方表「执行」出来。
4. **framework-agnostic**：纯函数落 core，react/vanilla/直接 IR 三处同一份。

## 不在本 ADR 范围

- **`along-path`（`moveAlong`）/ clip 动画（`wipeIn`）/ 数据过渡 morph**：各自后续 ADR（需路径采样 / clip 几何 / Tier 2）。
- **完整 timeline / sequence DSL**：本 ADR 只 per-track + `stagger` helper。
- **renderer 播放 / 降级**：已由 ADR-02/03/04 提供，本 ADR 不碰。
- **ADR-04 后续项**（SVG `{at:t}` 截帧、react canvas rAF、manual `ref` 句柄）：与本 ADR 正交。

---

## 实现契约（必填）🔻

### Level

`yellow`

判级：**纯新增**——core 加 preset 模块 + 导出、react/vanilla re-export、`<Layout>` 加可选 `animations` prop。无破坏性改动、无 IR schema 变更（只构造既有 `AnimationTrack`）→ yellow（additive public API）。

### 改动

| 文件 | 操作 | 内容 |
|---|---|---|
| `packages/core/core/src/presets/animation.ts` | 新建 | 11 preset 工厂 + `stagger` + options 类型；纯函数、产 `IRAnimationTrack` |
| `packages/core/core/src/presets/index.ts` | 新建 | barrel |
| `packages/core/core/src/index.ts` | 修改 | 导出 preset 函数 + options 类型 |
| `packages/core/react/src/index.ts` | 修改 | `export { fadeIn, ... } from '@retikz/core'` re-export |
| `packages/core/react/src/kernel/Layout.tsx` | 修改 | `LayoutProps.animations?`（注入 IR 根 animations，供 cameraTo） |
| `packages/core/vanilla/src/index.ts` | 修改 | re-export preset；（可选）`figure().animations()` |
| `packages/core/core/tests/presets/animation.test.ts` | 新建 | 见测试象限 |
| `apps/docs/...` | 新增 | 动画 mdx 页（preset API 表 + `<ComponentPreview>` demo）——见下「文档」 |

### 测试象限

**等价性（每 preset ≥1，硬规则）**：`fadeIn()` / `drawOn()` / `scaleIn()` / `grow()` / `growUp()` / `slideIn()` / `colorShift()` / `cameraTo()` / `pulse()` / `spin()` / `loop()` 各 `toEqual` 对应手写 track（默认参数下）。
**opts 覆盖（≥3）**：`fadeIn({duration,delay,easing,trigger})` 透传；`scaleIn({from,origin})`；`slideIn({axis:'y',offset})`。
**必填 / 错误（≥2）**：`colorShift({})` 缺 `to` → throw；`cameraTo({to})` 缺 `from` → throw。
**组合 / 编排（≥2）**：`loop(spin())` 叠 iterations:'infinite'；`stagger([fadeIn(),fadeIn()], 100)` → delay 0 / 100。
**集成（≥2）**：`buildIR(<Node animations={[fadeIn()]}/>)` 节点带等价 track（react 路径）；`<Layout animations={[cameraTo(...)]}>` → IR 根 `animations`。

### 依赖的现有元素

- ADR-01 `AnimationTrack` / `AnimationProperty` / `AnimationEasing` / `IRAnimationTrack`（`@retikz/core`）—— **构造目标**：preset 产出它。
- roadmap §动画配方表 —— **规格源**：默认值 / keyframes 照表实装。
- ADR-02/03/04 播放通路 —— **消费方**：preset 产出的 track 由它们播，本 ADR 不改。

### 文档（用户可见，必须同改）

preset 是新用户 API：`apps/docs` 加动画页（双语 zh/en）——preset 列表 API 表（签名 + 默认 + 可调项）+ `<ComponentPreview>` 实跑 demo（fadeIn / growUp 柱状入场 / spin loader / cameraTo），按 docs-doc-principle + docs-doc-component SKILL。`<Layout animations>` / `<Node animations>` 新 prop 也在对应组件页补行。**文档与实现同一改动集**（AGENTS.md 硬规则）。
