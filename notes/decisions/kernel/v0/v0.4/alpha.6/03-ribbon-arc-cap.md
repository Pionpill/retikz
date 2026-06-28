# ADR-03: Ribbon 自定义圆弧端帽

- Status: 被 ADR-07 收敛（已通过 `Path.ribbon.start/end.cap` 落地）
- Decision date: 2026-06-27
- Owner: core
- Related:
  - [alpha.6 roadmap](./roadmap.md)
  - [ADR-01 Ribbon 可变宽度路径](./01-ribbon.md)
  - [ADR-02 Ribbon 边界与对齐增强](./02-ribbon-boundary-and-alignment.md)
  - [v0.4 roadmap](../roadmap.md)
  - [core design](../../../../../architecture/core-design.md)

## 收尾说明

本 ADR 的显式圆弧端帽能力已经作为 `Path.ribbon.start.cap` / `Path.ribbon.end.cap` 的结构化 cap 选项落地。下文描述的独立 `Ribbon` 宿主已被 [ADR-07](./07-path-kind-registry.md) 收敛。

## 背景

ADR-02 已经把 `Ribbon` 端面抽象成 `start.cap` / `end.cap`，并支持 `"butt"`、`"round"`、`"square"` 三种内置端帽。`"round"` 可以生成半圆端帽，但圆心、半径和 sweep 都由编译器从 ribbon 当前两侧边界自动推导。

后续 Sankey / alluvial layout 会遇到另一类需求：流带端面需要贴合外部节点槽位或环形边界，端帽弧线的圆心和半径来自布局结果，而不是端面两侧点的中点。这类几何在 plot 层手搓 path 可以局部解决，但会绕开 core 已有的 `Ribbon` 宽度、对齐、采样、样式和 renderer-agnostic lowering 能力。

因此这个能力应补在 core `Ribbon` 的端帽语义里，而不是新增 plot-only 几何。核心目标是：用户仍然描述一条 ribbon，端面可以选择由给定圆心和半径的圆弧闭合，compile 仍然输出普通闭合 `PathPrim`。

TikZ 本身有 `arc` path action，语义由圆心、半径和角度确定。retikz 已有 `Step` arc 能力，但 ribbon 端帽不是一条独立 path，它连接的是编译器生成的左右边界端点，所以需要在 `RibbonEndpoint.cap` 中保留端帽上下文。

## 决策：`cap` 增加 `type: "arc"` 对象变体

扩展 `RibbonEndpointSchema.cap`，从单纯枚举扩展为字符串枚举或对象 union：

```ts
export const RibbonArcCapSweep = {
  Short: "short",
  Long: "long",
} as const;

export const RibbonArcCapSchema = z
  .object({
    type: z.literal("arc").describe("Discriminator for a custom circular arc ribbon cap."),
    center: PositionLikeSchema.describe("Circle center used by the cap arc."),
    radius: z
      .number()
      .finite()
      .positive()
      .describe("Circle radius in user units used by the cap arc."),
    sweep: z
      .enum(RibbonArcCapSweep)
      .optional()
      .describe("Which circular arc connects the two ribbon sides; omitted means short."),
  })
  .strict()
  .describe("A ribbon endpoint cap closed by a user-specified circular arc.");

export const RibbonCapSchema = z
  .union([z.enum(RibbonCap), RibbonArcCapSchema])
  .describe("Ribbon endpoint cap style: built-in flat/round/square or custom circular arc.");
```

`PositionLikeSchema` 指当前 codebase 中等价于 `IRPosition | PolarPosition` 的位置 schema；实际实现应复用已有位置 schema，不另造一套点结构。`cap: "round"` 保持现有语义：编译器自动生成半圆端帽。`cap: { type: "arc", ... }` 表示用户明确给出端帽圆弧。

编译语义：

- 对中心线模式，先按现有逻辑得到端点两侧边界点，再用 `cap.center` 和 `cap.radius` 生成连接两点的圆弧端面。
- 对 `align: "left"` / `"right"`，圆弧仍然连接实际生成的两侧边界点；如果其中一侧就是中心线，arc 也以该边界点为端点。
- `center` 支持笛卡尔坐标和 polar position。polar 若使用字符串 `origin`，应沿用 compile 阶段已有的 node lookup 语义解析。
- `radius` 必须为正有限数。
- 两侧端点到 `center` 的距离必须与 `radius` 在编译精度内一致；不一致时 fail-loud，提示 arc cap cannot connect the ribbon sides with the given center/radius。首版不做隐式投影或半径自动修正。
- `sweep` 默认为 `"short"`，选择两个端点之间绝对角度较小的弧；`"long"` 选择补弧。首版不增加 clockwise / counterclockwise，因为端帽场景通常只需要短弧或长弧，方向可由 start/end 两侧点顺序和端点位置推导。
- 输出仍然是 `PathPrim`。若当前 ribbon 已经在采样路径中，arc cap 可以沿用采样点近似；若当前 ribbon 走结构化 path command，arc cap 应优先输出 `arc` command，除非与现有 command 拼接限制冲突。

理由：

1. `type: "arc"` 对齐已有 `Step` arc 词汇，LLM 和人都能直觉理解，不把特殊 Sankey 能力藏进 plot。
2. 字段全为 JSON-safe 数据，保留 IR 持久化、structured output 和 JSON round-trip 契约。
3. 保留现有字符串端帽，已有 `cap: "round"` / `"square"` 文档和代码无需迁移。
4. fail-loud 比隐式投影更适合布局调试；Sankey layout 应负责算出自洽的槽位几何，core 负责稳定消费。
5. 输出仍然是普通闭合 `PathPrim`，renderer 不需要新增 primitive。

## 待决策点

- **arc command 还是采样 line**：结构化 centerline lowering 下优先输出 `arc` command；采样 lowering 下可输出 line 近似。若实现发现 `PathPrim` 的 `arc` command 无法自然表达端帽拼接，可以先统一采样，但必须在文档中说明 arc cap 是视觉圆弧而不是保留为 Scene arc command。
- **radius mismatch 容差**：实现应使用 compile precision 相关容差，不新增公开字段。若现有 round 精度不足以稳定判断，可使用一个内部小容差并在测试中固定。
- **是否支持 boundary 模式 arc cap**：本 ADR 首选只覆盖 centerline 模式，因为 boundary 模式已经由 `upper` / `lower` 明确给出外边界，端面可以由用户在边界 path 中表达。若实现成本低，也可以支持 boundary 模式的 `startCap` / `endCap`，但这需要新增 schema 字段，不在本 ADR 中。
- **多模型设计评估**：`develop-design` 要求 red/yellow ADR 做多 LLM 评估；当前对话中可用 sub-agent 工具要求只有用户显式要求代理时才能 spawn。本草案先不执行代理评估，待人工确认是否允许开独立评估线程。

## DSL 表面

React：

```tsx
<Ribbon
  width={24}
  start={{
    cap: {
      type: "arc",
      center: [-180, 0],
      radius: 32,
      sweep: "short",
    },
  }}
  end={{
    cap: {
      type: "arc",
      center: [180, 0],
      radius: 32,
    },
  }}
  fill="#f59e0b"
>
  <Step kind="move" to={[-180, 24]} />
  <Step kind="cubic" control1={[-60, 80]} control2={[60, -80]} to={[180, -24]} />
</Ribbon>
```

Vanilla：

```ts
ribbon(
  [
    { type: "step", kind: "move", to: [-180, 24] },
    {
      type: "step",
      kind: "cubic",
      control1: [-60, 80],
      control2: [60, -80],
      to: [180, -24],
    },
  ],
  {
    width: 24,
    start: { cap: { type: "arc", center: [-180, 0], radius: 32 } },
    end: { cap: { type: "arc", center: [180, 0], radius: 32, sweep: "long" } },
    fill: "#f59e0b",
  },
);
```

JSON IR：

```json
{
  "type": "ribbon",
  "width": 24,
  "start": {
    "cap": {
      "type": "arc",
      "center": [-180, 0],
      "radius": 32,
      "sweep": "short"
    }
  },
  "end": {
    "cap": {
      "type": "arc",
      "center": [180, 0],
      "radius": 32
    }
  },
  "children": [
    { "type": "step", "kind": "move", "to": [-180, 24] },
    {
      "type": "step",
      "kind": "cubic",
      "control1": [-60, 80],
      "control2": [60, -80],
      "to": [180, -24]
    }
  ]
}
```

## 测试设计

`packages/kernel/core/tests/compile/ribbon.test.ts` 覆盖 schema、lowering、错误路径和与现有端帽/对齐/采样的交互。React / Vanilla 只需要验证 authoring surface 能把对象 cap 原样落进 IR，因为它们共用 core schema 和 compile。

具体 case 见下方实现契约。

## 影响

- `packages/kernel/core/src/schemas/ribbon.ts`：新增 arc cap schema，修改 `RibbonEndpointSchema.cap` 类型。
- `packages/kernel/core/src/compile/ribbon.ts`：端帽生成逻辑需要从字符串分支扩展到对象分支，并解析 `center`。
- `@retikz/react`：`RibbonProps` 派生自 `IRRibbon['start']` / `IRRibbon['end']`，通常只需类型自然更新；若 builder/unbuilder 对 cap 有显式枚举假设，需要同步。
- `@retikz/vanilla`：builder config 派生自 core IR，通常只需类型自然更新；若测试缺失应补一条。
- `apps/docs`：Ribbon 页面需要补 arc cap 用法、边界诊断说明和一个最小 demo。
- 不新增 renderer primitive，不修改 `PathPrim` 类型，除非实现确认需要复用已有 `arc` command。

## 不在本 ADR 范围

- Sankey / alluvial 的节点布局、slot 分配、link 排序、crossing 优化。
- plot `<LinkMark>` 的公开 API 和 lowering 改造。它后续可以消费本 ADR 的 core 能力，但不在本次 core ADR 中实现。
- 椭圆弧端帽、贝塞尔端帽、任意 path 端帽。
- arc cap 自动吸附、自动修正半径、自动反推圆心。
- boundary 模式新增独立端帽字段。boundary 模式已经能通过 `upper` / `lower` 自行表达复杂端面。

---

## 实现契约

### Level

`red`

本 ADR 修改 core IR schema、compile lowering、public authoring type surface 和 docs。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
| --- | --- | --- | --- | --- | --- |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `RibbonArcCapSchema.type` | `z.literal("arc")` | 无 | 自定义圆弧端帽的判别字段 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `RibbonArcCapSchema.center` | `Position | PolarPosition` | 无 | 端帽圆弧的圆心 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `RibbonArcCapSchema.radius` | `number > 0` | 无 | 端帽圆弧半径 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 新增 | `RibbonArcCapSchema.sweep` | `"short" \| "long"` | `"short"` | 连接两侧边界点时使用短弧或长弧 |
| `packages/kernel/core/src/schemas/ribbon.ts` | 修改 | `RibbonEndpointSchema.cap` | `"butt" \| "round" \| "square" \| RibbonArcCap` | `"butt"` | 端点端帽，可为内置端帽或自定义圆弧端帽 |

### 文件 scope

允许修改：

- `packages/kernel/core/src/schemas/ribbon.ts`
- `packages/kernel/core/src/schemas/index.ts`
- `packages/kernel/core/src/compile/ribbon.ts`
- `packages/kernel/core/tests/compile/ribbon.test.ts`
- `packages/kernel/react/src/kernel/Ribbon.tsx`
- `packages/kernel/react/tests/kernel/*.test.tsx`
- `packages/kernel/vanilla/src/builder/ribbon.ts`
- `packages/kernel/vanilla/src/builder/types.ts`
- `packages/kernel/vanilla/tests/*.test.ts`
- `apps/docs/src/contents/kernel/components/draw/ribbon/**`

偏离上述白名单需要回到本 ADR 补充 scope，或新开 ADR。

不允许在本 ADR 中修改：

- `packages/graph/**`
- renderer primitive 类型系统
- 与 ribbon 无关的 Path / Node / Layout 行为
- PaintSpec schema

### 测试象限

Happy path（至少 3）：

- `schema accepts arc cap and preserves JSON round-trip`：含 start/end arc cap 的 ribbon 经过 `JSON.stringify` / `JSON.parse` / `RibbonSchema.parse` 后语义不丢。
- `start arc cap closes a centerline ribbon with a circular endpoint`：起点使用 arc cap，输出闭合且包含预期端面弧点或 arc command。
- `end arc cap closes a centerline ribbon with default short sweep`：终点省略 `sweep` 时按 `"short"` 行为闭合。
- `long sweep uses the complementary circular arc`：同一圆心半径和端点下，`sweep: "long"` 生成与 short 不同的补弧。

边界（至少 2）：

- `arc cap works with align left/right`：单侧对齐时，arc cap 连接实际两侧边界点，不把中心线错当中线。
- `arc cap works with sampled width stops`：使用 `width.kind: "stops"` 导致采样 lowering 时，arc cap 仍然输出有限闭合 path。
- `polar center resolves before arc cap geometry`：`center` 使用 polar position 时能解析为笛卡尔圆心。

错误路径（至少 2）：

- `schema rejects nonpositive arc cap radius`：`radius <= 0` 被 zod 拒绝。
- `schema rejects unknown arc cap sweep`：`sweep` 不是 `"short"` / `"long"` 时被拒绝。
- `compile rejects center radius that cannot connect ribbon sides`：两侧边界点不在给定圆上时抛出可诊断错误。
- `compile rejects polar center with unsupported string origin only if existing resolver cannot resolve it`：保留现有 position resolver 的错误语义。

交互（至少 2）：

- `round and square caps remain unchanged`：现有字符串端帽输出保持稳定。
- `start.direction/end.direction interact with arc cap after tangent resolution`：端点方向改变边界点后，arc cap 连接改变后的端点。
- `fill/stroke/shadow/blendMode survive arc cap lowering`：样式透传不因 arc cap 丢失。
- `React Ribbon accepts arc cap props without custom adapter fields`：React authoring surface 到 IR 一致。
- `Vanilla ribbon accepts arc cap config without custom adapter fields`：Vanilla builder 到 IR 一致。

### 依赖的现有元素

- `RibbonEndpointSchema`（`packages/kernel/core/src/schemas/ribbon.ts`）：扩展 `cap` 字段。
- `Vector2Schema` / `PolarPositionSchema`（`packages/kernel/core/src/schemas/position.ts` 与相关文件）：复用位置表达。
- `emitRibbonPrimitive`（`packages/kernel/core/src/compile/ribbon.ts`）：扩展端帽生成分支。
- `PathPrim.commands`（`packages/kernel/core/src/primitive/path.ts`）：继续作为唯一输出 primitive。
- `Step` arc 语义（`packages/kernel/core/src/schemas/path/step.ts` 与 compile path）：复用圆弧参数心智模型，不复用为 ribbon 端帽 schema。
- React / Vanilla Ribbon authoring surface：仅薄封装 core IR，不新增 adapter 私有能力。
