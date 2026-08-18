# ADR-03：pin 引脚（label + 引线）

- 状态：Accepted（已实现）
- 决策日期：2026-05-24
- 关联： · tikz-gap-analysis §1 Node（历史分析已删除） · 本 milestone [ADR-01](./01-paint-basics.md) / [ADR-02](./02-max-text-width.md) · [alpha.4 Node label rotate](../alpha.4)（label 体系）· [alpha.6 ADR-02 edgePoint](../alpha.6/02-side-t-edge-point.md)（引线起点边界解析）

## 背景 / 约束

- `NodeLabelSchema` 的 label 挂 node 边、`position`（8 方向 / 数字角度）+ `distance` + 字体 + `rotate`（alpha.4），但 label **无引线**——直接贴在 node 旁的文字。
- 缺带指引线的标注（TikZ `[pin=right:bar]`：从 node 牵一条短线连到文字）。pin 本质 = "label + 一条从 node 边到 label 的引线"，可复用 label 的方向 / 角度 / distance，引线起点取 node 边界（复用 alpha.6 `boundaryPointOf` / `edgePoint`）。

## 决策：`NodeLabelSchema.pin` 单字段（`boolean | LeaderStyle`）合并开关 + 样式

核心数据结构（字面即决策——单字段的取舍是关键决策，完整 schema + 英文 describe 见 ）：

```ts
// label 复用，pin 单字段表达"开关 + 样式"
pin?: boolean | { stroke?: string; strokeWidth?: number; dashPattern?: Array<number> }
// true = 默认细实线；对象 = 带样式；省略 / false = 无引线
```

理由：

1. **复用 label placement，最 DRY**：pin = label + 引线，placement / distance / 字体 / rotate 全复用，只加 `pin` 单字段。
2. **单字段消除非法组合**：`pin: boolean` 与独立 `leader` 对象会允许"缺 pin + 给 leader"的无意义组合，因此合并成单 `pin` 字段；emit 用 `typeof pin === 'object'` 取样式。
3. **引线几何复用 alpha.6**：起点取 node 边界朝 label 方向点（`boundaryPointOf`），无新几何。
4. **零破坏**：`pin` 都 optional，现有 label 不受影响。

设计细节（具体决策）：

- **引线起点**：node 边界上朝 label `position` 方向的点，复用 `boundaryPointOf(node, towardLabel)`（auto clip 同款），或沿 label 角度求边界。
- **引线终点**：label 外接框朝 node 一侧的锚点（label 框朝 node 边的交点）。
- **产出**：label 的 `TextPrim` + 一条引线 `PathPrim`（line），包进 label 的 `GroupPrim`（与 label rotate 同 group 管线）。
- **引线样式**：`pin` 为对象时取 `stroke` / `strokeWidth` / `dashPattern`；`stroke` 缺省继承 label 色 / `currentColor`，`strokeWidth` 缺省 1。
- **`strokeWidth` 用 `.finite().positive()`**：`.positive()` 单用放行 `Infinity`（`Infinity > 0` 为真），须加 `.finite()`（与全仓 finite 约定一致）。

### label / pin 计入 layout（实现期反转原决策）

原决策"label / pin 不计入 layout、被裁用 alpha.9 viewBox override"在实现验证时立刻暴露问题——单 node + 远 label 的 demo 里 label 直接超出自动 viewBox 被裁，体验不可接受。**改为 label 文本框四角 + pin 一并计入 bbox**（`labelExtentPoints` → `allPoints`），与 step.label 早已进 bbox 一致、也贴 TikZ（label 默认进 bounding box）。node 自身 rotate 时 label 四角绕 node 中心同步旋转。alpha.9 viewBox override 仍是"反向裁小 / 固定尺寸"的逃生口，但默认不再裁掉 label。

## 长期边界

- **Paint / 资源表** → [ADR-01](./01-paint-basics.md)；**maxTextWidth** → [ADR-02](./02-max-text-width.md)。
- **引线末端 arrow**：留 alpha.8（自定义 arrow 落地后，复用 arrow 系统增强），本段引线纯 line。
- **pin 的 anchor 边上比例点起点**：复用 alpha.6 `boundaryPointOf`，不在本段扩 edgePoint。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：additive 非 breaking（`pin` optional）；其余默认行为、失败语义与公开契约以正文为准。
