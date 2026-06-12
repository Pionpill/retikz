# retikz 与 TikZ 的能力差距

> 范围：仅评估 `@retikz/core`（v0.3.0-beta.1）。Tier 2 图表 / 领域语义在独立包，不在本文衡量范围。
> 参照实现：`packages/core/core/src/ir/*`、`packages/core/core/src/compile/*`、`packages/core/core/src/shapes/*`、`packages/core/core/src/arrows/*`、`packages/core/core/src/patterns/*`、`packages/core/core/src/parsers/*`

## 结论

截至当前 v0.3.0-beta.1，core 已经覆盖 TikZ 最常用的二维图元表达：`Scene`（顶层）/ `Scope`、`Node`、`Path` + 12 种 `Step`、`Coordinate`、五族定位、锚点体系、箭头定义、标签、形状注册、路径生成器注册、四类 paint、裁切、`viewBox` 覆盖。在 v0.2 之后又补齐了三块原本属于“后期”的能力，并全部进了 IR：**时间轴动画**（声明式 keyframe）、**交互水合接入点**（IR 只存事件名 / id，回调留运行时）、**Tier 2 composite 接入点**（`namespace` + `type` passthrough + compile 期下沉）。

它和 TikZ 的主要差距，已经从“基础能力缺口”转成了“高级库能力缺口”和“少量几何 / 排版细节缺口”。换句话说，core 现在是一个受约束、AI 友好、且已具备动画与交互接缝的图形底座，而不是 PGF/TikZ 的全量复刻。

## 已经对齐的部分

| 能力 | core 现状 | TikZ 对照 |
| --- | --- | --- |
| 顶层容器 / 坐标语境 | `Scene` 根 + `Scope`（局部变换 / 样式默认 / clip） | `tikzpicture` + `scope` |
| 节点 | `Node`，含形状、文本、标签、样式、缩放、旋转 | `node` |
| 路径 | `Path` + `Step` | `\draw` + path syntax |
| 路径步骤（12 种 `kind`） | `move` / `line` / `fold`（折角）/ `cycle` / `curve` / `cubic` / `bend` / `arc` / `circlePath` / `ellipsePath` / `rectangle` / `generator` | 常用 path 语法 |
| 定位（五族） | 笛卡尔 `[x,y]`、极坐标（origin 可链）、相对定位（8 compass 方向 + `of` + distance）、偏移定位（calc 镜像 `+offset`）、两点比例 `between`/`t`；路径端点另支持 `relative` / `relativeAccumulate` | `calc` / positioning |
| 锚点 | compass 锚点（9 标准 + web 别名 + shape 专属）、角度锚点（度数）、边界比例点 `{side,t}`；`boundary` 可改写连接面（`shape`/`circle`/注册形状） | node anchors / local bounding box |
| 箭头 | 8 内置箭头形状（normal/open/stealth/openStealth/diamond/openDiamond/circle/openCircle）+ Arrow Registry + 端点继承 + 每端覆盖 + 路径沿途 marks | arrow tips / `arrows.meta` |
| 标签 | 节点标签、路径 step 边标注（position / side / 样式覆盖） | `label` / `pin` |
| 形状 | 6 内置形状（rectangle / ellipse / sector / arc / polygon / star）+ circle/diamond preset + Shape Registry | built-in shapes + shape declarations |
| 路径生成器 | `generator` step + Path Generator Registry（core 不内置具体生成器） | `to path` / 自定义路径生成 |
| Paint | 纯色、`linearGradient`、`radialGradient`、`pattern`（内置 lines/dots/grid + Registry）、`image` | fill / shading / pattern / image |
| 裁切 | `Scope.clip`：rect / circle / ellipse / polygon | `\clip` |
| 画布范围 | `viewBox` 覆盖自动布局 | `\useasboundingbox` |
| 时间轴动画 | `IRAnimationTrack`：12 内置属性 + keyframe + 触发器（load/visible/manual/onEvent）+ 15 个 preset | （TikZ 静态，无对应；对标 PGF beamer 动画的声明式版本） |
| 交互接缝 | IR 携带 `id` + 事件名供水合层挂回调（回调本身不进 IR） | （TikZ 无；retikz 的 AI / 跨平台约束所致） |
| Tier 2 接入点 | `IRComposite`（`namespace` + `type` passthrough）+ `CompileOptions.composites` 注册表 + compile 期 `lowerComposites` 下沉 | （对标 PGFPlots 之于 TikZ：独立演进） |

## 仍然存在的差距

| 方向 | 当前状态 | 说明 |
| --- | --- | --- |
| decorations | 部分 | 路径沿途 arrow marks 已落地，但 `snake` / `coil` / `markings` 等装饰层还没做成一等能力 |
| intersections | 未实现 | IR 里没有 TikZ 那种通用交点求解 API |
| 投影定位 | 未实现 | 例如 `($(A)!(P)!(B)$)` 这类把点投影到线段的 calc 语义还缺 |
| 完整 calc 语言 | 部分 | 偏移、`between` 比例、polar origin 链覆盖了常用子集，但没有通用 calc 运算符 |
| 图库级 library 加载语义 | 不实现 | core 走 npm 包 + `CompileOptions` 注册注入，而不是 `\usetikzlibrary` 模式 |
| 任意贝塞尔 / 几何工具链 | 部分缺失 | 复杂几何辅助函数不如 TikZ 全面 |
| 数学排版 | 仍是空白 | core 不做数学排版引擎，文本度量靠注入接口，公式委托外部（KaTeX/MathJax） |
| 高级图表域 | 交给独立包 | flow / plot / graph 这类属于 Tier 2 domain 包，不进 core（经 composite 接入点下沉） |

## 不是差距、而是设计取舍

这些地方看起来像“少了 TikZ 功能”，但其实是 retikz 的刻意选择：

- `Shape Registry`、`Arrow Registry`、`Pattern Registry`、`PathGeneratorDefinition`、`CompileOptions.composites` 全走注册注入，不走 TikZ 的宏库加载。
- `Scene` / `Scope` / `Node` / `Path` / `Step` 保持 IR 结构化，避免把字符串小语法继续膨胀成一层新的 DSL；折角等便捷写法是 sugar，在进 IR 前就展平。
- 高级图表、布局算法、领域语义不塞进 core，而是放到独立包，经 composite 接入点在 compile 期下沉成 Kernel。
- 交互回调与动画触发回调不进 IR（只存名字 / id），保证 IR 100% JSON 可序列化、AI 可生成可 patch。

## 结论分级

| 级别 | 内容 |
| --- | --- |
| 已对齐 | 核心二维绘图、常用定位、锚点、箭头、标签、形状、路径生成、四类 paint、裁切、viewBox、时间轴动画、交互接缝、Tier 2 接入点 |
| 有缺口但可接受 | decorations（除 arrow marks）、intersections、完整 calc、投影定位、数学排版 |
| 刻意不做 | TikZ library 加载语义、把 chart/layout 语义塞进 core、把回调 / 函数塞进 IR |

## 后续优先级

1. 如果要继续补 TikZ 差距，优先看 `decorations`（snake/coil/markings）、`intersections`、投影定位。
2. 如果目标是“更像 TikZ 但仍保持结构化”，再补完整 calc 语言。
3. 如果目标是“更广的领域覆盖”，应该经 composite 接入点新增 Tier 2 domain 包，而不是继续膨胀 core。
