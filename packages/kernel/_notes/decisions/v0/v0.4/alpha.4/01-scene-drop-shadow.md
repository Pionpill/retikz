# ADR-01：Scene drop shadow（投影）—— 图元级 renderer-agnostic 阴影

- 状态：Accepted（2026-06-16 完工）
- 决策日期：2026-06-16
- 关联：[v0.4-alpha.4 roadmap](./roadmap.md) · [v0.4 roadmap 候选 F](../roadmap.md) · [core-design.md §7 AI 一等公民](../../../../../../../notes/architecture/core-design.md) · [ADR-02 blend mode（同享接线骨架）](./02-blend-mode.md)

> **范围**：F1「drop shadow」——给 Scene 图元加投影。F2「blend mode」见 [ADR-02](./02-blend-mode.md)。

## 背景：塑造决策的硬约束

- `primitive/scene.ts` 红线：Scene 不得出现 backend-only 特性。drop shadow 之所以可做、blur 滤镜之所以缓，分界就在这条线：三端 drop-shadow 都是原生能力，**不依赖** backend-only 的 `ctx.filter`（只有高斯模糊依赖它）。SVG 走 `<feDropShadow>`，浏览器 / Node `@napi-rs/canvas` 都走 `ctx.shadow*`（已实测 Node 全支持，无降级分支）。
- retikz 当时无任何 effect 基础设施，shadow 是第一个。参照系 = `opacity`：每个 drawable primitive 各自挂可选字段、node 经 `ShapeStyle`、path 经 `PathBaseProps`、SVG 出属性 / Canvas 走 ctx 状态。shadow 镜像这条成熟管线，不另起炉灶。

## 决策：图元级可选 `shadow`，作用于元素主几何图元，编译期展开透传、各 renderer 翻译

给 `IRNode` / `IRPath` 加可选 `shadow`，两种写法共享同一 union 字段（优先级恒为：**显式字段 > preset 档位 > schema 默认**）：

1. **预设字符串** `shadow="md"`（`'sm'|'md'|'lg'|'xl'|'2xl'|'none'`）——Tailwind 风格档位，开箱即用、LLM 友好；字面等价于对象 `{ preset:'md' }`。
2. **统一对象** `shadow={{ preset?, offsetX?, offsetY?, blur?, color?, opacity? }}`——给 `preset` 则以该档位为默认基底、显式字段逐项覆盖（`{ preset:'md', color:'#3b82f6' }` = 快捷调色）；不给 `preset` 则须自定 `offsetX`+`offsetY`（完整显式）。「preset+覆盖」与「完整显式」是同一对象的两种填法，不是两套 schema。

union 先例：`fill: string|PaintSpec`、`scale: number|{x,y}`。**IR 存原始（预设字符串 | 对象），compile 用单一真源表 `SHADOW_PRESETS` 把预设展开、再用显式字段覆盖合并成 canonical `DropShadow` 后才透传**（同 `thickness`→`strokeWidth` 展开模式）；renderer 只见解析后的对象。缺省不设 → Scene / 渲染逐字不变。

已拍板的子决策：

1. **作用范围 = 仅 element 级、跟随图元本身（主几何 + 其上端点箭头）**。Node `shadow` → shape emit 的几何图元（`RectPrim` / `EllipsePrim` / `PathPrim`）；Path `shadow` → 主 `PathPrim` **含其端点箭头**——SVG `marker-start/end` 落在被 `filter` 的同一 `<path>` 上 / Canvas 在同一绘制过程内画箭头，两端原生即把效果带到箭头，强行剥离反需把 marker 拆成独立元素且观感更怪。**不作用于** Node 的 text / label / pin、Path 的 step label——这些是独立图元（各自 `TextPrim` 等），自然不带效果；也不动 `GroupPrim`、不经 `IRScope` 级联。「整元素（含独立标注）统一投影」= 延后的 group/scope 级工作。
2. **字段命名** = `offsetX` / `offsetY` / `blur` / `color` / `opacity`（renderer-agnostic 直白名，贴 Canvas 命名）。
3. **color 默认** = `rgba(0,0,0,0.5)`（半透明黑）；`opacity`（若给）**相乘**到 color 有效 alpha 上。
4. **blur 语义** = user-units 模糊半径，「可诊断近似」口径（同动画 pathDraw 估长先例）：renderer 各自校准到原生 shadow API，精确常量按快照微调，不追求跨端逐像素一致。
5. **首切单个 outer drop shadow**；多重阴影 / inset 内阴影留后续。
6. `none` = 显式无阴影（当前等价省略；为将来 scope 级联预留，故 `SHADOW_PRESETS.none` → null 而非删字段）。
7. **三端均原生支持（已实测），无降级分支。**

理由：

1. **renderer-agnostic 干净子集**——三端原生、不碰 backend-only `ctx.filter`，守 Scene 红线。
2. **复用 opacity 管线**——IR 入口 / `ShapeStyle` / drawable primitive / 双 renderer dispatch 全是 opacity 的成熟路径。
3. **「主几何图元」边界清晰可测**——effect 只跟随元素主形状，与「整元素覆盖（group 级）」延后项划清，契约不含糊。

### 最终 schema 形态

字面 union 形态本身是决策的一部分（字符串 `"md"` ≡ 对象 `{ preset:'md' }`），故留最小骨架；完整 schema / describe / 预设档位数值见 `packages/kernel/core/src/ir/effects.ts`（`DropShadowSchema` / `ShadowPreset` / `SHADOW_PRESETS`）。

```ts
// IRNode / IRPath 的 shadow 字段
shadow: z.union([z.enum(ShadowPreset), DropShadowSchema]).optional();
// DropShadowSchema.refine：须有 preset，或同时给 offsetX + offsetY
```

## DSL 表面

react kernel `<Node shadow>` / `<Path shadow>` 与 vanilla `node()` / `draw()` config（经 `Omit<IRNode>` / `Omit<IRPath>` 自动派生 `shadow`，同 react 一份 schema）皆支持预设字符串与对象两种写法。落地用法 / demo 见文档站 `apps/docs/src/contents/kernel/components/effects/shadow/`（zh/en + presets / object / primary-only 三组 demo）。

## 影响

- **附属图元继承语义**（关键，文档须并排写清）：shadow 跟随图元本身——Node shape、Path 主路径（**含端点箭头**）；Node 的 text / label / pin、Path 的 step label 是独立图元，不继承。「端点箭头随主路径一起投影」可以，「整张卡片含文字一起投影」做不到（那是 group 级）。
- **与 `opacity` / `clip` 区分**：shadow 是新增投影，不改 opacity / clip 语义；三者可叠加。
- **视觉外溢纳入根 auto-layout**：shadow 是视觉效果、不改锚点 / scope bbox，但 offset+blur 会溢出图元包围盒；根 auto-layout 把每个带 shadow 图元的外溢角点纳入计算，避免投影被根 viewBox / 画布裁掉。显式 layout 不受影响。
- **SVG filter region = `userSpaceOnUse` + 整 viewBox**（被否决：默认 `objectBoundingBox` `-10%/120%`）。否决理由：默认按被引用元素包围盒裁剪——直线 / 细 path 包围盒退化为零宽/零高（120%×0≈0）会把投影整段裁没，小图元上 offset+blur 超 10% 也被切边；且一个 filter 跨不同尺寸元素共享去重，无法按单元素定区域。故统一取 scene viewBox（与 Canvas 无区域裁剪口径对齐）。
- **对外 API**：新增 `shadow` prop / IR 字段 + `DropShadow` 公开类型，optional / additive，无 breaking。

## 不在本 ADR 范围

- **blend mode** —— [ADR-02](./02-blend-mode.md)。
- **blur（高斯模糊滤镜）** —— 依赖 backend-only `ctx.filter`，缓（roadmap F）。
- **多重阴影 / 内阴影（inset）** —— 首切单个 outer drop shadow。
- **group / scope 子树整体投影 + 含标注 / 箭头的整元素投影** —— 首切仅主几何；整组投影需 `GroupPrim` 加视觉属性 + SVG filter-on-`<g>` / Canvas 离屏合成，留后续。
- **横向成品**（卡片 / 浮层组件）—— 归 react sugar / domain。

## 实现指针

- IR / schema / 预设表：`packages/kernel/core/src/ir/effects.ts`；node / path 字段 `ir/node.ts`、`ir/path/path.ts`；`ShapeStyle`、primitive 透传见 `shapes/types.ts`、`primitive/{rect,ellipse,path,index}.ts`；公开导出 `src/index.ts`。
- compile 展开（`resolveShadow` helper + 外溢角点）：`compile/effects.ts`、`compile/node.ts`、`compile/path/index.ts`、`compile/compile.ts`。
- renderer：SVG `render/src/svg/builders/shadow-defs.ts` + `prim.ts`（filter 去重注册 + `filter=` 引用）；Canvas `render/src/canvas/draw-scene.ts`。
- 测试：`packages/kernel/core/tests/ir/effects-schema.test.ts`、`tests/compile/{node,path}-shadow.test.ts`、`packages/kernel/render/tests/svg-effects.test.ts`、`packages/kernel/react/tests/string-react-parity.test.tsx`。
- 文档：`apps/docs/src/contents/kernel/components/effects/shadow/`。

---

> 🔖 本文件压缩前完整施工蓝图 = `git show 6902289a:_notes/decisions/core/v0/v0.4/alpha.4/01-scene-drop-shadow.md`（封板全文）。
