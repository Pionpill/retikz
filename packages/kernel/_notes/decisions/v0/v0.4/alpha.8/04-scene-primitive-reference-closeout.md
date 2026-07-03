# ADR-04：ScenePrimitive reference 与发布文案收口

- 状态：Proposed
- 决策日期：2026-07-03
- 关联：[v0.4-alpha.8 roadmap](./roadmap.md) · [ADR-01 closeout](./01-drawing-complete-alpha4-closeout.md) · [ADR-03 group effect boundary](./03-group-scope-effect-boundary.md)

## 背景

alpha.4 已把 `shadow` / `blendMode` 加到 Scene 可渲染主几何 primitive 上。当前组件页和 changelog 已说明 `<Node>` / `<Path>` 的效果，但 runtime reference 的 ScenePrimitive 页面仍只列 `fill`、`stroke`、`opacity` 等常见视觉字段，没有明确 `RectPrim` / `EllipsePrim` / `PathPrim` 支持 `shadow` / `blendMode`，也没有明确 `TextPrim` / `GroupPrim` 不支持。

同时，alpha.4 changelog 中 SVG filter region 的发布文案仍写“整 viewBox”，而当前实现位于 `render/src/svg/builders/shadow-defs.ts`，会用 `userSpaceOnUse` 并按 shadow offset / blur 外扩 scene layout。这是更精确的当前行为，应该在 alpha.8 收口时改正文案。

alpha.8 是收口版本，这类改动应作为 docs / release wording 修正，不改变 runtime 行为。

## 决策：alpha.8 必须完成 docs-only reference / changelog 对账

alpha.8 必须执行以下 docs-only 收口，完成后才关闭本 milestone 的文档对账项：

1. **ScenePrimitive reference 补字段**：说明 `RectPrim` / `EllipsePrim` / `PathPrim` 支持 `shadow?: ResolvedDropShadow` 与 `blendMode?: BlendModeValue`。
2. **ScenePrimitive reference 补边界**：说明 `TextPrim` 不支持图元级 `shadow` / `blendMode`；`GroupPrim` 目前只有 transforms / clipRef / children / id / meta / animations，不支持 group-level effect。
3. **changelog 精确化 filter region**：把“整 viewBox”改成“按 shadow 外扩后的 scene viewBox”，避免与当前实现漂移。
4. **不回写 alpha.4 Accepted ADR**：历史 ADR 保留当时设计语境；当前真源由本 ADR 和代码 / reference 对齐。

理由：

1. 自定义 renderer 作者会优先看 runtime reference；缺字段会导致它们漏渲染 alpha.4 effect。
2. docs-only 修正符合 alpha.8 收口主题，不改变 public API。
3. 不回写旧 ADR 可避免破坏历史设计记录，同时用 alpha.8 ADR 记录“当前真源”。

## 适用性说明

本 ADR 是 docs-only 收口，不是新绘图能力设计，因此不单独执行完整绘图完备性检测；完整审计入口在 [ADR-01](./01-drawing-complete-alpha4-closeout.md)。

- 适用范围：ScenePrimitive reference 与 alpha.4 changelog wording。
- 不适用范围：IR / schema、contract / provider、compile / Scene、render runtime、React / Vanilla API。
- 与完备性检测的关系：ADR-01 发现 runtime reference 没有完整呈现 alpha.4 图元级 effect 字段，本 ADR 只负责把该文档缺口补齐。
- 边界说明：reference 需要提醒自定义 renderer 消费 `shadow` / `blendMode`，同时明确 Text / Group 不支持图元级 effect，且视觉效果不改变 hit area。

## 已执行口径

- changelog 只改 alpha.4 render 条目，避免重写历史发布记录。
- ScenePrimitive reference 中英文同步补齐 effect 字段与 Text / Group 边界。

## DSL 表面

无新增 DSL。

## 测试设计

docs-only follow-up 验证：

- `git diff --check`
- `pnpm --filter @retikz/docs exec -- tsc --noEmit --pretty false`

## 影响

- 对 runtime：无。
- 对 public API：无。
- 对 docs：ScenePrimitive reference 更完整；changelog 文案与当前实现一致。

## 不在本 ADR 范围

- 修改 `shadow` / `blendMode` runtime 行为。
- 给 `TextPrim` / `GroupPrim` 新增 effect 字段。
- 重写 alpha.4 ADR 历史内容。
- 修改 docs 站导航或新增页面。

---

## 实现契约（必填）🔻

### Level

`green`

本 ADR 自评 level：`green`。仅 docs data / MDX。

### Schema 改动

无。

### 文件 scope

- `packages/kernel/_notes/decisions/v0/v0.4/alpha.8/04-scene-primitive-reference-closeout.md`（新建）
- `packages/kernel/_notes/decisions/v0/v0.4/alpha.8/01-drawing-complete-alpha4-closeout.md`（引用本 ADR）
- `packages/kernel/_notes/decisions/v0/v0.4/alpha.8/roadmap.md`（登记本 ADR）
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/scene-primitive/index.zh.mdx`（docs follow-up）
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/scene-primitive/index.en.mdx`（docs follow-up）
- `apps/docs/src/modules/docs/data/changelog.ts`（精确化 alpha.4 render 文案）

### 测试象限

**Happy path（≥ 3）**：

- `rect-ellipse-path-effects-documented`：三类几何 primitive 的 effect 字段有说明。
- `custom-renderer-contract-clear`：reference 告知自定义 renderer 需要消费 effect。
- `changelog-filter-region-accurate`：filter region 文案与当前实现一致。

**边界（≥ 2）**：

- `text-no-effect-documented`：TextPrim 不支持 effect。
- `group-no-effect-documented`：GroupPrim 不支持 group-level effect。

**错误路径（≥ 2）**：

- `no-runtime-change`：diff 不触碰 `packages/kernel/*/src/**`。
- `no-navigation-change`：diff 不改 docs data navigation。

**交互（≥ 2）**：

- `effect-not-hit-area`：reference 不暗示 shadow 外溢可命中。
- `interaction-not-covered`：reference 不把 `id/meta` 误写成 manifest。

### 依赖的现有元素

- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/scene-primitive/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/scene-primitive/index.en.mdx`
- `apps/docs/src/modules/docs/data/changelog.ts`
- `packages/kernel/render/src/svg/builders/shadow-defs.ts`
