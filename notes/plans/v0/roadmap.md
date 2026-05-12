# v0 路线图：完成 TikZ 基础能力

> 写于 2026-05-07。完工或重大调整时**更新本文件**，不另起新文。
>
> 关联：[`架构 DESIGN.md`](../architecture/DESIGN.md) · [`TikZ gap analysis`](../analysis/2026-05-07-tikz-gap-analysis.md)

## 总目标

把 retikz 做成"浏览器原生的 TikZ 子集"——`@retikz/core` + `@retikz/react` 能画出 TikZ 主流用例：流程图、UML、几何图、网络拓扑。

**衡量标准**：TikZ basic examples 集合 60% 以上能用 retikz 等价复刻（流程图 / UML / 几何图分类；不含 plot / decorations / 3D）。

## 版本节奏

每个 v0.x 是一个能力大块，**封闭后再开下一块**，避免半成品并行。

| 版本 | 主题 | 主要新增 |
|---|---|---|
| **v0.1**（当前焦点） | **Node + Path 基础能力** | shape 多态、anchor 命名、箭头、折角、cycle、fill、曲线、相对坐标 |
| v0.2 | Scope + 样式 + Shape 扩展 | `<Scope>` / `<Group>`、`every node/.style` 默认值、局部 transform、`NodeShape` 闭合枚举打开 + ShapeRegistry 注入第三方 shape |
| v0.3 | 高级定位 / Coordinate | `<Coordinate>` 命名点、相对定位语义糖、`intersections` / `calc` |
| v0.4 | TikZ libraries 概念 + decorations 入门 | `shapes.geometric` / `arrows.meta` 等 lib 划分 |
| v0 收尾 | codec 起步、文档完整 | `@retikz/codec` 早期 IR ↔ TikZ 文本子集双向转换 |

v0 完工后开 v1，重点转向 **Tier 2 domain 包**（`@retikz/flow`、`@retikz/plot`）与跨框架 adapter。

---

## v0.1 拆分：Node + Path 基础能力

把 Node 与 Path 两个组件按 [TikZ gap analysis](../analysis/2026-05-07-tikz-gap-analysis.md) 的 P0 + P1 全部补齐——让 retikz 能画出完整流程图、UML 类图、基础几何图。

### 当前位置

**v0.1.0-alpha**（已发布）：Node 仅矩形；Path 仅 `move` / `line`；`Target` 仅 `Position | PolarPosition | string`（节点 id）。

### 拆分原则

- **每个小版本一个语义闭环**——发布后用户能画一类新东西，不留半成品
- **alpha → beta → 0** 递进：alpha 允许破坏性改动（schema / API），beta.1 起严格只做非破坏性（bug / 性能 / 错误信息 / 内部重构 / 文档）
- 每条 IR schema 改动配等价性测试；**有争议的设计选项另起 ADR**

### v0.1.0-alpha.1 — 流程图最小集（P0 闭环）

**目标**：画通完整流程图 + UML 类图。

| 改动 | 来源 |
|---|---|
| `IRStep.kind` 加 `'step'`（折角，`via: '-\|' \| '\|-'`） | gap §2 P0 |
| `IRStep.kind` 加 `'cycle'`（闭合到起点） | gap §2 P0 |
| `IRPath.arrow: 'none' \| '->' \| '<-' \| '<->'`（最常见三种箭头） | gap §2 P0 |
| `IRPath.fill` + `fillRule`（闭合后能填色） | gap §2 P1 |
| Node `shape: 'rectangle' \| 'circle' \| 'ellipse' \| 'diamond'` + 各自 `boundaryPoint` | gap §1 P0 |
| `IRTarget` 字符串扩展为 `'A' \| 'A.north' \| 'A.east' \| 'A.30'`（命名 + 角度锚点） | gap §1 P0 |

**待写 ADR**：
- 折角 step 语法：`via: '-\|' \| '\|-'` vs 单独 step kind
- 箭头表示：path-level 单 prop（`arrow: '->'`）vs 起末两个 prop
- shape 默认值（推荐 `'rectangle'`，与现状兼容）
- Target 字符串语法：anchor 用 `.` 分隔的合理性

### v0.1.0-alpha.2 — Node 美化（P1）

**目标**：节点视觉表达跟 TikZ 主题一致——多行文本、圆角、字体、不透明度全集。

| 改动 | 来源 |
|---|---|
| `Node.text` 升级为 `string \| Array<string>`（多行）+ `align` + `textWidth`（自动换行） | gap §1 P1 |
| Node `font: { family?, weight?, style?, size? }` 取代当前 `fontSize` 标量 | gap §1 P1 |
| `textColor` / `opacity` / `fillOpacity` / `drawOpacity` | gap §1 P1 |
| `roundedCorners` / `minimumWidth` / `minimumHeight` / `minimumSize` | gap §1 P1 |
| Node 描边样式：`dashed` / `dotted` / `dashArray` | gap §1 P1 |
| `innerXSep` / `innerYSep` / `outerSep` 分轴（替换或补强当前 `padding` / `margin`） | gap §1 P2 |
| `scale` / `xScale` / `yScale` | gap §1 P2 |

**待写 ADR**：
- `font` 用对象 vs 多个扁平字段（family / weight / size 单独）
- multi-line text：数组 vs `\n` 字符串
- `padding` / `margin` 是保留为 alias 还是直接迁移

### v0.1.0-alpha.3 — Path 增强（P0/P1）

**目标**：路径不只是直线段——曲线、相对坐标、边标注、形状指令全开。

| 改动 | 来源 |
|---|---|
| `Step.kind: 'curve'`（quadratic）+ `'cubic'`（两控制点） | gap §2 P0 |
| `Step.kind: 'bend'`（`bend left=N` / `bend right=N` 简记） | gap §2 P0 |
| 相对坐标：`Target` 加 `{ rel: [dx, dy] }` / `{ relAccumulate: [dx, dy] }` | gap §2 P1 |
| 路径上挂 node：`Step.label?: { text, position?: 'midway'\|'near-start'\|'near-end', side?: 'above'\|... }` | gap §2 P1 |
| Path-level 形状：`Step.kind: 'arc' \| 'circlePath' \| 'ellipsePath'` | gap §2 P1 |
| `lineCap` / `lineJoin` | gap §2 P2 |
| 语义 stroke 档位（`thickness: 'thin' \| 'thick' \| ...`） | gap §2 P2 |
| `opacity` / `strokeOpacity` 全套 | gap §2 P2 |

**待写 ADR**：
- 相对坐标的 IR 表达：嵌套对象 vs 字符串前缀
- bend：作为独立 step kind 还是 curve 的 option
- 边标注：嵌入 step 还是单独 child

### v0.1.0-alpha.4 — 相对定位 + 顶层完善（P1 + 共有）

**目标**：节点间相对定位、Coordinate 占位，整 v0.1 收尾打磨。

| 改动 | 来源 |
|---|---|
| Node `position: { direction: 'above'\|'below'\|'left'\|'right'\|..., of: NodeId, distance?: number }` | gap §1 P1 |
| `<Coordinate>` IR 节点（占位、不绘制、可被 path 引用） | gap §3 |
| Node `label?` 子结构（节点边挂额外文字） | gap §1 P2 |
| 文档站补齐 Node / Path 全 prop 演示页 | — |
| 测试覆盖 P0 / P1 全部组合 | — |

### v0.1.0-alpha.5 — schema 收尾扩张（破坏性窗口最后一站）

**目标**：alpha 期间发现但未补完的 IR schema 能力洞、字段语义 / 命名调整等"用户可见破坏性改动"全收在这一版；本版发布后 schema 字段名 / 语义冻结。

详细 TODO 见 [`v0.1-alpha.5.md`](./v0.1-alpha.5.md)。

| 改动 | 来源 |
|---|---|
| `Node.position` / `Coordinate.position` 加第 4 种相对定位（任意 `(dx, dy)` offset，对应 TikZ `calc` 语法） | v0.1-alpha.5 plan TODO-1 |

### v0.1.0-beta.1 — 非破坏性优化窗口 + 文档完整

- **不动** IR schema 字段名 / 语义；alpha.5 起冻结
- bug 修复、性能优化、错误信息改善、内部重构
- README、CHANGELOG、迁移指引就位
- npm prerelease 上架

### v0.1.0 — 正式发布

- 跑通 30+ TikZ basic examples 等价复刻
- 文档站三套教程：Hello World / Flow chart / UML class diagram

### v0.1 跟踪

- [x] v0.1.0-alpha.1（2026-05-09 完工：6 项改动 + 4 篇 ADR + ~180 测试）
- [x] v0.1.0-alpha.2（2026-05-09 完工：7 项改动 + 3 篇 ADR + 47 新测试 + sugar `<Text>`）
- [x] v0.1.0-alpha.3（2026-05-10 完工：ADR-01 Path 曲线三件套 curve / cubic / bend；ADR-02 path-level 形状 arc / circlePath / ellipsePath；ADR-03 相对坐标 `{ rel }` / `{ relAccumulate }` + way sugar 对象形态；ADR-04 边标注 step.label + sugar `<EdgeLabel>` + Draw way label 算子；P2 path 级 lineCap / lineJoin / thickness 语义档位 / opacity / fillOpacity / drawOpacity）
- [x] v0.1.0-alpha.4（2026-05-10 完工：ADR-01 节点间相对定位 `Node.position = { direction, of, distance? }` 8 方向枚举 + Tikz `nodeDistance` prop；ADR-02 `<Coordinate>` 一等占位节点（IRChild 第三种 discriminator，不发 primitive / 不扩 viewBox 但进 nodeIndex）；ADR-03 Node `label?` 边挂标签（8 方向 / 数字角度，font / textColor 继承 Node）；docs 加 coordinate 章节 + node/overview 增段 + ComponentPreview 双语 demo 解析；AGENTS.md 加"不缩写命名"规则；+33 新测试）
- [ ] v0.1.0-alpha.5
- [ ] v0.1.0-beta.1
- [ ] v0.1.0

---

## v0.2 预备 — Scope / 样式 / Shape 扩展

v0.2 主线是 Scope + 样式继承（`<Scope>` / `<Group>` / `every node/.style` 默认值 / 局部 transform），同时**打开 NodeShape 的闭合枚举**——把"第三方自定义 shape 接入 IR"留作 v1 之前最后一步底层改造。详细 ADR 在 v0.2 开工前另起。

### Shape Registry 提案

**现状**：`NODE_SHAPES` 是 `as const` 闭合集合（rectangle / circle / ellipse / diamond），`NodeShape = z.nativeEnum(...)`；4 个 shape 的几何 / 边界 / anchor / emit 硬编码在 `compile/node.ts` + `geometry/{rect,circle,ellipse,diamond}.ts`——第三方包想加 `cloud` / `decision` / `cylinder` / `parallelogram` 没法进 IR，且没有可注入面。**`geometry/` 现存的 4 个 shape 文件 = 这套接口的"硬编码版本"**——v0.2 改造时各自包成一个 `ShapeDefinition` 实例、注册进 registry；其他纯数学文件（`point` / `polar` / `bend` / `segment` / `arc` 端点 + bbox）不变。

**不能套 Tier 2 `lowerComposites` 钩子的理由**：shape 是 Tier 1 一等基元——要支持 `boundaryPoint` / `anchor` / `layout` / `emit` 四件事，下沉不到 Kernel——它本身就是 Kernel 的一部分。

**目标接口（v0.2 ADR 阶段固化）**：

```ts
type ShapeDefinition = {
  layout(text, padding): Rect
  boundaryPoint(layout, from): Position
  anchor(layout, name: string): Position | undefined   // 支持任意 anchor 名 + 数字角度
  emit(layout, round): Iterable<ScenePrimitive>
}

CompileOptions.shapes?: Record<string, ShapeDefinition>     // 注入第三方
NodeSchema.shape = z.union([z.nativeEnum(NODE_SHAPES), z.string().min(1)])
```

内置 4 shape 改造为"自己也是注册项"——避免内置特权 / 二等公民分裂。第三方可发 `@retikz/shapes-flow` / `@retikz/shapes-uml` 等独立包。Adapter 不感知 shape，emit 出来的全是 `ScenePrimitive`（`RectPrim` / `EllipsePrim` / `PathPrim` / `GroupPrim`）。

**主要 trade-off**：

| 项 | 影响 | 缓解 |
|---|---|---|
| LLM schema 友好性下降 | union 开放后 LLM 可能输出未注册 shape | 内置仍走 enum 路径；`.describe(...)` 注明扩展点；要求 system prompt 列举已注册 shape |
| Anchor 体系重设计 | `RECT_ANCHORS` 常量 → `ShapeDefinition.anchor(layout, name: string)`；数字角度 `.30` 由 shape 自释 | 内部影响为主，公开 anchor 字符串面（`.north` / `.east` / `.30`）保持兼容 |
| 旋转语义边界 | shape 接口是否感知 rotate？ | layout 阶段把 rotate 折平到 `NodeLayout`，shape 看到的全是已旋转坐标系几何，shape 实现无需感知 |
| 覆盖语义 | 用户传同名 shape 是否覆盖内置？ | 建议支持（给"换默认 rectangle 的圆角行为"留口子）；文档警告"覆盖内置会影响所有依赖默认值的 demo / 测试" |

**为什么放 v0.2 而非 v0.1**：

- v0.1 内置 4 shape 已覆盖流程图 + UML 大头，扩展性不紧迫
- v0.2 Scope / 样式继承本来就要再过一遍 NodeSchema，趁机改造成本低
- 闭合枚举对 LLM 早期生成质量更友好，alpha / beta.1 阶段保留

**v0.2 开工前另起 ADR**：固化 `ShapeDefinition` 接口签名、覆盖规则、内置 shape 是否随 core 发布还是拆独立包、Anchor 数字角度的解释规则、**支持 shape factory 模式（带参数 shape，如 N-pin IC）的约束**。

### 远期：多端口 / 多引脚 shape（v1+）

Shape Registry 落地后，**域特化 shape 包**自然延伸到电路 / EDA 场景：

- `@retikz/shapes-circuit`：二极管（anchor `anode` / `cathode`）、电阻（`left` / `right`）、晶体管（`base` / `collector` / `emitter`）、电源 / 接地等基础元件
- `@retikz/shapes-ic`：IC 芯片（DIP / QFP / BGA 等封装），多引脚（`pin1` ~ `pinN` + 可选语义 alias 如 `vcc` / `gnd` / `data0`）
- `@retikz/shapes-pcb`：焊盘、过孔、连接器

ShapeDefinition 接口**结构上已经支持**：`anchor(layout, name: string): Position | undefined` 中 `name` 是任意字符串，由 shape 自释义——电路 anchor 名（`'anode'` / `'cathode'` / `'pin42'`）与几何 anchor 名（`'north'` / `'east'`）共享同一名空间，shape 自己解释。

但 **v0.2 ADR 阶段就要预留**的两点：

1. **支持 shape factory 模式** —— IC 不可能为每种 pin 数注册一个新 shape；需要 `createDipShape({ pinCount: 16, pinSpacing: 0.1 }) → ShapeDefinition`。这条要求 `ShapeDefinition` 本身只是 plain object（不依赖任何特定工厂语法约定）——工厂只是返回 ShapeDefinition 的普通函数。注册端 `CompileOptions.shapes` 接受**已实例化**的 ShapeDefinition 即可。
2. **Pin 视觉元素 emit** —— pin 不只是 anchor 点，通常是从 body 伸出的短线 / 焊盘 / 引脚编号文字。当前 `ShapeDefinition.emit` 返回 `Iterable<ScenePrimitive>` 已经覆盖——一个 shape 可以 emit 多个 prim（body + 每个 pin 的视觉表达）。

**结论**：电路 / EDA 域是 Shape Registry 接口的天然延伸；core / v0.2 **不下场**实现具体电路 shape，只要 v0.2 ADR 设计时确保上述两点不冲突，其余等域特化包 v1+ 独立演进。

---

## 范围外（v0 不做）

- Tier 2 domain 包（plot / flow / graph）→ v1
- text DSL（TikZ 原生语法 parser）→ v3.x+
- 编辑器 / 可视化 IDE → 永远不是图形库该做的事
- 跨框架 adapter（vue / svelte / native）→ v1+ 社区驱动
- 复杂 decorations（snake / coil / markings）→ v2+ 按需

## 推进方式

无硬截止——按可用时间推进。每完成一个 v0.x，回到本文件勾选并检查总目标进度。
