# ADR-01：结构化 Target / Anchor（path target 对象唯一 + AnchorRef + parseNodeTarget 单一真源）

- 状态：Accepted
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.6 plan §第一部分](../../../plans/v0/v0.2-alpha.6.md) · [roadmap §结构化 Target / Anchor 提案](../../../plans/v0/roadmap.md#结构化-target--anchor-提案) · [alpha.3 ADR-01 Shape Registry](../v0.2-alpha.3/01-shape-registry.md)（anchor 接口先固化）· [alpha.1 ADR-02 nodeIndex/anchor 解析](../v0.2-alpha.1/02-node-index-anchor-resolution.md) · 本 milestone [ADR-02](./02-side-t-edge-point.md) / [ADR-03](./03-tikz-to-layout-rename.md)

> **前置依赖**：本 ADR 的 anchor 解释面消费 alpha.3 ADR-01 固化的 `ShapeDefinition.anchor(rect, name)` + 数字角度 generic（`boundaryPoint`）。`{ side, t }` 边上比例点的几何由本 milestone [ADR-02](./02-side-t-edge-point.md) 定义，本篇只把它纳入 schema 与 compile 分发。

## 背景

path target 现状是 `packages/core/src/ir/path/target.ts:24-35` 的 6 分支 union，其中节点引用走 `z.string().min(1)`：`'A'`（节点中心 auto clip）/ `'A.north'`（命名 anchor）/ `'A.30'`（角度 anchor）。痛点：

- **anchor 语义藏在字符串里**：schema 只看到 `string`，无法约束 anchor 枚举、角度、边上比例点、offset；LLM 只能盲拼字符串，错了报"字符串解析失败"而非结构化诊断。
- **`.` 分隔符泄漏解析细节**：把"节点 id 不能含点"暴露给用户。
- **解析分散两处**：`compile/parseTarget.ts:24-38` `parseNodeRef`（编译期拆三态 `{ kind: 'node' | 'anchor' | 'angle' }`）+ `parsers/parseTargetSugar.ts`（react / Draw 只解析 `'+dx,dy'`，节点 id 原样透传给 core）。消费方 `compile/path/anchor.ts` 的 `refPointOfTarget`（17-42）/ `clipForTarget`（58-84）逐 step 调 `parseNodeRef` + `resolveAnchor`。

TikZ 用 `(A.north)` / `(A.30)` / `(A.north east)` 表达，retikz 现以字符串镜像；但要表达"上边从左到右 25% 处"这类边上比例点、或 anchor 后再 offset，字符串小 DSL 会继续膨胀。对象化把这些升级为 schema 可校验的字段。

## 选项

### A. TargetSchema 对象唯一 + parseNodeTarget 在 parser 层 eager 转对象（**推荐**）

```ts
// ir/path/target.ts —— 节点引用唯一契约（删 z.string 分支）
const NAMED_ANCHORS = Object.values(RECT_ANCHORS) as [string, ...string[]];

export const AnchorRefSchema = z.union([
  z.enum(NAMED_ANCHORS),       // 命名 anchor（复用 geometry/rect.ts 9 名）
  z.number().finite(),          // 角度 anchor（同 PolarPosition 度数；禁 NaN/Infinity）
  z.object({ side: z.enum(['north','south','east','west']), t: z.number().min(0).max(1) }),  // 边上比例点（几何见 ADR-02）
]);

export const NodeTargetSchema = z.object({
  id: z.string().min(1),
  anchor: AnchorRefSchema.optional(),                                  // 缺省 = 自动贴边界
  offset: z.tuple([z.number().finite(), z.number().finite()]).optional(),  // 世界系平移
});

export const TargetSchema = z.union([
  PositionSchema, PolarPositionSchema,
  NodeTargetSchema,             // 节点 / Coordinate 引用：唯一契约（无字符串形态）
  RelativeTargetSchema, RelativeAccumulateTargetSchema, OffsetPositionSchema,
]);
```

字符串 shorthand 由 react / parsers eager 解析成对象（`parsers/parseNodeTarget.ts`）后才入 core；core ir / compile / 错误诊断永远拿对象。

- 优：schema 可校验（anchor 枚举、`t ∈ [0,1]`、offset finite）；LLM tool schema / JSON Patch 字段级；core 单一对象代码路径，无字符串分支；解析单一真源。
- 缺：直接手写字符串 target 的 core 测试 / fixture 需迁移成对象（react JSX 不受影响——eager 在前）。pre-rc 允许破坏。

### B. 对象 + `z.string()` 兼容分支并存（core 仍 parseNodeRef 兜底）

union 同时留对象与字符串，core compile 对字符串走 `parseNodeRef` 归一。

- 优：直接手写字符串 IR 不破坏。
- 缺：双轨——序列化 IR 可能是字符串也可能是对象，LLM / patch / 错误诊断要处理两形态；与"IR 主契约对象化"目标相悖。用户已拍板**不要兼容分支、直接去除**（见决策）。

### C. 继续扩字符串小 DSL（`'A.north:0.25'` 表达 `{ side, t }`）

不对象化，给字符串加新语法表达边上比例点。

- 缺：正是对象化要消灭的"字符串 DSL 膨胀"；`t` 无法 schema 约束、错了仍是解析失败。否决。

## 决策：A

理由：

1. **用户已拍板（决策 2 + 追加"直接去除"）**：core schema 不保留 `z.string()` 兼容分支，alpha.6 即删，不留到 rc。IR 主契约 = 对象 target。
2. **schema 友好 + 结构化诊断**：`anchor` 可枚举、`t` 可约束、offset 可 finite 校验；错误能报 `anchor.t must be between 0 and 1` 而非字符串解析失败。
3. **单一真源、无双轨**：`parsers/parseNodeTarget` 是字符串 → 对象唯一入口（仅 React DSL 层消费）；core compile 对象唯一，序列化 IR 即对象。
4. **消费 alpha.3 anchor 接口、不开双轨**：命名 anchor 走 `ShapeDefinition.anchor`，角度走 `boundaryPoint` generic，内置 / 注册 shape 同源。

## 决策细节

> 主选项已锁，以下随对话 / review 收敛，下游按此执行。

1. **删 `z.string()` 分支（决策 2）**：`TargetSchema` 去字符串；`arc` step `center?`、`rectangle` step `from`/`to`（`ir/path/step.ts:208,277-278`）共用 `TargetSchema`，自动对象化，无需逐 step 改。
2. **`parseNodeRef` → `parsers/parseNodeTarget`（搬层）**：现 `compile/parseTarget.ts` 整体删除；新建 `packages/core/src/parsers/parseNodeTarget.ts`（与 `parseTargetSugar` 同层），返回 `IRNodeTarget` 对象。**搬出 compile 的理由**：若 react adapter 复用 compile 层函数，形成 parser / adapter 反向依赖 compile；放 parser 入口后 compile 不再消费字符串。
3. **dotted-id 限制（明说）**：`parseNodeTarget` 按**第一个点**切分（`'A.north'` → id `'A'` + anchor `'north'`），故**含 `.` 的 id 不能用字符串 shorthand**，必须写对象 `{ id: 'a.b', anchor: 'north' }`。沿用旧 `parseNodeRef` 行为，文档须显著声明；对象形态不受此限。
4. **`{ side, t }` 仅对象形态**：字符串 shorthand 刻意不扩 `'A.north:0.25'`（避免字符串 DSL 膨胀）。
5. **offset 世界系 / 已解析坐标系（决策 3）**：先把 `{ id, anchor }` / `{ side, t }` 解析到最终点，再直接加 `[dx, dy]`；节点 rotate 只影响 anchor / 边点位置，**不旋转 offset**。未来若需节点局部偏移，另加显式字段，不让 `offset` 双语义。
6. **schema 禁非有限数值**：角度 `z.number().finite()`、offset 两分量 `.finite()`（与 `position` / `transform` / `font` 既有 `.finite()` 一致；NaN/Infinity 与 JSON 可序列化 IR 冲突）。`t` 的 `.min(0).max(1)` 已隐式拒 NaN/Infinity。
7. **react eager 解析**：`parseTargetSugar` 扩展——字符串节点 ref 经 `parseNodeTarget` 转对象（相对偏移分支保留在前）；`builder.ts` 各 step 已调 `parseTargetSugar(p.to)`，扩展后自动产出对象；`Draw` / `parseWay` way item 节点 ref 同步归一。
8. **compile 对象唯一**：`refPointOfTarget` / `clipForTarget` 删字符串分支与 `parseNodeRef` import，按 `isNodeTarget(target)` 走对象路径（`anchor` undefined → 中心 / boundary；number → 角度；string → 命名；`{side,t}` → `resolveEdgePoint`，ADR-02）；offset 最后世界系叠加。
9. **公开类型**：core 导出 `IRNodeTarget` / `IRAnchorRef`；react `src/index.ts` re-export（友好别名命名见待决策点）。
10. **`Coordinate` 带 anchor 的退化（已拍板）**：Coordinate 零尺寸——命名 anchor / 角度 anchor **退化为中心**（兼容旧行为：零尺寸 rect 的 9 anchor 与 boundary 本就都 = 中心）；`{ side, t }` 对零尺寸 Coordinate **显式报错**（`{ side, t } is not meaningful on a zero-size Coordinate '<id>'`）——边上比例点对一个点无意义，报错比静默返回中心更可诊断。实现：`resolveEdgePoint` 检测 layout 零尺寸（width 与 height 均 0）即抛。
11. **每个 zod 字段必须 `.describe(...)`，描述用英文（已拍板）**：`AnchorRefSchema`（顶层）/ `NodeTargetSchema`（顶层）/ `id` / `anchor` / `offset` / `{ side, t }` 内的 `side` / `t` / `TargetSchema`（顶层）全部带英文 `.describe`（仓库铁律——schema 字段 describe 是 schema reference 文档 + LLM tool schema 的来源）。

## 待决策点

- **`AnchorRef` 字段命名**：`{ side, t }` vs `{ edge, position }`；倾向 `side/t`（避免与 `Node.position` 混淆）。
- **`NodeTarget` 命名**：`NodeTarget`（roadmap 草案）vs `RefTarget`（也引用 Coordinate）；react 公开别名是否去 `IR` 前缀。
- **`parseWay` shorthand 边界**：way item 字符串现支持哪些形态，节点 ref 经 `parseNodeTarget` 后与坐标 / 相对字符串的优先级。

## DSL 表面

```tsx
{/* 对象主契约：命名 / 角度 / 边上比例点 / anchor 后 offset */}
<Path><Step kind="line" to={{ id: 'A', anchor: 'north-east' }} /></Path>
<Path><Step kind="line" to={{ id: 'A', anchor: 30 }} /></Path>
<Path><Step kind="line" to={{ id: 'A', anchor: { side: 'north', t: 0.25 } }} /></Path>
<Path><Step kind="line" to={{ id: 'A', anchor: { side: 'west', t: 1 / 3 }, offset: [-4, 0] }} /></Path>

{/* 字符串 shorthand 仍可写（React DSL 层 eager 转对象）；含 . 的 id 必须用对象 */}
<Path><Step kind="line" to="A.north" /></Path>
<Path><Step kind="line" to={{ id: 'a.b', anchor: 'north' }} /></Path>
```

```jsonc
// 序列化 IR 永远是对象（无字符串节点引用）
{ "type": "step", "kind": "line", "to": { "id": "A", "anchor": { "side": "north", "t": 0.25 } } }
```

## 测试设计

`packages/core/tests/ir/path/target.test.ts`（新建，schema）+ `packages/core/tests/parsers/parseNodeTarget.test.ts`（新建）+ `packages/core/tests/compile/path/anchor.test.ts`（扩）+ `packages/react/tests/kernel/builder.test.tsx`（扩 eager）覆盖：schema 接受 / 拒绝、parseNodeTarget 等价、compile 对象路径、react eager == 对象写法、offset 世界系、core fixture 迁移。具体见"实现契约 § 测试象限"。

## 影响

- `packages/core/src/ir/path/target.ts`：新增 `AnchorRefSchema` / `NodeTargetSchema` + `IRAnchorRef` / `IRNodeTarget`；`TargetSchema` 删 `z.string()` 分支。
- `packages/core/src/parsers/parseNodeTarget.ts`（新建）+ `parsers/index.ts`（导出）：从 `compile/parseTarget.ts` 搬迁、改返回对象。
- `packages/core/src/compile/parseTarget.ts`（删除）：`parseNodeRef` + `ParsedNodeRef` 整体移除。
- `packages/core/src/compile/path/anchor.ts`：`refPointOfTarget` / `clipForTarget` 对象唯一（删字符串分支 + `parseNodeRef` import；加 `isNodeTarget` / `isRelative` 守卫；offset 叠加；`{side,t}` 调 `resolveEdgePoint`）。
- `packages/core/src/parsers/parseTargetSugar.ts`：字符串节点 ref 经 `parseNodeTarget` 转对象。
- `packages/core/src/parsers/parseWay.ts`：way item 节点 ref 归一。
- `packages/core/src/index.ts`：公开 `IRNodeTarget` / `IRAnchorRef` / `parseNodeTarget`。
- `packages/react/src/index.ts`：re-export `IRNodeTarget` / `IRAnchorRef`（友好别名待定）。
- **core 测试 / fixture**：直接手写字符串 target 的迁移成对象（react JSX 不受影响）。
- 文档：`core/concepts/anchors/` 主推对象形态 + dotted-id 限制声明；IR Schema 参考 `to`/`from`/`center` 字段对象主契约；含 anchor 的 demo（11 个）补对象形态对照。
- 对外 API：⚠️ BREAKING——core `TargetSchema` 不再接受字符串节点引用。迁移路径：React JSX / Draw way 字符串写法不变（eager 解析）；直接手写 IR 改对象。pre-rc 允许（v0.2.md §与 v0.1 衔接）。

## 不在本 ADR 范围

- **`{ side, t }` 几何实现**（真实边界 / `EDGE_ENDS` / circle·ellipse 弧段 / diamond 斜边 / `ShapeDefinition.edgePoint` / `resolveEdgePoint`）→ 本 milestone [ADR-02](./02-side-t-edge-point.md)。本篇只把 `{ side, t }` 纳入 schema + compile 分发到 `resolveEdgePoint`。
- **`<TikZ>` → `<Layout>` 改名 + system prompt 组件列举**→ [ADR-03](./03-tikz-to-layout-rename.md)。
- **anchor cache 机制改动**：`{side,t}` 缓存在 ADR-02；命名 / 角度 anchor 的 `resolveAnchor` 缓存沿用 alpha.3，不动。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/**`（target.ts schema）
- 动 `packages/core/src/compile/**`（path/anchor.ts 对象路径；删 parseTarget.ts）
- 动 `packages/core/src/parsers/**`（parseNodeTarget / parseTargetSugar / parseWay）
- 动 `packages/*/src/index.ts`（core + react 公开类型）
- 跨级取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/path/target.ts` | 新建 schema | `AnchorRefSchema` | `z.union([z.enum(NAMED_ANCHORS), z.number().finite(), z.object({ side, t })])` | — | anchor 引用：命名 anchor / 角度（度）/ 真实边界上比例点 `{ side, t }` |
| `ir/path/target.ts` | 新建 schema | `NodeTargetSchema` | `z.object({ id: z.string().min(1), anchor?: AnchorRefSchema, offset?: tuple finite })` | — | 按 id 引用 Node/Coordinate，可选 anchor + 世界系 2D offset |
| `ir/path/target.ts` | 改 schema | `TargetSchema` | `z.union([Position, Polar, NodeTarget, Relative, RelativeAccumulate, Offset])` | — | path 端点；**删 `z.string()` 节点引用分支**（改对象唯一） |
| `ir/path/target.ts` | 新建 type | `IRAnchorRef` | `z.infer<typeof AnchorRefSchema>` | — | anchor 引用类型 |
| `ir/path/target.ts` | 新建 type | `IRNodeTarget` | `z.infer<typeof NodeTargetSchema>` | — | 节点 target 对象类型 |

> `t` 的 `.min(0).max(1)` 隐式拒 NaN/Infinity；角度 / offset 显式 `.finite()`。schema 不接受字符串节点引用——字符串只在 React DSL 层经 `parseNodeTarget` 转对象。
>
> **英文 `.describe` 硬要求（决策细节 #11）**：上表「describe 中文摘要」是本 ADR 的可读注，**落地的 `.describe(...)` 文本必须用英文**，且覆盖：`AnchorRefSchema` / `NodeTargetSchema` / `TargetSchema` 三个顶层 + `id` / `anchor` / `offset` 字段 + `{ side, t }` 内 `side` / `t`，逐一带 describe（schema reference 文档 + LLM tool schema 来源）。

### 文件 scope

- `packages/core/src/ir/path/target.ts`（修改：3 schema + 2 type）
- `packages/core/src/parsers/parseNodeTarget.ts`（新建）
- `packages/core/src/parsers/index.ts`（修改：导出 parseNodeTarget）
- `packages/core/src/parsers/parseTargetSugar.ts`（修改：节点 ref → 对象）
- `packages/core/src/parsers/parseWay.ts`（修改：way item 节点 ref 归一）
- `packages/core/src/compile/parseTarget.ts`（删除）
- `packages/core/src/compile/path/anchor.ts`（修改：对象唯一 + 守卫 + offset）
- `packages/core/src/index.ts`（公开 `IRNodeTarget` / `IRAnchorRef` / `parseNodeTarget`）
- `packages/react/src/index.ts`（re-export 类型）
- `packages/core/tests/ir/path/target.test.ts`（新建）
- `packages/core/tests/parsers/parseNodeTarget.test.ts`（新建）
- `packages/core/tests/compile/path/anchor.test.ts`（扩 / 迁移）
- `packages/react/tests/kernel/builder.test.tsx`（扩 eager 解析）
- `apps/docs/src/contents/core/concepts/anchors/index.{zh,en}.mdx`（修改）
- `apps/docs/src/contents/core/**/anchors-*.demo.tsx`（补对象形态对照）

> `{ side, t }` 几何文件（`shapes/types.ts` / `geometry/_edge.ts` / `compile/anchor-cache.ts`）属 ADR-02 scope。

### 测试象限

#### Happy path（≥ 3）

- `node_target_named_anchor`：`{ id: 'A', anchor: 'north-east' }` → 命名 anchor 世界坐标（== 旧 `'A.north-east'`）
- `node_target_angle_anchor`：`{ id: 'A', anchor: 30 }` → 角度边界点（== 旧 `'A.30'`）
- `node_target_auto_clip`：`{ id: 'A' }`（无 anchor）→ 中心 → toward 射线贴边界（== 旧 `'A'`）
- `parse_shorthand_to_object`：`parseNodeTarget('A.north')` → `{ id: 'A', anchor: 'north' }`；`'A.30'` → `{ id: 'A', anchor: 30 }`；`'A'` → `{ id: 'A' }`
- `react_eager_equals_object`：`buildIR(<Step to="A.north"/>)` 与 `buildIR(<Step to={{ id:'A', anchor:'north' }}/>)` IR `toEqual`

#### 边界（≥ 2）

- `offset_world_space_after_anchor`：`{ id:'A', anchor:'north', offset:[2,-3] }` → 命名 anchor 点 + `[2,-3]`（不随节点 rotate 旋转）
- `dotted_id_first_dot_split`：`parseNodeTarget('a.b.north')` → id `'a'` + anchor 解析 tail `'b.north'`（非命名 → 抛错）；对象 `{ id:'a.b', anchor:'north' }` 正常
- `anchor_undefined_offset_only`：`{ id:'A', offset:[1,1] }` → 中心 / boundary + offset
- `coordinate_named_anchor_degenerates_center`：Coordinate（零尺寸）`{ id:'c', anchor:'north' }` / `anchor:30` → 退化为中心（兼容旧行为，决策细节 #10）

#### 错误路径（≥ 2）

- `schema_rejects_string_node_ref`：`TargetSchema.safeParse('A.north')` → **失败**（字符串分支已删）
- `t_out_of_range`：`{ side:'north', t: 1.5 }` → schema 报 `anchor.t` 越界（`t > 1`）；`t: -0.1` 同理
- `angle_not_finite`：`{ id:'A', anchor: Infinity }` / `NaN` → schema 拒（`.finite()`）
- `parse_unknown_anchor_throws`：`parseNodeTarget('A.foobar')` → 抛错含候选 anchor 名
- `coordinate_side_t_throws`：Coordinate（零尺寸）`{ id:'c', anchor:{ side:'north', t:0.5 } }` → compile 抛 `{ side, t } is not meaningful on a zero-size Coordinate`（决策细节 #10）

#### 交互（≥ 2）

- `arc_center_object_target`：`arc` step `center: { id:'O', anchor:'center' }` → 椭圆弧圆心解析正确（共用 TargetSchema）
- `rectangle_step_object_corners`：`rectangle` step `from`/`to` 用对象 target → 矩形角解析正确
- `draw_way_shorthand_to_object`：`<Draw way={['A.north', [1,1]]}>` → way item 节点 ref eager 转对象、坐标透传
- `core_fixture_migrated_no_drift`：原字符串 target 的 core fixture 改对象后 Scene 输出零漂移

### 依赖的现有元素

- `packages/core/src/geometry/rect.ts` 的 `RECT_ANCHORS` / `RectAnchor` —— **引用**：`NAMED_ANCHORS` 枚举来源
- `packages/core/src/compile/anchor-cache.ts` 的 `resolveAnchor` —— **引用**：命名 / 角度 anchor 解析（不改；`{side,t}` 的 `resolveEdgePoint` 在 ADR-02 加）
- `packages/core/src/compile/node.ts` 的 `boundaryPointOf` / `angleBoundaryOf` —— **引用**：auto clip / 角度边界点
- `packages/core/src/shapes/types.ts` 的 `ShapeDefinition.anchor`（alpha.3）—— **引用**：命名 anchor 权威解释面
- `packages/core/src/ir/position/*` 的 `PositionSchema` / `PolarPositionSchema` / `OffsetPositionSchema` —— **引用**：TargetSchema union 其余分支
- `packages/react/src/kernel/builder.ts` 的各 step `parseTargetSugar(p.to)` 调用 —— **仅依赖**：扩展 parseTargetSugar 后自动产对象，builder 不改
