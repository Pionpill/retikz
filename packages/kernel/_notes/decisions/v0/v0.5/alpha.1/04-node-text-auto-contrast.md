# ADR-04：Node 文本自动对比色

- 状态：Accepted
- 决策日期：2026-07-23

## 背景

由 adapter / renderer 根据 Node fill 求 `currentColor` 会破坏 React、Vanilla、SVG、Canvas 和 SSR 一致性；Core 只能对静态不透明 fill 做确定计算，其它情况必须明确降级

## 决策

`Node.textColor` 保持字符串契约，新增保留关键字：

```ts
const NodeTextColor = { Contrast: 'contrast' } as const;
```

`contrast` 也可由 `Scope.nodeDefault.textColor` 继承；候选色固定为 `#000000` / `#ffffff`，fallback 固定为 `currentColor`。关键字不进入 IRPaint 或 Scene，Path、edge、step label 不解释它

Core 在 style cascade 后、Node content / label layout 前解析一次。优先级为显式 line / text / math fill、label textColor、labelDefault.textColor、labelDefault.color、已解析 Node textColor、currentColor。正文、缺 fill 的 styled run、继承 Node 色的 label 与未显式 stroke 的 pin 才是消费者

只解析静态 CSS color：trim ASCII whitespace，支持 named color、3/4/6/8 位 hex、legacy / modern rgb 与 hsl；不支持 `none` channel、mixed separator、`currentColor`、`var()`、system color、gradient、image、Lab/LCH 或 DOM-dependent token。effective alpha 必须严格为 1，否则 fallback

对比算法为 CSS sRGB 线性化、WCAG relative luminance `L = .2126R + .7152G + .0722B`，比较 `(L + .05) / .05` 与 `1.05 / (L + .05)`，相等选黑。无法求值时 Node 继续编译，每个 Node 发一次 `TEXT_AUTO_CONTRAST_UNRESOLVED`，warning 包含 fill / kind、原因和 `currentColor` fallback

## 兼容性与最终结果

既有 CSS color、IRPaint、Scene 和 renderer contract 不变；新增的是 Node 保留字符串值与 Core 解析语义。React / Vanilla 只透传字符串，SVG / Canvas 只消费 Core 已解析的普通颜色

## 遗留边界

不采样透明背景、DOM computed style、gradient、pattern 或 image，不开放候选色、fallback 或算法 registry，不作用于非文本 paint 或 Path / edge / step label
