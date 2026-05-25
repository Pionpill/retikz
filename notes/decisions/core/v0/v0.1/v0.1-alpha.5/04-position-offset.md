# ADR-04：`Node.position` / `Coordinate.position` 加 `OffsetPosition`（任意 offset 相对定位）

- 状态：Accepted
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../roadmap.md) · [core-design.md §4.5](../../../../../architecture/core-design.md) · [alpha.4 ADR-01](../v0.1-alpha.4/01-node-at-positioning.md) · [alpha.4 ADR-02](../v0.1-alpha.4/02-coordinate-placeholder.md)

## 背景

`Node.position` / `Coordinate.position` 当前 union 三种形态：

| schema | 相对性 | 任意 `(dx, dy)` |
|---|---|---|
| `PositionSchema` (`[x, y]`) | 绝对 | — |
| `PolarPositionSchema` (`{ origin, angle, radius }`) | 相对 origin（极坐标） | 否——要手算 `atan2/hypot` |
| `AtPositionSchema` (`{ direction, of, distance? }`) | 相对 of | **否，仅 8 方向 + 单标量距离** |

缺口：**"相对节点 A 偏移 `(dx, dy)`"** 这种最直白的相对定位现在表达不了：

```
✘ "把 B 放在 A 右 30 下 10"——三种 schema 都表达不了
  - 绝对：得先知道 A 的坐标
  - polar：得手算极坐标 atan2(10, 30) ≈ 18.43°、hypot(30, 10) ≈ 31.62
  - at：只能选 "right" 或 "below-right"，距离单标量
```

`IRTarget` 上有 `RelativeTargetSchema` (`{ relative: [dx, dy] }`)，但它的基准点是 **path 前一步的终点**，不是命名节点；且只挂 `step.to`，不入 position union。

对应 TikZ：`calc` library 的 `($(A) + (30, 10)$)` 语法。

## 选项

### A. 新建 `OffsetPositionSchema` 加入 position union（**推荐**）

```ts
// packages/core/src/ir/position/offset-position.ts
const OffsetPositionSchema = z.object({
  of: z
    .union([z.string().min(1), PositionSchema, PolarPositionSchema])
    .describe(
      'Reference base point: node id string (forward-reference rejected), Cartesian [x, y] (direct coordinate, no pre-definition needed), or PolarPosition (recursive polar chain via its own origin). Mirrors PolarPosition.origin union shape.',
    ),
  offset: z
    .tuple([z.number(), z.number()])
    .describe('Offset (dx, dy) in user units'),
})
```

加入 `Node.position` 与 `Coordinate.position` 的 union；解析在 `compile/position.ts` 的 `resolvePosition` 加分支。

**`of` 接受三种基准点形态**（与 `PolarPosition.origin` 的 union 形态一致）：

- `string`（节点 id）—— 引用命名节点，要求在 IR 中**先**定义（前向引用拒绝）
- `Position` 笛卡尔 `[x, y]` —— 直接坐标基准，无需任何预定义；适合"基于一个绝对点偏移"的场景
- `PolarPosition` —— 递归极坐标基准（polar 自带 origin 递归），可以表达"基于 (A + 极坐标偏移) 再加 (dx, dy)"这种复合意图

这三种合在一起覆盖 TikZ `calc` library 的所有基准点用法（节点引用、原始坐标、极坐标表达式作基准）。

- 优点：schema 内字段不重叠（与 `AT_DIRECTIONS` / `polar.{origin,angle,radius}` 互不冲突）；命名直白；LLM `.describe(...)` 容易写清；`of` 形态与 polar.origin 一致，schema 间风格对称
- 缺点：position union 又长一个变体（从 3 变 4）

### B. 扩 `AtPositionSchema`，让 `distance` 兼接 `[dx, dy]`

```ts
distance?: number | [number, number]
// 给数组时，direction 字段忽略，按 [dx, dy] 偏移
```

- 优点：不增加 union 变体
- 缺点：**direction + 二维 offset 同字段角色冲突**，语义混淆；`.describe(...)` 难写清"二选一"；schema 内字段重叠是已知坏模式（schema validation 容易表面通过但语义错乱）

### C. 不加，让用户算

用户在自己代码里算 `[A.x + dx, A.y + dy]`，IR 仍只有绝对坐标。

- 优点：零 schema 改动
- 缺点：失去"相对节点"的意图表达；codec 反推 IR → TikZ 时无法生成 `calc` 语法；LLM 生成不直观

## 决策：A（新建 `OffsetPositionSchema`）

理由：

1. **schema 字段不重叠优于 schema 内字段重叠**——AGENTS.md 现有惯例
2. **保留意图**：IR 持久化高层"相对 A 偏移 (dx, dy)"语义，不是 evaluated 绝对坐标——codec 反推时能直接生成 `calc` 语法
3. **LLM 友好**：`.describe(...)` 可以白纸黑字写"相对节点 A 偏移 (dx, dy)"，模型生成不歧义
4. **与 alpha.4 ADR-01 (`AtPosition`) / ADR-02 (`Coordinate`) 风格对齐**：都是"高层意图字段进 IR、compile 时解析为笛卡尔"

## 决策细节

> 选项 A 主决策之外，3 项字段细节均已拍板。下游 implement 阶段按此执行。

1. **字段名 = `offset`**：最朴素，dx/dy 直觉强。**不与 path `RelativeTarget.relative` 复用同名**——两者基准点不同（命名节点 / 笛卡尔 / polar vs 前步终点），同名易混淆
2. **同步进 `IRTarget`（本 ADR 一并处理）**：让 `step.to` 也能写 `{ of, offset }`——把 OffsetPosition 加进 `TargetSchema` union。step.to 拥有"任意基准 + 任意 offset"能力，与 `Node.position` / `Coordinate.position` 一致——避免"position 能写、target 不能写"的语义不对称
3. **前向引用规则**：与 polar `origin` / at `of` 一致——**仅当 `of` 是 string（节点 id）或嵌套 PolarPosition 内部的 string origin 时**，要求被引用节点在 IR 中**先**定义（顺序敏感）。`of` 为 `Position`（直接笛卡尔）时**无前向引用概念**（字面坐标值）

## DSL 表面

```tsx
// of: string（节点 id）—— 节点 B 在 A 右 30 下 10
<Node id="A" position={[0, 0]}>A</Node>
<Node id="B" position={{ of: 'A', offset: [30, 10] }}>B</Node>

// of: Position（笛卡尔坐标）—— 无需先定义节点
<Node position={{ of: [50, 50], offset: [10, 0] }}>direct</Node>

// of: PolarPosition（极坐标作基准）—— 极坐标算完作为基准点，再加 offset
<Node id="hub" position={[100, 100]}>hub</Node>
<Node position={{
  of: { origin: 'hub', angle: 45, radius: 30 },
  offset: [5, 0],
}}>polar-then-offset</Node>

// Coordinate 也接受（任一 of 形态）
<Coordinate id="marker" position={{ of: 'hub', offset: [-20, 0] }} />
<Coordinate id="anchor" position={{ of: [0, 0], offset: [10, 10] }} />

// 嵌套链：基于 Coordinate 再 offset
<Coordinate id="A" position={[0, 0]} />
<Coordinate id="B" position={{ of: 'A', offset: [50, 0] }} />
<Node position={{ of: 'B', offset: [0, 30] }}>Below B</Node>

// 与既有 position 形态混用（同 IR 内）
<Node id="abs" position={[0, 0]}>abs</Node>
<Node id="pol" position={{ origin: 'abs', angle: 30, radius: 50 }}>polar</Node>
<Node id="at" position={{ direction: 'right', of: 'pol', distance: 40 }}>at</Node>
<Node id="off" position={{ of: 'at', offset: [10, -5] }}>offset-of-at</Node>

// step.to 也接受 OffsetPosition（IRTarget 一并扩）
<Path arrow="->">
  <Step kind="move" to="A" />
  <Step to={{ of: 'B', offset: [5, -10] }} />  {/* path 终点 = B + (5, -10) */}
</Path>

// step.to 用笛卡尔基准 + offset
<Path>
  <Step kind="move" to={[0, 0]} />
  <Step to={{ of: [50, 50], offset: [10, 0] }} />  {/* path 终点 = (60, 50) */}
</Path>
```

## 测试设计

- **schema 校验**：合法 / `offset` 缺失 / `of` 缺失 / `offset` 非二元组
- **compile**：能 resolve 到正确世界坐标
- **嵌套**：B referent A、C referent B 链式累积
- **前向引用**：先用后定义 → 抛错（与 polar `origin` / at `of` 一致）
- **与既有 position 形态互不冲突**：同 IR 内混用绝对 / polar / at / offset

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/ir/position/offset-position.ts`**（新文件）：`OffsetPositionSchema` + `IROffsetPosition` 派生类型
- **`packages/core/src/ir/position/index.ts`**：barrel 加 export
- **`packages/core/src/ir/node.ts`**：`NodeSchema.position` union 加 `OffsetPositionSchema`
- **`packages/core/src/ir/coordinate.ts`**：`CoordinateSchema.position` union 加 `OffsetPositionSchema`
- **`packages/core/src/ir/path/target.ts`**：`TargetSchema` union 加 `OffsetPositionSchema`——让 `step.to` 也能用 OffsetPosition
- **`packages/core/src/compile/position.ts`**：`resolvePosition` 加 OffsetPosition 分支（按 `of` 三种形态分支：string id 查 nodeIndex / Position 直接用 / PolarPosition 递归解析）
- **`packages/core/src/compile/path.ts`** 的 `parseTarget` / `resolveTarget`：path step target 解析加 OffsetPosition 分支，复用 `resolvePosition`
- **`packages/core/src/index.ts`**：公开 API 加 `OffsetPositionSchema` / `IROffsetPosition`
- **React adapter**：`_builder` 透传即可，无需特殊改造；`_unbuilder` 反推同
- **测试**：core schema + compile（position resolve + path target resolve）+ 前向引用拒绝
- **文档双语**：`apps/docs/doc/zh|en/components/node.mdx` + `coordinate.mdx` + `path.mdx`（step.to 章节增 OffsetPosition 形态）API 表加新形态 + demo

## 不在本 ADR 范围

- **嵌套深度限制**：A→B→C→...→Z 链式 offset 不设深度上限（与 polar nested origin 一致）
- **`AtPosition.distance` 扩成二元组**：选项 B 已否决，不做
- **`parseTargetSugar.ts` 加 string sugar**：OffsetPosition 没有简短字符串形态（`of` + `offset` 二元组难用单字符串表达），保持对象形态；未来如需 sugar 另开 ADR

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/**`（新 schema 文件 + position union 扩）
- 动 `packages/core/src/compile/**`（`resolvePosition` 加分支）
- 动 `packages/core/src/index.ts`（公开 API）
- 跨级取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/position/offset-position.ts` | 新建 schema | `OffsetPositionSchema` | `z.object({ of, offset })` | — | 基准点 + (dx, dy) 偏移的相对定位（对应 TikZ `calc`） |
| `packages/core/src/ir/position/offset-position.ts` | 新建字段 | `OffsetPositionSchema.of` | `z.union([z.string().min(1), PositionSchema, PolarPositionSchema])` | — | 基准点：节点 id（前向引用拒绝）/ 笛卡尔 `[x,y]` / PolarPosition（递归）；与 `PolarPosition.origin` 同形 |
| `packages/core/src/ir/position/offset-position.ts` | 新建字段 | `OffsetPositionSchema.offset` | `z.tuple([z.number(), z.number()])` | — | [dx, dy] 偏移量（user units） |
| `packages/core/src/ir/node.ts` | 改 | `NodeSchema.position` | union(...) 加 `OffsetPositionSchema` | — | 节点中心位置 union 扩 |
| `packages/core/src/ir/coordinate.ts` | 改 | `CoordinateSchema.position` | union(...) 加 `OffsetPositionSchema` | — | Coordinate 位置 union 扩 |
| `packages/core/src/ir/path/target.ts` | 改 | `TargetSchema` | union(...) 加 `OffsetPositionSchema` | — | path step.to 也接受 OffsetPosition，与 Node/Coordinate.position 对称 |

### 文件 scope

- `packages/core/src/ir/position/offset-position.ts`（新建）
- `packages/core/src/ir/position/index.ts`（barrel 加 export）
- `packages/core/src/ir/node.ts`（修改：position union）
- `packages/core/src/ir/coordinate.ts`（修改：position union）
- `packages/core/src/ir/path/target.ts`（修改：TargetSchema union 加 OffsetPositionSchema）
- `packages/core/src/index.ts`（公开 API 加 export）
- `packages/core/src/compile/position.ts`（`resolvePosition` 加分支）
- `packages/core/src/compile/path.ts`（`parseTarget` / `resolveTarget` 加 OffsetPosition 分支，复用 `resolvePosition`）
- `packages/core/tests/compile/node-at.test.ts`（扩 case，或新建 `node-offset.test.ts`）
- `packages/core/tests/compile/path.test.ts`（扩 case：step.to 用 OffsetPosition）
- `packages/react/tests/kernel/_builder.test.tsx`（确认 position 透传 / `_unbuilder` 反推）
- `apps/docs/doc/zh|en/components/node.mdx`（API 表增行 + demo）
- `apps/docs/doc/zh|en/components/coordinate.mdx`（同上）
- `apps/docs/doc/zh|en/components/path.mdx`（step.to 段增 OffsetPosition 形态 + demo）
- `apps/docs/doc/zh|en/components/node/*.demo.tsx`（新 demo 文件 1 个）
- `apps/docs/doc/zh|en/components/coordinate/*.demo.tsx`（新 demo 文件 1 个）
- `apps/docs/doc/zh|en/components/path/*.demo.tsx`（新 demo 文件 1 个：step.to 用 OffsetPosition）

### 测试象限

#### Happy path（≥ 3）

- `offset_of_string_basic`：`{ of: 'A', offset: [30, 10] }` 相对 A=(0,0) → 世界坐标 (30, 10)
- `offset_of_cartesian_direct`：`{ of: [50, 50], offset: [10, 0] }` → 世界坐标 (60, 50)（无需任何节点定义）
- `offset_of_polar_recursive`：`{ of: { origin: 'A', angle: 0, radius: 50 }, offset: [0, 20] }` → 极坐标解析后 (50, 0) + offset → (50, 20)
- `offset_of_polar_nested_polar`：`{ of: { origin: { origin: 'A', angle: 0, radius: 30 }, angle: 90, radius: 20 }, offset: [5, 0] }` → 递归 polar 链解析后 + offset
- `offset_negative_values`：`offset: [-20, -10]` → 反向偏移正确
- `offset_nested_id_chain`：A→B→C 链式 offset（id 形式） → 终点正确累积

#### 边界（≥ 2）

- `offset_zero_value`：`offset: [0, 0]` → 与基准点重合
- `offset_of_cartesian_at_origin`：`{ of: [0, 0], offset: [10, 0] }` → 世界坐标 (10, 0)
- `offset_referent_at_polar_node`：referent 是 Node、Node 自身用 polar position → polar 解析后基准点 + offset
- `offset_referent_at_at_position`：referent 是 Node、Node 自身用 `AtPosition` → 同上

#### 错误路径（≥ 2）

- `offset_of_string_forward_reference_rejected`：`of` 是 string id 但被引用节点在 IR 中**后**定义 → compile 抛错（与 polar `origin` / at `of` 一致）
- `offset_of_nested_polar_string_forward_ref_rejected`：`of: { origin: 'Z', ... }`（嵌套 polar 内 origin 字符串）但 'Z' 后定义 → 同上抛错（前向引用规则递归生效）
- `offset_of_unknown_id_rejected`：`of: 'nonexistent'` → 抛错
- `offset_missing_offset_field_rejected`：`{ of: 'A' }`（缺 offset） → zod 校验失败
- `offset_non_tuple_offset_rejected`：`offset: [1, 2, 3]` 或 `offset: 'invalid'` → zod 校验失败
- `offset_of_invalid_type_rejected`：`of: { foo: 'bar' }`（既不是 string、不是 Position、不是 PolarPosition） → zod 校验失败

#### 交互（≥ 2）

- `offset_node_then_path_string_reference`：Node B 用 offset 相对 A，path `step.to` 用 `'B'` 字符串引用 → 全链路 resolve 正确
- `offset_mixed_with_other_position_kinds`：同 IR 内 Node A 绝对、Node B polar、Node C offset（of 是 id）、Node D offset（of 是笛卡尔）、Node E offset（of 是 polar）—— 五种 position 并存全部 resolve
- `offset_of_polar_with_at_node_origin`：`of: { origin: <at-positioned node id>, angle, radius }` → polar 的 origin 链到 at-positioned 节点，全链路 resolve
- `step_to_offset_of_string`：`<Step to={{ of: 'A', offset: [10, 5] }} />` → path 终点 = A + (10, 5)
- `step_to_offset_of_cartesian`：`<Step to={{ of: [50, 50], offset: [10, 0] }} />` → path 终点 = (60, 50)
- `step_to_offset_of_polar`：`<Step to={{ of: { origin: 'A', angle: 0, radius: 30 }, offset: [0, 5] }} />` → path 终点 = polar 解析后 + offset
- `step_to_offset_chains_with_relative`：path 内连续 step——`<Step kind="move" to={{ of: 'A', offset: [0, 0] }} />` 然后 `<Step to={{ relative: [10, 0] }} />` → IRTarget 五种形态混用全部 resolve

### 依赖现有元素

- `packages/core/src/ir/position/position.ts` 的 `PositionSchema` —— **引用**：作为 OffsetPosition resolve 后的产物类型；**也作为 `of` union 成员之一**（笛卡尔基准点）
- `packages/core/src/ir/position/polar-position.ts` 的 `PolarPositionSchema` —— **引用**：作为 position union 内兄弟 schema 不变；**也作为 `of` union 成员之一**（极坐标基准点），其内部 `origin` 递归支持自然延伸到 OffsetPosition.of 内
- `packages/core/src/ir/position/at-position.ts` 的 `AtPositionSchema` —— **引用**：作为 position union 内兄弟 schema 不变（**不**作为 `of` 成员，保持 `of` union 与 polar.origin 同形）
- `packages/core/src/ir/path/target.ts` 的 `TargetSchema` —— **修改**：union 加 `OffsetPositionSchema`，让 step.to 也支持 OffsetPosition
- `packages/core/src/compile/position.ts` 的 `resolvePosition` —— **修改**：加 OffsetPosition 分支，内部递归 resolve `of`（按 string / Position / PolarPosition 分支）
- `packages/core/src/compile/path.ts` 的 `parseTarget` / `resolveTarget` —— **修改**：path step target 解析加 OffsetPosition 分支，复用 `resolvePosition`
- `packages/core/src/compile/node.ts` 的 `nodeIndex` —— 引用：OffsetPosition.of 为 string 时通过它查 nodeIndex 拿 referent layout center
- `packages/core/tests/compile/node-at.test.ts` —— 引用：测试模式（forward-reference 拒绝等）可参考
