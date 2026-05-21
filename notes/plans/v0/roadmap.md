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
| v0.2 | Scope + 样式 + Shape 扩展 | `<TikZ>` 重命名为 `<Layout>`、`<Scope>` / `<Group>`、`every node/.style` 默认值、局部 transform、`NodeShape` 闭合枚举打开 + ShapeRegistry 注入第三方 shape、结构化 Target / Anchor（对象 IR + 字符串 sugar 兼容）、显式 `zIndex` 覆盖、带文本 Node 输出始终包 `<g>`、NodeLabel 旋转（`rotate: 'none' \| 'radial' \| 'tangent' \| number`）、Path-level shape sugar（Circle / Ellipse / Arc / Rectangle / Grid / Sector + IR 椭圆弧 / 圆角矩形 / 部分裁剪）、StepLabel 自定义样式（`textColor` / `opacity` / `font`） |
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
| 相对坐标：`Target` 加 `{ relative: [dx, dy] }` / `{ relativeAccumulate: [dx, dy] }` | gap §2 P1 |
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

| 改动 | 来源 |
|---|---|
| Scene `PathPrim.d: string` → `commands: Array<PathCommand>`、`GroupPrim.transform: string` → `transforms: Array<Transform>`；adapter 各自从结构化数据翻译为原生 API | ADR-01 |
| `StepLabel.position` 扩 7 keyword + 任意 t∈[0, 1]（与 TikZ `pos=<float>` 对齐），fold N 段等占 t 区间、Bezier 用参数 t、arc 角度参数化 | ADR-02 |
| 删 `Path.arrowShape`，加 `Path.arrowDetail` 对象（shape / scale / length / width / color / fill / opacity / lineWidth + start / end 起末分别 merge） | ADR-03 |
| `Node.position` / `Coordinate.position` 加第 4 种相对定位（任意 `(dx, dy)` offset，对应 TikZ `calc` 语法）；同步进 `IRTarget` step.to | ADR-04 |
| IRTarget 字段去缩写：`{ rel }` / `{ relAccumulate }` → `{ relative }` / `{ relativeAccumulate }` | AGENTS.md 不用缩写规则收尾 |

### v0.1.0-beta.1 — 优化窗口（一）

**beta 阶段定位**：持续优化 + **不考虑兼容性**——schema 字段名 / 公开 API 仍可改名 / 重构；**rc 起冻结公开 API**。与 alpha 区别：beta 不开新功能 ADR（不加新 schema 形态 / 新 IR 字段集），只做"重构 / 命名 / 注释 / 测试 / 错误信息 / 性能"。

- 注释 / `.describe()` 去 SVG-imposing 语言（ADR-01）
- 公开 union 拆 named type + JSDoc 补全（ADR-02）
- geometry 共享 transform + 死 `*Anchor` 类型清理（ADR-03）
- unbuilder round-trip 补 alpha.5 新增形态（ADR-04）
- `compile/path.ts` 拆目录 + `findPrev` O(n²)→O(n) + `THICKNESS_TO_WIDTH` 互锁（ADR-05）
- 字段表互锁通用做法 + 两处应用（ADR-06）
- `_builder.ts` cast 收敛到边界（ADR-07）
- `CompileOptions.onWarn` 收集器（ADR-08）
- 边界 / error path 测试补完（ADR-09）
- 改名清理：`NodeTextSchema` → `TextBlockSchema`、`_builder` / `_unbuilder` 去 `_`、`renderPrim` `ctx`→`context`（ADR-10）
- core 测试 helper 去除 renderer mirror 漂移（ADR-11）

### v0.1.0-beta.2 — 优化窗口（二）

beta.1 实施过程中发现的命名抽象候选，跨 beta.1 ADR scope 单独成 plan。

- Scene `ViewBox` → `Layout` 抽象（去 SVG 命名）
- `<TikZ>` → `<TikZ>` 组件改名（与 TikZ 原品牌大小写一致）
- core endpoint arrow split 命名中性化，arrow shrink 几何从 SVG `viewBox` / `refX` 语义中抽离
- Path 线型命名对齐 TikZ 术语：`strokeDasharray` → `dashPattern: Array<number>`，Node `dashArray` 同步改为数组结构

详 [`v0.1-beta.2.md`](./v0.1-beta.2.md)。

### v0.1.0-rc.1 — 候选发布（冻结起点）

- 公开 API surface **从本版冻结**——schema 字段名 / 组件名 / 函数签名 / 公开 type 名都不再改
- 仅做 bug fix / 文档完善 / 性能优化（不改 API）
- README、CHANGELOG、迁移指引就位
- npm prerelease 上架，宽测试覆盖
- 文档站结构进入用户路径验收：Concepts 前置、Source Code Guide 移到 About / Developer、组件长文档拆分、frontmatter 补齐、阶段旧术语清理、schema reference 中英文对齐、rc 安装验收。详见 [`v0.1-rc.1.md`](./v0.1-rc.1.md)。

### v0.1.0-rc.2 — 示例库与搜索体验

- Examples / Recipes 独立示例库补齐
- 搜索索引从 data label 扩展到 frontmatter、正文标题与代码标识符
- 不改变公开 API，仅做文档体验增强。详见 [`v0.1-rc.2.md`](./v0.1-rc.2.md)。

### v0.1.0 — 正式发布

- 跑通 30+ TikZ basic examples 等价复刻
- 文档站三套教程：Hello World / Flow chart / UML class diagram

### v0.1 跟踪

- [x] v0.1.0-alpha.1（2026-05-09 完工：6 项改动 + 4 篇 ADR + ~180 测试）
- [x] v0.1.0-alpha.2（2026-05-09 完工：7 项改动 + 3 篇 ADR + 47 新测试 + sugar `<Text>`）
- [x] v0.1.0-alpha.3（2026-05-10 完工：ADR-01 Path 曲线三件套 curve / cubic / bend；ADR-02 path-level 形状 arc / circlePath / ellipsePath；ADR-03 相对坐标 `{ rel }` / `{ relAccumulate }` + way sugar 对象形态；ADR-04 边标注 step.label + sugar `<EdgeLabel>` + Draw way label 算子；P2 path 级 lineCap / lineJoin / thickness 语义档位 / opacity / fillOpacity / drawOpacity）
- [x] v0.1.0-alpha.4（2026-05-10 完工：ADR-01 节点间相对定位 `Node.position = { direction, of, distance? }` 8 方向枚举 + TikZ `nodeDistance` prop；ADR-02 `<Coordinate>` 一等占位节点（IRChild 第三种 discriminator，不发 primitive / 不扩 viewBox 但进 nodeIndex）；ADR-03 Node `label?` 边挂标签（8 方向 / 数字角度，font / textColor 继承 Node）；docs 加 coordinate 章节 + node/overview 增段 + ComponentPreview 双语 demo 解析；AGENTS.md 加"不缩写命名"规则；+33 新测试）
- [x] v0.1.0-alpha.5（2026-05-12 完工：ADR-01 Scene PathPrim / GroupPrim 结构化——`d: string` → `commands[]`、`transform: string` → `transforms[]`，center-parameterization 弧；ADR-02 StepLabel.position 扩 7 keyword + 任意 t∈[0,1]，fold N 段等占 t 区间 / Bezier 用参数 t / arc 角度参数化；ADR-03 删 arrowShape 加 arrowDetail 对象——shape/scale/length/width/color/fill/opacity/lineWidth 起末逐字段 merge，空心 fill silent no-op，所有 shape line tip 接 back 接线点；ADR-04 OffsetPosition 第 4 种相对定位 `{ of, offset }`，同步进 IRTarget；TODO-4 IRTarget 字段去缩写 `{ rel }` → `{ relative }`；tests 533 → 833（+300）；alpha 期结束，公开 API 仍可改名直到 rc）
- [x] v0.1.0-beta.1（2026-05-13 完工：beta 优化窗口第一轮，聚焦类型/JSDoc、编译路径重构、诊断、边界测试与命名清理）
- [x] v0.1.0-beta.2（2026-05-14 完工：Scene `ViewBox` → `Layout`；顶层组件 `<Tikz>` → `<TikZ>`；endpoint arrow split / arrow shrink 几何去 SVG 术语；Path `strokeDasharray` → `dashPattern: Array<number>`，Node `dashArray` 同步改为数组结构；人工裁定内容较少，跳过多 LLM 评估）
- [x] v0.1.0-rc.1（2026-05-16 完工：v0.1 公开 API surface 冻结；core / react 无源码变更；本期工作集中在文档站结构（Concepts 前置 / Source Code Guide 移到 Developer 分组 / 组件文档 Usage / Examples / API Reference / Related 结构 / Comparison 对照机制 / AI 阅读助手）与命名规范（目录 kebab-case / 文件命名清规 / barrel index.ts））
- [x] v0.1.0-rc.2（2026-05-19 完工：库 3 处修复 compile z-order = IR 顺序 / buildIR 透明展开 `<Fragment>` / SVG `var()` 走 inline style + `collectArrowSpecs` null 防御；文档站 Examples / Recipes 分组 + 首例 Karl 单位圆 / `<ComponentPreview>` 增强（diff / SVG 下载 / Ask AI / size picker / 移动端可用性）/ 搜索覆盖 mdx 正文 / AI Copilot 风格重构 + 多会话 IDB 持久化 + 直接出图（retikz-ir / retikz-tsx 双协议）/ Blog 分区上线 + core-philosophy / origin 双语首发）
- [x] v0.1.0（2026-05-20 完工：正式版版本号切到 `0.1.0`；文档站版本标识、安装命令、About 概览与发布说明同步去掉 rc / next 通道）

---

## v0.2 预备 — Scope / 样式 / Shape 扩展 / z-index / Node group 包装 / Path-level shape sugar

v0.2 主线是 Scope + 样式继承（`<Scope>` / `<Group>` / `every node/.style` 默认值 / 局部 transform），同时**打开 NodeShape 的闭合枚举**——把"第三方自定义 shape 接入 IR"留作 v1 之前最后一步底层改造；补一组顶层容器命名改造：**`<TikZ>` 重命名为 `<Layout>`**，让 React 顶层组件更准确表达"声明布局并交给渲染器输出"的职责；补一组定位表达改造：**结构化 Target / Anchor**（对象 IR + 字符串 sugar 兼容）；并补两个 emit 层小改造：**显式 z-index 覆盖** + **带文本 Node 输出始终包 `<g>`**，加一组 **Path-level shape sugar**（6 个组件 + 配套 IR 扩张）。详细 ADR 在 v0.2 开工前另起，各项独立 ADR：[`v0.2-alpha.6.md`](./v0.2-alpha.6.md) 已先行铺好 sugar 提案。

### `<TikZ>` → `<Layout>` 命名提案

**目标**：v0.2 将 React 顶层容器从 `<TikZ>` 重命名为 `<Layout>`。`<TikZ>` 更像对原始灵感来源的致敬，但组件实际承担的是收集 DSL / IR、编译布局、交给当前 renderer 输出的职责；`Layout` 更贴近当前抽象，也避免把用户理解锁死在 SVG 或 LaTeX TikZ 语境里。

**兼容策略**：v0.2 阶段保留 `<TikZ>` 作为 deprecated alias，文档主推 `<Layout>`；迁移期给出 warning / codemod 建议，rc 前决定是否继续保留 alias。

### 结构化 Target / Anchor 提案

**现状**：path target 支持字符串形态（如 `'A'` / `'A.north'` / `'A.30'`），语法短、接近 TikZ，但 anchor 语义藏在字符串里。schema 只能看到 `string`，无法约束 anchor 枚举、角度、边上比例点、offset 等结构；同时 `.` 分隔符也把"节点 id 不能包含点"这种解析细节暴露给用户。

**目标**：v0.2 保留现有字符串写法作为 React DSL / `Draw` 语法糖，同时把底层 IR target 升级为结构化对象形态。字符串 sugar 由 `@retikz/react` / `Draw` 解析为对象 IR，core 的 schema、compile 与错误诊断以对象契约为准。

草案形态（v0.2 ADR 阶段固化命名）：

```ts
type AnchorRef =
  | 'center'
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'north-east'
  | 'north-west'
  | 'south-east'
  | 'south-west'
  | number
  | { side: 'north' | 'south' | 'east' | 'west'; t: number };

type NodeTarget = {
  id: string;
  anchor?: AnchorRef;
  offset?: [number, number];
};
```

语义：

- `{ id: 'A' }`：引用节点 / Coordinate，省略 `anchor` 时保持当前自动贴边界行为
- `{ id: 'A', anchor: 'north-east' }`：命名 anchor
- `{ id: 'A', anchor: 30 }`：角度 anchor
- `{ id: 'A', anchor: { side: 'north', t: 0.25 } }`：上边从左到右 25% 处；`t` 约束在 `[0, 1]`
- `{ id: 'A', anchor: { side: 'west', t: 1 / 3 }, offset: [-4, 0] }`：左边三等分点再做二维偏移

**兼容策略**：

- 现有 `'A'` / `'A.north'` / `'A.30'` 继续支持，作为 React DSL / Draw way 的 shorthand
- IR 主契约倾向对象形态；序列化、LLM tool schema、JSON Patch、错误信息均以对象字段为准
- `Draw way` 字符串 item 自行解析：节点 id / 命名 anchor / 角度 anchor / 相对坐标字符串继续走 sugar，不把解析规则扩散到 core schema 外层
- 文档主推对象形态；字符串写法保留为"便捷写法 / 迁移兼容"

**收益**：

| 项 | 收益 |
|---|---|
| schema 友好 | `anchor` 可枚举、`t` 可约束、offset 可校验，LLM 更容易生成合法 IR |
| 错误诊断 | 能报 `anchor.t must be between 0 and 1` 这类结构化错误，而不是字符串解析失败 |
| 扩展性 | 支持边上比例点、三等分点、角度 anchor、anchor 后 offset，不继续膨胀字符串小 DSL |
| IR diff / patch | 改 anchor / offset 是字段级修改，不需要字符串替换 |

**待写 ADR**（v0.2 开工前）：

- `AnchorRef` 命名与字段名：`side/t` vs `edge/position`；倾向 `side/t`，避免与 `Node.position` 混淆
- `Coordinate` 的 anchor 语义：维持所有 anchor 退化为中心，还是对结构化 `anchor` 显式报 warning / error
- 字符串 shorthand 是否只存在于 React DSL，还是 core `TargetSchema` 也保留兼容分支；倾向 DSL 保留、IR 主契约对象化
- 与 Shape Registry 的关系：自定义 shape 是否能解释 `{ side, t }`，或仅内置四类 shape 支持 side anchor；第三方 shape 至少必须支持命名 anchor / 角度 anchor

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

### 显式 z-index 提案

**现状（v0.1 rc.2 起）**：渲染 z-order 严格 = IR 顺序 = JSX 顺序（compile 单 pass 按序发 primitive）。SVG / Canvas 两个 renderer 都没原生 z-index 概念，只能靠 primitive 排列顺序。

**问题**：JSX 顺序与"我希望谁在上"经常不一致——用户为了 z-order 把 `<Node>` 移到 mdx 末尾，破坏阅读结构；多 demo 同结构里"标签永远在最上"这类需求难表达。

**目标**：给 Node / Path / Coordinate 加一个可选字段，**用户显式声明 z-index 时按数值排序，否则保留 IR 顺序**。

```ts
NodeSchema = z.object({
  // ...
  zIndex: z.number().int().finite().optional(),
})
PathSchema = z.object({
  // ...
  zIndex: z.number().int().finite().optional(),
})
// Coordinate 不发 primitive，zIndex 无意义但加上保持对称
```

**compile 行为**：

1. 走现有的 pass 1（layout 注册）+ pass 2（按 IR 顺序发 primitive）逻辑
2. 末端对 `scene.primitives` 做一次**稳定排序**：`zIndex ?? 0` 升序；同值保持原 IR 顺序
3. Group / 嵌套结构内部独立排序（不跨 group 比较），与 SVG `<g>` 局部 stacking context 一致

**渲染端零改动**：SVG / Canvas renderer 都按 scene 顺序画——sort 在 compile 完成，renderer 看到的就是最终顺序。同一接口同时覆盖两个 renderer。

**主要 trade-off**：

| 项 | 影响 | 缓解 |
|---|---|---|
| 引入"两套 z 决定路径"（IR 顺序 + zIndex）增加心智负担 | 用户得记两条规则 | 默认 zIndex=0 = IR 顺序；只有显式声明才走 zIndex 排序——大部分 demo 不会用 |
| Node 编译成多 primitive（rect + text + label TextPrim）共享 zIndex | 一个 Node 内部仍按 emit 顺序栈叠（背景 rect 在下、文本在上） | 文档明示「zIndex 只在 IR 子节点之间生效，单 Node 内部 emit 顺序固定」|
| Group 内部独立 stacking 上下文 | 跨 group 的"前景层"不存在 | 与 SVG / DOM 一致，**这是特性不是 bug**——想跨 group 上层就别用 group 包 |

**待写 ADR**（v0.2 开工前）：
- zIndex 字段是否给 Coordinate 留——保持对称 vs 严格按"会发 primitive 的才有 z" 简化 schema
- 同 zIndex 内排序是稳定（IR 顺序）还是按某种几何（左到右 / 上到下）；倾向稳定 + IR 顺序
- 跨 group stacking context 是否允许 break-out（`portal` 风格）——倾向不允许，简单为先

### 带文本 Node 输出始终包 `<g>` 提案

**现状**：`compile/node.ts` 的 `emitNodePrimitives` 仅在 `rotateDeg !== 0` 时把 shape + text + label 包进 GroupPrim；不旋转的 Node 直接平铺一组兄弟 primitive。从首版 compile 模块（commit `23be268`）起就是这套分支。

**问题**：

- DOM 看不出"哪段属于同一个 Node"——devtools inspect 时 rect 和 text 是散开的兄弟节点，得对照 IR 才能配对
- 与上面 zIndex 提案的语义对不齐——zIndex 要求"单 Node 内部 emit 顺序固定、整体作为 stacking 单元"，但当前 DOM 里同一 Node 的 rect / text / label 与相邻 Node 的 primitive 在同一层平铺，没有结构边界
- 未来"hover 整节点高亮"/"点击 Node 触发交互"/"给 Node 整体加 CSS class（如主题切换 stroke 色）"这类常见诉求，需要一个稳定的 DOM 锚点
- 包装策略当前是"看旋转角"——同一段 DSL 改个 `rotate` 值 DOM 结构就会突变（一会儿一层 `<g>`、一会儿没有），不利于稳定 snapshot 与下游样式工具

**目标**：**`layout.lines` 非空（即 Node 有文本内容）就**让 emit 走 group 分支，无文本的纯几何 Node 维持平铺。带文本通常意味着"语义化节点"（流程图节点 / UML 类目），纯几何 Node 多半是装饰背景——给前者一个 DOM 边界、给后者保留极简输出。

```ts
// 草案：emitNodePrimitives 末段
const needsGroup = layout.rotateDeg !== 0 || layout.lines !== undefined;
if (!needsGroup) return inner;
return [{
  type: 'group',
  transforms: layout.rotateDeg !== 0 ? [{ kind: 'rotate', ... }] : [],
  // 可选：data-node-id 之类元数据走另一字段，不污染 transforms
  children: inner,
}];
```

**compile / scene 端**：

- `GroupPrim.transforms` 允许空数组（已是当前 schema 允许的状态）——纯包装 group 不带变换
- 若决定给 `<g>` 加 `data-node-id` 之类钩子，需在 `GroupPrim` 加一个 `meta?: Record<string, string>` 字段，renderPrim 把 meta 平铺到 `<g>` 的 attribute——这部分单独取舍，**不强绑本提案**

**主要 trade-off**：

| 项 | 影响 | 缓解 |
|---|---|---|
| 无变换 `<g>` 增加一层 DOM | 多一层节点深度、SVG 体积每个文本 Node +几字节 | 文本 Node 数量级与图复杂度同阶，开销可忽略；换来的可预测 DOM 结构更值 |
| 现有 renderPrim / compile 快照测试全要刷 | 测试改动量大 | v0.2 内必经改造，统一刷；snapshot 改动机械化、易 review |
| 「带文本与否决定包不包」仍是条件分支，没彻底统一 | 用户记两条规则 | 文档里点明「pure-shape 装饰节点保持极简平铺」是有意为之；若 v0.2 ADR 阶段决定不在乎极简、就改成无条件包，省一条心智 |

**待写 ADR**（v0.2 开工前）：

- 是否干脆**所有 Node 都包 `<g>`**（含无文本），用一致性换极简性；倾向"带文本才包"留余地，但 ADR 阶段再敲定
- `<g>` 上要不要带 `data-node-id` / `data-node-shape` 钩子（影响 GroupPrim schema）
- 与 zIndex 提案的 sort 范围对齐——sort 单位是「Node 整体」还是「单个 primitive」；包 group 后天然按 group 排，简化实现
- label 当前已与 shape / text 同层；本提案不改 label 位置，只追加外层包装

### Node label 旋转能力计划

**现状**：`Node.label` 只根据 `position` / `distance` 计算标签中心点，文本本身保持水平；当 Node 自身 `rotate` 时，label 会随整个 Node group 一起旋转，但不支持“标签沿所在方向自旋”。例如 `position: 'left'` 只会把标签放到左侧，不会把文字旋转到左侧方向。

**目标接口（v0.2 ADR 阶段固化）**：

```ts
type NodeLabelRotate = 'none' | 'radial' | 'tangent' | number;

export const NodeLabelSchema = z.object({
  text: z.string(),
  position: ...,
  distance: ...,
  // 新增
  rotate: NodeLabelRotateSchema.optional(),
  keepUpright: z.boolean().optional(),
});
```

语义草案：

| 值 | 含义 |
| --- | --- |
| `undefined` / `'none'` | 保持水平，兼容 v0.1 行为 |
| `'radial'` | 沿「Node 中心 → label 中心」方向旋转；适合左 / 右 / 上 / 下等径向说明 |
| `'tangent'` | 使用径向方向的切线角；适合环绕式标注 |
| `number` | 手动指定角度（度数，沿用 retikz 屏幕坐标角度约定） |
| `keepUpright` | 可选；旋转后若文字会倒置，则自动翻转 180°，保证阅读方向 |

**实现要点**：旋转中心应当是 label 自身中心 `[lx, ly]`，不是 Node 中心。编译流程先复用现有 `labelCenter(layout, lab)` 算出位置，再把 TextPrim 包进一个只含该 label 的 GroupPrim：

```ts
{
  type: 'group',
  transforms: [{ kind: 'rotate', degrees, cx: lx, cy: ly }],
  children: [labelTextPrim],
}
```

这样 label 的位置仍由 `position` / `distance` 决定，`rotate` 只改变文字朝向，不会让标签绕 Node 再位移一次。

**为什么放 v0.2 而非 v0.1**：

- 需要扩展 `NodeLabelSchema`，v0.1 rc 起已冻结公开 API，不再加新字段
- v0.2 已计划整理 Node group / Transform / Scope 样式继承，label 自旋可以顺手复用同一套 GroupPrim transform 能力
- 与结构化 Target / Anchor 的对象化计划相邻：未来 label 的 `position` 若支持更复杂的百分比 / anchor 表达，旋转角也应基于统一的几何解析结果计算

**待写 ADR**（v0.2 开工前）：

- `rotate` 默认值是否显式写入 schema reference 为 `'none'`，还是保持字段缺省
- `'radial'` / `'tangent'` 在屏幕 y-down 坐标中的角度定义，以及与 numeric `position` 的一致性
- `keepUpright` 默认是否开启；倾向默认关闭，避免悄悄改变严格几何语义，由用户显式要求可读性优化
- Node 自身 `rotate` 与 label 自身 `rotate` 的组合顺序：倾向外层 Node group 先整体变换，label 内层围绕自身中心自旋，最终视觉等价于两者角度叠加

### Path-level shape sugar 提案

补一组面向"画几何形"的 sugar 组件，让 `\draw circle [radius=R]` / `\draw (0,0) rectangle (3,2)` 这类 TikZ 习语在 retikz 也是一行：

| sugar | 主要场景 | 是否需要 IR 改 |
| --- | --- | --- |
| `<Circle>` | 完整圆 / 半圆 / 1/4 圆 | ✓ `circlePath` step 加 `startAngle` / `endAngle` / 闭合模式 |
| `<Ellipse>` | 完整椭圆 / 部分椭圆 | ✓ `ellipsePath` step 加同上 |
| `<Arc>` | 纯弧线（不闭合） | ✓ `arc` step 加 `radiusX` / `radiusY`（椭圆弧） |
| `<Sector>` | 扇形（wedge 闭合） | × sugar 层拼 `move + line + arc + cycle` |
| `<Rectangle>` | 矩形 / 圆角矩形 | ✓ 新增 `rectangle` step（自带 `roundedCorners` 字段） |
| `<Grid>` | 网格底纹 / 坐标参考 | × sugar 层展开多 Path（每条 `move + line`） |

每个 sugar 支持**多种 prop 形态**：例如 `<Rectangle>` 接受 `{ corner1, corner2 }` / `{ center, width, height }` / `{ corner1, width, height }` / `{ center, side }` 等 5 种写法；`<Circle>` 接受 `radius` / `diameter` / `{ from, to }`（直径两端）/ `{ corner1, corner2 }`（bbox 内切）4 种。

详细 prop 表 / IR 字段变更 / 实现拆分 / ADR 待定项见 [`v0.2-alpha.6.md`](./v0.2-alpha.6.md)。

### Step label 自定义样式提案

> **归宿**（2026-05-19）：折入 v0.2 **alpha.2**（样式继承 + Scope 挂 Node 样式子集 + label 样式字段扩展），不开新 alpha；ADR 在 alpha.2 开工时与 Scope 样式继承 ADR 同期起草。详 [`v0.2.md §alpha.2 设计预想`](./v0.2.md#alpha2-设计预想scope-样式子集) 末段。

**现状**：`StepLabelSchema` 只有 `text` / `position` / `side` 三个字段；`compile/path/label.ts` 渲染时 `fill: 'currentColor'` 硬编码——所有边标注都跟随主题色（黑 / 白），无法**与所标注的线段同色**。给彩色函数线（sin / cos / tan / sec / csc / cot 等）配标注时尤其违和，标签都是 currentColor 一片黑，读者得对照线色和位置反推。

**目标接口（v0.2 ADR 阶段固化）**：

```ts
export const StepLabelSchema = z.object({
  text: z.string(),
  position: ...,
  side: ...,
  // ✚ 新增
  textColor: z.string().optional()
    .describe('Label text color; defaults to currentColor. Set to match segment stroke when labeling colored lines.'),
  opacity: z.number().min(0).max(1).optional()
    .describe('Label-only opacity 0..1; multiplied with surrounding text opacity if present.'),
  font: FontSchema.optional()
    .describe('Label font overrides (family / size / weight / style); missing fields inherit from segment-level default then renderer default.'),
});
```

`compile/path/label.ts` 改 `fill: label.textColor ?? 'currentColor'`，并把 `fontSize` / `fontFamily` 等改成 `label.font?.size ?? LABEL_FONT_SIZE` 的回退链。

**为什么放 v0.2 而非 v0.1**：

- 不阻塞 v0.1 闭环——v0.1 标注全 currentColor 也能用（karl-circle / unit-circle 都跑通）
- v0.2 主线是 Scope + 样式继承，本来就要在 NodeSchema / 文字渲染路径走一遍统一改造，趁机一起把 StepLabel 的样式扩展加上
- 新字段加在已有 schema 末尾，零破坏性，alpha 期后再开窗也行——但提早进 v0.2 与 Scope `every node label/.style` 配合更顺

**待写 ADR**（v0.2 开工前）：固化 textColor / opacity / font 字段，确认与 Scope 的样式继承顺序（label > Scope label 默认 > 段级 stroke 衍生 > 全局 currentColor 兜底）；ZodSchema reference 同步更新 8 个 step variant 的 `'label.*'` 嵌套点路径描述。

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
