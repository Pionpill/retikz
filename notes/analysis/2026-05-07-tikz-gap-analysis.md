# retikz 图元与 TikZ 能力对照

> 关联文档：[`architecture/DESIGN.md`](../architecture/DESIGN.md) · [`packages/core/AGENTS.md`](../../packages/core/AGENTS.md)

## 总览

**修改记录**

- **2026-05-07 初版**：基于 `@retikz/core` v0.1.0-alpha（仅 `move` / `line` step、矩形 node）盘点缺失项。
- **2026-05-21 修订**：对照 `@retikz/core` v0.1.0 正式版按图元重排。初版列出的 P0 全部闭环，P1 / P2 绝大多数已补齐；当前缺口集中在结构化能力（Scope / 主题）、文本排版（LaTeX / 数学）与 P3 高级特性。

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
| 形状 | `shape: rectangle/circle/ellipse/diamond` | `[circle]` / `[diamond]` / `[regular polygon]` / `[cloud]` | ⚠️ | 4 种已支持；regular polygon / star / cylinder / cloud / chamfered 缺 |
| 文本内容 | `text`（单行 string 或多行 `LineSpec[]`） | `{文字}` + `\\` 手动换行 | ✅ | 多行用数组，JSON 友好无 escape |
| 逐行样式覆盖 | `LineSpec` 的 `fill` / `opacity` / `font` | 需 inline `\textcolor` 等 | ✨ | 逐行结构化覆盖，AI 生成更直接 |
| 数学 / LaTeX 排版 | —（纯文本） | `$x^2$` 等任意 LaTeX | ❌ | 文本为纯字符串，无数学 / 宏 |
| 多行对齐 | `align: left/center/right` | `[align=center]` | ✅ | |
| 行高 | `lineHeight` | 字体间接控制 | ✅ | |
| text width 自动换行 | —（仅手动分行） | `[text width=3cm]` | ❌ | 按宽度自动折行缺 |
| 填充 / 描边 | `fill` / `stroke` / `strokeWidth` | `[fill=, draw=, line width=]` | ✅ | |
| 边框线型 | `dashed` / `dotted` / `dashArray` | `[dashed]` / `[dotted]` / `[dash pattern=]` | ✅ | |
| 边框语义粗细 | —（仅数值 `strokeWidth`） | `[very thick]` / `[ultra thin]` | ❌ | 语义档位目前仅 Path 有 |
| 圆角 | `roundedCorners`（仅 rectangle） | `[rounded corners=2pt]` | ⚠️ | 非矩形圆角缺 |
| 最小尺寸 | `minimumWidth` / `minimumHeight` / `minimumSize` | `[minimum size=1cm]` | ✅ | |
| 缩放 | `scale` / `xScale` / `yScale` | `[scale=]` / `[xscale=]` | ✅ | |
| 旋转 | `rotate` | `[rotate=]` | ✅ | |
| 内 / 外边距 | `innerXSep` / `innerYSep` / `outerSep`（+ `padding` / `margin` 别名） | `[inner sep=, outer sep=]` | ✅ | retikz 支持分轴 inner sep |
| 字体 | `font: family/size/weight/style` | `[font=\bfseries\Large]` | ✅ | `\Large` 等语义宏用数值 `size` 表达 |
| 颜色 / 透明度 | `textColor` / `opacity` / `fillOpacity` / `drawOpacity` | `[text=, opacity=, fill opacity=, draw opacity=]` | ✅ | |
| 标签 label | `label`（单 / 数组，方向或角度 + distance + 字体覆盖） | `[label=above:foo]` | ✅ | |
| 引脚 pin | — | `[pin=right:bar]` | ❌ | label 无引线 |
| 双线边框 | — | `[double, double distance=2pt]` | ❌ | P3 |
| 裁剪 clip | — | `[clip]` | ❌ | P3 |

---

## 2. Path 路径

由一串 step 动作组成的绘制路径。本节列 path 级样式（描边 / 箭头 / 填充 / 变换）；具体动作见 [§3 Step](#3-step-路径步骤)。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 描边 | `stroke` / `strokeWidth` / `dashPattern` | `[draw=, line width=, dash pattern=]` | ✅ | |
| 语义粗细 | `thickness: ultraThin…ultraThick` | `[ultra thin]…[ultra thick]` | ✅ | |
| 箭头方向 | `arrow: ->` / `<-` / `<->` | `[->]` / `[<-]` / `[<->]` | ✅ | |
| 箭头细节 | `arrowDetail`：7 shape + scale/length/width/color/fill/opacity/lineWidth + `start`/`end` 逐端覆盖 | `[>=Stealth]` + `arrows.meta` | ✅ | UML open / diamond / openDiamond 内置 |
| 填充 | `fill` / `fillRule`（nonzero / evenodd） | `\fill` / `[fill=, even odd rule]` | ✅ | evenodd 可画环形 |
| 线端 / 拐角 | `lineCap` / `lineJoin` | `[line cap=, line join=]` | ✅ | |
| 透明度 | `opacity` / `fillOpacity` / `drawOpacity` | `[opacity=, fill opacity=, draw opacity=]` | ✅ | |
| 路径整体变换 | — | `[rotate=30, shift={(1,2)}]` | ❌ | primitive 层有 GroupPrim，IR 未暴露 |
| decorations | — | `decorate[decoration={snake}]` | ❌ | P3 |
| intersections | — | `(intersection of A--B and C--D)` | ❌ | P3 |

---

## 3. Step 路径步骤

Path 的子动作，十种 `kind`。除 `move` / `cycle` 外每段可挂 `label?` 边标注。端点 `to` 的坐标形态见 [§5 定位](#5-定位与坐标nodestep-共用)。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 移动（不绘制） | `kind: move` | `(A)` | ✅ | |
| 直线 | `kind: line` | `(A) -- (B)` | ✅ | |
| 折角 | `kind: step, via: -\| / \|-` | `(A) -\| (B)` | ✅ | |
| 闭合 | `kind: cycle` | `-- cycle` | ✅ | |
| 二次贝塞尔 | `kind: curve` + `control` | `.. controls (c) ..` | ✅ | |
| 三次贝塞尔 | `kind: cubic` + `control1/2` | `.. controls (a) and (b) ..` | ✅ | |
| 弧形简记 | `kind: bend` + `bendDirection/bendAngle` | `to[bend left=30]` | ✅ | 编译为 cubic 近似 |
| 圆弧 | `kind: arc` + `startAngle/endAngle/radius` | `arc[start angle=, end angle=, radius=]` | ✅ | |
| 整圆 | `kind: circlePath` + `radius` | `circle[radius=]` | ✅ | |
| 整椭圆 | `kind: ellipsePath` + `radiusX/Y` | `ellipse[x radius=, y radius=]` | ✅ | |
| 边标注 | step `label`：`pos`（0..1 或 7 档关键字）+ `above/below/left/right/sloped` | `-- node[midway, above] {x}` | ✅ | |
| 路径中段任意 marking | —（仅文字 label） | `decoration={markings, mark=...}` | ⚠️ | 任意图形标记缺 |

---

## 4. Coordinate 坐标占位

命名一个点，不绘制任何图形，供 path 端点 / 相对定位引用。与 Node 在同一 nodeIndex 注册。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 命名点 | `IRCoordinate { id, position }` | `\coordinate (m) at (3,2);` | ✅ | position 支持笛卡尔 / 极 / 相对 / 偏移 |

---

## 5. 定位与坐标（Node/Step 共用）

`Node.position` 与 `Step.to` 共用的坐标表达。非笛卡尔形态全部在编译期解析为笛卡尔。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 笛卡尔 | `[x, y]` | `(x, y)` | ✅ | |
| 极坐标 | `PolarPosition { angle, radius, origin? }`（origin 可嵌套） | `(30:2)` | ✅ | |
| 相对定位 | `AtPosition { direction, of, distance? }` | `[above=2cm of A]`（positioning） | ✅ | 8 方向 |
| calc 偏移 | `OffsetPosition { of, offset }` | `($(A) + (1,2)$)`（calc） | ⚠️ | 仅加法偏移；投影 / 比例等完整 calc 表达式缺 |
| 命名 anchor | `'A.north'`（9 anchor） | `(A.north)` | ✅ | center + 8 方位 |
| 角度边界点 | `'A.30'` | `(A.30)` | ✅ | 同极坐标角度约定 |
| 节点 auto-clip | `'A'`（中心→目标射线交边界） | `(A)` 自动裁剪 | ✅ | |
| 相对端点（不推进） | `{ relative: [dx, dy] }` | `(+x, +y)` | ✅ | |
| 累积相对（推进游标） | `{ relativeAccumulate: [dx, dy] }` | `(++x, ++y)` | ✅ | |

---

## 6. Scene 与全局能力

顶层结构与跨图元机制。Scene children 当前为 `node` / `path` / `coordinate` 三种。

| 能力 | ReTikZ | TikZ | 状态 | 备注 |
|---|---|---|---|---|
| 作用域 / 分组 | —（GroupPrim 仅 primitive 层，编译内部用） | `\begin{scope}` / `{[...]}` | ❌ | IR 层无用户可写的 scope / group |
| 样式继承 / 主题 | — | `every node/.style={...}` | ❌ | 当前每个图元自带全量样式字段 |
| 自定义 viewBox | —（`computeViewBox` 自动） | `\useasboundingbox` | ❌ | 无逃生口 |
| libraries 划分 | —（能力平铺） | `\usetikzlibrary{...}` | ❌ | 功能多已落地，缺的是组织方式 |

---

## 7. 剩余优先级

初版 **P0 闭环（箭头 / 折角 / shape 多态 / anchor / cycle + fill）已全部完成**，v0.1.0 已能画教科书级流程图、UML 类图、简单几何图。下一阶段杠杆点：

1. **结构化能力（最高）**：`<Scope>` / `<Group>` IR + 样式继承 / 主题。primitive 层已有 `GroupPrim`，主要工作在 IR schema 与编译展开；落地后 AI 生成的 IR 会显著变短。
2. **文本排版**：数学 / LaTeX 排版、`text width` 自动换行。
3. **补全图元**：更多 shape（regular polygon / star / cylinder / cloud）、`pin`、node 语义粗细档位、非矩形圆角。
4. **P3 高级特性**：路径整体变换、decorations、intersections、任意 markings、double border、clip、`useasboundingbox`、完整 calc 表达式。
