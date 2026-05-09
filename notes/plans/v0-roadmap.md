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
| v0.2 | Scope + 样式继承 | `<Scope>` / `<Group>`、`every node/.style` 默认值、局部 transform |
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
- **alpha → beta → 0** 递进：alpha 可以改 schema，beta 起冻结
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
| 相对坐标：`Target` 加 `{ rel: [dx, dy] }` / `{ relAccum: [dx, dy] }` | gap §2 P1 |
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
| Node `at: { dir: 'above'\|'below'\|'left'\|'right'\|..., of: NodeId, distance?: number }` | gap §1 P1 |
| `<Coordinate>` IR 节点（占位、不绘制、可被 path 引用） | gap §3 |
| Node `label?` 子结构（节点边挂额外文字） | gap §1 P2 |
| 文档站补齐 Node / Path 全 prop 演示页 | — |
| 测试覆盖 P0 / P1 全部组合 | — |

### v0.1.0-beta — schema 冻结 + 文档完整

- 不再改 IR schema 字段名 / 语义；只改 bug
- README、CHANGELOG、迁移指引就位
- npm prerelease 上架

### v0.1.0 — 正式发布

- 跑通 30+ TikZ basic examples 等价复刻
- 文档站三套教程：Hello World / Flow chart / UML class diagram

### v0.1 跟踪

- [x] v0.1.0-alpha.1（2026-05-09 完工：6 项改动 + 4 篇 ADR + ~180 测试）
- [x] v0.1.0-alpha.2（2026-05-09 完工：7 项改动 + 3 篇 ADR + 47 新测试 + sugar `<Text>`）
- [ ] v0.1.0-alpha.3
- [ ] v0.1.0-alpha.4
- [ ] v0.1.0-beta
- [ ] v0.1.0

---

## 范围外（v0 不做）

- Tier 2 domain 包（plot / flow / graph）→ v1
- text DSL（TikZ 原生语法 parser）→ v3.x+
- 编辑器 / 可视化 IDE → 永远不是图形库该做的事
- 跨框架 adapter（vue / svelte / native）→ v1+ 社区驱动
- 复杂 decorations（snake / coil / markings）→ v2+ 按需

## 推进方式

无硬截止——按可用时间推进。每完成一个 v0.x，回到本文件勾选并检查总目标进度。
