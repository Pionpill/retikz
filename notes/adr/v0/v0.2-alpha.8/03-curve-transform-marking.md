# ADR-03：out/in 曲线 + self-loop / 路径整体变换 / 中段 marking（三搭车项）

- 状态：Accepted
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.8 plan §第三~五部分](../../../plans/v0/v0.2-alpha.8.md) · [tikz-gap-analysis §2 Path / §3 Step](../../../analysis/2026-05-07-tikz-gap-analysis.md) · 本 milestone [ADR-01](./01-arrow-definition.md)（marking 复用 arrow marker）/ [ADR-02](./02-path-generator-definition.md) · [alpha.1 Scope transform](../v0.2-alpha.1/)（路径变换复用）

> **定位**：三项都是**低成本搭车项**，复用既有机器（bend→cubic / GroupPrim transform / `segment.ts`），不与两个注册面（ADR-01/02）互相阻塞。合一篇 ADR、按需插入实现。

## 背景

- **out/in + self-loop**：`bend` step（`packages/core/src/ir/path/step.ts:161-178`）只有 `bendDirection` + `bendAngle`，编译成 cubic 近似。缺任意出 / 入射角、缺自环（`from == to` 同 node，bend 画不出）。
- **路径整体变换**：`PathSchema`（`ir/path/path.ts`）无 transform 字段——单 path 旋转 / 缩放须包 `<Scope transforms>`。变换机器现成：`GroupPrim.transforms`（`primitive/group.ts:45-52`）+ `applyTransformChain`。
- **中段 marking**：沿路径 t 处放图形。**几何现成**：`geometry/segment.ts` 给全 7 段类型实现 `*SegmentSample(seg, t) → { point, tangent }`（闭式 O(1)），`sloped` step label 已在用（`compile/path/label.ts:108`）。现只能放文字 label。

## 决策（三项各自）

### 1. out/in + self-loop —— 扩 `bend` step

- `BendStepSchema` 加 `outAngle?` / `inAngle?` / `looseness?`（与 `bendDirection`/`bendAngle` 互补；同给时 out/in 优先）。
- 编译：out/in 角 + looseness → 算 cubic 控制点（标准 TikZ 公式：control1 = from + d·dir(outAngle)，control2 = to + d·dir(inAngle)，d 受 looseness 调）。复用现有 bend→cubic 路径。
- **self-loop**：`from == to`（同 node id / 同坐标）退化——给默认环大小 + 用 out/in 角撑开（这是 out/in 最大价值：状态机自环）。
- 选项对比：**扩 bend**（推荐，复用编译路径）vs 新 `to`-style step（多一个 kind）。倾向扩 bend。

### 2. 路径整体变换 —— `PathSchema` 加 `rotate` / `scale`

- `PathSchema` 加 `rotate?` / `scale?`（对齐 Node transform 字段）。
- 编译：把该 path 解析出的 primitive 包进 `GroupPrim`、写 `transforms`（复用 Scope transform 机器）。
- **旋转支点**（待决策）：path 包围盒中心 / 世界原点 / 可配——倾向**包围盒中心**（对齐 Node 绕自身中心，直觉）。

### 3. 中段 marking —— IR `marks` + 复用 segment.ts

- step / path 加 `marks?: Array<{ pos, mark }>`（评审 P2 收紧）：`pos` 为 `z.number().min(0).max(1)`（**schema 拒越界**，非实现钳制）；`mark` **首批仅 `kind:'arrow'`**，字段复用 `ArrowEndDetailSchema` 视觉子集（shape = 已注册箭头名 + scale / length / width / color…），**方向由 tangent 决定**（不是 `shape:'->'` 方向）。
- 编译：对每个 mark 调 `*SegmentSample(seg, pos)` 取 `{ point, tangent }`（复用 `segment.ts`），产按 tangent 定向的 marker primitive（复用 ADR-01 arrow marker / MarkerPrimitive）。
- **不做**：真弧长参数化（`pos` 按段参数，沿用 label 同款便宜模型）；任意小图形 mark（留扩展，首批仅 arrow）。

## 决策细节

1. **out/in 与 bend 字段并存**：`bendDirection`/`bendAngle`（对称弯）保留；`outAngle`/`inAngle`/`looseness`（非对称 + 自环）叠加；同给时 out/in 优先（文档说明）。
2. **looseness 默认**：缺省 ≈ 1（TikZ 默认）；控制控制点距离 = looseness × |from-to| × 系数。
3. **self-loop 退化几何**：`from==to` 时 |from-to|=0，控制点距离改用默认环大小（user units，可由 looseness 缩放）。
4. **路径变换 transform 顺序（硬契约，评审 P2）**：① path 端点先按**当前 scope** resolve 到世界坐标；② arrow shrink 在**未应用 path transform 的几何**上完成（shrink 沿线收缩，须在原始几何算，否则箭头错位）；③ 最后以 **path 包围盒中心**为支点包 `GroupPrim` transform（`rotate` 的 `cx`/`cy` = bbox center）；④ layout 外接框据**变换后 bbox** 计。顺序错会让端点 / shrink / scope hoist / bbox 互相污染——路径变换**不是无脑搭车项**，这条顺序是其可测最小语义。
5. **marking 首批仅 `mark.kind:'arrow'`（评审 P2 收紧）**：`mark` 字段复用 `ArrowEndDetailSchema` 视觉子集（`shape` = 已注册箭头名 + scale / length / width / color…），方向由 `tangent` 决定（**不是** `shape:'->'`——`shape` 是箭头名，见 ADR-01）；`pos` `z.number().min(0).max(1)` schema 拒越界。复用 ADR-01 arrow marker / `MarkerPrimitive`；任意小图形留扩展。
6. **marking 不计 layout / 计 layout**：倾向计入（避免远端 mark 被裁），与 step label 一致性待确认。
7. **英文 `.describe`**：bend 新字段 / path transform / `marks` 各字段英文 describe。

## 待决策点

- out/in 扩 bend vs 新 step（倾向扩 bend）。
- 路径旋转支点（包围盒中心 / 世界原点 / 可配）。
- marking `mark` 内容范围（仅箭头 marker vs 任意 MarkerPrimitive）；是否计入 layout。
- self-loop 默认环大小（绝对 user units vs 相对 node 尺寸）。

## DSL 表面

```tsx
{/* out/in 弯边 */}
<Path><Step kind="bend" to={{ id:'B' }} outAngle={30} inAngle={150} looseness={1.2} /></Path>
{/* self-loop（from==to） */}
<Path><Step kind="move" to={{ id:'A' }} /><Step kind="bend" to={{ id:'A' }} outAngle={60} inAngle={120} /></Path>
{/* 路径整体旋转 */}
<Path rotate={30}><Step kind="line" to={[10,0]} /></Path>
{/* 中段方向箭头：mark.kind='arrow' + 已注册箭头名（方向由 tangent 决定，非 '->'） */}
<Path marks={[{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }]}><Step kind="line" to={{ id:'B' }} /></Path>
```

## 影响

- `packages/core/src/ir/path/step.ts`：`BendStepSchema` 加 out/in/looseness。
- `packages/core/src/ir/path/path.ts`：`PathSchema` 加 `rotate`/`scale` + `marks`。
- `packages/core/src/compile/path/`：out/in→cubic + self-loop；path transform 包 GroupPrim；marks 调 segment.ts 产 marker。
- 对外 API：纯叠加字段，零破坏。

## 不在本 ADR 范围

- **ArrowDefinition / MarkerPrimitive**→ [ADR-01](./01-arrow-definition.md)（marking 复用其 marker）。
- **decorations（snake/coil）/ intersections / 真弧长参数化**：学术 / 装饰，跳过。

---

## 实现契约（必填）

### Level

`yellow`（叠加 IR 字段 + compile，复用既有机器；不动注册面 / primitive 契约根本）

- 动 `ir/path/{step,path}.ts`（叠字段）+ `compile/path/**`（复用 bend→cubic / GroupPrim / segment.ts）
- 取最高 = yellow

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/path/step.ts` | 加字段 | `BendStepSchema.outAngle` | `z.number().finite().optional()` | — | 出射角（度）；与 inAngle 一起编译成 cubic |
| `ir/path/step.ts` | 加字段 | `BendStepSchema.inAngle` | `z.number().finite().optional()` | — | 入射角（度） |
| `ir/path/step.ts` | 加字段 | `BendStepSchema.looseness` | `z.number().finite().positive().optional()` | ≈1 | 曲线松紧（控制点距离系数；`.finite()` 拒 Infinity） |
| `ir/path/path.ts` | 加字段 | `PathSchema.rotate` | `z.number().finite().optional()` | — | 整条 path 旋转（度，绕包围盒中心） |
| `ir/path/path.ts` | 加字段 | `PathSchema.scale` | `z.number().finite().positive().optional()`（或 {x,y} finite） | — | 整条 path 缩放 |
| `ir/path/path.ts` | 加字段 | `PathSchema.marks` | `z.array(z.object({ pos: z.number().min(0).max(1), mark: ArrowMarkSchema })).optional()` | — | 沿路径标记：pos∈[0,1]（拒越界）处放 arrow marker；`mark.kind:'arrow'` + ArrowEndDetail 视觉子集 |

> **英文 `.describe`**：上述全部字段 + `marks` 内 `pos` / `mark` 必须英文。

### 文件 scope

- `packages/core/src/ir/path/step.ts`（bend 加 out/in/looseness）
- `packages/core/src/ir/path/path.ts`（rotate/scale/marks）
- `packages/core/src/compile/path/`（out/in→cubic + self-loop；path transform；marks → segment.ts + marker）
- `packages/core/tests/compile/path-outin-loop.test.ts` / `path-transform.test.ts` / `path-marks.test.ts`（新建）
- `apps/docs/src/contents/core/components/path/`（out/in / self-loop / 变换 / marks demo）

### 测试象限

#### Happy path（≥ 3）

- `outin_to_cubic`：out/in 角 → cubic 控制点方向正确
- `self_loop`：`from==to` → 成环（非退化直线）
- `path_rotate`：`<Path rotate={30}>` 与包 Scope rotate 等价
- `mark_at_midpoint`：`marks:[{pos:0.5,...}]` → marker 在中点、按 tangent 定向

#### 边界（≥ 2）

- `looseness_tightness`：looseness 调控制点距离
- `mark_on_curve_tangent`：贝塞尔 / arc 段 mark 的 tangent 方向正确（复用 segment.ts）
- `path_scale_xy`：非等比 scale

#### 错误路径（≥ 2）

- `outin_angle_non_finite`：`outAngle: NaN` → schema 拒
- `looseness_non_positive`：`looseness: 0` → schema 拒
- `mark_pos_out_of_range`：`pos: 1.5` / `-0.1` → **schema 拒**（`z.number().min(0).max(1)`，非实现钳制，评审 P2）
- `mark_non_arrow_kind_rejected`：`mark.kind` 非 `'arrow'` → schema 拒（首批仅 arrow）

#### 交互（≥ 2）

- `outin_with_bend_fields`：out/in 与 bendDirection 同给 → out/in 优先
- `path_transform_with_arrow`：旋转 path + 箭头 → 箭头方向随变换正确
- `mark_with_custom_arrow`：mark 用 ADR-01 自定义箭头 → 定向渲染

### 依赖的现有元素

- `packages/core/src/ir/path/step.ts` 的 `BendStepSchema` —— **修改**：加 out/in/looseness
- `packages/core/src/compile/path/` 的 bend→cubic —— **引用 + 扩展**
- `packages/core/src/primitive/group.ts` 的 `GroupPrim.transforms` + `applyTransformChain` —— **引用**：path transform
- `packages/core/src/geometry/segment.ts` 的 `*SegmentSample`（point + tangent）—— **引用**：marking
- 本 milestone [ADR-01](./01-arrow-definition.md) 的 arrow marker / `MarkerPrimitive` —— **引用**：marking 内容
