# v0.4 路线讨论快照

> 状态：历史归档。记录 2026-06 起 v0.4 候选拆分与已完成方向的早期取舍，用于解释为什么形成当前 milestone；当前执行状态以 [`roadmap.md`](./roadmap.md) 和 Accepted ADR 为准。

## 原始候选拆分

| 代号 | 方向                      | 最终处置                                         |
| ---- | ------------------------- | ------------------------------------------------ |
| A    | 计算 / 几何               | `@retikz/math` + core 纯几何下沉，alpha.1 完成   |
| B    | 路径补强                  | 圆角 + 平滑曲线 alpha.3 完成；后续项进入 backlog |
| C    | 交互行为                  | 未进入 v0.4；headless interaction 留在 backlog   |
| D    | eval（LLM 生成评测）      | 转交独立分支，不由 Kernel v0.4 跟踪              |
| E    | 数学公式                  | 独立 `@retikz/tex`，alpha.5 完成                 |
| F    | Scene 视觉                | shadow + blend alpha.4 完成                      |
| G    | 跨框架 runtime            | 未排期，留在 backlog                             |
| H    | Scope 多态 bounding shape | alpha.2 完成 rectangle / circle MVP              |
| P3D  | 伪三维投影                | 未排期，设计边界移入 backlog                     |

原始顺序判断是 A 先建立共享计算底座，B 与 H 再消费 A；Scene 视觉和 TeX 可独立推进。实际 milestone 仍由各阶段 roadmap / ADR 定稿，不能从本表反推当前 API。

## A · `@retikz/math`（2026-06-12 拍板）

- 定位为零依赖、零 IR、零 Zod 的纯计算包；使用纯函数和普通对象，不建立 class 对象模型。
- 依赖方向为 core → math；math 不反向依赖 core。首切即把 core 中纯向量、仿射、插值、arc 与求交原语下沉，并由 core re-export。
- 首批能力覆盖线 / 线段交点、三角形内切 / 外接圆、点在多边形、凸包；曲线求交和伪三维矩阵后置。
- 进包红线是“纯数学、可独立测试、无绘图业务语义”；否则留在消费域。
- 早期曾考虑让 core geometry 与 math 短期并存，后被 alpha.1 ADR 推翻，以 [alpha.1 roadmap](./alpha.1/roadmap.md) 为准。

## B · 路径补强（2026-06-12 拍板）

- 首切把任意折线圆角与过点平滑曲线一起推进：前者复用 contour fillet，后者落为 registered generator。
- path-path 求交依赖 math 的曲线求交原语，后置。
- motif 装饰不自动进入 core；先评估扩展机制。
- 沿路径放置节点 / markings 等待真实消费场景，不提前扩张 Path contract。
- 最终实现与 contour shape 合并进 [alpha.3 roadmap](./alpha.3/roadmap.md)。

## E · 数学公式（2026-06-12 方向）

- 坚持 renderer-agnostic：MathJax SVG glyph path lowering 到基础 Scene path，使 SVG、Canvas 与 Node 输出共享结果。
- 独立为 `@retikz/tex`，避免把 MathJax 重依赖并入 core 或轻量 extension 集合。
- MathJax 作为 optional peer，宿主控制版本和 macro。
- 早期设想的独立 math IR 节点最终收敛为文本中的 `$...$`、`$$...$$` 与 runs，由可选 `lowerTex` 下沉；以 [alpha.5 roadmap](./alpha.5/roadmap.md) 为准。

## F · Scene 视觉（2026-06-13 方向）

- 首切锁定 zIndex、drop shadow 与 blend mode，选择 SVG、浏览器 Canvas 和 Node Canvas 都能解释的 renderer-agnostic 子集。
- blur 因 Node Canvas 支持与降级不稳定而后置；mask 与已有 clip 重叠，未进入首切。
- Scene 只保存效果意图，各 renderer 翻译；不能把 DOM filter 或 Canvas 状态带进 core。
- zIndex 还为后续深度排序提供通用底座，但不因此把三维语义放进 core。
- 最终范围见 [alpha.4 roadmap](./alpha.4/roadmap.md)。

## 历史依赖判断

- A → H：Scope 多态边界可消费 math 的包围与轮廓算法。
- A → B：圆角、求交和平滑曲线共享 math / curve 原语。
- Composite / embeddable 与 A 可并行：它们是 adapter 与 compile contract，不依赖新几何。
- D eval 从一开始就不属于 Kernel 路线，后续不应重新混入本 roadmap。
