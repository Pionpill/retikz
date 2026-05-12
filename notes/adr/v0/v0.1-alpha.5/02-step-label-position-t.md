# ADR-02：`StepLabel.position` 扩充（7 keyword + 任意 t 数值 + 多 kind 参数化规则）

- 状态：Proposed
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../../plans/v0/roadmap.md) · [v0.1.0-alpha.5 plan TODO-3](../../../plans/v0/v0.1-alpha.5.md) · [DESIGN.md §4.5](../../../architecture/DESIGN.md)

## 背景

`StepLabelSchema.position`（`packages/core/src/ir/path/step.ts:16`）现状只接受 3 个 keyword：

```ts
position: z.enum(['midway', 'near-start', 'near-end']).optional()
```

对照 TikZ edge label 完整位置语法：

| TikZ | t 位置 |
|---|---|
| `at start` | 0.0 |
| `very near start` | 0.125 |
| `near start` | 0.25 |
| `midway` | 0.5 |
| `near end` | 0.75 |
| `very near end` | 0.875 |
| `at end` | 1.0 |
| `pos=<float>` (0..1) | 任意 t |

retikz 缺 4 个 keyword + 完全没有数值形态。用户想表达"路径 30% 处放标签"得手算坐标，无法用相对参数表达——破坏了 LLM 友好性（LLM 训练数据里 TikZ `pos=0.3` 是常见输入）。

更深层问题：**当前 schema 没规定 t 在多段 step / Bezier / arc / 整圆椭圆上怎么解释**。compile/path.ts 内部仅在 LineStep / FoldStep 上实现了三个 keyword 的硬编码。扩成数值后必须把"t 在每种 step kind 上的几何含义"写定，否则 Bezier curve / fold N 段 / circlePath 各自的 t 落点不可预测。

## 选项

### A. `union(enum 7 keyword, number 0..1)`（**推荐**）

```ts
position: z
  .union([
    z.enum([
      'at-start',          // t=0.0
      'very-near-start',   // t=0.125
      'near-start',        // t=0.25
      'midway',            // t=0.5（默认）
      'near-end',          // t=0.75
      'very-near-end',     // t=0.875
      'at-end',            // t=1.0
    ]),
    z.number().min(0).max(1),
  ])
  .optional()
```

keyword 是 t 的语义糖（一对一映射），数值 t ∈ [0, 1] 提供任意位置。t 在不同 step kind 上的几何参数化与 TikZ 对齐——见下方"t 解释规则"。

### B. 只扩 keyword（不支持数值）

把 7 个 keyword 加全，不引入数值。

- 优点：超集扩展兼容旧 IR；schema 仍是 enum 简单
- 缺点：用户 / LLM 想表达 t=0.3 这种细粒度位置时无路可走；与 TikZ `pos=<float>` 偏离

### C. 只数值（删 keyword）

drop 所有 keyword，强制数值 0..1。

- 优点：schema 最简
- 缺点：破坏现有 IR（alpha.4 的 `'midway'` 失效）；`'midway'` 等是 TikZ 标准词汇，对 LLM 训练数据亲和力高；DX 差（写 0.5 不如 'midway' 直观）

## 决策：A（keyword + 数值 union）

理由：

1. **覆盖 TikZ 完整集**：跟 LLM 训练数据中的 TikZ 用法 100% 对齐
2. **keyword 友好 DX**：常用位置写关键词更直白，数值留给精细控制
3. **超集扩展非破坏 IR**：alpha.4 写的 3 keyword 旧 IR 100% 继续合法（运行时层面）
4. **schema 不复杂**：union of (enum, number) 是 zod 标准模式

## t 在不同 step kind 上的解释规则

t 是**沿整个 step 的归一化参数**（t=0 起点 / t=1 终点），不同 kind 的参数化方式**与 TikZ 对齐**：

| Step kind | 参数化方式 | t=0.25 | t=0.5 | t=0.75 |
|---|---|---|---|---|
| `line` | 直线段，t 即归一化弧长 | 1/4 处 | 中点 | 3/4 处 |
| `step`（fold N 段） | N 段等 t 拼接（详见下方"Fold N 段通用规则"） | N=2: 第 1 段中点；N=4: 拐角 1 | N=2: 拐角；N=4: 拐角 2 | N=2: 第 2 段中点；N=4: 拐角 3 |
| `curve` / `cubic` | Bezier 参数 t（**非弧长**） | Bezier t=0.25 位置 | Bezier t=0.5 位置（**通常不是视觉中点**） | Bezier t=0.75 位置 |
| `bend` | 内部 lower 成 cubic，再走 Bezier t | 同 cubic | 同 cubic | 同 cubic |
| `arc` | 角度参数化：t 线性映射 `startAngle..endAngle` | 起末角度 1/4 处 | 起末角度中点 | 起末角度 3/4 处 |
| `circlePath` | 沿整圆 t∈[0, 1]：t=0 为 angle 0（+x），CCW 增长 | 圆周 90°（屏幕下方 +y） | 圆周 180°（-x） | 圆周 270°（屏幕上方 -y） |
| `ellipsePath` | 同 circlePath：t=0 在 angle 0（+x），CCW 增长 | 椭圆 90° 处 | 椭圆 180° 处 | 椭圆 270° 处 |

**Move / Cycle step 无 label**——schema 本来就没 label 字段，不在本规则覆盖范围。

### Fold N 段通用规则

Fold step 由 N 段直线 + (N-1) 个拐角组成。t 参数化**与段实际长度无关**：

- 每段在 t 轴上各占 `1/N` 长度
- 第 i 段（0-indexed）覆盖 `t ∈ [i/N, (i+1)/N]`，段内 t 仍归一化弧长
- 第 j 个拐角（连接段 j-1 和段 j，1-indexed）落在 `t = j/N`

| N | 拐角位置 | t=0.25 | t=0.5 | t=0.75 |
|---|---|---|---|---|
| 2（当前 `-\|` / `\|-`） | 拐角 1 @ 0.5 | 第 1 段中点 | **拐角 1** | 第 2 段中点 |
| 3（未来扩展） | 1/3 / 2/3 | 段 1 内 t=0.75 | 段 2 内 t=0.5 | 段 3 内 t=0.25 |
| 4（未来扩展） | 0.25 / 0.5 / 0.75 | **拐角 1** | **拐角 2** | **拐角 3** |

**当前 schema 只支持 N=2**（`via: '-\|' \| '\|-'`）。规则按通用 N 段一次写定，未来若加 N>2 的折角（`'-\|-'` / `'\|-\|'` / `corners: Array<Position>` 等）**复用同一参数化**。

### 关键设计选择（每条对齐 TikZ）

1. **Bezier 用 Bezier 参数 t，不用弧长**——按弧长定位需数值积分，昂贵；与 TikZ 行为不一致
2. **Fold N 段每段等占 `1/N` t 区间**（不按弧长加权）—— 即使段长悬殊，拐角恒在 `t = j/N`
3. **Arc / circlePath / ellipsePath 用角度参数化**——简单且跨平台一致

## 决策细节

> 选项 A 主决策之外，3 项字段细节均已拍板。下游 implement 阶段按此执行。

1. **`circlePath` / `ellipsePath` t=0 起点 = angle 0（+x 方向），CCW 增长**：与 TikZ 一致。"cursor 进入点"方案不可取——cursor 在圆心、无"进入点"概念
2. **Fold N 段不按弧长加权 t**：每段各占 `1/N` t 区间，拐角恒在 `t = j/N`，与段实际长度无关。规则按通用 N 段一次写定，未来 schema 扩展不动 t 语义
3. **异常值严格拒绝**：`pos=-0.1` / `pos=1.2` 由 zod `.min(0).max(1)` 在 schema 校验阶段拒绝；**不**在 compile 阶段 clamp。与 schema 一贯严格性一致

## DSL 表面

```tsx
// keyword（最常见，旧 3 keyword 兼容 + 4 个新 keyword）
<Step to="B">
  <EdgeLabel position="midway">midway</EdgeLabel>
</Step>
<Step to="B">
  <EdgeLabel position="at-end">end</EdgeLabel>
</Step>

// 任意数值 t
<Step to="B">
  <EdgeLabel position={0.3}>30%</EdgeLabel>
</Step>

// fold t=0.5 自动落在拐角
<Step kind="step" via="-|" to="B">
  <EdgeLabel position={0.5}>at-corner</EdgeLabel>
</Step>

// curve t=0.5 落 Bezier 参数 t=0.5 位置（通常非视觉中点）
<Step kind="curve" control={[3, 3]} to="B">
  <EdgeLabel position={0.5}>at-bezier-mid</EdgeLabel>
</Step>
```

## 测试设计

`packages/core/tests/compile/path-label.test.ts`（已存在，cascade 加新用例）覆盖：

- 每个 step kind × {7 keyword + 至少 3 个数值} 的 label 位置定点测试
- 重点测：fold 拐角恰在 t=0.5、Bezier t=0.5 ≠ 视觉中点、arc 中点角度、circlePath t=0.5 落 180°
- schema 边界：`pos=-0.1` / `pos=1.2` 拒绝
- keyword + number union 都被接受、互不冲突

具体 case 拆分见下面"实现契约 § 测试象限"。

## 每 step kind 的独立 demo + 测试覆盖矩阵

**实现要求**：8 种支持 label 的 step kind（`line` / `step` / `curve` / `cubic` / `bend` / `arc` / `circlePath` / `ellipsePath`）**每一种都要有独立的文档 demo + 独立的测试用例组**，确保 t 参数化规则在每种 kind 上都被验证。下表是实施清单——demo 文件名 / 关键测试 case 名按此规范，下游 alpha-feature-implement 阶段照此执行：

| Step kind | Docs demo 文件（apps/docs/...） | 关键测试 case（`label_<kind>_t_<value>_<desc>` 命名） |
|---|---|---|
| `line` | `components/path/edge-label-on-line.demo.tsx` | t=0 / 0.25 / 0.5 / 0.75 / 1 在直线归一化弧长位置；含 keyword `'midway'` 退化验证 |
| `step` (fold N=2) | `components/path/edge-label-on-fold.demo.tsx` | `label_fold_t_0_5_at_corner`（落拐角）/ `label_fold_t_0_25_segment_1_mid` / `label_fold_t_0_75_segment_2_mid`；两段长度悬殊时拐角仍恒在 t=0.5 |
| `curve` | `components/path/edge-label-on-curve.demo.tsx` | `label_curve_t_0_5_at_bezier_midpoint`（Bezier t=0.5，与视觉弧长中点对比可视化）/ `label_curve_t_0_25_at_bezier_0_25` |
| `cubic` | `components/path/edge-label-on-cubic.demo.tsx` | `label_cubic_t_0_5_at_bezier_midpoint`（cubic Bezier 参数 t 行为同 curve）|
| `bend` | `components/path/edge-label-on-bend.demo.tsx` | `label_bend_lowered_cubic_same_t_behavior`（验证 bend 内部 lower 成 cubic 后 t 解释一致） |
| `arc` | `components/path/edge-label-on-arc.demo.tsx` | `label_arc_t_0_5_at_mid_angle`（t 线性映射 `startAngle..endAngle`，`t=0.5` ⇒ `(start+end)/2` 角度位置）/ `label_arc_t_0_25_at_quarter_angle` |
| `circlePath` | `components/path/edge-label-on-circle.demo.tsx` | `label_circlePath_t_0_at_pos_x`（angle 0，+x 方向）/ `label_circlePath_t_0_25_at_90deg`（屏幕下方 +y）/ `label_circlePath_t_0_5_at_180deg` / `label_circlePath_t_0_75_at_270deg`（屏幕上方 -y）；CCW 增长 |
| `ellipsePath` | `components/path/edge-label-on-ellipse.demo.tsx` | `label_ellipsePath_t_0_5_at_180deg`（同 circlePath 角度参数化，但因 rx≠ry 时**不是**弧长参数化，t=0.5 仍落 angle=180° 而非视觉弧长中点）|

**每个 demo 至少展示**：三组 t（0.25 / 0.5 / 0.75）+ 一组 keyword（如 `'midway'`）的视觉对比，让用户一眼看出"keyword = 数值的语义糖、不同 kind 上 t 的几何含义"。

**Demo 双语并行**：每个 `.demo.tsx` 配 zh.mdx / en.mdx 两边都引用；demo 本身是 TS 共享，mdx 只引用。

**测试用例分组**：`packages/core/tests/compile/path-label.test.ts` 内每 step kind 一个 `describe('label on <kind>', ...)` 块，便于 grep / 单独跑。

## 影响

- **`packages/core/src/ir/path/step.ts`**：`StepLabelSchema.position` 类型扩为 `union(enum, number)`；`.describe(...)` 写清 t 解释规则、指向文档详细页
- **`packages/core/src/compile/path.ts`**：加 `resolveLabelT(positionInput, stepKind) → t` keyword→数值映射；加 `pointAtT(step, t, geometryContext) → Position` 按 step kind 分 8 路实现参数化
- **`packages/core/tests/compile/path-label.test.ts`**：新增大量定点测试
- **`apps/docs/doc/zh|en/components/path.mdx`** step label 章节：加完整 keyword 列表表 + 数值 t 语义 + 各 step kind t 解释规则表 + 视觉 demo（每种 step kind 至少一组 t=0.25/0.5/0.75 标记）
- ⚠️ **轻度 BREAKING (TS 体感)**：`StepLabel['position']` 接受值集合扩大；用户对旧 3 keyword 做 exhaustive `switch` 的话，新值会落到 default 分支——TS 不报错但运行时可能意外。运行时 IR 100% 兼容

## 不在本 ADR 范围

- **`NodeLabel.position`**：那是 8 方向 + 数字角度（节点边界相对位置），与 StepLabel 完全独立
- **Move / Cycle step**：本来就无 label 字段
- **Label 其他字段**（`side` / `text`）不动

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/path/step.ts`（IR schema 字段类型扩展）
- 动 `packages/core/src/compile/path.ts`（compile 参数化规则改写）
- 跨级取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/path/step.ts` | 改 | `StepLabelSchema.position` | `z.union([z.enum([7 keyword]), z.number().min(0).max(1)]).optional()` | 缺省 `'midway'` (t=0.5) | 沿 step 的归一化位置 t；7 keyword 是 t 的语义糖；不同 step kind 上 t 几何解释见文档表 |

### 文件 scope

- `packages/core/src/ir/path/step.ts`（修改）
- `packages/core/src/compile/path.ts`（修改：加 `resolveLabelT` + `pointAtT`，按 step kind 分路）
- `packages/core/tests/compile/path-label.test.ts`（扩 case）
- `apps/docs/doc/zh|en/components/path.mdx` step label 章节（增 mdx）
- `apps/docs/doc/zh|en/components/path/*.demo.tsx`（按需新建 demo 文件，每 step kind 一组 t 标记）

### 测试象限

#### Happy path（≥ 3）

- `label_keyword_midway_line`：line step + `position='midway'` → 直线中点
- `label_keyword_at_start`：line step + `position='at-start'` → 直线起点（t=0）
- `label_keyword_very_near_end`：line step + `position='very-near-end'` → t=0.875 位置
- `label_numeric_0_3_line`：line step + `position={0.3}` → 直线 30% 处

#### 边界（≥ 2）

- `label_at_start_equals_t_0`：`'at-start'` 与 `0` 几何位置相同
- `label_at_end_equals_t_1`：`'at-end'` 与 `1` 几何位置相同
- `label_circlePath_t_0_5_at_180deg`：circlePath + `position={0.5}` → 圆周 180° 位置（不是 0° 起点）

#### 错误路径（≥ 2）

- `label_position_below_0_rejected`：`position={-0.1}` → zod 校验失败
- `label_position_above_1_rejected`：`position={1.5}` → zod 校验失败
- `label_unknown_keyword_rejected`：`position='unknown'` → zod 校验失败

#### 交互（≥ 2）

- `label_fold_t_0_5_at_corner`：`<Step kind="step" via="-|" to="B">` + `position={0.5}` → 落在拐角（而非两段任一段中点）
- `label_curve_t_0_5_at_bezier_midpoint`：`<Step kind="curve" control={...}>` + `position={0.5}` → Bezier t=0.5 位置（通常不是视觉弧长中点）
- `label_arc_t_0_25_at_quarter_angle`：`<Step kind="arc" startAngle={0} endAngle={90}>` + `position={0.25}` → 22.5° 角度位置

### 依赖现有元素

- `packages/core/src/ir/path/step.ts` 的 `StepLabelSchema` —— **修改**：position 字段类型扩展
- `packages/core/src/compile/path.ts` 的现有 fold / curve / cubic / arc / circlePath / ellipsePath 几何计算函数 —— 引用：pointAtT 内部调用
- `packages/core/src/geometry/{bend,arc,segment}.ts` —— 引用：t → 几何点的转换 helper
- `packages/core/src/ir/path/step.ts` 的 `StepSchema` discriminated union —— 引用：pointAtT 按 `kind` 分路
