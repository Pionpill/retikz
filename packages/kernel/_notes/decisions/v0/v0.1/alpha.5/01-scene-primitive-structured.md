# ADR-01：Scene `PathPrim` + `GroupPrim` 结构化（去 SVG 字符串）

- 状态：Accepted（已实现）
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../roadmap.md)

> **目标**：把 Scene primitive 里残留的 SVG mini-language 字符串（`PathPrim.d` / `GroupPrim.transform`）改为结构化命令数组，让 core 不再依赖 SVG 知识、各 backend 翻译为各自原生 API。

## 背景 / 约束

- `PathPrim.d: string` 与 `GroupPrim.transform?: string` 本质都是 SVG mini-language，与“Scene primitive 是矢量图形最大公约子集、core 不假定渲染端”的约束冲突。
- 后果：Canvas / Skia / PDF adapter 要么自写 SVG path 解析器、要么依赖浏览器 `Path2D`（Node canvas 没有）；SVG-only 细节（A 命令 `large-arc/sweep` flag）被迫住在 ；GroupPrim transform 同病（canvas 的 `translate/rotate/scale` 是顺序调用、无字符串概念）。
- TikZ 自身从不暴露"d 字符串"——path 操作是 high-level 命令、各 backend 走不同 lowering；retikz 应复刻"core 持结构化数据、backend 翻译原生 API"。

## 决策：全结构化（commands / transforms 数组）

`PathPrim.d` → `commands: Array<PathCommand>`；`GroupPrim.transform` → `transforms?: Array<Transform>`（按数组顺序应用，语义同 SVG transform list）。每 adapter render 时翻译：SVG 拼字符串、Canvas 调 `ctx.moveTo/arc/...` 与 `ctx.translate/rotate/scale`。判别 union 的 kind（字面即决策，完整字段见 ）：

- `PathCommand`：`move` / `line` / `quad` / `cubic` / `arc` / `ellipseArc` / `close` 七种。
- `Transform`：`translate` / `rotate` / `scale` 三种。

理由：

1. **跨 adapter 是 retikz 第一原则**——保留字符串让 core 继续依赖 SVG 知识，背离 §4.5。
2. **双源是已知错误模式**——字符串 + 结构化双源同步问题反复出现，保持单源（结构化）最稳。
3. **顺手清理 `arcSvgFlags`**——SVG-only flag 计算落进 react adapter， 回归跨平台纯数学。
4. **AI 友好性不削弱**——PathPrim/GroupPrim 是 Scene primitive 不是 IR；LLM 生成的是 `<Path>`/`<Step>` 那层，不写 PathCommand[]。

设计细节（具体决策，每条对齐跨 adapter 兼容）：

- arc / ellipseArc 角度单位 = **度**（与 IR `ArcStep.startAngle` 一致；canvas 用弧度由 adapter 内转）；方向字段 `counterClockwise` 缺省 `false`（与 SVG y-down 屏幕方向一致）。
- arc 与 ellipseArc **分开不合并**（对应 canvas `ctx.arc` vs `ctx.ellipse`，rx===ry 退化检测在 SVG adapter 内做）。
- circlePath / ellipsePath 编译为**单个 ellipseArc 全 sweep**（不拆半弧）——整圆怎么渲染留给 adapter（SVG 在需要时拆半弧避 360° 退化、canvas 直接 `ctx.ellipse`）。
- core **不**提供 `pathCommandsToSvgD`——SVG 转换全住 react adapter，避免 core 被 SVG 偏向。
- `Transform.scale.y` 缺省等比；`rotate.cx/cy` 缺省绕原点（同 SVG `rotate(deg)`）。
- 不 emit `boundsHint`——bbox 仍由 viewBox 阶段算，性能优化另开 ADR。

## 长期边界

- 其它 primitive 审计：`Rect/Ellipse/Text` 经审无字符串 leakage（TextPrim 已是结构化 `lines`）。
- `boundsHint` 等性能字段；canvas / Skia / PDF adapter 的实际实现（v1+）；IR 层 `IRStep.kind` 设计不动。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：⚠️ BREAKING（消费 Scene primitive 的 adapter 作者需同步；React/IR/LLM 端零感知、文档不改）；其余默认行为、失败语义与公开契约以正文为准。
