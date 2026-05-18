---
name: docs-doc-component
description: retikz 组件类文档（apps/docs/src/contents/<module>/components/**/*.mdx）的页面结构规范——5 段固定顺序（Usage / Composition / Examples / API Reference / Related）、Examples 子节多 demo 时的主题分组、Usage 的双代码块写法、Composition 适用的组件类型。本 skill 只覆盖组件页特有规则；通用规则（三处协同、双语、写作风格、Comparison、自绘图示、宽度、阅读时间、ZodSchema 等）见 docs-doc-principle。retikz 专用。
---

# 组件类文档写法

## 何时用本 skill

- 在 `apps/docs/src/contents/<module>/components/**` 下加 / 改组件页
- 即将动手前**必须先读** [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿通用规则

本 skill 只覆盖**组件页特有**的 5 段结构与子节写法；其它一切（三处协同、双语、写作风格、Comparison、自绘图示、宽度、阅读时间、ZodSchema、Common Mistakes 等）以 principle 为准。

## 文档结构（5 段固定）

参考：<https://ui.shadcn.com/docs/components/spinner>（简单）/ <https://ui.shadcn.com/docs/components/radix/alert-dialog#usage>（复杂）

字典类组件页固定为 5 类 section，**按下面顺序**出现；`Composition` / `Related` 可选，其余不要新增散乱顶级章节。需要额外内容时优先并入 `Examples` 子节、`API Reference` 说明或拆子页。

| section | 必需 | 内容 |
| --- | --- | --- |
| `## 用法 / Usage` | ✅ | 两个**纯代码块**（不放 `<ComponentPreview>`）：`import` + 一个最小 JSX 骨架 |
| `## 组合 / Composition` | 可选 | 仅 compound 组件需要——展示组件之间的父子关系 |
| `## 例子 / Examples` | ✅ | 页面主体；多子节，每子节围绕一个能力点，通常一句说明 + 一个 `<ComponentPreview>` |
| `## API 参考 / API Reference` | ✅ | 4 列表（`属性 / 类型 / 默认值 / 描述` / `Prop / Type / Default / Description`），无默认填 `—`，属性名 + 类型用反引号包；多组件合一页时按组件分子节 |
| `## 相关 / Related` | 可选 | 只放相关组件、概念、Reference、Guide 链接；不承载长解释 |

frontmatter `title` + `description` 始终在；H1 由 DocPage 渲染，正文**不要**再写 `# 标题`。zh 用中文小节标题、en 用英文，但层级、子节数、表格列数保持对齐。

## Usage 写法

shadcn 同款，import 与最小骨架分两个代码块（**只显示代码，不放 ComponentPreview**）：

````mdx
## 用法

```tsx
import { Path, Step } from '@retikz/react';
```

```tsx
<Path stroke="currentColor">
  <Step kind="move" to="a" />
  <Step kind="line" to="b" />
</Path>
```
````

骨架展示组件名 / props / children 形态，不要求可运行——`<ComponentPreview>` 留给 Examples 段。

## Composition 适用

| 组件 | 是否写 Composition |
| --- | --- |
| `<Tikz>` | ✅ 容器，children 是 Kernel/Sugar |
| `<Path>` | ✅ 必须配 `<Step>` 子节点 |
| `<Node>` `<Draw>` | ❌ 单组件 |
| `<Step>` | ❌ 只作 `<Path>` 子节点；写在父组件页里 |

## Examples 分组

Examples 里的示例较多时，必须先抽象主题，再在主题下细分具体能力，避免一长串并列 `###` 把页面变成 demo 清单。

规则：

- 同类示例 ≥ 3 个时，先合并成主题组。例如 `<Draw>` 的弧线、二次贝塞尔、三次贝塞尔可统一放进"曲线"主题，再在主题下细分
- 样式类示例统一归入"样式 / Style"主题，不要把 stroke、fill、dash、opacity、font 等每个样式字段都单独提成同级小节
- 主题组用 `###`，组内具体示例用 `####`；如果该页示例较少，可直接用 `###`
- 主题顺序按用户心智排序：基础 → 常用变体 → 高级 / 边界 → 样式；样式主题一般放在 Examples 最后面，除非该组件本身就是样式组件
- 分组后每个具体示例仍保持"一句说明 + 一个 `<ComponentPreview>`"的节奏
- 如果一个主题组本身超过阅读时间或示例过多，优先拆成子页，而不是继续加深标题层级

> 注意：本节的 "Examples" 指**组件页内部的 `## 例子` 子节**——是该组件自身能力的多个独立小 demo。这与 `contents/<module>/examples/**` 顶层「示例页」是两件事，后者走 [`docs-doc-example`](../docs-doc-example/SKILL.md)。

## API Reference 写法

- 列固定 4 列：`属性 / 类型 / 默认值 / 描述`（zh）或 `Prop / Type / Default / Description`（en）
- 没有默认值填 `—`（em dash）；不要留空
- 属性名 + 类型字面量用反引号包：`` `stroke` ``、`` `'->'` ``
- union 类型用 `\|` 转义：`` `'butt' \| 'round' \| 'square'` ``
- 一页含多个组件时（如 `<Path>` 同时记 `<Step>`），按组件分 `###` 子节，每个组件一张 4 列表
- 表格单元格不会换行——见 principle 的「文档宽度限制」节

## 常见错误（组件页特有）

- **5 段顺序错乱** —— Examples 放到 API 后面、Related 放最前都不行；按表格规定的顺序走
- **API 表少列 / 多列** —— 严格 4 列，列名与顺序与表格规定一致
- **Examples 平铺 10+ 个 `###`** —— 满足 ≥3 同类时必须主题分组到 `####`
- **把"示例页"内容写进组件页** —— 完整图表的 step-by-step 教程走 `examples/`，不要塞进单组件页的 `## 例子`
