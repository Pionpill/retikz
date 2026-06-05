# ADR-01：水合（hydration）—— SVG + Canvas 统一事件绑定

- 状态：Accepted（已实现，2026-06-05；core IRPath.id + 图元 id stamp / render data-retikz-id + hitTest + hydration 控制器 / vanilla hydrate + mountCanvas / react 事件 props + collectHydrationHandlers + 双模等价 / 文档全落地。Adversarial 两关：第一关修 1 BLOCKING——canvas enter/leave 改 pointermove 状态机；第二关 contract 对账无 BLOCKING）
- 决策日期：2026-06-04
- 关联：[v0.3 roadmap §水合 / §动画 / §Alpha 切分 alpha.3](../roadmap.md) · [core-design.md §4.4 IR 100% 可序列化](../../../../../architecture/core-design.md) · [alpha.1 ADR-03 vanilla runtime / 依赖图](../v0.3-alpha.1/03-vanilla-runtime-and-dependency-graph.md)

> **范围**：SSR / 静态先渲染出图，客户端再把用户 handler 绑回图元。SVG 与 Canvas 共用同一套绑定语义，差异只在"如何把 pointer 事件定位到图元 id"这一定位层。函数（handler / 回调）**不进 IR**，只在 runtime。本 ADR 不做动画（roadmap §动画，候选 v0.4，复用本段 runtime 基建）。

## 背景 / 约束

塑造方案的硬约束（2026-06-04 摸底）：

- **`PathSchema` 无 `id`**——Node / Coordinate / Scope 都有 user `id`，唯独 Path 缺；Path 水合须新增 `IRPath.id`（本 ADR 唯一一处 IR schema 变更，触发文档同步）。
- **Node emit 不总是 group**——纯几何 Node 平铺 shape 图元、不包 group，带文本 / rotate 才包单层 `GroupPrim`；故挂点不能"灌到 group"，须 stamp 到每个 top-level emit 图元。
- **Coordinate 无视觉、不 emit 图元**——无可点面积、不能作 hit 目标，首版不暴露 handler。
- **`react ⊥ vanilla`**（[alpha.1 ADR-03](../v0.3-alpha.1/03-vanilla-runtime-and-dependency-graph.md)）——两者唯一共同依赖是 `@retikz/render`，共享水合 runtime 只能落那里（不能落 vanilla）。
- **Canvas 无逐图元 DOM**，但 `drawScene` 每个 prim 都经 `beginPath()` 构建路径——可复用同一几何 + 原生 `isPointInPath` / `isPointInStroke` 做 hit-test，无需离屏色拾取。

## 决策：统一注册表 + 双定位层，共享 runtime 落 `@retikz/render/hydration`

绑定分两层：

- **上层**（renderer 无关 runtime）：handler 注册表 `Map<id, Map<eventName, handler>>` + 根级单 listener 分发；非冒泡的 `pointerEnter` / `pointerLeave` 用 **`pointermove` + 上一帧命中 id 状态机**合成（每次 move `locate→id`，与上次不同则 fire leave(旧)+enter(新)）。SVG / Canvas 经统一 `locate` 共用同一套 → 双模等价。
- **下层**（定位，各自实现）：SVG 走 `event.target.closest('[data-retikz-id]')`；Canvas 走 `hitTest`（pointer → Scene 坐标 → 逆 z-order 复用 drawScene 几何 + isPointInPath/isPointInStroke，命中即最近 id-bearing 祖先 id）。

挂点来自 IR user `id`，compile stamp 到每个 top-level emit 图元——**只为 user id**（天然 opt-in、不膨胀输出、无需 manifest）。函数绝不进 IR；只有事件"名"是数据（枚举），handler 是闭包只活在 runtime 注册表，IR 仍 100% JSON 可序列化。

**命名决策**（字面即决策，故记下）：事件名全程无缩写——`doubleClick`（非 `dblclick`）、`rightClick`（非 `contextmenu`），`as const` + `ValueOf` 派生、裸字面量仍可用；DOM 技术名只藏在内部 `EVENT_DOM_TYPE` 映射，不外露。完整枚举见代码 `render/src/hydration`（`RetikzEvent`）。新增数据：`IRPath.id`（zod additive optional，`core/src/ir/path/path.ts`）、`ScenePrimitive.id?`（纯 TS、非 zod，`core/src/primitive/*`）。

理由：

1. **唯一同时满足**「SVG+Canvas 统一语义」「react/vanilla 共享」「`renderer` 双模 handler 等价」「函数不进 IR」四条。
2. **最大化复用**：SVG 定位 trivial `closest`；Canvas hit-test 复用 drawScene 几何 + 原生 isPointInPath；上层分发器一份两端共用。
3. **opt-in 零额外 IR 契约**：挂点来自现有 `id` 字段，SSR 只多 emit 一个 attribute。
4. **依赖图自洽**：共享 runtime 落 render，不破坏 `react ⊥ vanilla`。

### 被否决的选项

- **B：React 用原生合成事件（onClick 挂元素）+ vanilla 另用委托** —— 两套机制违反"共享同一绑定语义"；`renderer="canvas"` 下 react 无逐元素节点、无法挂 React handler，双模不一致。
- **C：Canvas 离屏 pick canvas（每图元唯一色重绘、读像素反查 id）** —— 需维护同步离屏副本 + 每帧重绘，与 drawScene 逻辑双份；A 复用同一几何更省更 DRY。留作超大图后续优化备选。
- **D：interaction manifest 进 IR** —— "哪些 id 可交互"可由 user id 存在性 + runtime handlers map 推断，进 IR 只增 schema 面、撑 LLM 契约。
- **E：水合 runtime 放 `@retikz/vanilla`** —— react 不依赖 vanilla（ADR-03），放这儿 react 用不了。

## 不在本 ADR 范围

- **动画**（时间轴进 IR + 数据过渡 / 形变 `view.update(nextIr, {transition})`）—— roadmap §动画，候选 v0.4，复用本段 runtime（rAF / 事件）基建。
- **root 级「离开整图」hook**（≈ ECharts globalout）、**冒泡版 `pointerover` / `pointerout`** —— enter/leave 之外按需暴露，延后。
- 键盘 / 焦点 / a11y、拖拽 / pan / 缩放手势编排（down·move·up 原语已具备、可自拼）、touch 专属事件、惯性。
- Canvas hit-test 空间索引 / 离屏拾取性能优化（超大图）；interaction manifest 外部导出格式；AI 增量渲染 / progressive（v0.4+，共用 `update(nextIr)` 通道）。

---

> **实现指针**（施工契约已封板压缩，原文见 git）：level `red`、四包 lockstep、非 breaking（新增项均 additive）。
> - 实现 commit `75e2c933..978b4c41`（core → render → vanilla → react → adversarial 修复）。
> - 用户 API / 交互 demo 见文档站「参考 / 渲染器 / 水合」页 + Path 组件页 API 表 `id` 行（react 事件 props `onClick`… / vanilla `hydrate` / `mountCanvas` / `<Layout handlers>` 两套写法）。
> - 真源以代码为准：`IRPath.id`（`core/src/ir/path/path.ts`）、`ScenePrimitive.id`（`core/src/primitive/*`）、`RetikzEvent` / `hitTest` / `createHydrationController`（`render/src/{hydration,canvas}`）、`hydrate` / `mountCanvas`（`vanilla/src`）；测试在四包 `tests/`（scene-id stamp、path-id round-trip、hitTest 逆 z-order / stroke-only、enter/leave 合成、collectHydrationHandlers、renderer-parity、ssr-then-hydrate）。
> - 完整施工契约（Schema 改动表 / 文件 scope / 测试象限 16 case / 依赖现有元素）：`git show 9f795047:notes/decisions/core/v0/v0.3/v0.3-alpha.3/01-hydration.md`。

> 🔖 封板压缩 commit `a5a1bd80`；压缩前完整施工蓝图 = `git show a5a1bd80^:notes/decisions/core/v0/v0.3/v0.3-alpha.3/01-hydration.md`。
