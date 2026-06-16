# v0.4.0-alpha.4 路线：Scene 视觉效果（F）—— drop shadow + blend mode

> 写于 2026-06-16。承接 [v0.4 roadmap 候选 F「Scene 视觉效果」](../roadmap.md#f--scene-视觉效果2026-06-13-方向)（2026-06-13 拍板「首切 = z-index / 层模型 + shadow + blend mode」）。
>
> 关联：[`v0.4 roadmap`](../roadmap.md) · [`ADR-01 drop shadow`](./01-scene-drop-shadow.md)（Draft）· [`ADR-02 blend mode`](./02-blend-mode.md)（Draft）· `primitive/scene.ts`（Scene 契约红线）· `shapes/types.ts`（`ShapeStyle`）

## 定位

alpha.4 是 v0.4「纵向底座深化」里的 **Scene 视觉层增量**：给 Scene 图元加两块 renderer-agnostic 的视觉属性——**drop shadow（投影）** 与 **blend mode（混合模式）**。Scene 只描述意图，各 renderer 翻译成原生 API：

| 能力 | SVG | 浏览器 Canvas | Node 位图（@napi-rs/canvas） |
| --- | --- | --- | --- |
| shadow | `<feDropShadow>` filter | `ctx.shadow{OffsetX,OffsetY,Blur,Color}` | 同 Canvas（待核） |
| blend | `mix-blend-mode` | `ctx.globalCompositeOperation` | 同 Canvas（待核） |

三端都有原生对应 → 守 Scene「全后端一致、无 backend-only 特性」红线（`primitive/scene.ts`）。属纵向底座（core Scene schema + render emit），非 extension 词汇。

**z-index 不在本轮重做**：图元级 `zIndex`（node / path / scope）已落地——编译期按 scope 稳定重排绘制序、不写进 Scene 本体（见 `compile/compile.ts` 的 `zIndexOf`）。可选的「跨 scope 具名 layer 层模型」是 F 的延后富化，待议（见「不在 alpha.4」）。

衡量标准：同一份带 shadow / blend 的 IR 经 `compileToScene` 产出带新属性的 Scene 图元，SVG 与 Canvas（含 Node）三端视觉一致（允许 blur 量纲等可诊断近似）；缺省（不设）时 Scene 与渲染逐字不变、零回归。

## 子项

| # | 子项 | 代号 | ADR | 状态 |
|---|---|---|---|---|
| F1 | drop shadow（投影） | F | [ADR-01](./01-scene-drop-shadow.md) | Proposed（实现契约齐 + 多 LLM 评审已合并；待人工说「进实现」） |
| F2 | blend mode（混合模式） | F | [ADR-02](./02-blend-mode.md) | Proposed（实现契约齐 + 多 LLM 评审已合并；待人工说「进实现」） |

两子项独立、可并行；共享同一条接线骨架（`ShapeStyle` / 各 drawable primitive 加字段 → compile 透传 → SVG `buildPrimRaw` / Canvas `drawPrim` 翻译）。

## 设计骨架（两 ADR 共用，详见各 ADR）

- **加在哪**：每个 drawable primitive（`PathPrim` / `RectPrim` / `EllipsePrim` / `TextPrim`）各自加可选字段（与 `opacity` 同模式，无共享基类）；node 形状经 `ShapeStyle`（`shapes/types.ts`）透传，path 经 `PathBaseProps`。`GroupPrim` 是否纳入（对整子树投影 / 混合）= 关键待决策（见各 ADR）。
- **IR 入口**：`IRNode` / `IRPath` 加对应字段（与 `opacity` 同位置）；是否经 `IRScope` 级联（同 `opacity` 级联）= 待决策。
- **renderer**：SVG 在 `render/svg/builders/` 注册 filter def（仿 `paint-defs.ts`）+ 在 `buildPrimRaw` 各 case emit `filter=` / `mix-blend-mode`；Canvas 在 `draw-scene.ts` 的 `drawPrim` 包一层 `withEffects`（仿 `withOpacity`），set `ctx.shadow*` / `ctx.globalCompositeOperation`。
- **红线核查**：实现前须核 `@napi-rs/canvas`（Node）对 `ctx.shadow*` 与 blend `globalCompositeOperation` 的支持；不支持则按「可诊断降级 + warnUnsupported」处理，不破全后端一致红线。

## 依赖与边界

- **独立于 A / B**：不依赖 math / path 文法；纯 Scene + render。
- **为 P3D 铺路**：z-index（已有）+ shadow（深度感）是伪三维深度排序 / 雾化的底座，F 之后顺势。
- **不在 alpha.4**：
  - **blur（高斯模糊）**：依赖 `ctx.filter`，Node `@napi-rs/canvas` 支持不稳，破全后端一致红线——缓（要做先核 Node + 接受降级）。
  - **mask**：与已有 clip（硬边裁剪）重叠，常见需求 clip 已覆盖——缓。
  - **跨 scope 具名 layer 层模型**（z-index 之上的命名层）：现有 per-scope zIndex 够用，具名 layer 待真实痛点再议。
  - **横向成品**（具体「卡片阴影组件」等）：归 react sugar / domain，core 只出机制。

## 验收（alpha.4 整体）

- F1 / F2 各自 ADR 验收条款全过；core + render + 下游 `tsc --noEmit` + 全仓 `pnpm lint` 全绿。
- 新增 Scene / IR 字段全部 optional / additive，缺省时现有 Scene 输出 + 渲染逐字不变（向后兼容、零回归）。
- 三端（SVG / 浏览器 Canvas / Node 位图）视觉一致性测试（含 shadow / blend 的对照快照或几何断言）；Node 不支持项有 `warnUnsupported` 可诊断降级。
- `apps/docs` 同步：shadow / blend 双语文档 + demo（含与 `opacity` / `clip` 的区分）。
