# ADR-01：core 注释 / `.describe()` 去 SVG-imposing 语言

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-3](./roadmap.md) · [packages/core/AGENTS.md](../../../../../../packages/core/AGENTS.md) · [core-design.md](../../../../../architecture/core-design.md)

## 背景

`packages/core/src/` 下的 JSDoc 注释与 zod `.describe()` 字符串把 SVG 当作"the renderer"来描述类型——`<ellipse>` / `<tspan>` / `stroke-dasharray` / SVG path `M/L/Q/C/A/Z` / SVG `textAnchor` 等满天飞。这违背 `packages/core/AGENTS.md` 硬约束："core 不准依赖 DOM API"——延伸到注释层，core 描述抽象 IR / primitive 时不该假定目标渲染器是 SVG。

后果：
- 误导未来 canvas / Skia / PDF adapter 作者，让他们以为 core 是 SVG 库
- `.describe()` 字符串是 LLM 工具调用契约的一部分（zod JSON Schema 导出），LLM 看到 "SVG stroke-dasharray" 会以为只能跟 SVG 配；改成中性表述让生成的 IR 更不依赖具体 renderer
- alpha.5 ADR-01 已把 `PathPrim.d: string` / `GroupPrim.transform: string` 结构化、把 `arcSvgFlags` 挪去 react adapter，core 已经在数据层面去 SVG 化；注释层也应跟上

## 选项

### A. 全量替换为渲染器中性表述（**推荐**）

按 plan TODO-3 的"替换原则"表逐一改：

| 旧（SVG-imposing） | 新（中性） |
|---|---|
| "对应 SVG `<ellipse>`" | "椭圆原语（cx/cy 圆心，rx/ry 半径）" |
| "SVG stroke-opacity" | "描边透明度 0~1" |
| "SVG stroke-dasharray 模式" | "描边 dash 模式（如 '4 2'，与 SVG/CSS `stroke-dasharray` 同格式）" |
| "SVG fill-rule" | "填充规则（nonzero / evenodd）" |
| "SVG stroke-linecap" / "SVG stroke-linejoin" | "描边端点 / 拐角形状" |
| "SVG path M / L / Z / Q / C / A" | "move（不绘） / line / close / quad Bezier / cubic Bezier / arc" |
| "`<tspan>`" | "单行 / 行级内容" |
| "SVG textAnchor" | "文字对齐锚点（start / middle / end）" |
| "SVG y-down" / "SVG y-down CW" | "screen y-down" / "y-down 屏幕坐标系" |
| "SVG marker" | "箭头 marker（renderer 端实现）" |
| "SVG viewBox 数值四元组" | "viewBox 数值四元组 `[x, y, w, h]`（与 SVG `viewBox` 同语义）" |

**保留 SVG 名字作为"格式标识"**（不是"为 SVG 准备"，而是"与该标准格式兼容"）：
- dash 模式格式（与 SVG/CSS `stroke-dasharray` 同格式）
- viewBox 数值（与 SVG `viewBox` 同语义）

### B. 现状保留 + 补一段 AGENTS.md 注释规则

只在 AGENTS.md 添"未来注释要中性"的规则，存量不动。代价：5+ 文件的存量误导继续存在；未来 canvas adapter 作者读 core 时依然被引偏。

## 决策：A

理由：
1. alpha.5 已经在数据层去 SVG 化（PathPrim.commands / GroupPrim.transforms），注释层不跟上等于 core 一半诚实、一半装样
2. `.describe()` 字符串是 LLM 工具调用契约，影响 IR 生成质量——这部分必须改
3. 工作量集中（grep 出的位置有限，且 alpha.5 TODO-5/6 重写时已自然清掉一半 SVG 注释）

## 决策细节

- ✓ **保留"与 SVG `X` 同格式"标注限定在 dash / viewBox 两处**——这两处 SVG 是格式标准的 reference（"与该标准格式兼容"），不是"为 SVG 准备"；其它一律去 SVG 词汇
- ✓ **`parseWay.ts:24` "TikZ `cycle` / SVG `Z`" 保留**——TikZ-SVG 对照语境，引用合法
- ✓ **`primitive/scene.ts:10` "不允许出现 SVG-only 或 Canvas-only 特性" 保留**——本身是正确的渲染器中性表述

## DSL 表面

无（纯注释 / `.describe()` 字符串修改，DSL 不变）。

## 测试设计

无新测试。既有 833 测试全过即守门通过——纯字符串变化不应影响任何行为。

> `.describe()` 字符串变化**会影响** zod JSON Schema 导出，但下游消费方（文档站 ZodSchema 组件、LLM tool definition）应对中性表述更友好，不视为破坏。

## 影响

- **文件**：`primitive/` 5 文件、`compile/` 2 文件、`ir/` 4 文件、`geometry/` 1 文件
- **外部 API**：无变化
- **文档站**：mdx 自己写的描述独立于 zod `.describe()`，不需要改

## 不在本 ADR 范围

- `path/path.ts` / `path/step.ts` / `compile/path.ts` 中已被 alpha.5 ADR-01 重写自然清掉的 SVG 注释——重写后这些位置已经中性
- `geometry/arc.ts` 已在 alpha.5 挪去 react adapter，不再属 core 注释范围

---

## 实现契约

### Level

`green`（仅注释 / `.describe()` 字符串变化，零行为变化）

### Schema 改动

无字段改动，仅修改 `.describe(...)` 文本。

### 文件 scope

- `packages/core/src/primitive/ellipse.ts`
- `packages/core/src/primitive/rect.ts`
- `packages/core/src/primitive/view-box.ts`
- `packages/core/src/primitive/text.ts`
- `packages/core/src/compile/node.ts`
- `packages/core/src/ir/node.ts`
- `packages/core/src/ir/path/path.ts`
- `packages/core/src/ir/path/step.ts`
- `packages/core/src/geometry/bend.ts`

**不在 scope**：
- `parseWay.ts`（TikZ-SVG 对照保留）
- `primitive/scene.ts`（已正确表述）
- `compile/path.ts` / `primitive/path.ts` / `primitive/group.ts`（alpha.5 ADR-01 重写后已中性）

### 测试象限

不适用（零行为变化）。验证手段：

- `pnpm --filter @retikz/core test:run` 既有 592 测试全过
- `pnpm --filter @retikz/core exec tsc --noEmit` / `eslint .` 全过
- React adapter / docs workspace 编译通过

### 依赖的现有元素

无。
