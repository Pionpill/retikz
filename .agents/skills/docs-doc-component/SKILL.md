---
name: docs-doc-component
description: retikz 组件类文档（apps/docs/src/contents/<module>/components/**/*.mdx）的页面结构规范——6 段顺序（Usage / Composition / Examples / How it works / API Reference / Related，Composition / How it works / Related 可选）、Examples 子节多 demo 时的主题分组、Examples vs How it works 边界（简单 demo vs 底层原理）、Usage 的双代码块写法、Composition 适用的组件类型、How it works 何时该写。本 skill 只覆盖组件页特有规则；通用规则（三处协同、双语、写作风格、Comparison、自绘图示、宽度、阅读时间、ZodSchema 等）见 docs-doc-principle。retikz 专用。
---

# 组件类文档写法

## 何时用本 skill

- 在 `apps/docs/src/contents/<module>/components/**` 下加 / 改组件页
- 即将动手前**必须先读** [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿通用规则

本 skill 只覆盖**组件页特有**的 6 段结构与子节写法；其它一切（三处协同、双语、写作风格、Comparison、自绘图示、宽度、阅读时间、ZodSchema、Common Mistakes 等）以 principle 为准。

组件页尤其要遵守 principle 的“新手友好，不用全知视角”规则：Usage 先回答这个组件帮用户解决什么问题，再给最小骨架；Examples 先展示可复制写法，再解释术语；How it works 只在用户可观察行为需要解释时写，不能把内部类型名和实现决策当正文主线。

## 文档结构（6 段顺序）

参考：<https://ui.shadcn.com/docs/components/spinner>（简单）/ <https://ui.shadcn.com/docs/components/radix/alert-dialog#usage>（复杂）

字典类组件页固定为 6 类 section，**按下面顺序**出现；`Composition` / `How it works` / `Related` 可选，其余不要新增散乱顶级章节。需要额外内容时优先并入 `Examples` 子节、`How it works` 子节、`API Reference` 说明或拆子页。

| section | 必需 | 内容 |
| --- | --- | --- |
| `## 用法 / Usage` | ✅ | 两个**纯代码块**（不放 `<ComponentPreview>`）：`import` + 一个最小 JSX 骨架 |
| `## 组合 / Composition` | 可选 | 仅 compound 组件需要——展示组件之间的父子关系 |
| `## 例子 / Examples` | ✅ | 页面主体；多子节，每子节围绕一个能力点，**简单 demo + 一句说明**，回答"长什么样、怎么写" |
| `## 技术原理 / How it works` | 可选 | 底层 compile / 投影 / 命名空间 / bbox 计算等机制说明，回答"为什么这么工作 / 内部怎么走的"；用户读完用法 + 例子已会用，本节是 deepdive |
| `## API 参考 / API Reference` | ✅ | 4 列表（`属性 / 类型 / 默认值 / 描述` / `Prop / Type / Default / Description`），无默认填 `—`，属性名 + 类型用反引号包；多组件合一页时按组件分子节 |
| `## 相关 / Related` | 可选 | 只放相关组件、概念、Reference、Guide 链接；不承载长解释 |

frontmatter `title` + `description` 始终在；H1 由 DocPage 渲染，正文**不要**再写 `# 标题`。zh 用中文小节标题、en 用英文，但层级、子节数、表格列数保持对齐。

**阅读路径**：

- **必读线**：用法 → 例子（→ API 查参）—— 用户能上手用
- **可选 deepdive**：技术原理 —— 想理解 compile 行为时再看；不影响用户上手

中文段标题用「技术原理」、英文段标题用「How it works」；双语层级、子节数对齐。

## 形状页（双 API 页型）

`components/shapes/**` 下的形状页是上面 6 段结构的**例外**：同一个几何形状同时有两种用法——**Sugar 组件**（画一条 `<Path>`，如 `<Circle>`）和 **Node 形状**（节点边界，如 `shape="circle"`）。这类页改用**两大块自包含**结构，每块各写自己的用法 / 例子 / API，让"画图形"和"建节点"两类读者各自一口气读完、不来回跳：

| 段 | 必需 | 内容 |
| --- | --- | --- |
| 导言 | ✅ | 一句话点出该形状的**双重身份** + 一句决策（要画线 → Sugar；要可连节点 → Node），并链到 [形状组落地页](/core/components/shapes) 看完整定义——**不在每页重写定义** |
| `## 作为 Path 图形（Sugar）` | ✅ | 该 Sugar 组件的完整文档：`### 用法`（import + 骨架）/ `### 例子`（demo + 写法表）/ `### API 参考`（组合表） |
| `## 作为 Node 形状` | ✅ | 该 shape 的完整文档：`### 用法` / `### 例子`（含 params / 几何 anchor）/ `### API 参考`（shape 值 / params / 边界表） |
| `## 技术原理 / How it works` | 可选 | **共享底层机制**（Sugar→Path、Node→边界外接、角度坐标系等）；子节用一句标注适用 Path / Node / 两者 |
| `## 相关 / Related` | ✅ | 链接 Node、相邻形状页、形状组、扩展 Reference |

要点：

- **两套用法 / 例子 / API 是有意为之**——形状页同时服务两类读者，不要为了凑 6 段把它们揉成「作为图形 / 作为节点形状」交错子节
- **定义单一来源**：形状的权威定义（双重身份 + 可扩展性）写在**形状组落地页**（`shapes/index`），各形状页导言只一句话 + 链接，不复制
- 无参的 Node 形状（circle / ellipse / rectangle）Node 块较短（无 params 表）；带参的（sector / arc / star / polygon）多一块 **params 表 + 几何 anchor 列表**
- `## 技术原理` 仍是可选 deepdive，按 6 段规则用 blockquote 写导读；不要每个块各写一个技术原理，统一收在共享段
- 其它（双语、写作风格、Comparison、自绘图示、宽度、ComponentPreview 用法）一律继承 [docs-doc-principle](../docs-doc-principle/SKILL.md)

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

`Usage` 下应包含**使用时机相关说明**，帮助读者判断这个组件适合解决什么问题。说明很短时，直接接在最小骨架后的段落尾；说明较长，或 `Usage` 下已有子分小节时，单独开一个 `### 何时使用 / When to use` 子小节说明。

## Composition 适用

| 组件 | 是否写 Composition |
| --- | --- |
| `<Layout>` | ✅ 容器，children 是 Kernel/Sugar |
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
- **Examples 保持"展示用法"——底层 compile / 投影 / 命名空间机制的原理说明走 `## 技术原理`**（见下节），不要塞进 Examples 子节让用户在"看 demo"和"读原理"之间来回切
- 同一主题下的并列示例，优先按**横向并排**排版，便于用户对比；除非形态极端狭长或需要强顺序阅读，否则不要竖着堆成一列
- 每个示例下方建议加一行**浅灰说明文字**，只说这张图在演什么，不解释内部原理；这样用户扫图时不会猜错示例意图
- 说明文字要短，优先用一句话或词组，颜色用灰阶字面值而不是主题色

> 注意：本节的 "Examples" 指**组件页内部的 `## 例子` 子节**——是该组件自身能力的多个独立小 demo。这与 `contents/<module>/examples/**` 顶层「示例页」是两件事，后者走 [`docs-doc-example`](../docs-doc-example/SKILL.md)。

## How it works 写法

可选段。组件有"用户可感知但不直观的底层行为"或"陷阱性机制"时才写；简单组件（`<Coordinate>` / `<Text>` / `<Step>` 等）通常不需要。

### Examples vs How it works 边界

| 段 | 内容 | 阅读路径 |
| --- | --- | --- |
| `## 例子 / Examples` | **简单 demo + 一句说明**，回答"长什么样、怎么写"；用户复制即用 | 用户线性必读 |
| `## 技术原理 / How it works` | **机制 / 原理性说明**，回答"为什么这么工作 / 内部怎么走的"；偏说明文 + 边界 case + 概念性插图 | 用户可选，想 deepdive 才看 |

判断哪边写：

- 一句话能讲完 + demo 就够 → Examples
- 要解释「为什么 A 写法在 scope 里不工作」「同 id 多次声明的处理顺序」「坐标系怎么累积」「bbox 怎么算」 → How it works

### 何时该写本节

至少满足以下一条才写：

- **命名空间 / 作用域**机制（如 `<Scope>` 的 namespace stack / shadowing / forward-reference 规则）
- **坐标 / 变换累积**机制（如 scope chain inverse projection / `<Path>` step.to 的 polar/at/offset referent 投影）
- **synthetic / 派生 layout** 机制（如 scope.id bbox 计算、`<Coordinate>` 的 0×0 占位语义）
- **重复 / 冲突处理**策略（如 DUPLICATE_NODE_ID warn + last-wins）
- **compile 阶段的可观察副作用**（如 anchor cache、frame phase 守门）
- 这些机制写在 Examples 会喧宾夺主、写在 API 表又装不下

简单 sugar（`<Draw>` / `<EdgeLabel>`）或纯样式 prop 组件**不需要**本节——它们没有底层 compile 行为，硬写会变成「为了凑节而写」。

### 子节组织

- 子节用 `###` 平铺；每个子节单独一个主题（如 scope 的「命名空间与隔离」/「重复 id 处理」/「scope.id synthetic bbox」/「transforms 展平到 Scene」/「scope 下相对定位投影」）
- **节首用 blockquote 写一句导读，明示"上手不依赖本节、按需回来即可"**——光靠 H2 在 Examples 之后的位置信号不够；初学者默认按顺序读完才算掌握，硬啃机制描述容易劝退。导读把"先会用、再懂原理"的学习路径写明，给读者跳过的许可
- 句式参考（按组件自身机制替换"compile 行为"那段）：
  - zh：「> 上手阶段可跳过本节；遇到边界 case 或想理解 \<本组件的核心机制\> 时再回来读。」
  - en：「> Optional for everyday use; revisit when you hit edge cases or want to understand \<the component's core mechanism\>.」
- 单子节超过 5 分钟阅读体量时拆子页或并入 `concepts/` 章节，不要让本节自己变成长文
- 顺序按"用户最容易碰到 → 最少碰到"排：常见陷阱（重复 id / shadowing）在前，底层机制（bbox 计算 / 变换展平）在后

### 写作风格

仍服从 principle 的「文字精简、表格 / 列表 / 代码块优先」规则。本节常用的几种表达：

- **概念性插图**：`<ComponentPreview hideCode>` 当叙述图，**用 retikz 自绘逻辑图**，别引第三方截图 / Mermaid / draw.io
  - **风格：学术 + 简单 + Node 无 border**（即 `stroke="none"`，参 [`docs-figure-draw`](../docs-figure-draw/SKILL.md)）—— 让节点退到背景、把视觉焦点留给关系线 / 标签 / 区域分组；与"演示用法"类 demo 的视觉口径区分（用法 demo 的 Node 保留默认外框，机制图的 Node 是文字锚点）
  - 多用箭头 / 虚线 / 浅色区域分块表达"流程 / 包含 / 隔离 / 投影"等抽象语义；不要追求像素级精确，节点位置以"读懂关系"为准
- **边界 case demo**：`<ComponentPreview>`（带源码）演示「这样写会被拒 / 这样写才能工作」
- **机制表**：3 列以内说清 `输入 → compile 行为 → 用户可见效果`
- **`<Comparison target="tikz">`**：对照 TikZ pgf 同机制的实现可以提一下，但只在差异有教学价值时；不为对照而对照

### 与 API Reference 的边界

- 字段表归 API Reference；How it works **不**重复列字段
- 「这个字段做什么 + 默认值」走 API 表；「这个字段引入的机制怎么运转」走 How it works
- API 表的「描述」列可写一句"详见 § 技术原理"指向 How it works 对应子节

## API Reference 写法

- 列固定 4 列：`属性 / 类型 / 默认值 / 描述`（zh）或 `Prop / Type / Default / Description`（en）
- 没有默认值填 `—`（em dash）；不要留空
- 属性名 + 类型字面量用反引号包：`` `stroke` ``、`` `'->'` ``
- union 类型用 `\|` 转义：`` `'butt' \| 'round' \| 'square'` ``
- 一页含多个组件时（如 `<Path>` 同时记 `<Step>`），按组件分 `###` 子节，每个组件一张 4 列表
- 表格单元格不会换行——见 principle 的「文档宽度限制」节

## 常见错误（组件页特有）

- **6 段顺序错乱** —— Examples 放到 API 后面、Related 放最前、How it works 写在 Examples 之前都不行；按表格规定的顺序走
- **API 表少列 / 多列** —— 严格 4 列，列名与顺序与表格规定一致
- **Examples 平铺 10+ 个 `###`** —— 满足 ≥3 同类时必须主题分组到 `####`
- **把"示例页"内容写进组件页** —— 完整图表的 step-by-step 教程走 `examples/`，不要塞进单组件页的 `## 例子`
- **把机制 / 原理塞进 Examples 子节** —— Examples 一句说明 + demo 就够；compile / 命名空间 / 投影 / bbox 这些机制走 `## 技术原理`，让用户能选择性跳过
- **简单组件硬写 How it works** —— 没有底层 compile 行为的组件（纯 sugar / 纯样式 prop 组件）不需要本节；为了"完整性"凑节会让节内只剩重复 API 表的内容
- **How it works 段塞 API 表** —— 字段表归 API Reference；本节讲机制不讲字段；要交叉引用时 API 表「描述」列写"详见 § 技术原理"指过去
- **How it works 段写成"我们的实现细节"** —— 站在**用户能观察到的行为**写（"同 id 多次声明时后定义覆盖前定义"），不是站在内部数据结构写（"NameStack 用栈式 frame 管理"）；内部数据结构留给 AGENTS / ADR
- **中英标题不一致** —— 中文必须用「技术原理」，英文必须用「How it works」；不要写「原理」/「原理说明」/「Implementation」/「Internals」等变体
- **概念性插图忘开 `hideCode`** —— How it works 里的叙述性插图（架构图 / 概念示意）必须 `<ComponentPreview hideCode>`；演示边界 case 的 demo 才保留源码
