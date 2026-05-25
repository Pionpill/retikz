# retikz 图元与 TikZ 能力对照

> 关联文档：[`architecture/core-design.md`](../architecture/core-design.md) · [`packages/core/AGENTS.md`](../../packages/core/AGENTS.md)

## 总览

**修改记录**

- **2026-05-07 初版**：基于 `@retikz/core` v0.1.0-alpha（仅 `move` / `line` step、矩形 node）盘点缺失项。
- **2026-05-21 修订**：对照 `@retikz/core` v0.1.0 正式版按图元重排。初版列出的 P0 全部闭环，P1 / P2 绝大多数已补齐；当前缺口集中在结构化能力（Scope / 主题）、文本排版（LaTeX / 数学）与 P3 高级特性。
- **2026-05-23 修订**：补 v0.2 alpha.1–4 已落项（`<Scope>` / 样式继承 / Shape Registry / `zIndex` / Node label rotate）+ 预留 alpha.5 行（Path-level shape sugar：circle/ellipse 部分裁剪、椭圆弧、`rectangle` step、grid / sector / 候选 regular-polygon / star sugar）。结构化能力缺口已基本闭合；当前缺口转向补全图元（更多形状 / parabola / sin-cos / patterns / shading）、文本排版（LaTeX / 数学）与 P3 高级特性。
- **2026-05-24 续修 (alpha.9)**：v0.2 能力补全阶段收尾段 alpha.9 完工——Scene / Position 三 ADR：clip 裁切（`Scope.clip` 接 rect/circle/ellipse/polygon，compile 去重成 renderer-agnostic `ClipResource` 进 Scene 资源表 + scope GroupPrim 挂 `clipRef`，`<clipPath>` 物化只在 adapter）；自定义 viewBox override（IR 根可选 `viewBox` 覆盖自动算 layout、忽略 padding，round 后复检 finite）；比例 partway 定位（`{ between:[A,B], t }` 进 Node/Coordinate position 与 Step.to，端点用自包含 `AbsoluteTarget` 排除 path-relative、z.lazy 化解 schema 环，复用 refPointOfTarget + lerpPoint）。对应 §6「裁剪 clip」❌→✅、§6「自定义 viewBox」❌→✅、§5「两点间比例 partway」新增 ✅、§5「calc 偏移」备注更新。Bug Hunter 补 viewBox round 后 + partway between lerp 的 finite 守卫。**至此能力补全阶段 alpha.7–9 覆盖 gap §1–6 全部值得做的项**；剩 P3（decorations / intersections / 投影 / 完整 calc / 双线边框 / t 外插 / 任意贝塞尔裁剪）。
- **2026-05-24 续修 (alpha.8)**：v0.2 能力补全阶段 alpha.8 完工——Path / Step 三 ADR：自定义箭头 `ArrowDefinition` 注册面（`arrowDetail.shape` 开放 string + `CompileOptions.arrows`，emit-in-compile 产 `MarkerPrimitive` 进 `ArrowEndSpec`、内置 7 降注册项、contextStroke 颜色继承）；路径生成器 `PathGeneratorDefinition` 注册面（`generator` step + `CompileOptions.pathGenerators` + `definePathGenerator`，JSON params 双 parse 护栏，core 不内置曲线、parabola / sin-cos 外部注册）；out/in·self-loop（bend 加 `outAngle`/`inAngle`/`looseness`）+ 路径整体变换（`PathSchema` `rotate`/`scale` 绕包围盒中心）+ 中段 marking（`marks` 复用 segment.ts + arrow marker，朝向随切线）。对应 §2 Path「路径整体变换」⚠️→✅、§3 Step「广义曲线连接(out/in)」⚠️→✅、「抛物线 / 正弦余弦」❌→✅(经注册面外部实现)、「中段 marking」⚠️→✅；箭头细节补 `ArrowDefinition` 注册。**ADR-04 pattern 自定义 motif**：`pattern.shape` 开放 string + `CompileOptions.patterns` + 内置 lines/dots/grid 降注册项，emit-in-compile 复用 `MarkerPrimitive`（§1 填充 pattern 自定义 motif ✅）。三注册面 + pattern 的 motif emit 全部补 finite 守卫（NaN/Infinity 编译期拦，守 Scene JSON 可序列化）。
- **2026-05-23 续修**：v0.2 六段 alpha 全部完工。alpha.5 Path-level shape sugar 落地——`rectangle` step、椭圆弧（arc `radiusX/Y`）、circle/ellipse 部分裁剪（`startAngle/endAngle/closed`）+ `<Grid>` / `<Sector>` / `<RegularPolygon>` / `<Star>` sugar（原 🔜 行转 ✅）。alpha.6 结构化 Target / Anchor——path 节点引用从字符串升级为对象主契约 `{ id, anchor?, offset? }`，新增 `{ side, t }` 真实边界比例点；字符串 `'A'` / `'A.north'` / `'A.30'` 降为 React DSL shorthand（eager 转对象后入 IR）；顶层容器 `<TikZ>` 改名 `<Layout>`（`<TikZ>` 留 deprecated alias）。结构化能力缺口全闭；剩余缺口集中在补全图元（parabola / sin-cos / patterns / shading / 更多内置 node 形状）、文本排版（LaTeX / 数学 / text width 自动换行）与 P3 高级特性。

**状态图例**

| 状态 | 含义 |
|---|---|
| ✨ | **超过**——retikz 比原生 TikZ 更结构化 / 更易用 |
| ✅ | **相等**——能力对齐，写法不同但效果一致 |
| ⚠️ | **不足**——部分支持，覆盖主流但有边界缺口 |
| ❌ | **缺失**——尚未实现 |

---

## 1. Node 节点

可定位的形状容器（矩形 / 圆 / 椭圆 / 菱形）+ 可选文本标签。retikz 的形状边界统一外接"文本框 + padding"，circle / ellipse / diamond 为外接几何。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 形状 | `shape: rectangle/circle/ellipse/diamond` + 开放字符串 | `[circle]` / `[diamond]` / `[regular polygon]` / `[cloud]` | ⚠️ | 4 内置；alpha.3 起 `shape` 开放为字符串 + `ShapeDefinition` 注入面（`CompileOptions.shapes`），第三方可发 shape 包；内置 node 形状仍缺 regular polygon / star / cylinder / cloud / chamfered（regular polygon / star 可用 Path sugar `<RegularPolygon>` / `<Star>` 画几何，但非带文本 / anchor 的 Node 形状） |
| 文本内容 | `text`（单行 string 或多行 `LineSpec[]`） | `{文字}` + `\\` 手动换行 | ✅ | 多行用数组，JSON 友好无 escape |
| 逐行样式覆盖 | `LineSpec` 的 `fill` / `opacity` / `font` | 需 inline `\textcolor` 等 | ✨ | 逐行结构化覆盖，AI 生成更直接 |
| 数学 / LaTeX 排版 | —（纯文本） | `$x^2$` 等任意 LaTeX | ❌ | 文本为纯字符串，无数学 / 宏；数学排版规划归 `@retikz/math` 专包 |
| 多行对齐 | `align: left/center/right` | `[align=center]` | ✅ | |
| 行高 | `lineHeight` | 字体间接控制 | ✅ | |
| text width 自动换行 | `maxTextWidth`（折行阈值 + 短文本收缩） | `[text width=3cm]` | ✅ | 折行阈值语义（超过才折、短文本盒收缩，非固定段落宽）；西文按词 / CJK 按字 |
| 填充 / 描边 | `fill`（纯色 / 渐变 / 图案 / 图片 PaintSpec） / `stroke` / `strokeWidth` | `[fill=, draw=, line width=]` + shadings / patterns lib | ✅ | `fill` 支持 linear / radial 渐变、pattern（斜线 / 网点 / 网格）、image（URL）；渲染目标无关（`<defs>` adapter 物化） |
| 边框线型 | `dashed` / `dotted` / `dashArray` | `[dashed]` / `[dotted]` / `[dash pattern=]` | ✅ | |
| 边框语义粗细 | —（仅数值 `strokeWidth`） | `[very thick]` / `[ultra thin]` | ❌ | 语义档位目前仅 Path 有 |
| 圆角 | `roundedCorners`（仅 rectangle） | `[rounded corners=2pt]` | ⚠️ | 非矩形圆角缺 |
| 最小尺寸 | `minimumWidth` / `minimumHeight` / `minimumSize` | `[minimum size=1cm]` | ✅ | |
| 缩放 | `scale` / `xScale` / `yScale` | `[scale=]` / `[xscale=]` | ✅ | |
| 旋转 | `rotate` | `[rotate=]` | ✅ | |
| 内 / 外边距 | `innerXSep` / `innerYSep` / `outerSep`（+ `padding` / `margin` 别名） | `[inner sep=, outer sep=]` | ✅ | retikz 支持分轴 inner sep |
| 字体 | `font: family/size/weight/style` | `[font=\bfseries\Large]` | ✅ | `\Large` 等语义宏用数值 `size` 表达 |
| 颜色 / 透明度 | `textColor` / `opacity` / `fillOpacity` / `drawOpacity` | `[text=, opacity=, fill opacity=, draw opacity=]` | ✅ | |
| 标签 label | `label`（单 / 数组，方向或角度 + distance + 字体覆盖 + `rotate` none/radial/tangent/数字 + `keepUpright`） | `[label={[rotate=]above:foo}]` | ✅ | alpha.4 加 label 自旋；radial / tangent 自动朝向是便利档 |
| 引脚 pin | `label.pin`（`true` / `{ stroke, strokeWidth, dashPattern }`） | `[pin=right:bar]` | ✅ | 从节点边界牵引线到 label，复用 label placement / distance / rotate；计入 layout 外接框 |
| 双线边框 | — | `[double, double distance=2pt]` | ❌ | P3 |
| 裁剪 clip | `Scope.clip`（rect/circle/ellipse/polygon，renderer-agnostic ClipResource + clipRef） | `[clip]` | ✅ | alpha.9；Scope 级最实用，单 primitive 级 / 任意贝塞尔曲线裁剪推迟 |

---

## 2. Path 路径

由一串 step 动作组成的绘制路径。本节列 path 级样式（描边 / 箭头 / 填充 / 变换）；具体动作见 [§3 Step](#3-step-路径步骤)。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 描边 | `stroke` / `strokeWidth` / `dashPattern` | `[draw=, line width=, dash pattern=]` | ✅ | |
| 语义粗细 | `thickness: ultraThin…ultraThick` | `[ultra thin]…[ultra thick]` | ✅ | |
| 箭头方向 | `arrow: ->` / `<-` / `<->` | `[->]` / `[<-]` / `[<->]` | ✅ | |
| 箭头细节 | `arrowDetail`：开放 shape 名 + scale/length/width/color/fill/opacity/lineWidth + `start`/`end` 逐端覆盖 | `[>=Stealth]` + `arrows.meta` | ✅ | 内置 7（UML open / diamond…）；alpha.8 `ArrowDefinition` + `CompileOptions.arrows` 注册自定义箭头（emit-in-compile，内置 7 降注册项） |
| 填充 | `fill` / `fillRule`（nonzero / evenodd） | `\fill` / `[fill=, even odd rule]` | ✅ | evenodd 可画环形 |
| 线端 / 拐角 | `lineCap` / `lineJoin` | `[line cap=, line join=]` | ✅ | |
| 透明度 | `opacity` / `fillOpacity` / `drawOpacity` | `[opacity=, fill opacity=, draw opacity=]` | ✅ | |
| 路径整体变换 | `PathSchema` `rotate` / `scale`（绕包围盒中心）+ `<Scope transforms>`（分组变换） | `[rotate=30, shift={(1,2)}]` | ✅ | alpha.8 单 path 自身 `rotate` / `scale`（免包 Scope，变换顺序硬契约）；分组仍用 `<Scope>` |
| decorations | — | `decorate[decoration={snake}]` | ❌ | P3 |
| intersections | — | `(intersection of A--B and C--D)` | ❌ | P3 |

---

## 3. Step 路径步骤

Path 的子动作，当前 IR 十二种 `kind`（含 alpha.8 IR 级 `generator`，无 JSX DSL、经 `<Layout ir>` 直传 + `pathGenerators` 注入）。除 `move` / `cycle` / `rectangle` 外每段可挂 `label?` 边标注。端点 `to` 的坐标形态见 [§5 定位](#5-定位与坐标nodestep-共用)。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 移动（不绘制） | `kind: move` | `(A)` | ✅ | |
| 直线 | `kind: line` | `(A) -- (B)` | ✅ | |
| 折角 | `kind: step, via: -\| / \|-` | `(A) -\| (B)` | ✅ | |
| 闭合 | `kind: cycle` | `-- cycle` | ✅ | |
| 二次贝塞尔 | `kind: curve` + `control` | `.. controls (c) ..` | ✅ | |
| 三次贝塞尔 | `kind: cubic` + `control1/2` | `.. controls (a) and (b) ..` | ✅ | |
| 弧形简记 | `kind: bend` + `bendDirection/bendAngle` | `to[bend left=30]` | ✅ | 编译为 cubic 近似 |
| 圆弧 | `kind: arc` + `startAngle/endAngle/radius` | `arc[start angle=, end angle=, radius=]` | ✅ | alpha.5 加 `radiusX/Y` 椭圆弧 |
| 整圆 / 部分圆 | `kind: circlePath` + `radius` | `circle[radius=]` | ✅ | alpha.5 加 `startAngle/endAngle/closed` 部分裁剪（半圆 / 弓形） |
| 整椭圆 / 部分椭圆 | `kind: ellipsePath` + `radiusX/Y` | `ellipse[x radius=, y radius=]` | ✅ | alpha.5 加部分裁剪 |
| 矩形 | `kind: rectangle` + `from/to/roundedCorners` | `(a) rectangle (b)` | ✅ | alpha.5 新增 step（自带圆角） |
| 网格 | `<Grid>` sugar 展开多 Path | `(a) grid (b)` | ✅ | alpha.5 sugar 层拼装 |
| 扇形 | `<Sector>` sugar（`move + line + arc + cycle`） | `arc` + 连圆心 cycle | ✅ | alpha.5 sugar；arc step 显式 `center` 画正确 wedge |
| 正多边形 | `<RegularPolygon>` sugar（`move + line·(n-1) + cycle`） | `[regular polygon]`（node 形状） | ✅ | alpha.5 sugar；画几何而非带文本 node |
| 星形 | `<Star>` sugar（外 / 内半径交替顶点） | `[star]`（node 形状） | ✅ | alpha.5 sugar；画几何而非带文本 node |
| 抛物线 | 经路径生成器注册面外部实现 | `parabola bend (c) (b)` | ✅ | alpha.8 `PathGeneratorDefinition` + `CompileOptions.pathGenerators`；core 不内置曲线，外部包注册 |
| 正弦 / 余弦波段 | 经路径生成器注册面外部实现 | `sin (b)` / `cos (b)` | ✅ | 同上；generator step 采样多段（可含 move sub-path） |
| 广义曲线连接 | `kind: bend` + `outAngle` / `inAngle` / `looseness` | `to[out=, in=, looseness=]` | ✅ | alpha.8 任意出 / 入射角 + looseness；`from==to` 退化自环 |
| 边标注 | step `label`：`pos`（0..1 或 7 档关键字）+ `above/below/left/right/sloped` | `-- node[midway, above] {x}` | ✅ | |
| 路径中段任意 marking | `PathSchema.marks`（`pos∈[0,1]` + arrow marker，朝向随切线） | `decoration={markings, mark=...}` | ✅ | alpha.8 首批 `mark.kind:'arrow'`（复用注册箭头名）；任意小图形 mark 留扩展 |

---

## 4. Coordinate 坐标占位

命名一个点，不绘制任何图形，供 path 端点 / 相对定位引用。与 Node 在同一 nodeIndex 注册。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 命名点 | `IRCoordinate { id, position }` | `\coordinate (m) at (3,2);` | ✅ | position 支持笛卡尔 / 极 / 相对 / 偏移 |

---

## 5. 定位与坐标（Node/Step 共用）

`Node.position` 与 `Step.to` 共用的坐标表达。非笛卡尔形态全部在编译期解析为笛卡尔。节点引用自 alpha.6 起以对象 `{ id, anchor?, offset? }` 为 core 主契约，字符串 `'A'` / `'A.north'` / `'A.30'` 降为 React DSL shorthand（eager 解析为对象后入 IR；含 `.` 的 id 须用对象形态）。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 笛卡尔 | `[x, y]` | `(x, y)` | ✅ | |
| 极坐标 | `PolarPosition { angle, radius, origin? }`（origin 可嵌套） | `(30:2)` | ✅ | |
| 相对定位 | `AtPosition { direction, of, distance? }` | `[above=2cm of A]`（positioning） | ✅ | 8 方向 |
| calc 偏移 | `OffsetPosition { of, offset }` | `($(A) + (1,2)$)`（calc） | ⚠️ | 加法偏移 ✅；比例 partway 见下行；投影 / 完整 calc 表达式仍缺 |
| 两点间比例 partway | `BetweenPosition { between:[A,B], t }`（端点自包含 AbsoluteTarget，进 Node/Coordinate position 与 Step.to） | `($(A)!t!(B)$)`（calc） | ✅ | alpha.9；t∈[0,1]（外插推迟），复用 refPointOfTarget + lerpPoint |
| 命名 anchor | `{ id, anchor: 'north' }`（9 anchor；shorthand `'A.north'`） | `(A.north)` | ✅ | center + 8 方位 |
| 角度边界点 | `{ id, anchor: 30 }`（shorthand `'A.30'`） | `(A.30)` | ✅ | 同极坐标角度约定 |
| 节点 auto-clip | `{ id: 'A' }`（中心→目标射线交边界；shorthand `'A'`） | `(A)` 自动裁剪 | ✅ | 省略 anchor |
| 边上比例点 | `{ id, anchor: { side, t } }`（t∈[0,1] 真实边界） | `($(A.north west)!t!(A.north east)$)`（calc，仅直边） | ✨ | alpha.6 新增；rect 直边 / circle·ellipse 周长弧段 / diamond 斜边，自定义 shape 需实现 `edgePoint` |
| anchor 后 offset | `{ id, anchor?, offset: [dx, dy] }`（世界系） | `($(A.north)+(dx,dy)$)`（calc） | ✅ | alpha.6；anchor / 边点解析后叠加，不随 node rotate 旋转 |
| 相对端点（不推进） | `{ relative: [dx, dy] }` | `(+x, +y)` | ✅ | |
| 累积相对（推进游标） | `{ relativeAccumulate: [dx, dy] }` | `(++x, ++y)` | ✅ | |

---

## 6. Scene 与全局能力

顶层结构与跨图元机制。Scene children 当前为 `node` / `path` / `coordinate` 三种。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 作用域 / 分组 | `<Scope>`（容器 + 局部 transform） | `\begin{scope}` / `{[...]}` | ✅ | alpha.1 落地 |
| 样式继承 / 主题 | `color` 级联 + `nodeDefault` / `pathDefault` / `labelDefault` / `arrowDefault` + `resetStyle` 屏障 | `every node/.style={...}` / `\begin{scope}[draw=red]` | ✅ | alpha.2 落地 |
| 显式栈序 z-index | `zIndex`（Node / Path / Scope；稳定排序，缺省 = 声明序） | —（绘制序 = 源码序） | ✨ | alpha.4；TikZ 无原生 z-index |
| 自定义 viewBox | IR 根 `viewBox { x, y, width, height }`（覆盖自动算、忽略 padding；React `<Layout viewBox>` prop 注入） | `\useasboundingbox` | ✅ | alpha.9；具名四字段，path-as-bbox 推迟 |
| libraries 划分 | —（能力平铺） | `\usetikzlibrary{...}` | ❌ | 功能多已落地，缺的是组织方式 |

---

## 7. 剩余优先级

初版 P0 闭环 + **v0.2 结构化能力全落（alpha.1–6：`<Scope>` / 样式继承 / Shape Registry / `zIndex` / Node label rotate / Path-level shape sugar / 结构化 Target·Anchor / `<TikZ>`→`<Layout>`）**。剩余杠杆点：

1. **补全图元**：`parabola` / `sin`-`cos` 波段（新 Step kind）、patterns（填充图案）、shading（渐变）。Path-level shape sugar（circle / ellipse 部分裁剪、椭圆弧、`rectangle` / `grid` / `sector` / `regular polygon` / `star`）已于 alpha.5 落地。
2. **文本排版**：数学 / LaTeX 排版（`text width` 自动换行已 alpha.7 ✅）。
3. **更多内置 node 形状**：cylinder / cloud / chamfered（经 Shape Registry / 第三方包）；regular polygon / star 已可用 Path sugar 画几何，但仍缺带文本 / anchor 的 node 形态；node 语义粗细档位、非矩形圆角（`pin` 已 alpha.7 ✅）。
4. **P3 高级特性**：decorations、intersections、任意小图形 marking（alpha.8 marking 首批仅 arrow）、double border、投影定位、完整 calc 表达式、t 外插（单 path 整体变换、pattern 自定义 motif `PatternDefinition` 均 alpha.8 ✅；clip 裁切 / `useasboundingbox`（viewBox override）/ 两点间比例 partway 均 alpha.9 ✅）。
