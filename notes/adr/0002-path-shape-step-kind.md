# ADR-0002：Path-level 形状指令（arc / circlePath / ellipsePath）

- 状态：Accepted（2026-05-09 完工）
- 决策日期：2026-05-09
- 关联：[v0-roadmap §v0.1.0-alpha.3](../plans/v0-roadmap.md) · [tikz-gap-analysis §2 P1](../analysis/2026-05-07-tikz-gap-analysis.md) · ADR-0001（曲线 step kind）

## 背景

TikZ 的 path 不仅可以由"点 → 点"的连接段组成，还可以直接画整图形：

- `\draw (A) arc[start angle=0, end angle=90, radius=2];`：弧段
- `\draw (A) circle[radius=1];`：以 A 为圆心的整圆
- `\draw (A) ellipse[x radius=2, y radius=1];`：椭圆

retikz 的 alpha.3 必须能表达 arc / 整圆 / 整椭圆三类，否则几何图、节点装饰、网络拓扑里的弯曲连接都画不出来。

跟 ADR-0001 的曲线 step kind 不同：曲线是"两点间连接"（有 from → to 起末），arc / circle / ellipse 是"以某点为圆心的整图形"——拓扑上不消耗"前进"语义，画完后画笔留在原点（或弧的终点，取决于 TikZ 实现）。

## 选项

### A. step kind 扩展（**推荐**）

```ts
type IRStep =
  | ...（既有）
  | { kind: 'arc'; startAngle: number; endAngle: number; radius: number }
  | { kind: 'circlePath'; radius: number }
  | { kind: 'ellipsePath'; radiusX: number; radiusY: number };
```

圆心（弧 / 圆 / 椭圆）**隐式**取上一 step 的终点（即 `lastEndPoint`）；新 step 走完后 path 的"画笔位置"按 TikZ 语义：

- `circlePath` / `ellipsePath`：闭合后留在原圆心（下一 step 从圆心出发）
- `arc`：留在弧的终点（圆心 + radius·(cos endAngle, sin endAngle)）

### B. Path-level prop（与 step 序列并列）

```ts
type IRPath = {
  steps: Array<IRStep>;
  shape?: { type: 'arc' | 'circle' | 'ellipse'; ... };
};
```

### C. 独立 IR 节点（脱离 path）

```ts
type IRDrawable = IRPath | IRArcDrawable | IRCircleDrawable | ...;
```

## 决策

选 **A：扩展为 step kind（与 curve / cubic / bend 同层）**。

圆心隐式取上一 step 终点；arc 起末按 startAngle / endAngle 算；circlePath / ellipsePath 闭合后画笔回到圆心。

## 理由

1. **保持 path 是 step 序列的一致性**：alpha.1 起 `IRPath = { steps: [...] }` 是稳定 schema，所有"画什么"都装进 `steps` 数组。引入新一类 path-level prop 等于多开一个并行轨，IR 模型分裂
2. **TikZ 原生语义**：`\draw (A) circle[...]` 与 `\draw (A) -- (B)` 都接在同一条 path 描述里，TikZ 把它们视为同语法层级的 path 操作。retikz IR 直接对齐这一层
3. **复用 from-target 推断**：所有既有 step kind 都需要从上一 step 推上 from（参见 alpha.1 path clip 算法重构），arc / circle / ellipse 同样需要 lastEndPoint 当圆心——已有机制免费复用
4. **B 方案是反模式**：`path.shape` 与 `path.steps` 谁先画？多个 shape 按什么顺序？引入隐式排序规则等于把 IR 拖向"复杂状态机"
5. **C 方案丧失组合能力**：用户希望"先画一段直线、再画一个圆、再连一段弧"——这在 step kind 方案里就是数组 push 三个元素，独立 drawable 方案下需要把多 drawable 包起来再渲染，反而把 path 拆碎
6. **AI 友好**：alpha.1 的 LLM 写 path 已经习惯"steps 数组里塞 step"，新增 kind 不破坏心智模型

## 影响

### IR Schema

`packages/core/src/ir/path/step.ts`：扩展 discriminatedUnion，加 `arc` / `circlePath` / `ellipsePath` 三分支。

```ts
{ kind: 'arc',
  startAngle: z.number().describe('Arc start angle in degrees, CCW from +x'),
  endAngle:   z.number().describe('Arc end angle in degrees'),
  radius:     z.number().positive(),
}
```

### 几何模块

`packages/core/src/geometry/`：

- arc：扩 `arcEndPoint(center, radius, angleDeg)` 工具
- circle / ellipse：alpha.1 已有 `boundaryPoint`，复用即可

### Compile

`packages/core/src/compile/path.ts`：

- `arc` → SVG `A rx,ry 0 large-arc,sweep ex,ey`，sweep 由 `endAngle > startAngle` 决定
- `circlePath` → SVG `M cx,cy + radius`（起点）`A radius,radius 0 1,1 cx,cy + radius'` 两段半弧拼整圆（避开 `A` 命令的 360° 退化）
- `ellipsePath` → 同 circle 但 rx ≠ ry

画笔位置追踪：

- 进入 `arc`：lastEndPoint = from + (radius·cos endAngle, radius·sin endAngle)
- 进入 `circlePath` / `ellipsePath`：lastEndPoint = from（圆心，闭合后回到原点）

### React DSL

`packages/react/src/kernel/Step.tsx`：透传新字段；可选 sugar `<Arc>` / `<Circle>` / `<Ellipse>` 组件——本 ADR 不强制。

### 文档

- `apps/docs/src/contents/core/components/draw/step/`：补 arc / circle / ellipse 子页与 demo
- alpha.3 changelog 标 P1 改动

## 等价性测试

- IR ↔ JSON 序列化无损（所有新 kind）
- builder ↔ unbuilder 双向
- arc 0° / 90° / 180° / 360° 边界几何正确（含 sweep flag 取值）
- circlePath 与 cycle 同时使用时的拓扑（圆 + 之后再 line 出去：从圆心出发还是从圆周？—— **决策：从圆心**）
- ellipsePath 退化为 circlePath（rx === ry）的渲染等价
