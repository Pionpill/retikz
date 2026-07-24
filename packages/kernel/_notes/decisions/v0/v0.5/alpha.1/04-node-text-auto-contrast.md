# ADR-04：Node 文本自动对比色

- 状态：Proposed
- 决策日期：2026-07-23
- 关联：[alpha.1 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

> Architecture Gate 第 2 轮 PASS；人工实现授权已于 2026-07-23 获得。

## 背景

`currentColor` 不根据 Node fill 保证可读性，而由 adapter / renderer 求值会破坏 React / Vanilla、SVG / Canvas 与 SSR 的一致性。Core 又无法解析动态背景，因此本能力只处理静态不透明 fill，其余情况确定降级。

## 决策

### IR 与 API

`Node.textColor` 保持字符串契约，不新增策略对象：

```ts
export const NodeTextColor = {
  Contrast: 'contrast',
} as const;

<Node textColor={NodeTextColor.Contrast} />
```

- `'contrast'` 是 Node 宿主保留关键字；由 NodeSchema 派生的 `Scope.nodeDefault.textColor` 同样接受
- React / Vanilla 直接透传该字符串；缺省与其它 CSS color 字符串语义不变
- 固定候选色为 `#000000` / `#ffffff`，固定 fallback 为 `currentColor`
- 关键字不进入 PaintSpec 或 Scene；Path / edge / step label 不解释该语义

### 解析时机、消费者与优先级

Core 在 style cascade 后、Node content / label layout 前按每个 Node 解析一次关键字。颜色优先级保持：

1. line / text / math run 显式 `fill`
2. label `textColor`
3. `labelDefault.textColor`
4. `labelDefault.color`
5. 已解析的 Node `textColor`
6. `currentColor`

`nodeDefault.textColor` 不在 Scope 层预计算；`resetStyle` 保持现有通道语义。正文字符串、缺 `fill` 的 StyledLine / run，以及最终继承 Node 色的 label 正文或未显式 `stroke` 的 pin 算消费者。无正文 / label，或正文、label、pin 全部显式着色时，不解析也不 warning。

### 静态颜色与算法

内部 parser 冻结为：

- 只 trim ASCII whitespace（TAB / LF / FF / CR / SPACE），标识符与单位 ASCII case-insensitive
- number grammar 为 `[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?`；percentage 紧跟 `%`，angle 可紧跟 `deg` / `rad` / `grad` / `turn`
- 支持 `transparent`、CSS Color 4 named colors、3/4/6/8 位 hex
- legacy `rgb[a]()` / `hsl[a]()` 用 comma 且禁 slash；modern `rgb()` / `hsl()` 用 ASCII whitespace 和可选 `/ alpha` 且禁 comma
- RGB 三通道须全 number（0..255）或全 percentage；HSL 的 S/L 必须 percentage，H 支持上述角度单位；finite 后 clamp
- HSL 转 sRGB 使用 `C = (1 - |2L - 1|)S`、`X = C(1 - |(H / 60 mod 2) - 1|)`、`m = L - C / 2` 与六区间通道排列
- 不支持 `none` 通道、NaN / Infinity、混合单位 / separator、尾随 token、`currentColor`、`var()`、system color、`color()`、Lab/LCH/OKLab/OKLCH、relative color 或 DOM-dependent token

对比算法固定为：

1. 解析 cascade 后的 fill，并计算颜色 alpha × `fillOpacity`；`node.opacity` 不参与
2. 只有 effective alpha `=== 1` 才继续；透明 / 缺省 fill、`none`、PaintSpec 或动态 / 非法字符串走 fallback
3. 线性化通道：`c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4`
4. 相对明度：`L = 0.2126R + 0.7152G + 0.0722B`
5. 比较未 round 的 `(L + 0.05) / 0.05` 与 `1.05 / (L + 0.05)`；相等选黑

无法求值时 Node 继续编译，并按 Node 发一次 `TEXT_AUTO_CONTRAST_UNRESOLVED`。warning path 固定为当前 Node locator，message 包含 fill 值 / kind、原因与 `currentColor` fallback。render 只消费 Scene 中已解析的普通颜色。

## DSL

```tsx
import { NodeTextColor } from '@retikz/core';

<Node fill="#1e293b" textColor={NodeTextColor.Contrast}>
  Status
</Node>;
```

## 被否决的方案

- 参数对象：为少量透明背景配置扩大 `textColor` 类型，并向 React / Plot 等下游传播 string/object union
- 从 renderer / DOM 求 computed style，或估算 gradient / image：缺少确定、后端中立的真源
- 独立 backdrop / fallback 字段或 definition registry：比固定关键字复杂，且本轮无需扩展分派

## 公开影响与兼容性

新增 `NodeTextColor.Contrast` 常量并保留字符串 IR；既有 CSS color、Scene、PaintSpec 与 renderer 契约不变。透明背景不猜测 backdrop，固定 warning + `currentColor`。

## 测试设计

ignored 矩阵：`notes/plans/kernel-v0.5-alpha.1-scope/TEST_CONTRACT_ADR_04.md`。覆盖关键字 / JSON round-trip、对象拒绝、静态颜色 grammar、透明边界、WCAG tie-break、级联 / 显式覆盖、消费者判定、warning / locator、React / Vanilla parity 与 SVG / Canvas 同源消费。

## 绘图完备性检查

- 能力域 / 面：Drawing；Style / Resource、Primitive / Scene
- 主责：Core Node schema vocabulary、style 后求值和 warning；adapter 只透传，render 只消费
- 表达：扩展 Node textColor 的保留字符串语义，不修改 PaintSpec / resource registry，不建 definition
- 闭环：正文、mixed / TeX、继承 label / pin 在 emit 前得到普通颜色；结论为扩展当前 Core Node text style 域

## 不在范围

透明背景合成、动态背景采样、DOM computed style、图片 / gradient 分析、自定义候选色 / fallback / 算法、非文本 paint 及 Path / edge / step label 自动对比。

## 实现契约

- Level：`red`
- Schema：`schemas/node/constants.ts` 新增 `NodeTextColor.Contrast`；`NodeSchema.textColor` 仍为 `CssColorSchema`，types 派生 `NodeTextColorValue`
- 文件 scope：
  - Core：上述 schema vocabulary；`compile/node/text-color/{constants,types,parse,resolve,index}.ts`；`compile/orchestration/traversal.ts`、warning constants
  - React：`kernel/components/Node.tsx` JSDoc 与 Node / Scope default round-trip tests
  - Vanilla / render：无产品源码改动，只补 parity / contract tests
  - Docs：Node overview、schema entity、runtime warning 的 zh / en 与 demo
- 测试契约矩阵：`notes/plans/kernel-v0.5-alpha.1-scope/TEST_CONTRACT_ADR_04.md`
- 依赖：现有 style cascade、IRPaintSpec / effective fill、text run / label 颜色优先级、Scene TextPrim / PathPrim、compile warning locator
