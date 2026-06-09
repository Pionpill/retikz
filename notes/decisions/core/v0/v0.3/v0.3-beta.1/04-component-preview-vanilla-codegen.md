# ADR-04：ComponentPreview vanilla 代码视图补齐——`stepsToWay` 逆映射对齐 `parseWay` 正向语法（零漂移），way 表达不了的走 IR fallback

- 状态：Proposed
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md) TODO-4 · **正向语法真源**：`packages/core/core/src/parsers/parseWay.ts`（`WayArcOp` / `WayCircleOp` / `WayEllipseOp` 等十二形态）· `packages/core/vanilla/src/builder/draw.ts`（`draw(way)` 内部就是 `parseWay`，与 React `<Draw way>` 同一全集）

## 背景

文档站 `ComponentPreview` 的 `irToVanillaCode` 从 demo IR 反推 `@retikz/vanilla` 命令式 builder 代码，帮用户在 React DSL / IR / vanilla 三视图间对照。它与 IR 视图同源（都吃 `buildPreviewIR`），零 per-demo 维护。

path 的 `way` 由 `stepsToWay` 从 `path.children` 反推。现状覆盖：`move` / `line` / `step`(fold) / `cycle` / `curve` / `cubic` / `bend`(direction)。其余一律降级成 `/* unsupported step: <kind> */` 注释：`arc` / `circlePath` / `ellipsePath` / `rectangle` / `generator` / `bend`(out/in angle)。v0.3 已补齐 Draw / shape 能力后，这种降级会削弱 docs demo 可信度。

## 关键区分：哪些 step 是 way 可表达的，哪些不是（codex 草案混为一谈）

`vanilla` 的 `draw(way)` 内部就是 core 的 `parseWay`，与 React `<Draw way>` 共用同一正向语法。所以「能否反推成 way」**取决于 `parseWay` 是否有对应正向算子**，不能一概而论：

| step kind | `parseWay` 有正向算子？ | 反推目标 | 处理 |
|---|---|---|---|
| `arc` | ✅ `WayArcOp` | `{ arc: { startAngle, endAngle, radius } }` | **本 ADR 补逆映射** |
| `circlePath` | ✅ `WayCircleOp` | `{ circle: { radius } }` | **本 ADR 补逆映射** |
| `ellipsePath` | ✅ `WayEllipseOp` | `{ ellipse: { radiusX, radiusY } }` | **本 ADR 补逆映射** |
| `bend`(out/in angle) | ⚠️ 部分（`bend` 算子当前只反推 direction 形态） | 评估扩 `WayBendOp` 反推 | 视成本，可后置 |
| `rectangle` | ❌ 不在 way 语法 | —— | **IR-direct fallback** |
| `generator` | ❌ 不在 way 语法 | —— | **IR-direct fallback** |

arc/circle/ellipse 是 infix 形状算子：**以上一项为圆心、不消耗下一项、不产 `to`**。所以逆映射就是在序列里插一个算子对象 frag（`stepsToWay` 现成的 per-step push 模型直接适配）。

## 决策：补 way 可表达 step 的逆映射，不可表达的给 IR-direct 而非 unsupported 洞

1. **`arc` / `circlePath` / `ellipsePath` 补逆映射**，输出形态**逐字段对齐 `parseWay` 正向算子**（上表），维持 `parseWay`(正向) ↔ `stepsToWay`(逆向) 的零漂移契约——这正是 `draw.ts` JSDoc 说的「同一解析、同一全集、零漂移」在 codegen 侧的对偶。
2. **`rectangle` / `generator` 等 way 语法外的 step**：不输出 `unsupported` 注释洞，改为可运行的 IR-direct fallback（整条 `path` 以 raw IR child 形式放进 `figure([...])`，或把该 demo 降到 IR 直喂），并附「此结构无 way sugar，请切换 IR 视图」的明确注释。不要把 raw IR step 塞进 `draw(way)`；`draw` 会进入 `parseWay`，只接受 way DSL。
3. 既有 `move`/`line`/`fold`/`cycle`/`curve`/`cubic`/`bend`(direction) 输出**不回退**。

注意 `WayFrag` 现有的 `comment` 标记机制（注释项不带尾逗号、避免稀疏数组洞）继续沿用——fallback 注释走它，别造无效数组洞。

## 影响范围

- `apps/docs/src/components/shared/component-preview/irToVanillaCode.ts`（`stepsToWay` 的 `switch`：加 `arc`/`circlePath`/`ellipsePath` case；`default`/`rectangle`/`generator` 改 IR-direct fallback；头部 JSDoc 同步覆盖清单）
- `apps/docs/tests/irToVanillaCode.test.ts`
- 视需要补少量同级 `.vanilla.ts` 手写覆盖

## 非目标

- 不要求生成最短代码。
- 不要求 100% 逆推出用户原始 JSX。
- 不把 Tier 2 composite builder 一并补齐（仍 `null /* 经 IR 直喂 */`，见 codegen 现有 ADR-02 注释）。
- 不改变运行时库 API。
- 不为补 codegen 而扩 `parseWay` 正向语法（rectangle/generator 不靠新增 way 算子来圆，走 IR fallback）。

## 测试要求

- `arc` / `circlePath` / `ellipsePath` 反推出的 way frag **能被 `parseWay` 重新解析回等价 step**（往返一致，验证零漂移）。
- `rectangle` / `generator` 输出明确、可运行的 IR fallback（raw IR child / IR direct），而非 `unsupported` 注释、稀疏数组洞，或塞进 `draw(way)` 的无效 IR step。
- 既有 `line` / `fold` / `cycle` / `curve` / `cubic` / `bend`(direction) 输出不回退。

## 文档要求

- 无需新增页面；ComponentPreview 代码视图自然体现。
- 仍不支持的冷门结构，注释要写「此结构无 vanilla way sugar，请切换 IR 视图」，而非模糊的 `unsupported`。

> 实现指针：way 算子字段名以 `parseWay.ts` 当前导出为准；上方对照表按本 ADR 落定时的 `WayArcOp`/`WayCircleOp`/`WayEllipseOp` 形态。
