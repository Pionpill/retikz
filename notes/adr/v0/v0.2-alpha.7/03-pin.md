# ADR-03：pin 引脚（label + 引线）

- 状态：Proposed
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.7 plan §第三部分](../../../plans/v0/v0.2-alpha.7.md) · [tikz-gap-analysis §1 Node](../../../analysis/2026-05-07-tikz-gap-analysis.md) · 本 milestone [ADR-01](./01-paint-basics.md) / [ADR-02](./02-max-text-width.md) · [alpha.4 Node label rotate](../v0.2-alpha.4/)（label 体系）· [alpha.6 ADR-02 edgePoint](../v0.2-alpha.6/02-side-t-edge-point.md)（引线起点边界解析）

> **前置依赖**：复用 `NodeLabelSchema`（`packages/core/src/ir/node.ts:44-93`）的 placement 体系（`position` 8 方向 / 角度 + `distance`）+ alpha.6 的 `boundaryPointOf` / `edgePoint`（引线起点取 node 边界）。

## 背景

`NodeLabelSchema`（`ir/node.ts:44-93`）：label 挂 node 边、`position`（8 方向 / 数字角度）+ `distance` + 字体 + `rotate`（alpha.4）。label **无引线**——直接贴在 node 旁的文字。

痛点：缺带指引线的标注（TikZ `[pin=right:bar]`：从 node 牵一条短线连到文字 "bar"）。pin 在 org 图 / 标注场景常用。pin 本质 = "label + 一条从 node 边到 label 的引线"，可复用 label 的方向 / 角度 / distance。

## 选项

### A. `NodeLabelSchema` 加 `pin` 开关 + `leader` 样式（**推荐**）

```ts
// ir/node.ts —— label 复用，加引线
// NodeLabelSchema 内追加：
pin: z.boolean().optional()
  .describe('When true, draws a leader line from the node border to the label (TikZ pin).'),
leader: z.object({
  stroke: z.string().optional(),
  strokeWidth: z.number().finite().positive().optional(),
  dashPattern: z.array(z.number()).optional(),
}).optional().describe('Leader line style; defaults to a thin solid line inheriting node color.'),
```

- 优：pin 本质是"带引线的 label"，复用全部 placement 字段最省；`leader` 缺省 = 细实线；零新概念。
- 缺：label schema 多两字段（多数 label 用不上 pin，但 optional 零成本）。

### B. 独立 `NodePinSchema`（`Node.pin`）

`Node.pin`（单 / 数组），字段 = label placement 子集 + 引线样式，与 `Node.label` 平级。

- 优：语义分明（label vs pin 两个概念）。
- 缺：placement 字段（position / distance / 字体 / rotate）与 label 重复一遍，DRY 差；compile 两套近似路径。

### C. 不做

- 缺：标注场景缺引线。用户已拍要做（讨论确认）。

## 决策：A

理由：

1. **复用 label placement，最 DRY**：pin = label + 引线，placement / distance / 字体 / rotate 全复用，只加 `pin` 开关 + `leader` 样式。
2. **引线几何复用 alpha.6**：起点取 node 边界朝 label 方向点（`boundaryPointOf`），无新几何。
3. **零破坏**：`pin` / `leader` 都 optional，现有 label 不受影响。

## 决策细节

> 主选项已锁；以下随讨论收敛。

1. **`pin` 开关**：`NodeLabelSchema.pin?: boolean`；true → 在 label 基础上画引线。
2. **引线起点**：node 边界上朝 label `position` 方向的点——复用 `boundaryPointOf(node, towardLabel)`（auto clip 同款），或沿 label 角度求边界。
3. **引线终点**：label 外接框朝 node 一侧的锚点（见待决策；缺省取 label 框朝 node 边的中点）。
4. **产出**：label 的 `TextPrim` + 一条引线 `PathPrim`（line），包进 label 的 `GroupPrim`（与 label rotate 同 group 管线）。
5. **引线样式**：`leader.stroke` 缺省继承 node 主色 `color` / `currentColor`；`strokeWidth` 缺省细线；`dashPattern` 可选。
6. **英文 `.describe`**：`pin` / `leader` 及 `leader` 内字段（stroke / strokeWidth / dashPattern）逐一英文 describe。
7. **label / pin 计入 layout（实现期修正——原"不计入"反转）**：原决策"label/pin 不计入 layout、被裁用 alpha.9 viewBox override"在实现验证时立刻暴露问题——单 node + 远 label 的 demo 里 label 直接超出自动 viewBox 被裁，体验不可接受。改为 **label 文本框四角 + pin 一并计入 bbox**（`labelExtentPoints` → `allPoints`），与 **step.label 早已进 bbox**（`path-label.test.ts`）一致、也贴 TikZ（label 默认进 bounding box）。node 自身 rotate 时 label 四角绕 node 中心同步旋转。alpha.9 viewBox override 仍是"反向裁小 / 固定尺寸"的逃生口，但**默认不再裁掉 label**。
8. **`strokeWidth` 用 `.finite().positive()`**：`.positive()` 单用放行 `Infinity`（`Infinity > 0` 为真），须加 `.finite()`（评审 P1，与全仓 finite 约定一致）。

## 待决策点

- **引线终点锚定**：label 框朝 node 边中点 vs label center vs label 外接框相交点。倾向"框朝 node 边中点"（视觉自然，不穿过文字）。
- **引线起点是否随 node `rotate`**：node 旋转时边界点随之转（边界本就随 rotate），引线起点应跟随；待确认与 label placement 角度的一致性。
- **引线末端 arrow**：是否支持引线末端箭头（复用 arrow 系统）。倾向**留 alpha.8**（自定义 arrow 落地后增强），本段引线纯 line。
- ~~pin 是否计入 layout~~ **已拍 + 实现期修正（见 §决策细节 #7）**：label / pin **计入** layout（`labelExtentPoints`），与 step.label 一致、避免被裁；alpha.9 viewBox override 仅作"裁小 / 固定尺寸"逃生口。

## DSL 表面

```tsx
{/* 基本 pin：右侧引线 + 文字 */}
<Node label={{ text: 'entry', position: 'right', pin: true }}>A</Node>

{/* 引线样式 + 角度 placement */}
<Node label={{ text: 'note', position: 30, distance: 20, pin: true,
  leader: { stroke: 'gray', dashPattern: [2, 2] } }}>A</Node>

{/* 多 pin（label 数组） */}
<Node label={[
  { text: 'in', position: 'left', pin: true },
  { text: 'out', position: 'right', pin: true },
]}>A</Node>
```

## 测试设计

`packages/core/tests/compile/node-pin.test.ts`（新建）覆盖引线起点 / 终点 / 样式 / 多 pin / 与 label rotate 协同。详见"实现契约 § 测试象限"。

## 影响

- `packages/core/src/ir/node.ts`：`NodeLabelSchema` 加 `pin?` + `leader?`。
- `packages/core/src/compile/`（node label emit）：`pin` 为 true 时产引线 `PathPrim` + 包 GroupPrim。
- 文档：Node 页 `pin` / `leader`（引脚 demo）。
- 对外 API：纯叠加字段，零破坏。

## 不在本 ADR 范围

- **Paint / 资源表**→ [ADR-01](./01-paint-basics.md)；**maxTextWidth**→ [ADR-02](./02-max-text-width.md)。
- **引线末端 arrow**→ 留 alpha.8（自定义 arrow 后）。
- **pin 的 anchor 边上比例点起点**：复用 alpha.6 `boundaryPointOf`，不在本段扩 edgePoint。

---

## 实现契约（必填）

### Level

`yellow`

- 动 `packages/core/src/ir/node.ts`（label schema 加 2 字段）
- 动 `packages/core/src/compile/**`（label emit 产引线）
- 不动 primitive 契约 / index 公开面
- 取最高 = yellow

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/node.ts` | 加字段 | `NodeLabelSchema.pin` | `z.boolean().optional()` | 未给 = 无引线 | 为 true 时从 node 边界画引线到 label（TikZ pin） |
| `ir/node.ts` | 加字段 | `NodeLabelSchema.leader` | `z.object({ stroke?, strokeWidth?, dashPattern? }).optional()` | 缺省 = 细实线、继承 node 色 | 引线样式 |

> **英文 `.describe` 硬要求**：`pin` / `leader` + `leader` 内 `stroke` / `strokeWidth` / `dashPattern` 落地 `.describe(...)` 必须英文。

### 文件 scope

- `packages/core/src/ir/node.ts`（`NodeLabelSchema` 加 `pin` / `leader`）
- `packages/core/src/compile/`（node label emit：产引线 PathPrim + GroupPrim）
- `packages/core/tests/compile/node-pin.test.ts`（新建）
- `apps/docs/src/contents/core/components/node/`（Node 页 + pin demo）

### 测试象限

#### Happy path（≥ 3）

- `pin_right_leader`：`{ text:'x', position:'right', pin:true }` → 产 label TextPrim + 引线 PathPrim
- `leader_start_at_border`：引线起点落在 node 边界朝 label 方向的点
- `leader_end_at_label`：引线终点落在 label 框朝 node 一侧锚点
- `leader_default_style`：未给 `leader` → 细实线、stroke 继承 node `color` / `currentColor`

#### 边界（≥ 2）

- `pin_false_no_leader`：`pin` 未给 / false → 只有 label、无引线 PathPrim（零破坏）
- `multi_pin_array`：label 数组多 pin → 各产独立引线
- `pin_angle_placement`：`position` 为数字角度 → 引线起点沿该角度求边界

#### 错误路径（≥ 2）

- `leader_strokewidth_non_positive`：`leader.strokeWidth: 0` / 负 → schema 拒
- `pin_without_text`：pin 但 label 无 text → 按拍定（报错 / 空 label 引线），不崩

#### 交互（≥ 2）

- `pin_with_label_rotate`：pin + label `rotate` → 文字旋转、引线几何正确（同 GroupPrim）
- `pin_on_rotated_node`：旋转 node 上 pin → 引线起点随 node rotate 的边界点
- `pin_in_layout`：远处 label / pin 计入 layout 外接框（撑大 `scene.layout`，不被 viewBox 裁；与 step.label 一致）

### 依赖的现有元素

- `packages/core/src/ir/node.ts` 的 `NodeLabelSchema` —— **修改**：加 `pin` / `leader`
- `packages/core/src/compile/` 的 label emit（alpha.4 GroupPrim 包 label）—— **修改**：产引线 + 包同 group
- alpha.6 的 `boundaryPointOf`（`compile/node.ts`）—— **引用**：引线起点边界解析
- node 主色 `color` 级联（alpha.2）—— **引用**：引线 stroke 缺省继承
