# ADR-02：Scene blend mode（混合模式）—— 图元级 renderer-agnostic 混合

- 状态：Accepted（2026-06-16 完工）
- 决策日期：2026-06-16
- 关联：[v0.4-alpha.4 roadmap](./roadmap.md) · [v0.4 roadmap 候选 F](../roadmap.md) · [ADR-01 drop shadow（同享接线骨架）](./01-scene-drop-shadow.md)

> **范围**：F2「blend mode」——给 Scene 图元加混合模式。F1「drop shadow」见 [ADR-01](./01-scene-drop-shadow.md)。

## 塑造决策的硬约束

- blend mode 让图元与其下方已绘内容按 W3C compositing 公式混合（multiply 压暗、screen 提亮、overlay 增强对比…），是叠色高亮、热力叠加、艺术效果的通用能力。
- 三端原生对应、值名同源：SVG `mix-blend-mode`、浏览器 Canvas / Node `@napi-rs/canvas` 的 `ctx.globalCompositeOperation`。实测 Node `@napi-rs/canvas` 支持全部 15 个非 normal 分离模式，无需降级。
- 两套共享 W3C 的 16 个**分离式 blend 模式**；取这个交集即 renderer-agnostic，且**混合数学按 W3C 规范两端逐式相同**（结果像素级一致，差异只在「与谁混合」即 backdrop / isolation）。

## 决策：图元级可选 `blendMode` 闭集枚举，作用于元素主几何图元，编译期透传、各 renderer 翻译

给 `IRNode` / `IRPath` 加可选 `blendMode`，随 `opacity` 同路透传；SVG emit `mix-blend-mode`、Canvas 在 draw 前 set `globalCompositeOperation`、draw 后 restore。缺省 / `normal` → 逐字不变。

已拍板：

1. **枚举 = 全 16 个分离模式**（含 `normal`），用 const-object enum（`BlendMode` 大驼峰常量 + `z.enum`，对齐 `DrawWay` 惯例）；`normal` 保留为显式值（= 省略，便于显式覆盖）。
2. **字段名 = `blendMode`**。
3. **作用范围 = 仅 element 级、跟随图元本身（主几何 + Path 主路径含其端点箭头）**（同 [ADR-01](./01-scene-drop-shadow.md)）：SVG `mix-blend-mode` 是元素级、Canvas 同一绘制过程，两端原生即把箭头一起混合。**不**作用于 text / label / pin / step label 这些独立图元，不动 `GroupPrim`、不经 `IRScope` 级联。
4. **Node 支持三端原生，无降级分支。**

### 跨端语义（renderer-agnostic 可测口径）

IR 语义定义为：**`blendMode` 让该图元与「同一 Scene 内在它之前绘制的全部内容（accumulated backdrop）」按 W3C 分离公式混合**。

- **首切 element 级、不引入额外 isolation**：SVG 端 emit `mix-blend-mode` 时**不**额外包裹 isolation group（`isolation:isolate`），其 backdrop = 当前 stacking context 内已绘内容；Canvas 端 GCO 的 backdrop = 当前 canvas 已绘内容。扁平 Scene（无嵌套隔离）下两者 backdrop 相同，W3C 公式相同 → **混合结果两端一致**。
- **分歧面随 group 级一并延后**：嵌套 group 的 isolation（SVG stacking-context 隔离 vs Canvas 全局合成在「成组后再与外部混合」上的差异）只在 group / scope 级混合出现——而 group 级本就划归延后（见「不在本 ADR 范围」）。故 element 级首切**不破红线**：扁平场景两端一致且可测。

理由：

1. **renderer-agnostic 交集 + 同式数学**——只取三端共有的 16 分离模式，公式 W3C 统一，element 级扁平场景结果一致、可像素测。
2. **复用 opacity / shadow 管线**——与 [ADR-01](./01-scene-drop-shadow.md) 同骨架。
3. **闭集枚举、LLM 友好**——固定值集，非法值 schema parse 边界拒绝；CSS blend 名是 LLM 训练高频词。

最终 schema 形态（决策的字面落点）：

```ts
// ir/effects.ts（与 DropShadow 同文件）
export const BlendMode = {
  Normal: 'normal',
  Multiply: 'multiply',
  Screen: 'screen',
  Overlay: 'overlay',
  Darken: 'darken',
  Lighten: 'lighten',
  ColorDodge: 'color-dodge',
  ColorBurn: 'color-burn',
  HardLight: 'hard-light',
  SoftLight: 'soft-light',
  Difference: 'difference',
  Exclusion: 'exclusion',
  Hue: 'hue',
  Saturation: 'saturation',
  Color: 'color',
  Luminosity: 'luminosity',
} as const;
export type BlendModeValue = ValueOf<typeof BlendMode>;
```

## 影响

- **附属图元继承语义**：blendMode 跟随图元本身——主几何 + Path 端点箭头（同 shadow）；text / label / pin / step label 这些独立图元不继承。
- **跨端 isolation 差异**：element 级扁平场景两端一致；嵌套隔离差异随 group 级延后，文档须说明「首切为 element-与-backdrop 混合，组级隔离后续」。
- **对外 API**：新增 `blendMode` prop / IR 字段 + `BlendMode` 公开常量，optional / additive，无 breaking。

## 不在本 ADR 范围

- **drop shadow** —— [ADR-01](./01-scene-drop-shadow.md)。
- **group / scope 级组混合（isolation + 离屏合成）** —— 首切仅 element 主几何；组混合需 `GroupPrim` 加视觉属性 + 离屏合成，是嵌套 isolation 跨端分歧的归属地，留后续。引入 SVG 光栅器后，跨端 parity 可由「emit 指令相同」升级为逐像素对比。
- **非分离 blend / PorterDuff 全集 / 自定义合成** —— 只取三端共有 16 分离模式。
- **mask / clip 类合成** —— clip 已覆盖硬边裁剪。

## 实现指针

- IR / schema：`packages/kernel/core/src/ir/effects.ts`（`BlendMode` + `BlendModeValue`，公开经 `src/index.ts`）、`ir/node.ts`、`ir/path/path.ts`；透传 `shapes/types.ts`（`ShapeStyle`）、`primitive/{path,rect,ellipse}.ts`（`TextPrim` / `GroupPrim` 不加）。
- 编译：`compile/node.ts`（`toShapeStyle`）、`compile/path/index.ts`。
- renderer：`render/src/svg/builders/prim.ts`（emit `mix-blend-mode`）、`render/src/canvas/draw-scene.ts`（`withBlend`，参照 `withOpacity` 的 save/set/draw/restore）。
- React kernel：`react/src/kernel/{Node,Path}.tsx`、`react/src/kernel/_fields.ts`。
- 测试：`core/tests/compile/{node,path}-blend.test.ts`、`core/tests/ir/effects-schema.test.ts`、`render/tests/{svg,canvas}-effects.test.ts`（含跨端 parity）。
- 文档站：`apps/docs/src/contents/kernel/components/effects/blend/`（双语 + multiply / screen demo）。

---

> 🔖 本文件压缩前完整施工蓝图 = `git show 6902289a:_notes/decisions/core/v0/v0.4/alpha.4/02-blend-mode.md`（封板全文）。
