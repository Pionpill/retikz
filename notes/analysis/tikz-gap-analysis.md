# retikz 与 TikZ 的能力差距

> 参照实现：`packages/core/src/ir/*`、`packages/core/src/compile/*`、`packages/react/src/kernel/*`、`packages/react/src/sugar/*`

## 结论

截至当前 v0.2，retikz 已经覆盖了 TikZ 最常用的二维图元表达：`Layout` / `Scope`、节点、路径、步骤、定位、箭头、标签、形状注册、路径生成器、图案、裁切、`viewBox` 覆盖和比例定位。

它和 TikZ 的主要差距，已经从“基础能力缺口”转成了“高级库能力缺口”和“少量几何/排版细节缺口”。换句话说，retikz 现在更像一个受约束、AI 友好的图形底座，而不是 PGF/TikZ 的全量复刻。

## 已经对齐的部分

| 能力 | retikz 现状 | TikZ 对照 |
| --- | --- | --- |
| 顶层容器 / 坐标语境 | `Layout` + `Scope` | `tikzpicture` + `scope` |
| 节点 | `Node`，含形状、文本、标签、样式、缩放、旋转 | `node` |
| 路径 | `Path` + `Step` | `\draw` + path syntax |
| 路径步骤 | `move` / `line` / `step` / `cycle` / `curve` / `cubic` / `bend` / `arc` / `circlePath` / `ellipsePath` / `rectangle` / `generator` | 常用 path 语法 |
| 定位 | 笛卡尔、极坐标、相对定位、偏移定位、两点比例定位、相对 target | `calc` / positioning |
| 锚点 | 节点锚点、边界点、角度锚点、`Scope` 句柄 | node anchors / local bounding box |
| 箭头 | 方向箭头 + 细粒度箭头定义 + 端点继承 | arrow tips / `arrows.meta` |
| 标签 | 节点标签、路径边标注 | `label` / `pin` |
| 形状 | 内置形状 + Shape Registry | built-in shapes + shape declarations |
| 路径生成器 | `generator` step + 注册表 | `to path` / 自定义路径生成思路 |
| Paint | 纯色、渐变、图案、图片 | fill / shading / pattern / image |
| 裁切 | `Scope.clip` + renderer 侧物化 | `\clip` |
| 画布范围 | `viewBox` 覆盖自动布局 | `\useasboundingbox` |

## 仍然存在的差距

| 方向 | 当前状态 | 说明 |
| --- | --- | --- |
| decorations | 未实现 | `snake`、`coil`、`markings` 等装饰层还没做成一等能力 |
| intersections | 未实现 | 还没有 TikZ 那种通用交点求解 API |
| 投影定位 | 未实现 | 例如 `($(A)!(P)!(B)$)` 这一类更完整的 calc 语义还缺 |
| 完整 calc 语言 | 未实现 | 目前只覆盖了偏移、比例 partway 和少量结构化定位 |
| 图库级 library 加载语义 | 不实现 | retikz 走 npm 包 + 注册注入，而不是 `\usetikzlibrary` 模式 |
| 任意贝塞尔 / 几何工具链 | 部分缺失 | 复杂几何辅助函数不如 TikZ 全面 |
| 数学排版 | 仍是空白 | 仍不是一个数学排版引擎，纯文本/基础富文本为主 |
| 高级图表域 | 交给独立包 | flow / plot / graph 这类属于 domain 包，不进 core |

## 不是差距、而是设计取舍

这些地方看起来像“少了 TikZ 功能”，但其实是 retikz 的刻意选择：

- `Shape Registry`、`ArrowDefinition`、`PathGeneratorDefinition` 走注册注入，不走 TikZ 的宏库加载。
- `Layout` / `Scope` / `Node` / `Path` / `Step` 保持 IR 结构化，避免把字符串小语法继续膨胀成一层新的 DSL。
- 高级图表、布局算法、领域语义不塞进 core，而是放到独立包。

## 结论分级

| 级别 | 内容 |
| --- | --- |
| 已对齐 | 核心二维绘图、常用定位、箭头、标签、形状、路径生成、paint、裁切、viewBox |
| 有缺口但可接受 | decorations、intersections、完整 calc、投影定位、数学排版 |
| 刻意不做 | TikZ library 加载语义、把 chart/layout 语义塞进 core |

## 后续优先级

1. 如果要继续补 TikZ 差距，优先看 `decorations`、`intersections`、投影定位。
2. 如果目标是“更像 TikZ 但仍保持结构化”，再补完整 calc 语言。
3. 如果目标是“更广的领域覆盖”，应该新增 domain 包，而不是继续膨胀 core。
