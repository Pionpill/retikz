---
name: docs-doc-component
description: Use when writing or editing component pages under a module's apps/docs component contents, excluding pages marked as extension guides.
---

# 组件类文档写法

## 何时用本 skill

- 在 `apps/docs/src/modules/docs/contents/<module>/components/**` 下加 / 改组件页
- 即将动手前**必须先读** [`docs-doc-principle`](../docs-doc-principle/SKILL.md) 拿通用规则
- Standard Tier 2 composite 组件页继续读 `docs-doc-standard-composite`
- 页面含 controls 时再读 [`docs-doc-control`](../docs-doc-control/SKILL.md)，统一面板、契约、取景与视觉层级
- 页面使用多文件、数据文件或动态源码派生时，再读 [`ComponentPreview 按需契约`](../docs-doc-principle/references/component-preview.md)

本 skill 只覆盖**组件页特有**的页面结构与子节写法；其它一切（三处协同、双语、写作风格、Comparison、自绘图示、宽度、阅读时间、ZodSchema、Common Mistakes 等）以 principle 为准。

组件页尤其要遵守 principle 的“新手友好，不用全知视角”规则：Usage 先回答这个组件帮用户解决什么问题，再给最小骨架；Examples 先展示可复制写法，再解释术语；How it works 只在用户可观察行为需要解释时写，不能把内部类型名和实现决策当正文主线。

组件页首先说明组件的核心抽象、在能力闭环中的职责和边界；props 只是实现这些职责的接口，不是页面主线。边框色、背景色、线宽、透明度等跨图元通用样式默认简写并保留在 controls / API 表中，不为每个取值或字段建立独立叙事。

## 文档结构（5 类 section）

字典类组件页使用下面 5 类 section，**按顺序**出现；`How it works` / `Related` 可选，其余不要新增散乱顶级章节。需要额外内容时优先并入 `Usage`、`Examples`、`How it works`、`API Reference` 或拆子页。

| section                       | 必需 | 内容                                                                                                                                               |
| ----------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `## 用法 / Usage`             | ✅   | 两个**纯代码块**（不放 `<ComponentPreview>`）：`import` + 一个最小 JSX 骨架                                                                        |
| `## 例子 / Examples`          | ✅   | 页面主体；多子节，每子节围绕一个能力点，**简单 demo + 一句说明**，回答"长什么样、怎么写"                                                           |
| `## 技术原理 / How it works`  | 可选 | 底层 compile / 投影 / 命名空间 / bbox 计算等机制说明，回答"为什么这么工作 / 内部怎么走的"；用户读完用法 + 例子已会用，本节是 deepdive              |
| `## API 参考 / API Reference` | ✅   | 4 列表（`属性 / 类型 / 默认值 / 描述` / `Prop / Type / Default / Description`），无默认填 `—`，属性名 + 类型用反引号包；多组件合一页时按组件分子节 |
| `## 相关 / Related`           | 可选 | 只放相关组件、概念、Reference、Guide 链接；不承载长解释                                                                                            |

frontmatter `title` + `description` 始终在；H1 由 DocPage 渲染，正文**不要**再写 `# 标题`。zh 用中文小节标题、en 用英文，但层级、子节数、表格列数保持对齐。

**阅读路径**：

- **必读线**：用法 → 例子（→ API 查参）—— 用户能上手用
- **可选 deepdive**：技术原理 —— 想理解 compile 行为时再看；不影响用户上手

中文段标题用「技术原理」、英文段标题用「How it works」；双语层级、子节数对齐。

## 形状页（双 API 页型）

`components/shapes/**` 下的形状页是上面常规结构的**例外**：同一个几何形状同时有两种用法——**Sugar 组件**（画一条 `<Path>`，如 `<Circle>`）和 **Node 形状**（节点边界，如 `shape="circle"`）。这类页改用**两大块自包含**结构，每块各写自己的用法 / 例子 / API，让"画图形"和"建节点"两类读者各自一口气读完、不来回跳：

| 段                           | 必需 | 内容                                                                                                                                                              |
| ---------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 导言                         | ✅   | 一句话点出该形状的**双重身份** + 一句决策（要画线 → Sugar；要可连节点 → Node），并链到 [形状组落地页](/kernel/components/shapes) 看完整定义——**不在每页重写定义** |
| `## 作为 Path 图形（Sugar）` | ✅   | 该 Sugar 组件的完整文档：`### 用法`（import + 骨架）/ `### 例子`（demo + 写法表）/ `### API 参考`（组合表）                                                       |
| `## 作为 Node 形状`          | ✅   | 该 shape 的完整文档：`### 用法` / `### 例子`（含 params / 几何 anchor）/ `### API 参考`（shape 值 / params / 边界表）                                             |
| `## 技术原理 / How it works` | 可选 | **共享底层机制**（Sugar→Path、Node→边界外接、角度坐标系等）；子节用一句标注适用 Path / Node / 两者                                                                |
| `## 相关 / Related`          | ✅   | 链接 Node、相邻形状页、形状组、扩展 Reference                                                                                                                     |

要点：

- **两套用法 / 例子 / API 是有意为之**——形状页同时服务两类读者，不要为了凑常规结构把它们揉成「作为图形 / 作为节点形状」交错子节
- **定义单一来源**：形状的权威定义（双重身份 + 可扩展性）写在**形状组落地页**（`shapes/index`），各形状页导言只一句话 + 链接，不复制
- 无参的 Node 形状（circle / ellipse / rectangle）Node 块较短（无 params 表）；带参的（sector / arc / star / polygon）多一块 **params 表 + 几何 anchor 列表**
- `## 技术原理` 仍是可选 deepdive，按本页技术原理规则用 `<ComponentAlert type="tip">` 写导读；不要每个块各写一个技术原理，统一收在共享段
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

## 组合关系的承载位置

retikz 底层组件多数可直接使用，不把 shadcn compound component 的固定装配结构当作组件页前提，也不设置独立的 `## 组合 / Composition` 顶级章节。

- 组件要求 children 时，在 Usage 的最小 JSX 骨架与紧随其后的一句话中讲清，例如 `<Path>` 与 `<Step>`
- 存在多种协作或嵌套写法时，在 Examples 下按用户任务组织子节
- 组合引发用户可感知的 compile、作用域或边界行为时，在 How it works 解释机制
- 只有普通父子 JSX 关系时，代码本身足够，不再追加说明

## Examples 分组

Examples 里的示例较多时，必须先抽象主题，再在主题下细分具体能力，避免一长串并列 `###` 把页面变成 demo 清单。

### 静态 demo 与 controls 的分工

本节只判断是否使用 controls；实现、契约、取景、caption、视觉层级与验证全部由 [`docs-doc-control`](../docs-doc-control/SKILL.md) 拥有。

先判断变化是否改变组件结构或语义：

| 变化                                                                          | 承载方式                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| JSX 结构、组合关系、职责边界、错误行为或编译机制不同                          | 保留静态 demo                              |
| 任务与场景固定，只调整样式、尺寸或其它 prop 值                                | 合并进一个 controls playground             |
| 闭合 union / 内置 kind 属于同一能力，能在固定场景比较，且源码完整映射每个对象 | 可合并为 playground，并保留 canonical 说明 |
| 变体无法共享比较场景，或切换后读者需要重新理解组合、所有权、错误或边界        | 保留静态 demo                              |
| 样式本身就是组件的核心能力，或取值会改变语义                                  | 按核心语义保留必要静态 demo                |

controls 用于探索参数空间，不用于隐藏核心设计。每页通常只设一个主 playground；正文仍保留 canonical 用法，以及 controls 无法表达的语义分支。闭合集合放入 controls 时必须覆盖完整公开集合；某分支失败时追查实现或记录 blocker，不从 demo 静默删除。

规则：

- 同类示例 ≥ 3 个时，先合并成主题组。例如 `<Draw>` 的弧线、二次贝塞尔、三次贝塞尔可统一放进"曲线"主题，再在主题下细分
- 样式类示例默认合并进一个 controls playground 或 API 表；确需静态展示时统一归入一个简短的"样式 / Style"主题，不把 stroke、fill、dash、opacity、font 等字段分别提成小节
- 主题组用 `###`，组内具体示例用 `####`；如果该页示例较少，可直接用 `###`
- 主题顺序按用户心智排序：基础 → 常用变体 → 高级 / 边界 → 样式；样式主题一般放在 Examples 最后面，除非该组件本身就是样式组件
- 每个核心语义示例保持"一句说明 + 一个 `<ComponentPreview>`"的节奏；仅有视觉参数差异的条目不单独生成示例
- 如果一个主题组阅读体量较大或示例过多，先用 TOC、主题分组和稳定锚点保证可跳读；只有该组拥有可独立成立的职责、读者任务或 API 契约时才拆成子页
- **Examples 保持"展示用法"——底层 compile / 投影 / 命名空间机制的原理说明走 `## 技术原理`**（见下节），不要塞进 Examples 子节让用户在"看 demo"和"读原理"之间来回切
- 同一主题下的并列示例，优先按**横向并排**排版，便于用户对比；除非形态极端狭长或需要强顺序阅读，否则不要竖着堆成一列
- 示例需要读图提示时使用 `ComponentPreview.caption`，只说明“操作或观察什么”，不另写灰色 `span`

> 注意：本节的 "Examples" 指**组件页内部的 `## 例子` 子节**——是该组件自身能力的多个独立小 demo。这与 `contents/<module>/examples/**` 顶层「示例页」是两件事，后者走 [`docs-doc-example`](../docs-doc-example/SKILL.md)。

## How it works 写法

可选段。组件有"用户可感知但不直观的底层行为"或"陷阱性机制"时才写；简单组件（`<Coordinate>` / `<Text>` / `<Step>` 等）通常不需要。

### Examples vs How it works 边界

| 段                           | 内容                                                                                          | 阅读路径                   |
| ---------------------------- | --------------------------------------------------------------------------------------------- | -------------------------- |
| `## 例子 / Examples`         | **简单 demo + 一句说明**，回答"长什么样、怎么写"；用户复制即用                                | 用户线性必读               |
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

写本节前先读实现入口与相关测试，确认真实的行为、优先级和职责边界，再提炼成用户可观察的机制。正文不能只堆文字，也不能把内部函数名、类型名或调用顺序当作解释；它们只用于核对结论和提供源码入口。

### 子节组织

- 子节用 `###` 平铺；每个子节单独一个主题（如 scope 的「命名空间与隔离」/「重复 id 处理」/「scope.id synthetic bbox」/「transforms 展平到 Scene」/「scope 下相对定位投影」）
- **节首用 `<ComponentAlert type="tip">` 写一句导读，明示"上手不依赖本节、按需回来即可"**——光靠 H2 在 Examples 之后的位置信号不够；初学者默认按顺序读完才算掌握，硬啃机制描述容易劝退。导读把"先会用、再懂原理"的学习路径写明，给读者跳过的许可
- 句式参考（按组件自身机制替换 `description`）：

  ```mdx
  <ComponentAlert
    type="tip"
    title="上手阶段可跳过本节"
    description="遇到边界 case 或想理解本组件的核心机制时再回来读。"
  />

  <ComponentAlert
    type="tip"
    title="Optional for everyday use"
    description="Revisit when you hit edge cases or want to understand the component's core mechanism."
  />
  ```

- 单子节阅读体量较大时先压缩重复解释、增加清晰小节和跳读提示；只有内容能独立形成概念任务时才拆到子页或 `concepts/`，时间估算本身不构成拆页条件
- 顺序按"用户最容易碰到 → 最少碰到"排：常见陷阱（重复 id / shadowing）在前，底层机制（bbox 计算 / 变换展平）在后

### 写作风格

仍服从 principle 的「文字精简、表格 / 列表 / 代码块优先」规则。本节常用的几种表达：

- **概念性插图**：`<ComponentPreview hideCode>` 当叙述图，**用 retikz 自绘逻辑图**，别引第三方截图 / Mermaid / draw.io
  - 图只解释当前子节的一个局部机制，在组件职责边界停止；完整 JSX → IR → Scene 管线链接 `/kernel/concepts/design/principles`，不要在组件页重复绘制
  - 节点是否有框按 [`docs-figure-contract`](../docs-figure-contract/SKILL.md) 的语义规则选择，整图保持同一种边界模式；需要解释实现逻辑时继续读 [`docs-figure-logic`](../docs-figure-logic/SKILL.md)
  - 多用箭头 / 虚线 / 浅色区域分块表达"流程 / 包含 / 隔离 / 投影"等抽象语义；不要追求像素级精确，节点位置以"读懂关系"为准
- **图文衔接**：图前用一两句说明观察重点，图后说明该机制带来的用户可见结果、边界或排查方法；不能只放一张无上下文的图
- **边界 case demo**：`<ComponentPreview>`（带源码）演示「这样写会被拒 / 这样写才能工作」
- **机制表**：3 列以内说清 `输入 → compile 行为 → 用户可见效果`
- **`<Comparison target="tikz">`**：对照 TikZ pgf 同机制的实现可以提一下，但只在差异有教学价值时；不为对照而对照
- **源码入口**：每个需要源码佐证的子节，在行为解释、图示和用户可见结论之后，用 `<SourceLinks sources={[{ label, path, startLine?, endLine? }]} />` 收尾
  - `sources` 只列直接实现入口与关键决策分支；`label` 用当前语言概括机制，不写文件名
  - `path` 写仓库相对路径，行号范围只覆盖支撑当前结论的实现；完成前确认文件存在、行号范围不得超出文件、代码仍能支撑正文结论
  - 组件统一生成 GitHub URL 与双语标题；源码入口只用于延伸核对，不能替代行为解释，也不要手写 `<small>`、完整 GitHub URL 或本地文件路径

### 与 API Reference 的边界

- 字段表归 API Reference；How it works **不**重复列字段
- 「这个字段做什么 + 默认值」走 API 表；「这个字段引入的机制怎么运转」走 How it works
- API 表的「描述」列可写一句"详见 § 技术原理"指向 How it works 对应子节

## API Reference 写法

- 先核对页面出现的函数、类型和常量能从所属包根入口公开导入；概念简称不能冒充类型名
- 宿主或容器组件同时审计 owner barrel 中的 Provider、Context、hook 与 helper；只列完成当前任务需要的伴随导出
- 继承的共享 props 用一行“共享契约 + 职责 + 权威链接”概括，不在每个组件页复制整张字段表
- 列固定 4 列：`属性 / 类型 / 默认值 / 描述`（zh）或 `Prop / Type / Default / Description`（en）
- 没有默认值填 `—`（em dash）；不要留空
- 嵌套对象契约逐项写明字段名、类型与默认值；不得用 `field?` 这类裸可选字段代替字段类型
- 属性名 + 类型字面量用反引号包：`` `stroke` ``、`` `'->'` ``
- union 类型用 `\|` 转义：`` `'butt' \| 'round' \| 'square'` ``
- 一页含多个组件时（如 `<Path>` 同时记 `<Step>`），按组件分 `###` 子节，每个组件一张 4 列表
- 表格单元格不会换行——见 principle 的「文档宽度限制」节

## 常见错误（组件页特有）

- **5 类 section 顺序错乱** —— Examples 放到 API 后面、Related 放最前、How it works 写在 Examples 之前都不行；按表格规定的顺序走
- **照搬独立 Composition 章节** —— 组合要求写进 Usage 骨架、Examples 用法或 How it works 机制，不为普通父子 JSX 单独开顶级章节
- **API 表少列 / 多列** —— 严格 4 列，列名与顺序与表格规定一致
- **Examples 平铺 10+ 个 `###`** —— 满足 ≥3 同类时必须主题分组到 `####`
- **把通用样式写成页面主体** —— stroke、fill、opacity、尺寸等仅改变外观时合并进 controls / API 表；正文优先讲根问题、核心抽象、职责边界和语义分支
- **用 controls 吞掉语义分支** —— controls 只压缩稳定任务与可比较场景下的参数空间；不同 JSX、组合、职责边界、错误与编译机制仍保留静态 demo，闭合对象变体仅在满足本节条件时合并
- **把"示例页"内容写进组件页** —— 完整图表的 step-by-step 教程走 `examples/`，不要塞进单组件页的 `## 例子`
- **把机制 / 原理塞进 Examples 子节** —— Examples 一句说明 + demo 就够；compile / 命名空间 / 投影 / bbox 这些机制走 `## 技术原理`，让用户能选择性跳过
- **简单组件硬写 How it works** —— 没有底层 compile 行为的组件（纯 sugar / 纯样式 prop 组件）不需要本节；为了"完整性"凑节会让节内只剩重复 API 表的内容
- **How it works 段塞 API 表** —— 字段表归 API Reference；本节讲机制不讲字段；要交叉引用时 API 表「描述」列写"详见 § 技术原理"指过去
- **How it works 段写成"我们的实现细节"** —— 站在**用户能观察到的行为**写（"同 id 多次声明时后定义覆盖前定义"），不是站在内部数据结构写（"NameStack 用栈式 frame 管理"）；内部数据结构留给 AGENTS / ADR
- **How it works 只写文字或只堆源码名** —— 从实现与测试提炼用户可观察机制；关系、优先级或流程适合画图时用叙述性插图，图前后补观察重点和结果
- **源码链接替代机制解释** —— 正文先讲清行为，段末再用 `<SourceLinks>` 给次要层级的源码入口；不要手写 `<small>`、完整 GitHub URL 或本地文件路径
- **中英标题不一致** —— 中文必须用「技术原理」，英文必须用「How it works」；不要写「原理」/「原理说明」/「Implementation」/「Internals」等变体
- **概念性插图忘开 `hideCode`** —— How it works 里的叙述性插图（架构图 / 概念示意）必须 `<ComponentPreview hideCode>`；演示边界 case 的 demo 才保留源码
