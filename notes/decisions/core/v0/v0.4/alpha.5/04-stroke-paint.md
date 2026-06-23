# ADR：core stroke paint 支持

- 状态：Accepted
- 决策日期：2026-06-23
- 关联：[core v0.2-alpha.7 ADR-01 Paint 基础](../../v0.2/alpha.7/01-paint-basics.md) · [core-design.md §4.5 Scene 编译器](../../../../../architecture/core-design.md#45-scene-编译器) · plot 后续渐变 mark 需求

## 背景

core 已经有 `PaintSpec` / `PaintValue` / `SceneResource` 这套 renderer-agnostic paint 基础：`linearGradient` / `radialGradient` / `pattern` / `image` 通过资源表进入 Scene，再由 SVG / Canvas renderer 各自物化。这个设计已经解决了 node 背景、闭合 path 区域、图例连续色带等 `fill` 场景。

但当前能力仍偏向 `fill`：IR 里的 `Node.fill` / `Path.fill` / `Scope.fill` 可以是 `string | PaintSpec`，而 `stroke` 仍是字符串语义。Scene primitive 层的 `PathPrim.stroke` / `RectPrim.stroke` / `EllipsePrim.stroke` 也仍基本是 `string`。这导致上层包无法用同一套 core paint 机制表达“线条本身使用渐变描边”。

plot 需要的典型场景是：path / line mark 按 y 方向、x 方向或任意屏幕方向使用渐变，例如温度高处红、低处蓝。实现层可以在 SVG 中用 `stroke="url(#...)"`，也可以画一个渐变后用路径做 mask，Canvas 可以用 `createLinearGradient()` 后描边。但这些都不应该由 plot 直接暴露成 SVG-only 语义。plot 应描述数据和方向语义，core 应提供 renderer-agnostic 的 stroke paint 能力。

## 决策：把 stroke 升级为与 fill 同级的 PaintSpec / PaintValue

本 ADR 扩展 alpha.7 的 Paint 基础：所有支持描边的 core IR 与 Scene primitive，其 `stroke` 从纯字符串升级为 paint union。

```ts
// IR 层：用户输入 / JSON IR
type IRPaintInput = string | IRPaintSpec;

type IRPath = {
  stroke?: IRPaintInput;
  fill?: IRPaintInput;
};

type IRNode = {
  stroke?: IRPaintInput;
  fill?: IRPaintInput;
};

type IRScope = {
  stroke?: IRPaintInput;
  fill?: IRPaintInput;
};

// Scene primitive 层：编译后 renderer 消费
type PathPrim = {
  stroke?: PaintValue;
  fill?: PaintValue;
};
```

编译期复用现有 paint registry：`PaintSpec` 无论出现在 `fill` 还是 `stroke`，都进入同一个 `Scene.resources` 去重表，并在 primitive 上写 `{ kind: 'resourceRef', id }`。纯色字符串仍原样保留。

React / Vanilla authoring 表面同步接受结构化 stroke paint。示例：

```tsx
<Path
  stroke={{
    kind: 'linearGradient',
    angle: 90,
    stops: [
      { offset: 0, color: '#e11d48' },
      { offset: 1, color: '#2563eb' },
    ],
  }}
  strokeWidth={4}
>
  <Step to={{ x: 0, y: 0 }} />
  <Step to={{ x: 80, y: 30 }} />
</Path>
```

vanilla builder 示例：

```ts
tikz.path({
  stroke: {
    kind: 'linearGradient',
    angle: 0,
    stops: [
      { offset: 0, color: '#2563eb' },
      { offset: 1, color: '#e11d48' },
    ],
  },
  strokeWidth: 3,
});
```

理由：

1. **保持 core 是底层能力来源**：plot / graph / 后续 Tier 2 不需要绕过 core 自造 SVG url、mask 或 renderer 私有语义。
2. **复用既有 Paint 资源模型**：`PaintSpec`、资源去重、稳定 id、SVG defs、Canvas gradient 都已经存在；本 ADR 只补 stroke 接入点。
3. **fill / stroke 语义对称**：alpha.7 已把 `PaintValue` 命名成 fill / stroke 共用的通用词汇表，当前实现只接 fill 是未完成状态。
4. **纯色零迁移成本**：已有 `stroke: 'red'` 继续合法；只是类型扩张。

## 待决策点

- **Node.stroke 是否同步升级**：本 ADR 倾向同步升级。虽然 plot 当前最急的是 path stroke，但 node 边框使用渐变描边与 path 描边属于同一 paint 能力，拆开会造成 API 不对称。
- **Scope.stroke 是否允许 PaintSpec 级联**：本 ADR 倾向允许。`scope.stroke` 作为路径 / 节点描边默认值时，应能传递 PaintSpec；编译后由各元素落到 primitive stroke。
- **Arrow marker 如何继承 PaintSpec stroke**：当前 marker 的 `contextStroke` 只能表达纯色上下文描边；`resourceRef` 不能安全写进 marker-local primitive。MVP 规则是：path stroke 为 PaintSpec 且 arrow 没有显式 `arrowDetail.color` / 端点 `color` 时，编译期 fail-loud，错误提示用户给 arrow 显式纯色；若 arrow 已有显式纯色，则 path 可继续使用 PaintSpec stroke，marker 使用显式纯色。
- **Text.fill / Text.stroke 不在本轮升级**：当前 text fill 仍是字符串，文字渐变涉及 glyph paint、bbox、renderer 差异和可访问性，另开 ADR。
- **mask / clip paint composition 不在本轮升级**：renderer 内部可用 mask 实现 stroke gradient，但 public contract 不暴露 mask。若未来需要“任意 mark 作为 paint mask”的组合能力，再单独设计。

## DSL 表面

本 ADR 的用户可见价值是：所有路径描边都可以使用 core paint，而不是只能使用纯色。

```tsx
<Tikz>
  <Path
    stroke={{
      kind: 'linearGradient',
      angle: 90,
      stops: [
        { offset: 0, color: 'crimson' },
        { offset: 0.5, color: 'gold' },
        { offset: 1, color: 'royalblue' },
      ],
    }}
    strokeWidth={6}
    lineCap="round"
  >
    <Step to={{ x: 0, y: 40 }} />
    <Step to={{ x: 30, y: 10 }} />
    <Step to={{ x: 80, y: 50 }} />
  </Path>
</Tikz>
```

plot 后续可以把：

```ts
{
  mark: 'line',
  encoding: {
    x: 'day',
    y: 'temperature',
    stroke: {
      kind: 'gradient',
      along: 'y',
      scale: ['blue', 'red'],
    },
  },
}
```

lower 成 core `Path.stroke = PaintSpec`。如果是“沿路径采样的 temperature 字段”而不是屏幕 y 方向渐变，plot 仍应在自身 lowering 中切段 / 插值 / 采样；这不属于 core stroke paint 的职责。

## 测试设计

`packages/core/core/tests/compile/paint.test.ts`、`packages/core/render/tests/draw.test.ts`、`packages/core/react/tests/render/paint-defs.test.tsx` 覆盖：

- path / node / scope 的 stroke PaintSpec 被收进同一资源表，并在 primitive 上变成 resourceRef。
- fill 与 stroke 使用相同 PaintSpec 时资源去重。
- SVG renderer 对 stroke resourceRef 输出 `stroke="url(#...)"`，并生成对应 paint defs。
- Canvas renderer 对 stroke resourceRef 使用 gradient / pattern / image paint 后执行 stroke。
- React kernel / sugar / vanilla builder 都能表达结构化 stroke paint。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- **core IR schema**：`Path.stroke`、`Node.stroke`、`Scope.stroke` 从 `string` 扩展为 `string | PaintSpec`。
- **Scene primitive**：`PathPrim.stroke`、`RectPrim.stroke`、`EllipsePrim.stroke` 从 `string` 扩展为 `PaintValue`。
- **compile**：现有 `PaintRegistry.resolve` 不应只叫 `resolveFill`；需要改成通用 `resolvePaint` 或保留旧名并新增语义清楚的包装。
- **renderer**：SVG / Canvas stroke 分派逻辑需要与 fill 对齐。
- **文档**：core paint / path / node 样式文档需要补 stroke paint 示例；plot 文档后续再描述数据绑定语义。
- **兼容性**：非 breaking。已有纯色 stroke 不变；只扩展合法输入。

## 不在本 ADR 范围

- plot 的 `encoding.stroke.gradient` / `along: 'x' | 'y' | vector` 具体 API。
- 数据值沿路径变化的分段下沉策略。
- 任意 mark mask / clip paint composition 的公开契约。
- 文字渐变填充或描边。
- SVG filter、blend mode、shader / WebGL 后端。

---

## 实现契约（必填）

> 本段是下游 core implement / test / document / wrapup 阶段的硬契约。偏离需回到本 ADR 加条或另开 ADR。

### Level

`red`

判级理由：动 core IR schema、Scene primitive contract、compile 资源收集、renderer 输出和 public exports。

### Schema 改动

| 文件                                          | 操作 | 字段名   | 类型                                                | 默认值       | describe 中文摘要                               |
| --------------------------------------------- | ---- | -------- | --------------------------------------------------- | ------------ | ----------------------------------------------- |
| `packages/core/core/src/schemas/path/path.ts` | 改   | `stroke` | `z.union([z.string(), PaintSpecSchema]).optional()` | `undefined`  | 路径描边 paint，可为 CSS color 或 PaintSpec     |
| `packages/core/core/src/schemas/node.ts`      | 改   | `stroke` | `z.union([z.string(), PaintSpecSchema]).optional()` | 现有默认不变 | 节点外框描边 paint，可为 CSS color 或 PaintSpec |
| `packages/core/core/src/schemas/scope.ts`     | 改   | `stroke` | `z.union([z.string(), PaintSpecSchema]).optional()` | `undefined`  | 级联默认描边 paint，可为 CSS color 或 PaintSpec |
| `packages/core/core/src/primitive/path.ts`    | 改   | `stroke` | `PaintValue`                                        | `undefined`  | 编译后的路径描边 paint                          |
| `packages/core/core/src/primitive/rect.ts`    | 改   | `stroke` | `PaintValue`                                        | `undefined`  | 编译后的矩形描边 paint                          |
| `packages/core/core/src/primitive/ellipse.ts` | 改   | `stroke` | `PaintValue`                                        | `undefined`  | 编译后的椭圆描边 paint                          |
| `packages/core/core/src/contract/shape/types.ts` | 改 | `stroke` | `PaintValue` 或等价结构化类型                       | `undefined`  | shape emit 的描边 paint                         |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/core/core/src/schemas/path/path.ts`
- `packages/core/core/src/schemas/node.ts`
- `packages/core/core/src/schemas/scope.ts`
- `packages/core/core/src/primitive/path.ts`
- `packages/core/core/src/primitive/rect.ts`
- `packages/core/core/src/primitive/ellipse.ts`
- `packages/core/core/src/primitive/paint.ts`
- `packages/core/core/src/contract/shape/types.ts`
- `packages/core/core/src/compile/paint.ts`
- `packages/core/core/src/compile/style.ts`
- `packages/core/core/src/compile/node.ts`
- `packages/core/core/src/compile/path/**`
- `packages/core/core/src/compile/marker-prim.ts`（仅当 arrow marker 继承 path stroke 需要适配 PaintValue）
- `packages/core/core/src/index.ts`
- `packages/core/react/src/kernel/Path.tsx`
- `packages/core/react/src/kernel/Node.tsx`
- `packages/core/react/src/kernel/_fields.ts`
- `packages/core/react/src/sugar/Draw.tsx`
- `packages/core/react/src/render/**`
- `packages/core/vanilla/src/**`
- `packages/core/render/src/svg/**`
- `packages/core/render/src/canvas/**`
- `packages/core/core/tests/ir/paint.test.ts`
- `packages/core/core/tests/compile/paint.test.ts`
- `packages/core/react/tests/kernel/**`
- `packages/core/react/tests/render/paint-defs.test.tsx`
- `packages/core/vanilla/tests/**`
- `packages/core/render/tests/**`
- `apps/docs/src/contents/core/**`（文档阶段）

偏离白名单的改动需要：

- 加新条目到本 ADR 的“实现契约 → 文件 scope”段，并注解为什么扩展 scope。
- 或开新 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `path stroke linearGradient`：`IRPath.stroke = PaintSpec` → Scene resources 有 paint，`PathPrim.stroke = { kind: 'resourceRef', id }`。
- `node stroke radialGradient`：`IRNode.stroke = PaintSpec` → 对应 rect / ellipse primitive stroke 使用 resourceRef。
- `scope stroke PaintSpec 级联`：`Scope.stroke = PaintSpec`，内部 path / node 无显式 stroke → 子 primitive 继承同一个 resourceRef。
- `fill 与 stroke 资源去重`：同一 PaintSpec 同时用于 fill / stroke → resources 只有一个 paint。

**边界（≥ 2）**：

- `纯色 stroke 保持原样`：`stroke: '#333'` 不进入 resources，primitive stroke 仍是字符串。
- `stroke undefined`：未设置 stroke 时不生成 paint resource，不改变默认描边行为。
- `PaintSpec stop 边界`：offset 0 / 1 的 gradient 用于 stroke 时 schema 接受，renderer 输出有限值。

**错误路径（≥ 2）**：

- `非法 stroke PaintSpec`：只有一个 stop 或 offset 越界 → schema reject，错误路径与 fill PaintSpec 一致。
- `非法 stroke 类型`：数字 / object 非 PaintSpec → schema reject。
- `renderer 缺失资源引用`：构造孤立 Scene，primitive stroke 引用不存在 id → renderer fail-loud 或按现有 paint 缺失策略处理，但行为需有测试锁定。

**交互（≥ 2）**：

- `arrow × gradient stroke`：path stroke 是 resourceRef 且 arrow 未显式设置纯色 `arrowDetail.color` / 端点 `color` 时，compile fail-loud；显式 arrow color 存在时 marker 使用该纯色，path 继续使用 gradient stroke，不可把 resourceRef 写入 marker-local primitive。
- `dashPattern × gradient stroke`：虚线 path 使用 gradient stroke 时 dash 行为不变。
- `opacity × gradient stroke`：`strokeOpacity` 与 PaintSpec stroke 同时存在时，SVG / Canvas 输出透明度一致。
- `clip × gradient stroke`：带 clipRef 的 group 内 path 使用 gradient stroke，defs 中 paint / clip 均存在且引用不冲突。

### 依赖的现有元素

- `PaintSpecSchema` / `IRPaintSpec`（`packages/core/core/src/schemas/paint.ts`）——扩展 stroke schema 直接复用。
- `PaintValue` / `SceneResource`（`packages/core/core/src/primitive/paint.ts`）——Scene primitive stroke 改用同一 paint value。
- `PaintRegistry`（`packages/core/core/src/compile/paint.ts`）——从 fill-only resolver 泛化到 paint resolver。
- `PaintDefs` / SVG paint builders（`packages/core/react/src/render/**`、`packages/core/render/src/svg/**`）——stroke resourceRef 复用 paint defs。
- Canvas paint resolver（`packages/core/render/src/canvas/**`）——stroke 使用与 fill 同源的 CanvasGradient / CanvasPattern。
- alpha.7 Paint 基础 ADR——本 ADR 是对其“PaintValue fill / stroke 共用”契约的补完。
