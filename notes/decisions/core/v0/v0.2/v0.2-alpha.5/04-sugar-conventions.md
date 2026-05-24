# ADR-04：Path-level shape sugar 跨组件约定（点位契约 / 命名 / 几何下沉 / 等价性）

- 状态：Accepted
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.5 plan §跨 sugar 设计约定 / §扩展性 / §与 Node shape 的关系](../../../plans/v0/v0.2-alpha.5.md) · 本 milestone [ADR-01](./01-arc-center-and-elliptical.md) / [ADR-02](./02-partial-circle-ellipse.md) / [ADR-03](./03-rectangle-step.md)

## 背景

alpha.5 加 6（+ 收尾 2）个形状 sugar（`<Circle>` / `<Ellipse>` / `<Arc>` / `<Sector>` / `<Rectangle>` / `<Grid>`，收尾 `<RegularPolygon>` / `<Star>`）。它们共享一组跨组件约定，单独立 ADR 固化，避免每个 sugar 各自为政。ADR-01~03 管 IR 改动，本篇管 **sugar 层契约**。

## 决策

### 1. 点位契约：可计算形态限 literal 笛卡尔（AskUserQuestion 已选）

sugar 在 React 期**没有编译期坐标**（`resolvePosition` 是 compile 期工作）。故：

- **透传形态**（点位原样塞 `<Step>`，可接任意 Target = 笛卡尔 / 极坐标 / node id / relative / offset）：Circle / Ellipse / Arc / Sector 的 `center`、Rectangle `{ corner1, corner2 }`。
- **可计算形态**（sugar 要算 midpoint / bbox / 宽高 / arcStart，点位**只接 literal `[x, y]`**，传 node id / 极坐标 / 相对坐标**明确抛 Error，不静默兜底**）：Circle `{ from, to }` / `{ corner1, corner2 }`、Ellipse `{ corner1, corner2 }`、Rectangle `{ center, width, height }` / `{ center, side }` / `{ corner1, width, height }`、Sector（要算 arcStart 画 wedge 边，[ADR-01](./01-arc-center-and-elliptical.md)）、Grid 全部形态。
- **点位类型以 `ir/path/target.ts` `TargetSchema` 为准**：不含 `{ direction, of }`（那是 Node / Coordinate 的 `position`，不是 path target）。
- 备选「几何下沉 core 让所有形态接任意 Target」未选——工作量大，留后续。

### 2. 命名：用「语法位」区分 sugar shape 与 node shape（收口 plan §Circle 命名歧义）

- 形状作**独立组件** = 画图元 sugar：`<Circle>` / `<Rectangle>` / `<RegularPolygon>` …
- 形状作 **`shape=` 字符串值** = 节点形状：`<Node shape="circle">`

**同词有意**（词汇表一致），不另造前缀 / 命名空间（会丢短名与 TikZ 习惯）。文档配一页「形状：sugar vs node shape」讲清两者区别（详 plan §与 Node shape 的关系：sugar 是显式参数→纯绘制 PathPrim、无 text/anchor/boundary；node shape 是文本反推 layout→绘制+连接数学）。

### 3. 几何下沉 `core/geometry/`（复用前提）

ADR-01~03 新增的 outline / 顶点几何**一律写成 `geometry/*.ts` 纯函数**（`arc.ts` 椭圆弧、`{circle,ellipse}.ts` 部分 outline、`rect.ts` 圆角 outline、收尾 `polygon.ts` 顶点），**不内联在 `compile/path/`**。理由：`@retikz/core` 不能 import `@retikz/react`，「Node 复用 sugar」依赖方向不成立；正确形态是 sugar 的 compile 路径与未来 node shape 的 `emit` / `boundaryPoint` / `anchor` **并列消费同一 core 几何层**。

### 4. sugar 实现约定

- **每个 sugar = 纯函数 React FC**：props → 算出 `<Path> > <Step>` 子树 return；**不动 `kernel/builder.ts`**（builder 兜底展开普通函数组件，plan §扩展性）。约束：纯同步函数、无 hooks/context、不能 `memo`/`forwardRef` 包（builder 仅展开 `typeof type === 'function'`）。
- **多形态用 TS union + 运行时 narrow**：入口 if-else 按 prop 在场分形态，缺字段 / 混形态抛**具体** Error（如 `'Circle 需要 radius / diameter / { from, to } / { corner1, corner2 } 之一'`），不静默兜底。
- **prop 名全称**（AGENTS.md）：`radius` 不缩 `r`、`sides` 不缩 `n`、`corner1`/`corner2` 不缩 `p1`/`p2` 等。Rectangle 圆角 prop 用 `roundedCorners`（沿用 Node / IR 同名字段，不另起 `borderRadius`）。

### 5. 等价性是验收硬指标

每个 sugar × 每种 prop 形态一个**等价性测试**：sugar 派发出的 IR 与手写 Kernel `<Path><Step>` IR `toEqual`（diff = 0）——证明「sugar 不引入新能力、只是 Kernel 的便利包装」。

### 6. 候选 sugar 排序

核心 6（Circle / Ellipse / Arc / Sector / Rectangle / Grid）先落（过程中维持 6 sugar / 15 白名单）；`<RegularPolygon>` / `<Star>`（纯 sugar、无 IR 改动、仅加 `geometry/polygon.ts`）**收尾追加**，完成后升级为 **8 sugar / 17 白名单**，文档 +2 页、待定 / plan 同步。

## 影响

- `packages/react/src/sugar/{Circle,Ellipse,Arc,Sector,Rectangle,Grid}.tsx`（+ 收尾 `{RegularPolygon,Star}.tsx`）：新建。
- `packages/react/src/sugar/index.ts` + `packages/react/src/index.ts`：导出。
- `packages/core/src/geometry/*.ts`：新增 outline / 顶点纯函数（ADR-01~03 + polygon）。
- `apps/docs/src/lib/jsx-to-ir/parser.ts`：`COMPONENT_REGISTRY` 9 → 15（→ 收尾 17）。
- `apps/docs/src/layout/ai-chat/context.ts`：`composeSystem` 组件清单 + 每 sugar 最小示例。
- 文档：6（→ 8）component page + ComponentPreview demo + examples；「形状：sugar vs node shape」对照页。

## 实现契约

### Level

`green`（本篇约束 react sugar 层 + docs；IR / compile 改动在 ADR-01~03。几何下沉条目跨 core geometry，但属"新增纯函数"非改契约）。

### 测试象限（`packages/react/tests/sugar/*.test.tsx`）

- happy：每 sugar 每形态派发 IR === 手写 Kernel IR（等价性）
- 边界：透传形态 center 接 node id 字符串 / 极坐标正常透传；roundedCorners clamp（经 compile）
- 错误：可计算形态点位传 node id / 极坐标 → 抛具体 Error；混形态 / 缺字段 → 抛具体 Error
- 交互：sugar 嵌在 `<TikZ>` / `<Scope>` 内被 builder 透明展开（端到端 IR 正确）

### 依赖

- `kernel/builder.ts` `readSceneChildren` 兜底展开 —— **仅依赖、不改**（普通函数组件自动命中）。
- ADR-01~03 的 IR step 改动 —— sugar 派发的目标。
- `geometry/*.ts` —— sugar 下游 compile 与未来 node shape 共享。
