# ADR-04：Path-level shape sugar 跨组件约定（点位契约 / 命名 / 几何下沉 / 等价性）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.5 plan §跨 sugar 设计约定 / §扩展性 / §与 Node shape 的关系](./roadmap.md) · 本 milestone [ADR-01](./01-arc-center-and-elliptical.md) / [ADR-02](./02-partial-circle-ellipse.md) / [ADR-03](./03-rectangle-step.md)

> **范围**：固化 alpha.5 一批形状 sugar（`<Circle>` / `<Ellipse>` / `<Arc>` / `<Sector>` / `<Rectangle>` / `<Grid>` / `<RegularPolygon>` / `<Star>`）共享的跨组件约定。ADR-01~03 管 IR 改动，本篇管 sugar 层契约。

## 决策

### 1. 点位契约：可计算形态限 literal 笛卡尔

sugar 在 React 期**没有编译期坐标**（`resolvePosition` 是 compile 期工作）。故分两类：

- **透传形态**（点位原样塞 `<Step>`，可接任意 Target = 笛卡尔 / 极坐标 / node id / relative / offset）：Circle / Ellipse / Arc / Sector 的 `center`、Rectangle `{ corner1, corner2 }`。
- **可计算形态**（sugar 要算 midpoint / bbox / 宽高 / arcStart，点位**只接 literal `[x, y]`**，传 node id / 极坐标 / 相对坐标**明确抛 Error、不静默兜底**）：Circle `{ from, to }` / `{ corner1, corner2 }`、Ellipse `{ corner1, corner2 }`、Rectangle `{ center, width, height }` / `{ center, side }` / `{ corner1, width, height }`、Sector（算 arcStart 画 wedge 边，[ADR-01](./01-arc-center-and-elliptical.md)）、Grid 全部形态。
- **点位类型以 `core/src/ir/path/target.ts` `TargetSchema` 为准**：不含 `{ direction, of }`（那是 Node / Coordinate 的 `position`，不是 path target）。

### 2. 命名：用「语法位」区分 sugar shape 与 node shape

- 形状作**独立组件** = 画图元 sugar：`<Circle>` / `<Rectangle>` / `<RegularPolygon>` …
- 形状作 **`shape=` 字符串值** = 节点形状：`<Node shape="circle">`

**同词有意**（词汇表一致），不另造前缀 / 命名空间（会丢短名与 TikZ 习惯）。区别在文档站「形状：sugar vs node shape」对照页讲清：sugar 是显式参数 → 纯绘制 PathPrim、无 text/anchor/boundary；node shape 是文本反推 layout → 绘制 + 连接数学。

### 3. 几何下沉 `core/src/geometry/`

ADR-01~03 新增的 outline / 顶点几何**一律写成 `geometry/*.ts` 纯函数**（`arc.ts` 椭圆弧、`{circle,ellipse}.ts` 部分 outline、`rect.ts` 圆角 outline、`polygon.ts` 顶点），**不内联在 `compile/path/`**。理由：`@retikz/core` 不能 import `@retikz/react`，「Node 复用 sugar」依赖方向不成立；正确形态是 sugar 的 compile 路径与未来 node shape 的 `emit` / `boundaryPoint` / `anchor` **并列消费同一 core 几何层**。

### 4. sugar 实现约定

- **每个 sugar = 纯函数 React FC**：props → 算出 `<Path> > <Step>` 子树 return；**不动 `kernel/builder.ts`**（builder 兜底展开普通函数组件）。约束：纯同步函数、无 hooks/context、不能 `memo` / `forwardRef` 包（builder 仅展开 `typeof type === 'function'`）。
- **多形态用 TS union + 运行时 narrow**：入口 if-else 按 prop 在场分形态，缺字段 / 混形态抛**具体** Error（如 `'Circle 需要 radius / diameter / { from, to } / { corner1, corner2 } 之一'`），不静默兜底。
- **prop 名全称**（AGENTS.md）：`radius` 不缩 `r`、`sides` 不缩 `n`、`corner1` / `corner2` 不缩 `p1` / `p2`。Rectangle 圆角 prop 用 `roundedCorners`（沿用 Node / IR 同名字段，不另起 `borderRadius`）。

### 5. 等价性是验收硬指标

每个 sugar × 每种 prop 形态一个**等价性测试**：sugar 派发出的 IR 与手写 Kernel `<Path><Step>` IR `toEqual`（diff = 0）——证明「sugar 不引入新能力、只是 Kernel 的便利包装」（AGENTS.md「Sugar = Kernel 等价性硬规则」）。

### 被否决的选项

- **几何下沉 core 让所有形态接任意 Target**（消除可计算形态的 literal 笛卡尔限制）—— 工作量大，留后续；当前可计算形态对非 literal 点位明确抛 Error 而非静默兜底。

## 不在本 ADR 范围

- 让可计算形态也接任意 Target 的全几何下沉（见上「被否决的选项」，留后续）。

---

> **实现指针**：level `green`（本篇只固化 react sugar 层约定 + docs；IR / compile 改动在 [ADR-01](./01-arc-center-and-elliptical.md)~[ADR-03](./03-rectangle-step.md)，几何下沉的纯函数属「新增」非改契约）、非 breaking。真源以代码为准——8 个 sugar `react/src/sugar/{Circle,Ellipse,Arc,Sector,Rectangle,Grid,RegularPolygon,Star}.tsx`（经 `react/src/sugar/index.ts` + `react/src/index.ts` 导出）、几何纯函数 `core/src/geometry/*.ts`、builder 兜底展开 `react/src/kernel/builder.ts`（仅依赖、不改）；docs 端 `COMPONENT_REGISTRY`（`apps/docs/src/lib/jsx-to-ir/parser.ts`）+ AI chat 组件清单。测试在 `react/tests/sugar/shapes.test.tsx`（每 sugar 每形态 IR === 手写 Kernel）。完整原文（落地分布 / 文件 scope / 候选排序 / 测试象限）见本文件 git 历史。
