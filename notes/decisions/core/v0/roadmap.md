# v0 Roadmap

> 更新于 2026-05-24。本文件只记录总体路线，不再承载 alpha 级任务清单。
> 具体执行计划放在同目录 `v0.*.md`，设计决策放在 `notes/decisions/core/v0/`。

## 定位

v0 是 retikz 走向 1.0 前的验证期：证明它可以成为一个实用的、浏览器原生的、受 TikZ 启发的声明式绘图库。

目标不是复刻 TikZ 的所有 library，而是把核心架构打稳、覆盖常见图表需求，并给领域包留下清晰的扩展接口。

## 版本主题

| 版本 | 主题 | 说明 |
| --- | --- | --- |
| v0.1 | 架构确认，基础能力 | 确立 core IR、Scene primitives、React DSL、Node / Path / Coordinate 基础、箭头、标签、填充、相对定位、文档站结构与第一条稳定发布线。 |
| v0.2 | 能力完善，支持扩展 | 补齐 Scope、样式继承、shape registry、结构化 target、Layout 命名、path shape sugar、paint resources、文本换行、pin、自定义箭头、path generator、path transform、marking、clipping、viewBox override、partway positioning 等能力。 |
| v0.3 | renderer 架构 + runtime + 交互 | renderer 拆分进 `@retikz/render`（子路径 `./svg` / `./canvas`）、新增 `@retikz/vanilla` 原生 runtime、React 双渲染模式、水合（SVG + Canvas 统一事件绑定）、Tier 2 支撑（可注册 composite 展开管线，`@retikz/plot` 为首个消费者）、时间轴动画（alpha.4）。 |
| v1+ | 领域包与更广生态 | plot（已起步，独立 `plot/` 版本线）/ graph / flow / math / advanced shape packs、更多 renderer / adapter、工具链与编辑体验放到核心契约稳定之后。 |

## 参考来源

- v0.1 细节：`notes/decisions/core/v0/v0.1/roadmap.md` 与 `v0.1/*/roadmap.md`
- v0.2 细节：`notes/decisions/core/v0/v0.2/roadmap.md` 与 `v0.2/*/roadmap.md`
- v0.3 细节：`notes/decisions/core/v0/v0.3/roadmap.md` 与 `v0.3/*/roadmap.md`
- ADR：`notes/decisions/core/v0/`
- 底座对比分析：`notes/analysis/core-compare-analysis.md`

本文件不再跟踪 alpha-by-alpha 细节。具体计划变化时，先改对应版本计划；只有阶段主题或边界变化时，才更新本 roadmap。

## 范围边界

core 继续聚焦 renderer-agnostic、JSON 可序列化的图形 IR，以及常见图示所需的通用能力。

以下方向优先由扩展包承载：

- plotting / axes；
- graph layout；
- flowchart / UML presets；
- math / LaTeX-like text rendering；
- specialized shape packs；
- advanced decorations / intersections。

以下 TikZ 能力暂不进 core，除非后续阶段证明它们具有足够广泛的共性价值：

- 完整 calc 表达式语言；
- projection syntax；
- snake / coil 等复杂 decorations；
- TikZ library loading semantics；
- visual editor / IDE features。
