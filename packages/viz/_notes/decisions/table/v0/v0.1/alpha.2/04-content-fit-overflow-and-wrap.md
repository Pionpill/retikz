# ADR-04：Cell content fit、overflow、clip 与 wrap

- 状态：Accepted
- 决策日期：2026-07-23
- 收口日期：2026-07-27
- 关联：[alpha.2 roadmap](./roadmap.md) · [Cell box 与 span](./03-cell-box-span-and-alignment.md) · [layout lowering 与 manifest](./06-layout-lowering-manifest-and-migration.md)

## 背景

轨道和 Cell box 确定后，内容仍可能比 content box 大。Table 需要区分会改变 row contribution 的 reflow 与只改变最终放置的 fit / overflow，否则同一内容会在测量、求解与 replay 阶段得到互相矛盾的几何。

这些策略必须适用于任意 Core / Tier 2 child，而不是只为文本、DOM 或某个 renderer 建立特判。

## 决策

`IRTableCellLayout` 增加：

- `wrap?: boolean`，默认 `false`
- `fit?: 'none' | 'contain' | 'cover' | 'stretch'`，默认 `none`
- `overflow?: 'visible' | 'clip'`，默认 `visible`

normalize 后三项都成为 `ResolvedTableCellLayout` 的必填字段。schema 保持 strict、JSON-safe；未知策略 fail-loud。

### wrap 选择 layout result

所有 Cell 先用 `NaturalLayoutProposal` 执行 natural probe，以结果的 allocation width 参与 column contribution。columns 与 content-box width 确定后：

- `wrap: false` 继续使用 natural probe result
- `wrap: true` 用 `x: range(0, contentBox.width)` 与 `y: intrinsic(natural)` 执行一次 probe

被选中的 result 同时提供 row contribution、最终 replay、allocation bounds、visual bounds 与 nested artifacts；不得用 range-proposal bounds 配 natural replay，也不得再次 compile 内容。`range.max = 0` 是合法 proposal。

wrap 是通用 x 轴 range proposal probe 请求。文本 Node 是否换行由 Core measurer 与 Node 合同决定；Table 不识别 Node、文本或 composite kind。

### fit 与 alignment

fit 在选定 replay root 外层施加 finite numeric scale，再按 ADR-03 用缩放后的 allocation bounds 对齐 content box：

- `none`：两轴 scale 为 `1`
- `contain`：保持比例，完整放入 content box
- `cover`：保持比例，覆盖 content box
- `stretch`：两轴分别缩放到 content box

source 或 target 出现非法 bounds、非有限 scale 或除零歧义时 fail-loud。零尺寸内容采用确定规则，不产生 `NaN` / `Infinity`。fit 不回写轨道 solver，也不改变 source layout result。

### overflow

`visible` 保留 fit / alignment 后超出 content box 的可见范围；`clip` 在 replay root 的 fit 与 translation 外层增加 Table-local矩形 clip。clip 影响 visible geometry 与 manifest，不改变 allocation、轨道或 Cell box。

`visualOverflowBounds` 是 fit、alignment、clip 后的 Table-local可见范围；它不是 Core `visualBounds` 的重命名，也不参与自然尺寸 contribution。

## 不采用的方案

- 不用文字测量或 CSS overflow 实现 wrap：会绕开 Core 与 renderer-agnostic contract
- 不在 fit 后重跑轨道 solver：fit 是最终放置策略，不是自然尺寸贡献
- 不只裁剪 Scene 结果而丢弃 replay：会让 artifacts、id、meta 与实际渲染分离
- 不把 `visible` 当作缺省错误恢复；未知值必须拒绝

## 公开影响与兼容性

- `IRTableCellLayout`、detail header/body layout、React markers 与 Vanilla plain input 共享同一 wrap/fit/overflow contract
- `contain` / `cover` 保持比例，`stretch` 允许非等比缩放；这些 scale 只作用于 Cell replay root
- clip、fit 与 alignment 进入 manifest 的 content allocation / visual overflow 几何
- 不新增 Table 专用文字 API、renderer 分支或函数型 IR

## 最终结果
实现由 `layout/content.ts`、`layout/fit.ts` 与 `layout/transaction.ts` 组合 Core layout-aware replay。选中的 range-proposal result 只发布一次 nested artifact，丢弃的 natural probe 不进入最终 output。

正式测试覆盖 contain / cover / stretch、非零/负 source bounds、零尺寸、clip、visible overflow、未知策略、非有限 scale、wrap range-proposal replay 与 nested artifact 同源。关键证据位于 `tests/layout/content-policy.test.ts` 与 `tests/pipeline/layout-transaction.test.ts`。

有限高度 reflow、多行 fragmentation、hyphenation 与 renderer-specific text shaping 不在 alpha.2 范围；它们必须继续由 Core 或更高层显式能力承载。
