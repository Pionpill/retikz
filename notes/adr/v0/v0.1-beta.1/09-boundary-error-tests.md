# ADR-09：边界 / error path 测试补完

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-15](../../../plans/v0/v0.1-beta.1.md)

## 背景

3-agent 全仓审查后发现若干**边界 / error path 测试守门缺口**。模块本身实现可能没问题（既有 happy path 测试通过），但**极端输入 / 错误路径 / 契约边界**缺测——重构或加新功能时可能静默引入回归。

具体缺口：

| 模块 | 缺测场景 |
|---|---|
| `parseWay` `WayCircleOp` / `WayEllipseOp` | way[0] 是 circle/ellipse 算子是否降级 / 抛错？负 radius？arc `startAngle === endAngle`？ |
| `view-box` `computeViewBox` | NaN / Infinity 坐标输入行为未规约（IR 含 polar 极端值可触发） |
| `fallbackMeasurer` | `size=0` / 负 size / NaN size / 多 codepoint emoji 文本（length 与 codepoint 不一致） |
| `buildPathD` / `buildTransform` (`packages/react/src/render/`) | default → throw 只测了 `{ kind: 'unknown' }` 单条，throw message 未验证包含 kind 名（错误消息契约） |
| `<Tikz>` `arrowMarkerPrefix` | 多 `<Tikz>` 实例下相同 arrow spec 是否产出不同 marker id（避免 SVG defs 冲突）e2e 缺 |
| `browser-measurer` | 模块级 canvas/ctx 单例（同次会话二次调用复用 canvas、不重复 `createElement`）未测 |

## 选项

### A. 按上述 6 条各加 1~3 个测试用例（**推荐**）

目标补 10~15 个 case，分散到对应单测文件：

1. `packages/core/tests/parsers/parseWay-shape-errors.test.ts`（新建）—— 形状算子边界 3-5 case
2. `packages/core/tests/primitive/view-box-extremes.test.ts`（新建）—— NaN / Infinity 2-3 case
3. `packages/core/tests/compile/text-metrics-extremes.test.ts`（新建）—— fallbackMeasurer 4 case
4. `packages/react/tests/render/path-d-builder-errors.test.tsx`（修改）—— throw message 契约 2 case
5. `packages/react/tests/render/transform-builder-errors.test.tsx`（修改）—— 同上 2 case
6. `packages/react/tests/kernel/Tikz-multi-instance.test.tsx`（新建）—— marker id 多实例隔离 2 case
7. `packages/react/tests/render/browser-measurer-cache.test.ts`（新建）—— canvas 单例 1-2 case

### B. 合并到既有测试文件

降低文件数，但单文件会涨；新建 7 个小文件每个 ~30-80 行更易 review。

## 决策：A

理由：
1. 6 类缺口属不同模块，新建文件归口清晰
2. 单文件 30-80 行（每文件 1-5 case）保持可读
3. 后续 alpha.6 / beta.2 加新边界测试可继续追加，命名 pattern 一致

## 待决策点

- **NaN / Infinity 输入行为**：明确规约——`computeViewBox` 对 NaN / Infinity 输入是**抛错**还是**过滤丢弃 + warn**？建议**过滤 + warn**（与 ADR-08 onWarn 配合，新加 code `'BBOX_EXTREME_INPUT'`）
- **`fallbackMeasurer(size=0)`**：建议**返回 `width: 0, height: 0`**（与 `string=""` 一致）；负 size / NaN size 抛错
- **`buildPathD` throw message 契约**：建议 message 必须含 kind 字面量字符串（如 `"Unknown PathCommand kind: '<kind>'"`）—— 让用户能从 message 反推哪个 kind 没处理
- **多 `<Tikz>` marker id 隔离 e2e**：使用 React Testing Library 渲染两个 `<Tikz>` 实例，断言 `<marker id>` 在两实例下不同前缀
- **`browser-measurer` 单例测试**：mock `document.createElement('canvas')` 看连续调用次数；要求第二次调用不再 createElement

## DSL 表面

无变化（仅补测）。

## 测试设计

详见"选项 A"段 7 个测试文件 + 10-15 case。

## 影响

- **测试数**：~12-15 个新测试
- **可能暴露既有 bug**：若 NaN / Infinity 没被既有实现处理 → 本 ADR scope 扩展到修实现（与 ADR-08 onWarn 配合）
- **公开 API**：无（纯补测）
- **运行时**：无

## 不在本 ADR 范围

- 性能 benchmark 测试（如 100 step path compile 耗时）—— 留 ADR-05 拆 compile/path 时一并加
- E2E 集成测试（headless browser 跑真实 SVG 输出）—— v0.2+ 考虑
- 视觉回归测试（screenshot diff）—— v0.2+

---

## 实现契约

### Level

`green`（仅测试文件 + 可能的 onWarn code 扩展 / fallbackMeasurer 微调；零公开 API 变化）

### Schema 改动

无 zod schema 改动。

### 文件 scope

- `packages/core/tests/parsers/parseWay-shape-errors.test.ts`（新建）
- `packages/core/tests/primitive/view-box-extremes.test.ts`（新建）
- `packages/core/tests/compile/text-metrics-extremes.test.ts`（新建）
- `packages/react/tests/render/path-d-builder-errors.test.tsx`（新建或扩展既有）
- `packages/react/tests/render/transform-builder-errors.test.tsx`（新建或扩展既有）
- `packages/react/tests/kernel/Tikz-multi-instance.test.tsx`（新建）
- `packages/react/tests/render/browser-measurer-cache.test.ts`（新建）
- **可能**：`packages/core/src/primitive/view-box.ts`（如 NaN / Infinity 处理需补）
- **可能**：`packages/core/src/compile/text-metrics.ts`（如 size=0 / 负 size 处理需补）
- **可能**：`packages/react/src/render/path-d-builder.ts` / `transform-builder.ts`（throw message 含 kind）

### 测试象限

每个测试文件按本身性质分布：

**parseWay-shape-errors（≥ 3）**：
- way[0] 是 circle 算子 → 抛错 or 降级行为
- 负 radius → 抛错
- arc startAngle === endAngle → 边界处理

**view-box-extremes（≥ 2）**：
- 输入含 NaN → 过滤 + warn
- 输入含 Infinity → 过滤 + warn

**text-metrics-extremes（≥ 3）**：
- size=0 → width/height 0
- 负 size → 抛错
- emoji 多 codepoint → length != codepoint count 的正确处理

**path-d-builder-errors / transform-builder-errors（各 ≥ 2）**：
- 未知 kind → throw
- throw message 含 kind 字面量字符串

**Tikz-multi-instance（≥ 2）**：
- 两实例同 spec → 两个 marker id 不同前缀
- 两实例不同 spec → 各自独立 marker 不冲突

**browser-measurer-cache（≥ 1）**：
- 连续调用 → createElement 仅 1 次

### 依赖的现有元素

- `parseWay` / `view-box` / `text-metrics` / `path-d-builder` / `transform-builder` / `Tikz` / `browser-measurer` —— **引用**（被测对象）
- ADR-08 `CompileOptions.onWarn` —— **引用**（NaN / Infinity 过滤 + warn 时使用，**先做 ADR-08 再做本 ADR**）
