# ADR-01：Paint 基础（PaintValue 词汇表 + SceneResource discriminated 资源表 + gradient）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.7 plan §第一部分](./roadmap.md) · [tikz-gap-analysis §1 Node](../../../../../analysis/tikz-gap-analysis.md) · [alpha.2 样式继承](../alpha.2/)（`fill` 级联）· 下游 [alpha.8 ADR-01 ArrowDefinition](../alpha.8/)（复用 `PaintValue.contextStroke`）· [alpha.9 ADR-02 clip](../alpha.9/)（复用 `SceneResource` 资源表）· 本 milestone [ADR-02](./02-max-text-width.md) / [ADR-03](./03-pin.md) / [ADR-04](./04-pattern-image-deferred.md)

> **跨段契约**：本 ADR 定下的 `PaintValue` 词汇表与 `SceneResource` 资源表是 alpha.7–9 共享的地基——alpha.8 arrow 颜色继承用 `PaintValue.contextStroke`，alpha.9 clip 把 `ClipResource` 加进同一 `SceneResource` 表。

## 背景 / 约束

- `fill` 原本是纯字符串（node / path / scope 的 `fill` 与 primitive 层 `RectPrim` / `EllipsePrim` / `PathPrim` 全为 `string`），只能表达单色；渐变 / 图案 / 图片在 SVG 都靠 `fill="url(#id)"` 引用 `<defs>` 里的 paint server，而 core 无任何 defs / 资源管理。
- **硬约束**：`ScenePrimitive` 是"渲染目标无关的最大公约子集，不允许 SVG-only 特性（filter / marker / imageData）"。所以 **core 不能产 `<defs>` primitive**——必须 renderer-agnostic 的资源表 + 引用，由 adapter 物化。

## 决策：primitive `fill` 升 `PaintValue` union + Scene 级 `SceneResource` discriminated 资源表

核心数据结构（字面即决策，完整定义见 `core/src/primitive/paint.ts`）：

```ts
// PaintValue —— 任何 paint 属性的取值，fill / stroke 共用（不绑定 fill，alpha.8 arrow stroke 也用）
type PaintValue =
  | string                              // 纯色（任意 CSS color；含 var() 走 inline style）
  | { kind: 'resourceRef'; id: string } // 指向资源表（gradient / pattern / image）
  | { kind: 'contextStroke' };          // 继承所在元素描边（adapter → SVG context-stroke；alpha.8 arrow 用）

// SceneResource —— discriminated，便于后续加分支不破契约
type SceneResource = { kind: 'paint'; id: string; spec: IRPaintSpec };
// alpha.9 追加： | { kind: 'clip'; ... }
```

`Scene.resources?: Array<SceneResource>`（渲染无关，adapter 物化为 SVG `<defs>`）；compile 把 IR 的 `PaintSpec` 收进资源表（去重 + 稳定 id），primitive 写 `{ kind: 'resourceRef', id }`；纯色仍 `string`。IR 侧 `fill` 升 `z.union([z.string(), PaintSpecSchema])`，`PaintSpec` 是 `linearGradient` / `radialGradient` 的 discriminated union。

理由：

1. **守 `ScenePrimitive` 渲染无关契约**：core 只产 renderer-agnostic 资源表 + `PaintValue` 引用，`<defs>` 物化在 adapter，Canvas / PDF 可各自实现。
2. **一次定稳跨段契约**：`SceneResource` discriminated → alpha.9 clip 加分支不破契约；`PaintValue.contextStroke` → alpha.8 arrow 颜色继承不悬空（本段不主动产 `contextStroke`，词汇表先定稳）。
3. **纯色零破坏**：`fill` 仍接受 `string`，union 只叠加分支。
4. **去重 + 稳定 id 在 core**：同输入同 id，快照稳定、SSR / CSR 一致。

设计细节（具体决策）：

- **`PaintValue` 命名为 paint 通用取值**（fill / stroke 共用，非 fill-only）：命名 + `.describe` 按"可用于 fill 与 stroke 的 paint value"写，避免 alpha.8 像借用 fill-only 类型。
- **linear gradient 方向用 `angle`**（度，polar 约定 0=左→右 / 90=上→下）；react 过中心 (0.5,0.5) 沿方向画长 1 渐变线。
- **radial center / radius 用 `objectBoundingBox`**（0..1 相对形状，随缩放）；缺省 center (0.5,0.5)、radius 0.5。
- **stop `color` 支持 `currentColor`**（SVG `<stop stop-color>` 天然继承元素 color）。
- **纯色与 `var()` 不进资源表**：`fill` 是 `string` 时不收集；`var(--x)` 仍走 react inline style。
- **scope 级联 PaintSpec**：alpha.2 的 `fill` 级联默认值若是 `PaintSpec`，继承链解析后再进资源收集（去重兜底）。

### 被否决的选项

- **B：primitive `fill: string` + 新增 `fillRef?: string` 双字段**——两字段互斥需编译期 invariant；alpha.8 的 `contextStroke` 无处安放（又得加第三字段 / 魔法字符串），比 union 啰嗦。
- **C：core 直接产 `<defs>` primitive**——违反 `scene.ts` 渲染无关契约（SVG-only 泄漏 core），Canvas / PDF adapter 无法消费。

### 资源 id 策略（偏离 ADR 原"内容 hash"倾向）

实现选**递增首见序**（`paint-1` / `paint-2`…，`Map<jsonKey, id>` 去重），而非 ADR 原倾向的内容 hash：首见序对同一 IR 同样确定性（SSR / CSR 一致），且短、可读、无 hash 依赖；跨 SVG 唯一性由 react adapter 加 `useId` 前缀解决，hash 的"跨编译稳定"优势在 scene-local id 场景用不上。

## 不在本 ADR 范围

- **pattern / image** → [ADR-04](./04-pattern-image-deferred.md)（复用本 ADR 基建实现，实现期由 deferred 提升到 alpha.7 一并做）。
- **maxTextWidth** → [ADR-02](./02-max-text-width.md)；**pin** → [ADR-03](./03-pin.md)。
- **arrow 颜色继承用 `contextStroke`** → alpha.8 ADR-01（本篇只定 `PaintValue` 词汇表，不产 arrow marker）。
- **clip 资源** → alpha.9 ADR-02（本篇只把 `SceneResource` 定成 discriminated，clip 分支在 alpha.9 加）。
- **stop `color` 里的 `var()`**：`<defs>` 内未特殊处理，留待。

---

> **实现指针**：level `red`（动 IR fill union + primitive 契约 + compile 资源收集 + core/react 公开导出）、additive 非 breaking（`fill` 类型扩张，`string` 仍合法；消费 Scene 的 adapter 需处理 `PaintValue`，本仓 react 同步改）。真源以代码为准——`PaintSpecSchema` / `GradientStopSchema` / `IRPaintSpec`（`core/src/ir/paint.ts`）、`PaintValue` / `SceneResource`（`core/src/primitive/paint.ts`，经 `primitive/scene.ts` re-export）、资源收集 / 去重 / 派 id（`core/src/compile/paint.ts` + `compile/{node,path,scope}.ts` 接入）、adapter 物化（`react/src/render/paintDefs.tsx` + `renderPrim.tsx` 按 `PaintValue` 分派）。测试在 `core/tests/{ir,compile}/paint.test.ts` 与 `react/tests/render/paintDefs.test.tsx`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。

> 🔖 封板压缩 commit `d0ae9bf2`；压缩前完整施工蓝图 = `git show d0ae9bf2^:notes/decisions/core/v0/v0.2/alpha.7/01-paint-basics.md`。
