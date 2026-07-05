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

## 影响

- public IR：`FontSchema.size` 从正数扩展为正数、Web preset、`em` / `rem` 字符串。
- compile options：新增 `fontSize?: number`，默认 `DEFAULT_FONT_SIZE (16)`，同时作为默认字号和解析根字号。
- compile 行为：节点文本、节点 label、path label、line / run font override 都在 compile 阶段解析到 number。
- ScenePrimitive：不新增字段；`TextPrim.fontSize` 和 `TextLine.fontSize` 仍是 number。
- renderer：无新增职责。
- breaking：现有显式数字字号行为不变；未显式写 `font.size` 的默认字号统一为 16。

## 不在范围内

- 不支持 TikZ / LaTeX 字号 preset；该能力留给上层 sugar。
- 不支持任意 CSS 长度单位，如 `px`、`pt`、`cm`、`%`、`calc(...)`。
- 不根据浏览器 computed style 解析字号。
- 不增加字号取整选项。
- 不改变字体度量模型；`measureText` 仍接收解析后的 number。

## 实现契约

### Scope

- `packages/kernel/core/src/schemas/font/constants.ts`
- `packages/kernel/core/src/schemas/font/schema.ts`
- `packages/kernel/core/src/schemas/font/types.ts`
- `packages/kernel/core/src/compile/constants.ts`
- `packages/kernel/core/src/compile/compile.ts`
- `packages/kernel/core/src/compile/orchestration/context.ts`
- `packages/kernel/core/src/compile/text/font-size.ts`
- `packages/kernel/core/src/compile/text/index.ts`
- `packages/kernel/core/src/compile/node/layout.ts`
- `packages/kernel/core/src/compile/node/content.ts`
- `packages/kernel/core/src/compile/node/label-layout.ts`
- `packages/kernel/core/src/compile/path/label.ts`
- `packages/kernel/core/tests/ir/font-size.schema.test.ts`
- `packages/kernel/core/tests/compile/font-size.test.ts`
- `apps/docs/src/modules/docs/contents/kernel/reference/schema/entity/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/schema/entity/index.en.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/compile/index.zh.mdx`
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/compile/index.en.mdx`

### Tests

- 默认字号：未写 `font.size` 时 `TextPrim.fontSize === 16`。
- Web preset：`font.size = "sm"` 默认 `fontSize = 16` -> `TextPrim.fontSize === 14`。
- `rem`：`font.size = "1.25rem"` 且 `fontSize: 20` -> `TextPrim.fontSize === 25`。
- Path label：`font.size = "lg"` -> label primitive 字号为 18。
- `em`：节点 `font.size = "lg"`，行级 `font.size = "0.5em"` -> 行字号为 9。
- Scale：preset 先解析为 number，再按现有 node scale 规则缩放。
- TeX：`lowerTex` 接收解析后的 number。
- Schema：接受 Web preset / `em` / `rem`，拒绝 TikZ preset、未知 preset 和不支持的 CSS 单位。
- Compile option：`fontSize <= 0` fail-loud。
