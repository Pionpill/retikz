# ADR-01：`openStealth` 空心箭头——补齐默认箭头的实心/空心对称 + SVG/Canvas marker parity

- 状态：Proposed
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md) TODO-1 · **几何契约前置**：[v0.2-alpha.8 ADR-01 arrow 定义](../../v0.2/v0.2-alpha.8/01-arrow-definition.md)（`ArrowDefinition` / `BUILTIN_ARROWS` / `hollow` + `lineContactX` 静态 base 范式）· [v0.1-alpha.5 ADR-03 arrow detail](../../v0.1/v0.1-alpha.5/03-path-arrow-detail.md)（`fill` 在空心 shape 上 silent no-op）

## 背景

内置箭头注册表 `BUILTIN_ARROWS` 有 7 项：`normal` / `open` / `stealth` / `diamond` / `openDiamond` / `circle` / `openCircle`。`HOLLOW_ARROW_SHAPES` 集合只含 `open` / `openDiamond` / `openCircle`。

对称性缺口：三角（`normal`↔`open`）、菱形（`diamond`↔`openDiamond`）、圆（`circle`↔`openCircle`）都成对存在实心/空心，唯独**默认且最常用的 `stealth`（`DEFAULT_ARROW_SHAPE`）只有实心**。用户在文档站调箭头视觉时会自然预期一个 `openStealth`。

`stealth` 的几何是带凹口的四点风筝：`filledPath([[0,0],[10,5],[0,10],[3,5]])`、`lineContactX=3`（实心里唯一非 0 的接触点，因为有凹口）。

## 这条与 roadmap「不新增公开字段集」约束的对账（必须先定性）

beta.1 roadmap 写「**不开新功能 ADR，不新增 IR 形态或公开字段集**」，同时允许「修复、**parity**、文档/demo、public API 收口」。加 `openStealth` 会触及：

- `ARROW_SHAPES` const（新增一个枚举值）→ 派生 `ArrowShape` / `BuiltinArrowName` 联合
- `BUILTIN_ARROWS` Record（新增一项）
- `HOLLOW_ARROW_SHAPES` Set（新增一项）
- `arrow.ts` schema 里**两处英文 `.describe()` 枚举**（见影响范围）

定性结论：这是 **parity 补齐**，不是新 IR 形态——它**不新增 IR 字段、不改 `ArrowEndDetailSchema` 字段集、不改判别结构**，只是把已有「实心/空心成对」模式补到默认 shape 上。`shape` 字段本就是开放字符串（`ArrowShapeName = BuiltinArrowName | (string & {})`），第三方早能注册任意箭头名；内置补一个对称项不扩张「能力面」，只填补「内置覆盖面」。故归 beta.1 合法（parity 类）。**但 ADR 必须显式记下这次动了内置枚举，避免被当成「零公开面变更」。**

## 决策：新增内置 `openStealth`，几何 = 空心化的 stealth 风筝

命名取 `openStealth`，与 `openDiamond` / `openCircle` 的 `open*` 模式一致：

```tsx
<Path arrow="->" arrowDetail={{ shape: 'openStealth' }}>
  <Step kind="move" to={[0, 0]} />
  <Step kind="line" to={[80, 0]} />
</Path>
```

候选几何（对照 `open` 对 `normal` 的空心化手法——外轮廓内缩到 margin 1、tip 落 x=9）：

```ts
openStealth: {
  hollow: true,
  lineContactX: 3,   // 候选 base：先按 stealth 凹口接触点落定；framework 再减 lineWidth/2 得实际 refX/shrink
  tipX: 9,
  emit: ctx => [hollowPath(ctx, [[1, 1], [9, 5], [1, 9], [3, 5]], 'miter')],
},
```

要点：

- 走 `hollowPath`：无 `fill`、描边走 `ctx.stroke` / `ctx.lineWidth`（`contextStroke` 由 adapter 映射），与其余空心 def 同构。
- `strokeLinejoin` 取 `'miter'`（保 stealth 尖锐倒钩感），区别于 `openDiamond` 的 `'round'`。
- 凹口点 `[3,5]`：施工时按视觉校准——外轮廓内缩后凹口若过深会让描边自交/塌陷，必要时把凹口 x 略推（如 `[3.5,5]`）。
- `lineContactX` 不直接套 `open` 的 base 值。`stealth` 的线接触点语义来自凹口，空心化后仍优先让 path 端点停在凹口接触区，避免中线穿过 hollow 轮廓；若视觉 golden 证明 `3` 过深，再微调凹口点 / contactX，但不能只用 `open` 的尾边值蒙混。
- `tipX` 套 `open` 的 `9`；framework 对 `hollow:true` 统一减 `lineWidth/2`，无需在 def 里特殊处理。
- 默认 `stealth` 行为、几何、shrink 一律不动。

## 影响范围

- `packages/core/core/src/ir/path/arrow.ts`
  - `ARROW_SHAPES` 加 `openStealth`
  - `HOLLOW_ARROW_SHAPES` 加 `openStealth`
  - **`shape` 字段 `.describe()`**：`built-in 7 (...)` → 8 名，补 `openStealth`
  - **`fill` 字段 `.describe()`**：空心列举 `(open / openDiamond / openCircle)` → 加 `openStealth`
- `packages/core/core/src/arrows/index.ts`
  - `BUILTIN_ARROWS` 加 `openStealth` 注册项
  - 头部 JSDoc「内置 7」表述同步（JSDoc 是中文、不引 ADR——只更新数量与几何描述）
- `packages/core/core/tests/arrows/builtin-registry*.test.ts`（注册键数 7→8、几何 golden）
- `packages/core/core/tests/compile/path-arrow-detail*.test.ts`（fill no-op、color→stroke、refX/shrink）
- `packages/core/render/tests/*`（SVG/Canvas marker parity，视实现补）
- `apps/docs/src/contents/core/components/draw/arrow/*`（demo + API 表）
- `apps/docs/src/contents/core/reference/schema/path/*`、`extending/custom-arrow/*`（若文中硬列了 7 名清单）

## 非目标

- 不引入 `fill="none"` 之类的「空心开关」——空心仍是独立注册的 shape，与现有模型一致。
- 不改 `stealth` / `open` / `normal` 任何既有几何或 shrink。
- 不重做 arrow naming 体系。
- 不新增 `ArrowEndDetailSchema` 字段。

## 测试要求

- `BUILTIN_ARROWS` / 注册键含 `openStealth`，注册数 8，几何 golden 落定。
- `HOLLOW_ARROW_SHAPES` 含 `openStealth`。
- `openStealth` 上 `fill` silent no-op（被丢），`color` 进 marker stroke。
- `lineWidth` 影响 refX / shrink 接触点，与最终落定的 `lineContactX` base 几何一致。
- SVG 与 Canvas 各至少一条可见 parity 覆盖，或通过共享 Scene marker 几何测试证明两端 marker primitive 一致；golden 必须覆盖“hollow stealth 不露路径中线穿过凹口”。
- `shape` / `fill` 两处 `.describe()` 枚举更新（schema 文案测试若有，同步）。

## 文档要求

- Arrow 组件页 demo 展示 `stealth` 实心 / `openStealth` 空心对照。
- 同一 demo 覆盖 SVG / Canvas renderer 视图，作为 beta.1 parity demo。
- API / 形状清单表加 `openStealth`（含「空心，`fill` 无效、`color` 主导描边、`lineWidth` 控描边粗」说明）。

> 实现指针：最终 schema / 类型 / 几何以代码为准；上方 `emit` 数值为推荐起点，施工时按视觉与 shrink 接触点校准。
