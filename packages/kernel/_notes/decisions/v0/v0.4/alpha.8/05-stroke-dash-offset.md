# ADR-05: Stroke dash offset

- 状态：Accepted
- 决策日期：2026-07-04
- 关联：[v0.4-alpha.8 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [path dash pattern naming](../../v0.1/beta.2/05-path-dash-pattern-naming.md)

## 背景

core 已经把虚线建模为 `dashPattern?: Array<number>`，并贯通 Path IR、Scene primitive、SVG / Canvas renderer、React / Vanilla adapter 与文档。这个字段不只是 Path 专用：Node 边框、shape outline、marker 内部 primitive、label pin leader 等也会复用同一套描边语义。

plot 的 axis domain line、grid line、reference line 等图表 guide 在使用虚线时，除了 dash / gap 长度，还需要控制虚线节奏从哪里开始。常见图表库把 dash offset 作为线条样式的一部分，用来让多条线的虚线 phase 对齐，或避免端点处出现不完整短 dash。

当前 Canvas animation 内部会为 pathDraw 使用 `ctx.lineDashOffset`，SVG animation 也会生成 `stroke-dashoffset`，但这只是 renderer 的动画实现细节，不是 IR / Scene 的稳定契约。上层包不能依赖它表达静态线条样式，否则 plot 会被迫发明 plot-only 的 dash phase 字段。

## 决策：给 core 通用描边能力补齐 `dashOffset`

core 在已有 `dashPattern` 覆盖面上新增 `dashOffset?: number`。字段语义是描边虚线相位，单位与当前 path user units 一致；字段是 JSON-safe finite number，允许正数、0 和负数。没有 `dashPattern` 时字段仍可保留在 IR / Scene 中，但没有可见效果。

```ts
type StrokeDashStyle = {
  dashPattern?: Array<number>;
  dashOffset?: number;
};
```

renderer 映射规则：

- SVG：`dashOffset` 映射为 `stroke-dashoffset`。
- Canvas：stroke 前设置 `ctx.lineDashOffset = dashOffset ?? 0`，并在每个 primitive / marker-local stroke 的 save / restore 作用域内隔离状态。
- pathDraw 动画仍可临时覆盖 dash pattern / dash offset；动画有效帧使用动画揭示语义，非动画或动画 settled base render 使用静态 `dashOffset`。

理由：

1. `dashOffset` 与 `dashPattern` 是同一类描边能力，字段命名保持并列，避免 `strokeDashoffset` 这类 renderer 细节泄漏到 core IR。
2. 允许有限负数可以对齐 SVG / Canvas 原生 dash phase 行为；schema 只拦截 NaN / Infinity，保证 JSON round-trip 不失真。
3. 覆盖范围跟 `dashPattern` 对齐，plot axis / grid / legend 等后续只需要消费 core 通用 line style，不需要 plot-only 平行语义。

## DSL 表面

```tsx
<Path stroke="gray" dashPattern={[6, 3]} dashOffset={3}>
  <Step kind="move" to={[0, 0]} />
  <Step kind="line" to={[120, 0]} />
</Path>
```

```tsx
<Node
  id="box"
  position={[0, 0]}
  stroke="currentColor"
  dashPattern={[4, 2]}
  dashOffset={-2}
/>
```

## 测试设计

`packages/kernel/core/tests/compile/stroke-dash-offset.test.ts` 覆盖 schema 与 compile 主路径：

- Path schema 接受 `dashPattern + dashOffset`。
- Path schema 接受只有 `dashOffset` 的合法 IR。
- Node schema / NodeDefault schema 接受 `dashOffset`。
- Node label pin 接受 `pin.dashOffset`。
- schema 拒绝 `dashOffset: NaN`。
- schema 拒绝 `dashOffset: Infinity` / `-Infinity`。
- schema 拒绝字符串数字。

- Path compile 后 `PathPrim.dashOffset` 保留。
- Node 边框 compile 后 `RectPrim` / `EllipsePrim` / shape outline primitive 保留 `dashOffset`。
- label pin leader compile 后 `PathPrim.dashOffset` 保留。
- `dashed` / `dotted` 预设只生成 `dashPattern`，不会自动生成 `dashOffset`。

`packages/kernel/render/tests/svg` 覆盖：

- Path / Rect / Ellipse 输出 `stroke-dasharray` 和 `stroke-dashoffset`。
- marker-local primitive 输出 `stroke-dashoffset`。
- pathDraw 动画的 `stroke-dashoffset` setup 不被静态字段破坏。

`packages/kernel/render/tests/canvas` 覆盖：

- Path / Rect / Ellipse stroke 前设置 `lineDashOffset`。
- 下一条没有 `dashOffset` 的 primitive 不继承上一条 offset。
- marker-local stroke 设置并隔离 `lineDashOffset`。
- pathDraw 动画仍可用动画 offset 覆盖当前帧。

`packages/kernel/react` / `packages/kernel/vanilla` 覆盖：

- `<Path dashOffset={...}>` builder / unbuilder round-trip。
- `<Node dashOffset={...}>` builder / unbuilder round-trip。
- `<Draw dashOffset={...}>` sugar 透传。
- Grid 等复用 path visual props 的 helper 自动获得 `dashOffset`，不单独写重复逻辑。

## 影响

- public IR：`IRPath`、`IRNode`、`NodeLabel.pin` 增加 `dashOffset?: number`。
- public Scene：`PathPrim`、`RectPrim`、`EllipsePrim`、marker-local `path` / `rect` / `ellipse` 增加 `dashOffset?: IRPathBase['dashOffset']` 或等价类型。
- contract：`ResolvedShapeStyle` / shape style context 增加 `dashOffset`，自定义 shape 可与 `dashPattern` 一起透传。
- renderer：SVG 输出 `stroke-dashoffset`；Canvas 在 stroke 前设置 `ctx.lineDashOffset`，并避免状态泄漏。
- adapter：React / Vanilla 与 `<Draw>` / `<Path>` / `<Node>` 公开 props 同步暴露。
- docs：Path / Draw / Node / Grid / shape registry / ScenePrimitive reference 与 changelog 同步。
- breaking：无。新增可选字段，不改变既有字段默认值和解释。

## 不在本 ADR 范围

- 不在 plot guide line / axis line / theme line style 中新增字段；plot 在 core 实现落地后单独消费。
- 不新增 `dashedOffset`、`strokeDashoffset`、CSS 字符串 dash shorthand 或 dotted shorthand。
- 不改变 `dashPattern` 的数组语义，也不改变 `dashed` / `dotted` 的优先级。
- 不把 pathDraw 动画的内部 offset 变成独立动画属性；本 ADR 只处理静态描边样式字段。

---

## 实现契约（必填）🔒

### Level

`red`

本 ADR 自评 level：`red`。它会改 core schema / compile / Scene 契约，并贯通 renderer、adapter、docs。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/kernel/core/src/schemas/path/path/schema.ts` | 加 | `dashOffset` | `z.number().finite().optional()` | — | 描边虚线相位，单位为 user units，可为负数。 |
| `packages/kernel/core/src/schemas/node/schema.ts` | 加 | `dashOffset` | `z.number().finite().optional()` | — | 节点边框虚线相位，配合 `dashPattern` 使用。 |
| `packages/kernel/core/src/schemas/node/schema.ts` | 加 | `pin.dashOffset` | `z.number().finite().optional()` | — | 标签引线虚线相位，配合 `pin.dashPattern` 使用。 |

### 文件 scope

- `packages/kernel/_notes/decisions/v0/v0.4/alpha.8/roadmap.md`
- `packages/kernel/_notes/decisions/v0/v0.4/alpha.8/05-stroke-dash-offset.md`
- `packages/kernel/_notes/decisions/v0/v0.4/roadmap.md`
- `packages/kernel/core/src/schemas/path/path/schema.ts`
- `packages/kernel/core/src/schemas/node/schema.ts`
- `packages/kernel/core/src/schemas/node/types.ts`
- `packages/kernel/core/src/contract/scene/path.ts`
- `packages/kernel/core/src/contract/scene/rect.ts`
- `packages/kernel/core/src/contract/scene/ellipse.ts`
- `packages/kernel/core/src/contract/scene/marker.ts`
- `packages/kernel/core/src/contract/shape/types.ts`
- `packages/kernel/core/src/compile/path/emit.ts`
- `packages/kernel/core/src/compile/node/types.ts`
- `packages/kernel/core/src/compile/node/layout.ts`
- `packages/kernel/core/src/compile/node/emit.ts`
- `packages/kernel/core/src/compile/node/text.ts`
- `packages/kernel/core/src/providers/shape/**`
- `packages/kernel/render/src/svg/**`
- `packages/kernel/render/src/canvas/**`
- `packages/kernel/react/src/kernel/**`
- `packages/kernel/react/src/sugar/**`
- `packages/kernel/vanilla/src/**`
- `packages/kernel/*/tests/**`
- `apps/docs/src/modules/docs/contents/kernel/**`
- `apps/docs/src/modules/docs/data/changelog.ts`

偏离白名单的改动需要回本 ADR 补 scope，并说明为什么属于 dashOffset 落地的必要范围。

### 测试象限

**Happy path（≥ 3）**：

- `path-dash-offset-scene`：`Path` 带 `dashPattern + dashOffset` 编译后 Scene 保留 offset。
- `node-border-dash-offset-scene`：`Node` 边框带 `dashOffset` 编译后 outline primitive 保留 offset。
- `svg-stroke-dashoffset`：SVG renderer 输出 `stroke-dashoffset`。
- `canvas-stroke-dashoffset`：Canvas renderer stroke 前设置 `lineDashOffset`。
- `adapter-round-trip`：React / Vanilla 对 Path / Node / Draw 的 `dashOffset` round-trip。

**边界（≥ 2）**：

- `dash-offset-without-pattern`：只有 `dashOffset` 无 `dashPattern` 仍保留字段，但没有额外可见 dashed 效果。
- `dash-offset-zero`：`dashOffset: 0` 不被当作 undefined 丢失。
- `dash-offset-negative`：`dashOffset: -2` schema 接受，renderer 原样输出 / 设置。

**错误路径（≥ 2）**：

- `dash-offset-nan-rejected`：schema 拒绝 NaN。
- `dash-offset-infinity-rejected`：schema 拒绝 ±Infinity。
- `dash-offset-string-rejected`：schema 拒绝字符串数字。

**交互（≥ 2）**：

- `canvas-no-leakage`：上一条 path 设置 offset，下一条未设置 offset 的 path 不继承。
- `pathdraw-animation-overrides-static-offset`：pathDraw 动画有效帧使用动画 offset，静态 `dashOffset` 不破坏揭示动画。
- `marker-local-offset-isolated`：marker-local primitive 的 dash offset 不泄漏到主 path 或其他 marker。

### 依赖的现有元素

- `dashPattern` 字段：扩展其覆盖面，不改变现有语义。
- `PathPrim` / `RectPrim` / `EllipsePrim` / marker primitive：新增可选描边字段。
- `applyDash` / `applyStrokeStyle` / `strokeCurrentPath`：扩展为设置 dash offset 并保证 Canvas 状态隔离。
- SVG `stroke-dasharray` 输出路径：并列输出 `stroke-dashoffset`。
- pathDraw animation：继续作为动画内部覆盖，不提升为本 ADR 的新动画 API。
