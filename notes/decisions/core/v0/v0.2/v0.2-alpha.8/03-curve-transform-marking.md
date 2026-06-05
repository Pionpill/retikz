# ADR-03：out/in 曲线 + self-loop / 路径整体变换 / 中段 marking（三搭车项）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.8 plan §第三~五部分](./roadmap.md) · [tikz-gap-analysis §2 Path / §3 Step](../../../../../analysis/tikz-gap-analysis.md) · 本 milestone [ADR-01](./01-arrow-definition.md)（marking 复用 arrow marker）/ [ADR-02](./02-path-generator-definition.md) · [alpha.1 Scope transform](../v0.2-alpha.1/)（路径变换复用）

> **定位**：三项都是低成本搭车项，复用既有机器（bend→cubic / `GroupPrim.transforms` / `geometry/segment.ts`），不与两个注册面（ADR-01/02）互相阻塞。合一篇 ADR、按需插入实现。

## 背景

- **out/in + self-loop**：`bend` step 原只有 `bendDirection` + `bendAngle`，编译成 cubic 近似，缺任意出 / 入射角、缺自环（`from == to` 同 node bend 画不出）。
- **路径整体变换**：`PathSchema` 原无 transform 字段——单 path 旋转 / 缩放须包 `<Scope transforms>`。变换机器现成：`GroupPrim.transforms`（`core/src/primitive/group.ts`）+ `applyTransformChain`。
- **中段 marking**：沿路径 t 处放图形。几何现成：`core/src/geometry/segment.ts` 给全 7 段类型 `*SegmentSample(seg, t) → { point, tangent }`（闭式 O(1)），`sloped` step label 已在用。原只能放文字 label。

## 决策（三项各自）

### 1. out/in + self-loop —— 扩 `bend` step

- `BendStepSchema` 加 `outAngle?` / `inAngle?` / `looseness?`（与 `bendDirection`/`bendAngle` 互补；**同给时 out/in 优先**，文档说明）。
- 编译：out/in 角 + looseness → 算 cubic 控制点（标准 TikZ 公式：control1 = from + d·dir(outAngle)，control2 = to + d·dir(inAngle)，d 受 looseness 调）。复用现有 bend→cubic 路径。
- **self-loop**：`from == to`（同 node id / 同坐标）时 |from-to|=0，控制点距离改用默认环大小（user units，可由 looseness 缩放）+ 用 out/in 角撑开——这是 out/in 最大价值（状态机自环）。
- `looseness` 缺省 ≈ 1（TikZ 默认），控制控制点距离 = looseness × |from-to| × 系数。

### 2. 路径整体变换 —— `PathSchema` 加 `rotate` / `scale`

- `PathSchema` 加 `rotate?` / `scale?`（对齐 Node transform 字段）。编译把该 path 解析出的 primitive 包进 `GroupPrim`、写 `transforms`（复用 Scope transform 机器）。
- **transform 顺序（硬契约）**：① path 端点先按当前 scope resolve 到世界坐标；② arrow shrink 在**未应用 path transform 的几何**上完成（shrink 沿线收缩须在原始几何算，否则箭头错位）；③ 最后以 **path 包围盒中心**为支点包 `GroupPrim` transform（`rotate` 的 `cx`/`cy` = bbox center，对齐 Node 绕自身中心）；④ layout 外接框据变换后 bbox 计。顺序错会让端点 / shrink / scope hoist / bbox 互相污染——这条顺序是路径变换的可测最小语义，并非无脑搭车项。

### 3. 中段 marking —— IR `marks` + 复用 segment.ts

- `PathSchema` 加 `marks?: Array<{ pos, mark }>`：`pos` 为 `z.number().min(0).max(1)`（**schema 拒越界**，非实现钳制）；`mark` **首批仅 `kind:'arrow'`**，字段复用 `ArrowEndDetailSchema` 视觉子集（`shape` = 已注册箭头名 + scale / length / width / color…），**方向由 tangent 决定**（不是 `shape:'->'` 方向——`shape` 是箭头名，见 ADR-01）。
- 编译：对每个 mark 调 `*SegmentSample(seg, pos)` 取 `{ point, tangent }`，产按 tangent 定向的 marker primitive（复用 ADR-01 arrow marker / `MarkerPrimitive`）。
- **不做**：真弧长参数化（`pos` 按段参数，沿用 label 同款便宜模型）；任意小图形 mark（留扩展，首批仅 arrow）。marking 计入 layout（避免远端 mark 被裁）。

## 不在本 ADR 范围

- **ArrowDefinition / MarkerPrimitive**→ [ADR-01](./01-arrow-definition.md)（marking 复用其 marker）。
- **decorations（snake/coil）/ intersections / 真弧长参数化**：学术 / 装饰，跳过。

---

> **实现指针**：level `yellow`（叠加 IR 字段 + compile，复用既有 bend→cubic / `GroupPrim` / `segment.ts`，不动注册面 / primitive 契约根本），纯叠加字段、零破坏。真源以代码为准——`BendStepSchema` out/in/looseness（`core/src/ir/path/step.ts`）、`PathSchema` rotate/scale/marks（`core/src/ir/path/path.ts`）、out/in→cubic + self-loop / path transform 包 GroupPrim / marks 调 segment.ts 产 marker（`core/src/compile/path/`）、变换机器（`core/src/primitive/group.ts` `applyTransformChain`）、采样（`core/src/geometry/segment.ts`）。测试在 `core/tests/compile/{path-outin-loop,path-transform,path-marks}.test.ts` 与 `core/tests/ir/path/curve-transform-marking.schema.test.ts`。完整施工契约（Schema 改动表 / 文件 scope / 测试象限 / 待决策点）见本文件 git 历史。

> 🔖 封板压缩 commit `7141a9b0`；压缩前完整施工蓝图 = `git show 7141a9b0^:notes/decisions/core/v0/v0.2/v0.2-alpha.8/03-curve-transform-marking.md`。
