# v0.4 路线讨论（草案）

> 本文件是 v0.4 的**讨论工作区**：记录候选方向、取舍与后续讨论结论；尚未拍板成正式总计划。正式启动各子项时各自走 brainstorm → spec → plan。
>
> 关联：[`v0 roadmap`](../roadmap.md) · [`core 底座对比分析`](../../../../analysis/core-compare-analysis.md) · [`v0.3 renderer / runtime 专题`](../v0.3/roadmap.md) · [`plot-design.md`](../../../../architecture/plot-design.md)

## 切分原则

core 0.4 只做**纵向底座深化（机制 / 引擎 / 契约）**；**横向功能丰富（具体 shape / 图表 / 装饰 / 编辑器）交由 domain / sugar 包**——延续 [`v0 roadmap` 范围边界](../roadmap.md)。凡“具体成品”都是横向，core 只补其背后的机制。

## 候选方向（2026-06-12 brainstorm）

| 代号 | 方向 | 处置 | 备注 |
| --- | --- | --- | --- |
| A | 计算 / 几何 | ✅ **定名 `@retikz/math`** | 纯计算几何（交点、内切 / 外接圆、点在多边形、凸包…）；**独立零依赖**、零 IR、零 zod；core 与 domain（plot / flow）共享。详见下「后续讨论结论 · A」 |
| B | 路径补强 | ✅ 首切 = 圆角 + 平滑曲线 | core 内文法增量；详见下「后续讨论结论 · B」。装饰 motif 归 extension、path-path 交点等 A |
| C | 交互行为 | ⏸ 暂不 | 重、且易滑向「单框架编辑器深耕」非目标；等 A 的求交 / 反投影就位后再议 |
| D | eval（LLM 生成评测） | 🔀 **交其他分支处理**，本 core 路线不跟踪 | eval 工程已转交独立分支推进，不在本 core v0.4 路线内排期；设计参考 [`notes/eval/design.md`](../../../../eval/design.md) |
| E | 数学公式（LaTeX） | ⏸ 靠后，方向已定 | 守 renderer-agnostic：MathJax SVG-path → Scene `PathPrim` 的 lowering；独立包 **`@retikz/tex`**，MathJax 走 optional peer。详见下「后续讨论结论 · E」 |
| F | Scene 视觉 | ✅ 方向已定，首切 = z-index + shadow + blend | renderer-agnostic 子集；blur / mask 缓。归 core Scene + render（纵向底座）。详见下「后续讨论结论 · F」 |
| G | 跨框架 runtime | ⏸ 暂不 | Vue / Svelte adapter |
| H | scope 多态 bounding shape | ✅ 候选，承接 v0.2 deferred | `scope.id` 包络支持 circle / ellipse / polygon（非矩形），经 ShapeRegistry；消费候选 A 的外接圆 / 凸包。承接 [v0.2-alpha.1 ADR-03](../v0.2/alpha.1/03-scope-id-bounding-box.md) deferred 项；首个消费方 = [plot 可被组合 ADR-02](../../../plot/v0/v0.1/alpha.10/02-plot-composable.md)。**设计见 [`scope-polymorphic-bbox.md`](./alpha.2/02-scope-polymorphic-bbox.md)** |
| P3D | 伪三维（投影坐标） | 候选，下文详述 | 本质是 A 的投影坐标系实例 / plot 坐标扩展 |

要点：

- **A / B 是相互独立的子项目**（新工具包 / core 文法增量），各自出 spec，不合并。（D eval 已交其他分支，本路线不跟踪）
- 推荐顺序：**A 先**（B 与 domain 的共同前置）→ **B 跟上**（消费 A）。
- A 的核心待决：math 包到底装什么、与 core `geometry/` 如何拆、是否并入 render 的 oklch 色彩算 / 动画插值等数值算（拆分方向已在 [alpha.1 ADR-01](./alpha.1/01-math-package-and-geometry-api.md) 拍板）。

## alpha 里程碑拆分

> 候选方向（上表）按 alpha milestone 落地拆分；每个 milestone 下的子项各自走 brainstorm → spec → plan。**alpha.1（math）设计已拍板、进入 plan**——它是 scope-bbox / B 的共同前置，故排首位；**alpha.2 两篇（embeddable / scope-bbox）为先期 Draft 设计 note**（未拍板、RED、进实现前走外部 LLM 评审），其中 scope-bbox 实现依赖 alpha.1 的 math。「待排」= 方向已定但未定具体 alpha。

| milestone | 子项 | 候选 | 文档 | 状态 |
| --- | --- | --- | --- | --- |
| alpha.1 | `@retikz/math` + core 纯几何下沉 | A | [ADR-01/02/03](./alpha.1/roadmap.md) | Accepted（拆 3 ADR，待实现） |
| alpha.2 | 可嵌入 Tier2 in `<Layout>` ∥ scope 多态 bounding shape | Tier2 机制 / H | [ADR-01](./alpha.2/01-embeddable-tier2-in-layout.md) · [ADR-02](./alpha.2/02-scope-polymorphic-bbox.md) | Draft / 待人工签字 + 外部评审（两任务并列；H 依赖 alpha.1 math） |
| alpha.3 | 路径补强（圆角 B1 + 平滑曲线 B2） | B | — | 暂定，消费 A（下「后续讨论结论 · B」） |
| alpha.4 | Scene 视觉（z-index + shadow + blend） | F | — | 暂定，视余量（下「后续讨论结论 · F」） |
| 靠后（alpha.5+） | 数学公式 `@retikz/tex` | E | — | 方向已定（下「后续讨论结论 · E」），靠后 |
| 暂不 | 交互行为 / 跨框架 runtime / 伪三维 | C / G / P3D | — | ⏸（P3D 详见下文「伪三维视角层」） |

**建议实现顺序**：alpha.1 **A（math 底座）** → alpha.2 **scope 多态 bbox（消费 A）+ 可嵌入 Tier2**（待人工签字 + 外部评审）→ alpha.3 **B（路径补强，消费 A）** → alpha.4 **F（Scene 视觉，独立、视余量）**；**E（tex）靠后**（alpha.5+）。（D eval 已交其他分支，不在本路线）

依赖约束：

- **A → H-impl**：H（alpha.2 scope-bbox）实现消费 A（math）的外接圆 / 凸包，故 math 排 alpha.1 先行。
- **A → B**：B 消费 A（圆角复用 `filletContour`、求交原语）。

## 后续讨论结论

> 各候选轴深入后的结论陆续记在此处（A / B 等的边界、范围、命名拍板）。

### A · `@retikz/math`（2026-06-12 拍板；2026-06-13 深化、2026-06-14 拆 3 ADR 见 [alpha.1](./alpha.1/roadmap.md)）

> 深化与拆分：依赖方向定为 **core → math**（core 可正向依赖 math），**首切就把 core 纯几何下沉 math**（按函数粒度切）、core 改 re-export 保公开面。2026-06-14 拆成 [ADR-01 math 包 + API](./alpha.1/01-math-package-and-geometry-api.md) / [ADR-02 core 下沉 + re-export](./alpha.1/02-core-pure-geometry-sink.md) / [ADR-03 point 公开面修正](./alpha.1/03-point-polar-surface-fix.md)。下方原 2026-06-12 结论中「core geometry 留在 core 不迁移」「短期两个家」已被推翻，以这三份 ADR 为准。

- **定位**：新增·独立纯计算包；**零依赖、零 IR、零 zod**；一律纯函数 + 普通对象 / `Position` 数组，**不写 class**（对齐 core 几何约定）。
- **与 core 的关系**：依赖方向 **core → math**（正向，允许）；math 不反依赖 core。首切即把 core `geometry/` 的纯计算（向量运算 / 仿射变换 / lerp / 私有求交原语 / `arc.ts`）下沉 math，core 从 math re-export，「两个几何的家」消除。详见 [alpha.1 三份 ADR](./alpha.1/roadmap.md)。
- **首切范围**：线 / 线段交点、三角形内切 / 外接圆、点在多边形、凸包——均只需 point + line，不依赖曲线采样。**外加**接管 core 纯几何（下沉切面见 ADR）。
- **自己实现**，不直接依赖现成库：`@flatten-js/core` / `kld-intersections` 等多为 class-based、自带对象模型，与「纯函数 + 普通对象」约定冲突；现成库（`kld-intersections` / `robust-predicates` / `bezier-js`）仅作正确性 / 退化 case 参考。
- **数值取向**：epsilon 朴素实现（绘图场景够用），真撞退化 case 再按需升级谓词（参考 `robust-predicates` 的 `orient2d`）。
- **后置**：贝塞尔曲线 / path-path 含曲线求交（届时再定依赖或移植 `bezier-js` / `kld`）；伪三维投影矩阵等。内部按子模块切：`geometry/`（首切）· `curve/`（后置）· `matrix/`（伪三维）。
- **进包红线**：纯数学、可独立测试、无业务语义——否则不进 math。
- 具体 API / 实现方案动手时再定（本轮不出 spec）。

### B · 路径补强（2026-06-12 拍板）

- **首切 = B1 + B2 一块做**：
  - **B1 任意折线圆角 `rounded corners`**：把 rectangle 的 `cornerRadius` 推广到任意多段路径的拐角。纯几何，**复用 core 已有 `geometry/contour.ts` 的 `filletContour`**，不必等 A。
  - **B2 过点平滑曲线 smooth / spline**：穿过点列的光滑曲线（TikZ `plot[smooth]` / Hobby 风格）。**做成新 step 还是 registered generator 留实现时定**（倾向 generator：算法性、产 sub-path、core 已有 generator 机制；若要一等 label / 可当 step 用则新 step）。
- **不在首切**：
  - **B3 path-path 交点坐标**：依赖 A（曲线求交），是 A→B 的桥，等 A 就位再做。
  - **B4 装饰**：motif（花括号 / 波浪 / 弹簧）归 **extension**；「装饰引擎是否进 core」单独议。
  - **B5 连接器 / 沿路径放节点（markings）**：看实际痛点再排。
- 具体 API / 实现动手时再定（本轮不出 spec）。

### E · 数学公式（2026-06-12 方向；落地靠后）

- **守 renderer-agnostic**：用 **MathJax SVG 模式**（glyph = SVG path、非字体）→ 解析成 retikz `GroupPrim(PathPrim)`，全后端（SVG / Canvas / Node）一致、无字体注入。KaTeX / temml / MathML 因 font / DOM 绑定走不通 Canvas/Node，淘汰。
- **机制 = lowering**：IR 只存 `{ type: 'math', tex }`（可序列化）；胶水包提供 `lowerMath`（MathJax tex2svg → SVG `path d` 解析成 `PathPrim` + transform 展平 + bbox 测量 + 按 tex 缓存），经 `lowerComposites` 注入；**core 不碰**。
- **独立包 `@retikz/tex`**（不并进 `@retikz/extension`）：它是自带 path-d 解析 + 坐标映射 + 引擎集成的小子系统，比单个 extension 定义重；且拖一个重的 MathJax optional peer，不该和轻量几何 extension 纠缠；还单独 version「耦合 MathJax SVG 结构」这层。
- **MathJax = optional peerDependency**（用户自装、掌控版本 / macro），同 `@napi-rs/canvas` 先例。
- 实现 snag：MathJax init 异步、但 `tex2svg` init 后同步确定，可塞进纯 `compileToScene` + 按 tex 缓存。
- 落地**靠后**（E 非 0.4 首切）。

### F · Scene 视觉效果（2026-06-13 方向）

- **首切 = z-index / 层模型 + shadow（投影）+ blend mode**——renderer-agnostic 干净子集，三端（SVG / 浏览器 Canvas / Node 位图）都有对应原生 API（`feDropShadow` / `ctx.shadow*`、`mix-blend-mode` / `globalCompositeOperation`）；Scene 描述意图、各 renderer 翻译。
- **blur 缓**：依赖 `ctx.filter`，**Node `@napi-rs/canvas` 支持不稳**，会破「全后端一致」红线；要做须先核实 Node 支持 + 接受可能的退化。
- **mask 缓**：比已有 clip 重、且与 clip（硬边裁剪）重叠，常见需求 clip 已覆盖。
- **z-index 特别价值**：纯编译期重排绘制序、零后端成本，且**直接解锁 P3D 深度排序**——跨项杠杆，最该先做。
- **归属 = core（Scene schema 加 `shadow` / `blendMode` / `zIndex` 等图元级属性）+ render（各后端 emit 翻译）**；属纵向底座，非 extension 词汇。
- 落地排期看 0.4 整体取舍（A / B 为推荐首切，F 视余量）。

---

## 伪三维视角层（候选方向 P3D · 详述）

> 说明：这是 P3D 的讨论草案，不是正式总计划。正式开始 v0.4 时会重新 review 并决定是否纳入、如何拆分、与 plot / renderer / hydration 的边界如何划定。

### 讨论目标

本草案讨论一种伪三维能力：在二维 retikz 的基础上，引入一个可控视角，把三维坐标投影回二维 Scene，并允许根据深度派生透明度、缩放、z-order 等样式。

这不是完整 3D 渲染，也不是 Blender 式相机系统。它的目标是：

- 让 plot / diagram 里出现“看起来是三维”的几何表达；
- 仍然只输出二维 core IR / Scene；
- 后续连线、路径、标签等仍沿用既有二维逻辑；
- 把三维语义限制在 plot / coordinate scope / lowering 层，不污染 renderer。

v0.4 也会作为前一版本预留的 AI 增量渲染方向的正式优化窗口：如果 v0.3 已经把 renderer / runtime / hydration / plot 支撑的结构性条件留好，v0.4 可以开始设计更完整的 Progressive IR、JSON Patch stream、分层增量渲染和更细的 SVG / Canvas 更新策略。

### 核心想法

伪三维的基本形态可以理解成：

```text
[x, y, z] + view -> [screenX, screenY]
```

其中 `view` 代表观察参数，通常关注一个目标点，默认可以是原点。

可讨论的参数包括：

- `target`：关注点；
- `azimuth`：水平旋转角；
- `elevation`：俯仰角；
- `distance`：透视距离；
- `projection`：orthographic / perspective；
- `scale`：整体缩放。

### 深度派生

讨论中的另一条语义是：在三维投影之后，可以按深度派生一些二维样式。

候选项：

- 透明度；
- 缩放；
- z-order；
- strokeWidth；
- label emphasis。

这可以理解为：

```text
depth -> style
```

早期版本可以只做最小闭环：

1. 三维点投影成二维点。
2. 深度派生 opacity。
3. 深度派生 zIndex。
4. 连线仍按二维 path / step 逻辑处理。

### 语义边界

这类能力更像 plot 的坐标系扩展，而不是 core 的新渲染能力。

边界建议：

- **core** 继续只理解二维 Scene。
- **plot / coordinate system** 负责三维坐标投影与深度派生。
- **renderer** 仍然只画二维结果。
- **path / node / label** 的后续处理仍复用现有二维规则。

### 风险点

1. **过早膨胀**  
   如果把遮挡、光照、mesh、材质也纳入，会迅速从“伪三维投影”滑向完整 3D 系统。

2. **语义过重**  
   如果把三维直接塞进 core IR，后续 SVG / Canvas / SSR 的一致性会变差。

3. **图表边界模糊**  
   这更像 plot 的一个子方向，不适合作为 core 通用能力。

### 讨论结论倾向

当前倾向是把它放在 v0.4，而不是 v0.3。

理由是：

- v0.3 已经有 renderer 拆分、vanilla runtime、hydration、plot 支撑这些更底层的工作；
- pseudo-3D 需要一层更明确的坐标与样式派生语义；
- 它更接近 plot 的能力演进，而不是基础 runtime 的收尾。

### 待正式 review 的问题

1. 这个能力是否只属于 plot，还是应形成更通用的 coordinate system 扩展。
2. 视角参数的最小集合是什么。
3. 只做 orthographic，还是同时支持 perspective。
4. 深度派生哪些样式应该成为一等能力。
5. 连线、标签、guide 在深度语义下是否需要特殊处理。
6. 这项能力是否进入 v0.4 首批，还是作为后续 plot 子主题。
