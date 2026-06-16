# ADR-01：Scene drop shadow（投影）—— 图元级 renderer-agnostic 阴影

- 状态：Accepted（2026-06-16 完工）
- 决策日期：2026-06-16
- 关联：[v0.4-alpha.4 roadmap](./roadmap.md) · [v0.4 roadmap 候选 F](../roadmap.md) · [core-design.md §7 AI 一等公民](../../../../../architecture/core-design.md) · `primitive/scene.ts`（Scene 契约）· `shapes/types.ts`（`ShapeStyle`）· `render/svg/builders/prim.ts` · `render/canvas/draw-scene.ts` · [ADR-02 blend mode（同享接线骨架）](./02-blend-mode.md)

> **范围**：F1「drop shadow」——给 Scene 图元加投影。F2「blend mode」见 [ADR-02](./02-blend-mode.md)。

## 背景

阴影是图示高频视觉（卡片浮起、节点强调、层次区分）。三端都有原生 drop-shadow，且**不依赖** backend-only 的 `ctx.filter`（只有 blur 滤镜依赖它，被缓）：

- SVG：`<feDropShadow dx dy stdDeviation flood-color flood-opacity>`。
- 浏览器 Canvas / Node `@napi-rs/canvas`：`ctx.shadowOffsetX / shadowOffsetY / shadowBlur / shadowColor`。**已实测 Node `@napi-rs/canvas` 全支持**（`ctx.shadow*` 齐备），无需降级。

retikz 现状无任何 effect 基础设施（`primitive/scene.ts` 明令 Scene 不得出现 backend-only 特性）；drop shadow 三端原生对应、满足红线。参照系 = `opacity`：每个 drawable primitive 各自挂可选 `opacity`，node 经 `ShapeStyle`、path 经 `PathBaseProps`，SVG 出 `opacity=`、Canvas 走 `ctx.globalAlpha`。shadow 循同一条管线。

## 决策：图元级可选 `shadow`，作用于元素主几何图元，编译期透传、各 renderer 翻译

给 `IRNode` / `IRPath` 加可选 `shadow`，**两种写法**（优先级始终：显式字段 > preset 档位 > schema 默认）：

1. **预设字符串**（最简）：`shadow="md"` —— Tailwind 风格档位，开箱即用、LLM 友好；等价于对象 `{ preset:'md' }`。
2. **对象**（统一一种）：`shadow={{ preset?, offsetX?, offsetY?, blur?, color?, opacity? }}` —— 给 `preset` 就以该档位样式为**默认基底**，任意同时出现的字段逐项覆盖（如 `{ preset:'md', color:'#3b82f6' }` 快捷调色）；不给 `preset` 则须自定 `offsetX`+`offsetY`（完整显式）。「preset + 覆盖」与「完整显式」本质同一对象——只是有无 `preset` 决定是否套用档位默认。

随 `opacity` 同路透传；**compile 把 preset 展开 + 显式字段覆盖合并成 canonical `DropShadow`**，SVG 注册去重 `<feDropShadow>` filter、Canvas set `ctx.shadow*`。缺省不设 → Scene / 渲染逐字不变。

```ts
// 新建 ir/effects.ts
// 预设关键字（Tailwind 风格档位）；SHADOW_PRESETS 表为单一真源
export const ShadowPreset = {
  None: 'none', Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl', Xxl: '2xl',
} as const;
export type ShadowPresetValue = ValueOf<typeof ShadowPreset>;

// 对象形态：preset（档位默认）+ 任意覆盖字段；无 preset 时须给 offsetX+offsetY（完整显式）
export const DropShadowSchema = z
  .object({
    preset: z.enum(ShadowPreset).optional().describe('Tailwind-style size preset seeding offsetX / offsetY / blur / color; any explicit field below overrides it.'),
    offsetX: z.number().finite().optional().describe('Horizontal shadow offset in user units (overrides preset); SVG feDropShadow dx / Canvas shadowOffsetX.'),
    offsetY: z.number().finite().optional().describe('Vertical shadow offset in user units (overrides preset); positive = downward under screen y-down.'),
    blur: z.number().finite().nonnegative().optional().describe('Shadow blur radius in user units (overrides preset); 0 = hard-edged. SVG stdDeviation = blur / 2, Canvas shadowBlur = blur.'),
    color: z.string().optional().describe('Shadow color, any CSS color (overrides preset); when neither preset nor color given = translucent black rgba(0,0,0,0.5).'),
    opacity: z.number().min(0).max(1).optional().describe('Shadow opacity 0..1 multiplied onto the effective color alpha.'),
  })
  .refine(s => s.preset !== undefined || (s.offsetX !== undefined && s.offsetY !== undefined),
    { message: 'Provide a `preset`, or explicit `offsetX` + `offsetY`.' })
  .describe('Drop shadow: a `preset` (size defaults) with optional per-field overrides, or fully explicit offsets.');

// IRNode / IRPath 的 shadow 字段 = 预设字符串 | 对象（同 `fill: string | PaintSpec`、`scale: number | {x,y}` 的既有 union 先例；字符串 `"md"` ≡ 对象 `{ preset:'md' }`）
shadow: z.union([z.enum(ShadowPreset), DropShadowSchema]).optional().describe(
  'Drop shadow on the element’s primary geometry. A preset keyword (`sm`/`md`/`lg`/`xl`/`2xl`/`none`), or an object `{ preset?, offsetX?, offsetY?, blur?, color?, opacity? }` where explicit fields override the preset. Renderer-agnostic (feDropShadow / ctx.shadow*).',
);
```

**预设档位表（提议数值，compile 单一真源；exact 值实现期按快照微调）**——单层近似 Tailwind 阴影刻度，`offsetX=0`、暗化半透明黑：

| 预设 | offsetY | blur | color |
| --- | --- | --- | --- |
| `sm` | 1 | 2 | `rgba(0,0,0,0.10)` |
| `md` | 3 | 6 | `rgba(0,0,0,0.12)` |
| `lg` | 8 | 15 | `rgba(0,0,0,0.12)` |
| `xl` | 12 | 25 | `rgba(0,0,0,0.12)` |
| `2xl` | 20 | 40 | `rgba(0,0,0,0.18)` |
| `none` | —（不产阴影，等价省略） | | |

**已拍板决策**（折合上一轮人工签字 + 本轮收敛）：

1. **作用范围 = 仅 element 级、跟随图元本身（主几何 + 其上端点箭头）**。Node `shadow` → shape emit 出的几何图元（`RectPrim` / `EllipsePrim` / `PathPrim`）；Path `shadow` → 主 `PathPrim`，**含其端点箭头**（SVG `marker-start/end` 落在被 `filter` 的同一 `<path>` 元素上 / Canvas 在同一绘制过程内画箭头——两端原生即把效果带到箭头，强行剥离反而需要把 marker 拆成独立元素、且观感更怪）。**不作用于** Node 的 text / label / pin、Path 的 step label，这些是**独立图元**（各自 `TextPrim` 等），自然不带效果；也不动 `GroupPrim`、不经 `IRScope` 级联。「整元素（含独立标注）统一投影」= 延后的 group/scope 级工作。
2. **字段命名** = `offsetX` / `offsetY` / `blur` / `color` / `opacity`（renderer-agnostic 直白名，贴 Canvas 命名）。
3. **color 默认** = `rgba(0,0,0,0.5)`（半透明黑）；`opacity`（若给）**相乘**到 color 的有效 alpha 上。
4. **blur 语义** = user-units 模糊半径；renderer 近似对齐（SVG `stdDeviation = blur/2`、Canvas `shadowBlur = blur`），精确常量实现期按快照微调（「可诊断近似」口径，同动画 pathDraw 估长先例）。
5. **首切单个 `shadow`**；多重阴影 / inset 内阴影留后续。
6. **两种写法（同一 `shadow` 字段 union；优先级恒为：显式字段 > preset > 默认）**：
   - **预设字符串** `shadow="md"`（`'sm'|'md'|'lg'|'xl'|'2xl'|'none'`），≡ 对象 `{ preset:'md' }`；
   - **统一对象** `shadow={{ preset?, offsetX?, offsetY?, blur?, color?, opacity? }}`：有 `preset` 就套该档位为默认基底、显式字段逐项覆盖（`{preset:'md', color:'red'}` = 快捷调色）；无 `preset` 须给 offsetX+offsetY（完整显式）。「preset+覆盖」与「完整显式」是同一对象的两种填法，不是两套 schema。
   union 先例：`fill: string|PaintSpec`、`scale: number|{x,y}`。compile 用单一真源表 `SHADOW_PRESETS` 展开 preset 再用显式字段覆盖合并成 canonical `DropShadow`（同 `thickness`→`strokeWidth` 展开）。`none` = 显式无阴影（当前等价省略；为将来 scope 级联预留）。AI 友好：LLM 既能 `shadow="md"` 也能 `{preset:'md', color:'red'}`，无需记全部数值。
7. **Node 支持**：三端均原生支持（已实测），无降级分支。

理由：

1. **renderer-agnostic 干净子集**——三端原生、不碰 backend-only `ctx.filter`，守 Scene 红线。
2. **复用 opacity 管线**——IR 入口 / `ShapeStyle` / drawable primitive / 双 renderer dispatch 全是 opacity 的成熟路径。
3. **「主几何图元」边界清晰可测**——effect 只跟随元素的主形状，与「整元素覆盖（group 级）」延后项划清，契约不含糊。

## DSL 表面

react（kernel）—— 预设关键字（推荐日常）与完整对象（精确控制）两种写法：

```tsx
{/* 预设字符串：一字直用 */}
<Node position={[0, 0]} shape="rectangle" fill="white" shadow="md">card</Node>
{/* 对象 + preset：快捷调色（preset 出默认，color/opacity 覆盖） */}
<Node position={[80, 0]} shape="rectangle" fill="white"
  shadow={{ preset: 'md', color: '#3b82f6', opacity: 0.5 }}>card</Node>
{/* 对象无 preset：完整显式 */}
<Path stroke="steelblue" shadow={{ offsetX: 1, offsetY: 1, blur: 2, color: 'rgba(0,0,0,0.4)' }}>
  <Step kind="move" to="A" /><Step to="B" />
</Path>
```

vanilla（`node` / `draw` config 经 `Omit<IRNode>` / `Omit<IRPath>` 自动派生 `shadow`，同 react 一份 schema，预设 / 对象皆可）：

```ts
import { figure, node, draw } from '@retikz/vanilla';
const fig = figure([
  node('card', { position: [0, 0], shape: 'rectangle', fill: 'white', shadow: 'md' }),       // 预设字符串
  node('hot', { position: [80, 0], shape: 'circle', shadow: { preset: 'lg', color: 'crimson' } }), // 对象 + preset 覆盖
  draw(['(A)', '(B)'], { stroke: 'steelblue', shadow: { offsetX: 1, offsetY: 1, blur: 2 } }), // 对象显式
]);
```

## 影响

- **附属图元继承语义**（关键）：shadow 跟随图元本身——Node shape、Path 主路径（**含端点箭头**）。Node 的 text / label / pin、Path 的 step label 是**独立图元**，不继承。文档须并排写清：端点箭头随主路径一起投影，但「整张卡片含文字一起投影」做不到（那是 group 级）。
- **与 `opacity` / `clip` 区分**：shadow 是新增投影，不改 opacity / clip 语义；三者可叠加。
- **renderer**：SVG 新增 shadow filter-defs（仿 `paint-defs.ts` 去重注册）+ `buildPrimRaw` 各几何 case emit `filter=`；Canvas `drawPrim` 包 `withShadow`。
- **视觉外溢纳入根 auto-layout**（实现期定，本 ADR 追记）：shadow 是视觉效果、不改锚点 / scope bbox，但其 offset+blur 会溢出图元包围盒。`compile/compile.ts` 的根 auto-layout 把每个带 shadow 图元的外溢角点纳入计算（`shadowOverflowPoints`），避免投影被根 viewBox / 画布裁掉。显式 layout 不受影响。
- **SVG filter region = `userSpaceOnUse` + 整 viewBox**（实现期定，本 ADR 追记）：默认 `objectBoundingBox` `-10%/120%` 会按被引用元素包围盒裁剪——直线 / 细 path 的包围盒退化为零宽 / 零高（120%×0≈0）会把投影整段裁没，小图元上 offset+blur 超 10% 也被切边。一个 filter 跨不同尺寸元素共享去重，故区域统一取 scene viewBox（与 Canvas 无区域裁剪口径对齐）。
- **对外 API**：新增 `shadow` prop / IR 字段 + `DropShadow` 公开类型，optional / additive，无 breaking。
- **文档站**：shadow 双语说明 + demo（附属图元继承说明、三端一致性、blur 近似注脚）。

## 不在本 ADR 范围

- **blend mode** —— [ADR-02](./02-blend-mode.md)。
- **blur（高斯模糊滤镜）** —— 依赖 backend-only `ctx.filter`，缓（roadmap F）。
- **多重阴影 / 内阴影（inset）** —— 首切单个 outer drop shadow。
- **group / scope 子树整体投影 + 含标注 / 箭头的整元素投影** —— 首切仅主几何；整组投影需 `GroupPrim` 加视觉属性 + SVG filter-on-`<g>` / Canvas 离屏合成，留后续。
- **横向成品**（卡片 / 浮层组件）—— 归 react sugar / domain。

---

## 实现契约（必填）🔻

### Level

`red`——动 `packages/core/core/src/ir/**`、`primitive/**`、`compile/**`、`render/**`，并新增公开导出（`DropShadow` 类型经 `src/index.ts`）。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/core/src/ir/effects.ts`（新建） | 加 | `DropShadowSchema` | `z.object({preset?,offsetX?,offsetY?,blur?,color?,opacity?}).refine(有 preset 或 offsetX+offsetY)` | — | shadow 对象：preset 出默认 + 显式字段覆盖；无 preset 须给 offsetX+offsetY |
| 同上 | 加 | `ShadowPreset` + `ShadowPresetValue` | const-object enum（`sm/md/lg/xl/2xl/none`） | — | Tailwind 风格预设档位 |
| 同上 | 加 | `SHADOW_PRESETS` | `Record<ShadowPresetValue, DropShadow \| null>` | — | 预设 → canonical DropShadow 单一真源表（`none`→null） |
| `packages/core/core/src/ir/node.ts` | 加 | `shadow` | `z.union([z.enum(ShadowPreset), DropShadowSchema]).optional()` | — | node 主形状投影（预设 \| 对象） |
| `packages/core/core/src/ir/path/path.ts` | 加 | `shadow` | `z.union([z.enum(ShadowPreset), DropShadowSchema]).optional()` | — | path 主路径投影（预设 \| 对象） |
| `packages/core/core/src/shapes/types.ts` | 加 | `shadow`（`ShapeStyle`） | `DropShadow \| undefined`（**已解析对象**） | — | 透传进 shape emit（预设已在 compile 展开） |
| `packages/core/core/src/primitive/{path,rect,ellipse}.ts` | 加 | `shadow` | `DropShadow \| undefined` | — | Scene 图元属性（仅解析后对象） |

字段名 / 预设值写死。`TextPrim` / `GroupPrim` **不加**。**IR 存原始（预设字符串 \| 对象），compile 用 `SHADOW_PRESETS` 表把预设展开成 `DropShadow` 后再透传 `ShapeStyle` / primitive**（同 `thickness`→`strokeWidth` 展开模式）；renderer 只见解析后的对象。

### 文件 scope

- `packages/core/core/src/ir/effects.ts`（新建）、`ir/node.ts`、`ir/path/path.ts`（改）
- `packages/core/core/src/shapes/types.ts`（改 `ShapeStyle`）
- `packages/core/core/src/primitive/{path,rect,ellipse}.ts`（改）、`primitive/index.ts`（导出 `DropShadow`）
- `packages/core/core/src/compile/node.ts` / `compile/path/index.ts`（透传 shadow；抽共用 `resolveShadow(shadow): DropShadow | undefined` helper：字符串 → `SHADOW_PRESETS` 查表；对象 → `{ ...(preset ? SHADOW_PRESETS[preset] : {}), ...显式出现的字段 }` 合并（显式覆盖 preset）；`none` / 解析为空 → undefined。renderer 只见合并后对象）
- `packages/core/core/src/index.ts`（re-export `DropShadow` 类型 + `ShadowPreset` 常量）
- `packages/core/render/src/svg/builders/{prim.ts, shadow-defs.ts（新建）}`、`render/src/canvas/draw-scene.ts`
- `packages/core/core/tests/compile/path-shadow.test.ts`、`tests/compile/node-shadow.test.ts`（新建）；`packages/core/render/tests/**` shadow 三端测试（新建）
- `packages/core/react/src/kernel/{Node,Path}.tsx`（prop 透传）+ 测试；`apps/docs/**`（shadow 页 + demo）

### 测试象限（≥9）

**Happy（≥3）**：`node-shape-shadow`（Node + 显式对象 → shape 图元带 shadow、SVG 出 filter / Canvas set shadow）；`path-shadow`（Path + shadow → 主 PathPrim 带 shadow）；`shadow-defaults`（仅给 offsetX/Y，blur/color 取默认 `rgba(0,0,0,0.5)`）；`shadow-preset-md`（`shadow="md"` → compile 展开为 `SHADOW_PRESETS.md` 解析对象）；`shadow-preset-override`（`{ preset:'md', color:'#3b82f6', opacity:.5 }` → offset/blur 取 md、color/opacity 用显式值覆盖）。

**边界（≥2）**：`shadow-omitted-noop`（不设 → 图元无 shadow、渲染逐字不变）；`blur-zero-hard`（blur=0 → 硬边）；`preset-string-equals-preset-object`（`shadow="md"` ≡ `{preset:'md'}` 编译逐字一致）；`override-priority`（显式字段 > preset > 默认：`{preset:'sm', offsetY:99}` 的 offsetY=99、其余取 sm）；`preset-none-noop`（`shadow="none"` → 无阴影）。

**错误路径（≥2）**：`reject-nonfinite-offset`（offsetX=NaN/Inf → 拒）；`reject-bad-opacity`（opacity>1/<0 → 拒）；`reject-unknown-preset`（`shadow="huge"` → 拒）；`reject-object-without-preset-or-offsets`（`{ color:'red' }`（无 preset 又无 offsetX/Y）→ refine 拒）。

**交互（≥2）**：`shadow-text-not-inherited`（Node 带 text + shadow → text 的 `TextPrim` **不带** shadow，仅 shape 图元带；text 是独立图元）；`path-arrow-spec-no-shadow-field`（带 `arrow` 的 path + shadow → endpoint arrow spec 对象不冗余携带 shadow 字段；效果挂在 `PathPrim` 上，渲染时箭头随主路径一起被滤镜，见 render 层测试）；`shadow-with-opacity`（shadow + 元素 opacity 共存，互不吞没）。

**round-trip（≥1）**：含 shadow 的 IRNode / IRPath JSON 往返 parse 深等。

### 依赖的现有元素

- `opacity` 全链路（`ir/node.ts` / `ir/path/path.ts` / `ShapeStyle` / 各 primitive / `compile/node.ts:toShapeStyle` / `compile/path/index.ts:PathBaseProps` / SVG `buildPrimRaw` / Canvas `withOpacity`）—— **参照实现**，shadow 镜像其路径。
- `paint-defs.ts`（`render/svg/builders/`）—— **参照**（去重注册 def + `url(#…)` 引用模式）。
- `withOpacity`（`render/canvas/draw-scene.ts`）—— **参照**（save/set/draw/restore 包装）。
