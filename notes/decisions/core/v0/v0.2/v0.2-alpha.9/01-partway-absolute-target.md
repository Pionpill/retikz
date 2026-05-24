# ADR-01：比例 partway 定位（AbsoluteTarget + AbsoluteOffsetPosition + BetweenPosition）

- 状态：Proposed
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.9 plan §第一部分](./roadmap.md) · [tikz-gap-analysis §5 定位](../../../../../analysis/2026-05-07-tikz-gap-analysis.md) · [alpha.6 ADR-01 结构化 Target](../v0.2-alpha.6/01-structured-target-anchor.md)（对象主契约 + target resolve）· [alpha.6 ADR-02 edgePoint](../v0.2-alpha.6/02-side-t-edge-point.md)（`_edge.ts` lerpPoint）· 本 milestone [ADR-02](./02-clip.md) / [ADR-03](./03-viewbox-override.md)

> **前置依赖**：复用 alpha.6 的 target resolve（NodeTarget → 世界坐标，含 anchor / edgePoint）+ `geometry/_edge.ts` 的 `lerpPoint`。

## 背景

`OffsetPositionSchema`（`packages/core/src/ir/position/offset-position.ts:5`）= `{ of, offset:[dx,dy] }` 纯向量加法（对齐 TikZ `($(A)+(1,2)$)`）。`TargetSchema`（`ir/path/target.ts:64-72`）= union(`Position` / `Polar` / `NodeTarget` / `Relative` / `RelativeAccumulate` / `Offset`)。

TikZ calc 还有 **比例 partway** `($(A)!t!(B)$)`（A、B 间 t 处 = lerp）、投影、完整 affine。retikz 只对齐了加法。

痛点：缺"边中点 / A→B 三分之一处"这类高频定位。lerp 现成（`_edge.ts` `lerpPoint`）。

**两个坑**：

- **评审 P1#1（schema 递归）**：若 partway 端点定成 `TargetSchema`，而 `TargetSchema` 已含 `PositionSchema` + relative——`PositionSchema` 再引 `TargetSchema` 会循环 / 被迫 `z.lazy`；且 `{ relative }` / `{ relativeAccumulate }` 需"上一段终点"游标，在 Node.position / partway 端点无意义。
- **评审 P1#3（legacy offset 字符串绕回）**：`OffsetPositionSchema.of` 仍含 `z.string().min(1)`（`offset-position.ts:8`）——直接复用它当 partway 端点会把 core 字符串节点引用绕回，违 alpha.6「IR 对象主契约」。
- **评审 P1（legacy polar 字符串绕回）**：`PolarPositionSchema.origin` 同样含 `z.string().min(1)`（`polar-position.ts:10`）——直接把 `PolarPositionSchema` 放进 `AbsoluteTarget`、或让 `AbsoluteOffsetPosition.of` 含它，都会经 polar origin 绕回字符串。须用 `AbsolutePolarPositionSchema`（origin 仅对象）。**完整保持 absolute 闭包**：闭包内任何分支都不含 `z.string()` 节点引用。

## 选项

### A. 自包含 `AbsoluteTarget` + `AbsoluteOffsetPosition` + `BetweenPosition`（**推荐**）

```ts
// ir/position/absolute-target.ts —— 自包含、无 path-relative、无字符串绕回、无环
export const AbsoluteTargetSchema: z.ZodType = z.lazy(() =>
  z.union([
    PositionSchema, AbsolutePolarPositionSchema, NodeTargetSchema,  // 用 absolute polar（见下）
    AbsoluteOffsetPositionSchema,   // of 仅对象（见下）
    BetweenPositionSchema,          // 可嵌套
  ]),
);
// AbsolutePolarPosition：origin 不复用 legacy PolarPositionSchema（其 origin 含 z.string()，
// 见 polar-position.ts:10——会经 polar origin 把字符串绕回；评审 P1）
export const AbsolutePolarPositionSchema: z.ZodType = z.lazy(() =>
  z.object({
    origin: z.union([PositionSchema, AbsolutePolarPositionSchema, NodeTargetSchema]).optional(),  // 无字符串
    angle: z.number().finite(),
    radius: z.number().finite(),
  }),
);
// AbsoluteOffsetPosition：of 不复用 legacy OffsetPositionSchema（其 of 含 z.string()，评审 P1#3）
export const AbsoluteOffsetPositionSchema = z.object({
  of: z.union([PositionSchema, AbsolutePolarPositionSchema, NodeTargetSchema]),  // 无字符串（polar 也用 absolute）
  offset: z.tuple([z.number().finite(), z.number().finite()]),
});
export const BetweenPositionSchema = z.object({
  between: z.tuple([AbsoluteTargetSchema, AbsoluteTargetSchema]),
  t: z.number(),   // 0=A 1=B；外插与否见待决策
});
```

- 优：自包含闭包（不含 relative、不被 `TargetSchema` 反引）→ 无环（评审 P1#1）；`of` 仅对象 → 不绕回字符串（评审 P1#3）；`BetweenPosition` 可嵌套（三等分 = between of between）。
- 缺：新增一套 schema（与 `TargetSchema` 部分重叠）；`z.lazy` 处理自包含递归。

### B. partway 端点复用 `TargetSchema`

- 缺：schema 递归 + 把 relative / 字符串绕进端点（评审 P1#1/#3 两坑）。否决。

### C. partway 端点只接受 Cartesian / NodeTarget（最窄）

- 缺：不能 between 两个 OffsetPosition / 嵌套 between，表达力受限。倾向 A（更全且自洽）。

## 决策：A

理由：

1. **避免 schema 递归（P1#1）**：`AbsoluteTarget` 自包含、排除 path-relative，`Position` ↔ `Target` 不成环。
2. **守 alpha.6 对象主契约（P1#3）**：`AbsoluteOffsetPositionSchema.of` 仅对象，不复用含 `z.string()` 的 legacy。
3. **lerp 现成**：复用 `_edge.ts` lerpPoint，几何零新增。
4. **可嵌套 + 双落点**：`BetweenPosition` 自身属 `AbsoluteTarget`，同时进 Position（Node.position / Coordinate）与 Step.to。

## 决策细节

1. **`AbsoluteTarget` 成员**：`Position` / `AbsolutePolarPosition` / `NodeTarget` / `AbsoluteOffsetPosition` / `BetweenPosition`；**排除** `Relative` / `RelativeAccumulate`，**排除** legacy `Polar` / `Offset`（含字符串 origin / of）。
2. **`AbsolutePolarPositionSchema`（评审 P1）**：`origin` = `union([Position, AbsolutePolarPosition, NodeTarget])`（**无字符串**，不复用含 `z.string()` origin 的 legacy `PolarPositionSchema`）；`angle` / `radius` finite；`z.lazy` 包（origin 自引）。
3. **`AbsoluteOffsetPositionSchema`**：`of` = `union([Position, AbsolutePolarPosition, NodeTarget])`（无字符串，polar 用 absolute）；`offset` finite tuple。
4. **`BetweenPositionSchema`**：`{ between:[AbsoluteTarget, AbsoluteTarget], t:number }`；compile resolve A、B 到世界坐标后 `lerpPoint(A,B,t)`；嵌套递归 resolve。
5. **落点**：加入 `Node.position` / `Coordinate` 的 position union（`ir/node.ts:115` / `ir/coordinate.ts:25`）；`TargetSchema` 追加 `BetweenPositionSchema`（其端点 `AbsoluteTarget` 已排除 relative，不引环）。
6. **`z.lazy`**：`AbsoluteTargetSchema` / `AbsolutePolarPositionSchema` 都用 `z.lazy` 包（自引）；闭包自洽、构造不栈溢出。
7. **NodeTarget 端点**：A/B 含 NodeTarget 时走 alpha.6 anchor / edgePoint 解析（如 `A.north` → `B.south` 中点）。
8. **英文 `.describe`**：`AbsoluteTargetSchema` / `AbsolutePolarPositionSchema` / `AbsoluteOffsetPositionSchema` / `BetweenPositionSchema` 及字段（`origin` / `of` / `offset` / `between` / `t`）逐一英文 describe。

## 待决策点

- **字段命名**：`between`/`t` vs `lerp`/`at`。倾向 `between`/`t`（直观）。
- **`t` 外插**：是否允许 `t<0` / `t>1`（端点外延长线）。倾向允许（有用，文档说明），schema 不加 min/max；或限 `[0,1]`。
- **落点范围**：仅 Position / 也进 Target。倾向两者（与 §5 共用约定一致）。
- **公开别名**：react 是否去 `IR` 前缀（`AbsoluteTarget` / `BetweenPosition`）。

## DSL 表面

```tsx
{/* 两节点边的中点放节点 */}
<Node position={{ between: [{ id:'A' }, { id:'B' }], t: 0.5 }}>M</Node>
{/* anchor 端点：A.north → B.south 的 1/3 处 */}
<Coordinate id="p" position={{ between: [{ id:'A', anchor:'north' }, { id:'B', anchor:'south' }], t: 1/3 }} />
{/* Step.to 用 partway */}
<Path><Step kind="line" to={{ between: [[0,0], [10,10]], t: 0.5 }} /></Path>
{/* 嵌套 between（三等分起点） */}
<Coordinate id="q" position={{ between: [{ between: [{id:'A'},{id:'B'}], t: 1/3 }, { id:'C' }], t: 0.5 }} />
```

## 影响

- `packages/core/src/ir/position/{absolute-target,absolute-polar-position,absolute-offset-position,between-position}.ts`（新建）。
- `packages/core/src/ir/node.ts` / `ir/coordinate.ts`：position union 加 `BetweenPosition`。
- `packages/core/src/ir/path/target.ts`：`TargetSchema` 加 `BetweenPosition`。
- `packages/core/src/compile/position.ts`（+ target resolve）：`between` → resolve A/B + lerp（嵌套递归）。
- `packages/core/src/index.ts`：公开 `IRBetweenPosition` / `IRAbsoluteTarget`。
- 对外 API：纯叠加 union 分支，零破坏。

## 不在本 ADR 范围

- **投影 projection / 完整 calc 表达式**：学术 / 逆结构化方向，不做（plan §不做）。
- **clip**→ [ADR-02](./02-clip.md)；**viewBox override**→ [ADR-03](./03-viewbox-override.md)。

---

## 实现契约（必填）

### Level

`red`

- 动 `ir/position/**`（新 3 schema）+ `ir/node.ts` / `ir/coordinate.ts` / `ir/path/target.ts`（union 加分支）+ `compile/**`（resolve）+ `index.ts`
- 取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/position/absolute-target.ts` | 新建 schema | `AbsoluteTargetSchema` | `z.lazy(() => z.union([Position, AbsolutePolar, NodeTarget, AbsoluteOffset, Between]))` | — | 绝对端点（无 path-relative / 无字符串）；用于 partway 端点 |
| `ir/position/absolute-polar-position.ts` | 新建 schema | `AbsolutePolarPositionSchema` | `z.lazy(() => z.object({ origin?: union([Position,AbsolutePolar,NodeTarget]), angle: finite, radius: finite }))` | — | 极坐标（origin 仅对象，不接受字符串；评审 P1） |
| `ir/position/absolute-offset-position.ts` | 新建 schema | `AbsoluteOffsetPositionSchema` | `z.object({ of: union([Position,AbsolutePolar,NodeTarget]), offset: finite tuple })` | — | 偏移定位（of 仅对象，不接受字符串） |
| `ir/position/between-position.ts` | 新建 schema | `BetweenPositionSchema` | `z.object({ between: [AbsoluteTarget, AbsoluteTarget], t: number })` | — | A、B 间 t 比例点（lerp） |
| `ir/node.ts` / `ir/coordinate.ts` | 改 union | position | 追加 `BetweenPositionSchema` | — | Node/Coordinate 定位加 partway |
| `ir/path/target.ts` | 改 union | `TargetSchema` | 追加 `BetweenPositionSchema` | — | Step.to 加 partway |

> **英文 `.describe`**：上述 3 新 schema 顶层 + 各字段（`of` / `offset` / `between` / `t`）必须英文。

### 文件 scope

- `packages/core/src/ir/position/{absolute-target,absolute-polar-position,absolute-offset-position,between-position}.ts`（新建）
- `packages/core/src/ir/position/index.ts`（导出）
- `packages/core/src/ir/node.ts` / `ir/coordinate.ts` / `ir/path/target.ts`（union 加分支）
- `packages/core/src/compile/position.ts`（+ 相关 target resolve）：`between` resolve + lerp
- `packages/core/src/index.ts`（公开类型）
- `packages/core/tests/ir/position/between.test.ts`（新建）+ `packages/core/tests/compile/partway.test.ts`（新建）
- `apps/docs/src/contents/core/concepts/positioning/`（partway demo + AbsoluteTarget 说明）

### 测试象限

#### Happy path（≥ 3）

- `between_literal_midpoint`：`{ between:[[0,0],[10,10]], t:0.5 }` → `[5,5]`
- `between_endpoints`：`t:0` → A、`t:1` → B
- `between_node_anchors`：`{ between:[{id:'A',anchor:'north'},{id:'B',anchor:'south'}], t:0.5 }` → 两 anchor 中点
- `between_in_position_and_target`：同形态在 `Node.position` 与 `Step.to` 均合法

#### 边界（≥ 2）

- `nested_between`：between of between（三等分）resolve 正确
- `t_extrapolation`：`t:1.5` / `-0.5`（按拍定：外插 / 钳制 / 报错）
- `absolute_offset_object_of`：`AbsoluteOffsetPosition` 的 `of` 为对象 NodeTarget 正常

#### 错误路径（≥ 2）

- `reject_relative_endpoint`：`{ between:[{relative:[1,1]}, ...], t:0.5 }` → schema 拒（P1#1）
- `reject_string_of`：`AbsoluteOffsetPosition` 的 `of:'A'`（字符串）→ schema 拒（P1#3）
- `reject_string_polar_origin`：`AbsolutePolarPosition` 的 `origin:'A'`（字符串）→ schema 拒（P1，不经 polar origin 绕回）
- `no_schema_cycle`：构造 / parse `AbsoluteTargetSchema` 不栈溢出（`z.lazy` 闭包自洽）

#### 交互（≥ 2）

- `between_with_scope_transform`：partway 在 transformed scope 内 → 坐标投回正确
- `union_discrimination`：`between` key 不撞 `id` / `of` / `relative`，union 判别无歧义
- `between_endpoint_offset_position`：端点用 `AbsoluteOffsetPosition` → 先 resolve offset 再 lerp

### 依赖的现有元素

- `packages/core/src/ir/position/*` 的 `PositionSchema` / `PolarPositionSchema` —— **引用**：AbsoluteTarget 成员
- `packages/core/src/ir/path/target.ts` 的 `NodeTargetSchema`（alpha.6）—— **引用**：对象节点引用端点
- `packages/core/src/ir/position/offset-position.ts` 的 `OffsetPositionSchema` —— **不复用**（其 of 含字符串）；新建 `AbsoluteOffsetPositionSchema` 替代
- `packages/core/src/ir/position/polar-position.ts` 的 `PolarPositionSchema`（origin 含 `z.string()`，line 10）—— **不复用**（评审 P1）；新建 `AbsolutePolarPositionSchema` 替代
- `packages/core/src/geometry/_edge.ts` 的 `lerpPoint`（alpha.6）—— **引用**：between 插值
- alpha.6 target resolve（`compile/path/anchor.ts`）—— **引用**：NodeTarget 端点解析
