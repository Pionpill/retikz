# ADR-01: Font Size Presets And Relative Units

- 状态：Accepted
- 决策日期：2026-07-06
- 关联：[v0.4 roadmap](../roadmap.md) / [alpha.8 roadmap](../alpha.8/roadmap.md)

## 背景

`FontSchema.size` 原本只接受正数，语义是用户单位。它足够底层，但 authoring 体验偏硬：用户需要记具体字号，无法直接写 Web 常见的 `sm` / `lg`，也无法用 `em` / `rem` 表达相对字号。

TikZ / LaTeX 风格的 `small` / `Large` 也很常见，但它更像 React / Vanilla adapter 的 authoring sugar。core IR 应保持一个稳定、Web 友好的底层契约，不同时承载两套相近但不等价的命名体系。

SSR / Node 环境没有浏览器 CSSOM，不能依赖真实 DOM 解析 `em` / `rem`。字号解析必须是 compile 阶段的纯函数：相同 IR + 相同 compile options 得到相同的 number。

## 决策

`FontSchema.size` 扩展为：

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

`CompileOptions` 新增 `fontSize?: number`，默认 `DEFAULT_FONT_SIZE (16)`，同时作为默认字号、Web preset 和 `rem` 的根字号。

解析规则：

- 缺省：使用 `CompileOptions.fontSize`。
- `number`：保持现有语义，直接作为用户单位使用。
- Web preset：按 Web/Tailwind 常见比例乘以 `fontSize`。
- `rem`：乘以 `fontSize`。
- `em`：乘以当前继承字号。
- 输出允许小数，不单独取整；最终 Scene 输出继续走现有 `precision`。

TikZ / LaTeX 风格字号不进入 core schema。上层包如需支持 `small` / `Large`，应在 adapter / parser / sugar 层映射成 core 支持的 Web preset 或具体 number。

## 字号表

默认 `fontSize = 16`。

| Web preset | 比例 | 默认值 |
| --- | ---: | ---: |
| `2xs` | `0.625rem` | `10` |
| `xs` | `0.75rem` | `12` |
| `sm` | `0.875rem` | `14` |
| `base` | `1rem` | `16` |
| `lg` | `1.125rem` | `18` |
| `xl` | `1.25rem` | `20` |
| `2xl` | `1.5rem` | `24` |
| `3xl` | `1.875rem` | `30` |
| `4xl` | `2.25rem` | `36` |
| `5xl` | `3rem` | `48` |
| `6xl` | `3.75rem` | `60` |
| `7xl` | `4.5rem` | `72` |
| `8xl` | `6rem` | `96` |
| `9xl` | `8rem` | `128` |

## API 示例

```ts
compileToScene(ir, {
  fontSize: 16,
});
```

```ts
{
  type: 'node',
  text: 'Hello',
  font: { size: 'lg' },
}
```

```ts
{
  type: 'node',
  text: 'Relative',
  font: { size: '1.25rem' },
}
```

## 不在范围内

- 不支持 TikZ / LaTeX 字号 preset；该能力留给上层 sugar。
- 不支持任意 CSS 长度单位，如 `px`、`pt`、`cm`、`%`、`calc(...)`。
- 不根据浏览器 computed style 解析字号。
- 不增加字号取整选项。
- 不改变字体度量模型；`measureText` 仍接收解析后的 number。
---

> **实现指针**：本 ADR 已随 kernel v0.4-alpha.9 Accepted 落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在历史中。

> 🔖 压缩前完整施工蓝图 = `git show 5541ecd1dc26981b369839c162f3e61b17c0b0f4:packages/kernel/_notes/decisions/v0/v0.4/alpha.9/01-font-size-presets-and-relative-units.md`。
