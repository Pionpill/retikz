# ADR-07: Font Size Presets And Relative Units

- 状态：Accepted
- 决策日期：2026-07-06

## 背景

只有用户单位数字的 `FontSchema.size` 缺少稳定的 authoring preset 和相对字号表达；同时 SSR / Node 不能依赖浏览器 CSSOM，字号解析必须是 compile 阶段纯函数

## 决策

`FontSchema.size` 支持数字、Web preset 和 `em` / `rem`：

```ts
type FontSizePreset =
  | '2xs'
  | 'xs'
  | 'sm'
  | 'base'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | '7xl'
  | '8xl'
  | '9xl';

type RelativeFontSize = `${number}em` | `${number}rem`;
type IRFontSize = number | FontSizePreset | RelativeFontSize;
```

`CompileOptions.fontSize` 是默认字号、Web preset 基准和 `rem` 根字号，默认 `16`。数字保持用户单位；preset 按固定 Web 比例乘基准；`rem` 乘基准；`em` 乘当前继承字号；结果允许小数并继续受最终 precision 约束

Core 只接受上述 Web 友好的底层词汇。TikZ / LaTeX 的 `small`、`Large` 等由 adapter、parser 或 sugar 映射为 preset 或数字，不进入 Core schema

## 行为、失败语义与兼容性

缺省值、数字和继承字号保持确定性；不支持的 CSS 单位、浏览器 computed style、任意 CSS expression 和字号取整由 schema / compile fail-loud。`measureText` 继续接收解析后的 number，Scene 与 renderer contract 不变

## 最终结果与遗留边界

Core 提供确定性的 preset、`em`、`rem` 解析并保持跨 SSR / SVG / Canvas 一致。字体度量、字体族映射和 LaTeX authoring 语法仍由对应 adapter / TeX owner 负责
