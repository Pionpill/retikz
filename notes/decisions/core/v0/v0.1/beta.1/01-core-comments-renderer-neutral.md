# ADR-01：core 注释 / `.describe()` 去 SVG-imposing 语言

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-3](./roadmap.md) · [packages/core/AGENTS.md](../../../../../../packages/core/AGENTS.md) · [core-design.md](../../../../../architecture/core-design.md)

> **范围**：把 core 里 JSDoc 注释与 zod `.describe()` 字符串里"把 SVG 当作 the renderer"的措辞（`<ellipse>` / `<tspan>` / `stroke-dasharray` / SVG path `M/L/Q/C/A/Z` / SVG `textAnchor` 等）改成渲染器中性表述。纯字符串改动，DSL / 行为不变。

## 背景 / 约束

- `packages/core/AGENTS.md` 硬约束 "core 不准依赖 DOM API" 应延伸到注释层——core 描述抽象 IR / primitive 时不该假定目标渲染器是 SVG，否则误导未来 canvas / Skia / PDF adapter 作者以为 core 是 SVG 库。
- `.describe()` 字符串是 LLM 工具调用契约的一部分（zod JSON Schema 导出）——LLM 看到 "SVG stroke-dasharray" 会以为只能配 SVG；中性表述让生成的 IR 更不依赖具体 renderer。
- 数据层已在 alpha.5 去 SVG 化（`PathPrim.commands` / `GroupPrim.transforms` 结构化、`arcSvgFlags` 挪去 react adapter），注释层不跟上等于 core 一半诚实、一半装样。

## 决策：全量替换为渲染器中性表述

按"替换原则"逐一改（如 "对应 SVG `<ellipse>`" → "椭圆原语（cx/cy 圆心，rx/ry 半径）"、"SVG path M/L/Z" → "move（不绘）/ line / close"、"SVG textAnchor" → "文字对齐锚点 start / middle / end"、"SVG y-down" → "screen y-down"）。

被否决的备选：仅在 AGENTS.md 补"未来注释要中性"的规则、存量不动——5+ 文件的存量误导继续存在，未来 adapter 作者读 core 仍被引偏。

### 决策细节（字面即决策，故记下）

- **保留 SVG 名作为"格式标识"** 限定在 dash 模式与 viewBox 两处——这两处 SVG 是格式标准的 reference（"与 SVG/CSS `stroke-dasharray` / `viewBox` 同格式"，即"与该标准格式兼容"），不是"为 SVG 准备"；其它一律去 SVG 词汇。
- **`parseWay` 的 "TikZ `cycle` / SVG `Z`" 保留**——TikZ-SVG 对照语境，引用合法。
- **`primitive/scene.ts` 的 "不允许出现 SVG-only 或 Canvas-only 特性" 保留**——本身就是正确的渲染器中性表述。

## 不在本 ADR 范围

- `path/path.ts` / `path/step.ts` / `compile/path.ts` 中已被 alpha.5 ADR-01 重写自然清掉 SVG 注释的位置。
- `geometry/arc.ts`（已在 alpha.5 挪去 react adapter，不再属 core 注释范围）。

---

> **实现指针**：level `green`、非 breaking（仅 `.describe()` / JSDoc 文本，零行为变化；`.describe()` 变化会影响 zod JSON Schema 导出，下游对中性表述更友好，不视为破坏）。改动落 `core/src` 的 `primitive/` / `compile/` / `ir/` / `geometry/` 中带 SVG 措辞的 `.describe()` 与 JSDoc。真源以代码为准。验证手段：既有测试全过 + `tsc --noEmit` / `eslint` 全过。完整原文（替换原则表 / 文件 scope）见本文件 git 历史。

> 🔖 封板压缩 commit `ea674f3f`；压缩前完整施工蓝图 = `git show ea674f3f^:notes/decisions/core/v0/v0.1/beta.1/01-core-comments-renderer-neutral.md`。
