# Plot 可视化完备设计

> 本文定义 `@retikz/plot` 的可视化完备目标和检测方法。总纲见 [`notes/architecture/capability-design.md`](../../../../notes/architecture/capability-design.md)。本文只讨论 plot 模块，不覆盖 chart、table、geo、React / Vanilla adapter 或具体 renderer 的体验封装。

---

## 1. 定义

`@retikz/plot` 的定位是 **Grammar-of-Graphics Layer of Retikz**：它不是 chart type 目录，也不是 renderer，而是把数据语义映射成 core 图形语义的核心可视化表达层。所有 plot 功能迭代都必须服务这个定位。

`@retikz/plot` 的完备方向是 **Visualization Complete**：

> 任意数据可视化语义，都应能通过 plot 的 Data -> Transform -> Encoding -> Scale -> Coordinate -> Mark -> Guide -> Layer / Scope -> Lowering 管线表达，并最终下沉到 core IR。

这里的“任意数据可视化”不是指 plot 内置所有图表类型，也不是把所有交互运行时塞进 plot。它指 plot 有足够稳定的图形语法与交互契约底座，让新增可视化能力可以通过同一套机制进入：

```text
Plot IR / schema
  -> contract / definition
  -> provider / registry
  -> pipeline
  -> core IR
  -> core compile / render
  -> interaction metadata / locator
```

如果某种可视化只能靠 chart type、adapter props、demo 代码或 renderer 特判实现，而不能落回 Plot IR 与 core IR，它不属于 plot 完备能力。

如果某种交互只能靠 React / DOM / SVG 私有事件树或 renderer 私有状态实现，而不能落回 plot provenance、locator、selection 语义与 core Scene metadata，它也不属于 plot 完备能力。

---

## 2. Plot 需要检测的能力面

Plot 可视化完备至少覆盖九类能力面。每类能力都可以独立演进，但必须共享同一条 Plot IR -> core IR -> interaction metadata 管线。

| 能力面 | 目标 | 不属于 plot 的情况 |
| --- | --- | --- |
| Data | 描述数据引用、数据模型、字段路径和外部数据注入边界。 | 数据库接入、权限治理、业务数据源 SDK。 |
| Transform | 把原始数据变成可绘制数据视图。 | core 几何变换；UI 运行时状态变更。 |
| Encoding / Channel | 把字段、常量或派生值绑定到视觉通道。 | renderer 私有样式补丁；chart type 内部隐式映射。 |
| Scale | 把数据域映射到视觉范围或视觉值。 | 坐标系本身；core 图形 transform。 |
| Coordinate | 消费位置通道，把 scale 后的值解析到绘图空间。 | 通用 core target / anchor 语义；地理底图系统。 |
| Mark | 定义数据在坐标空间中的几何显现。 | chart type preset；只服务单个 demo 的几何拼装。 |
| Guide | 生成 axis、grid、legend、label 等解释性结构。 | 文档说明文字；上层 UI 控件。 |
| Layer / Lowering | 组织图层、scope、provenance，并下沉到 core IR。 | 独立 renderer、平行 scene graph、adapter 私有树。 |
| Interaction | 定义 tooltip、hover、selection、brush、linked highlighting 等交互语义所需的 datum identity、locator、命中索引、状态映射和诊断边界。 | React / DOM / SVG 私有事件绑定；renderer 私有 hit-test；大数据 dashboard 的高频过滤 dataflow。 |

这些能力面是检测维度，不是必须一一对应目录。具体实现仍按 `schemas / contract / providers / features / pipeline` 分层。

Interaction 是横切能力：plot 负责让下沉产物可追踪、可定位、可从 datum / series / scope 映射到图形元素和交互状态；React / Vanilla adapter 负责把浏览器事件、水合实例或框架状态接到这套契约上。adapter 可以暴露 `onHover` / `onClick` / tooltip 等体验入口，但不能私造与 Plot IR、locator 或 provenance 脱节的交互模型。

---

## 3. 准入原则

新增 plot 能力前，先做三步判断。

### 3.1 是否真的属于 plot

属于 plot 的能力通常满足：

- 能增强 grammar-of-graphics 表达层，而不是只服务单个 chart type、上层封装或 demo。
- 能用 Plot IR 描述。
- 能通过 lowering 下沉为 core IR。
- 不依赖 React、DOM、Canvas 实例、SVG DOM 或具体 renderer。
- 不要求 plot 自造 core 已有的 geometry、target、shape、style 或 renderer 语义。

Interaction 能力有一个例外：事件监听、水合实例和 DOM 命中本身属于 adapter / renderer runtime，但交互语义的静态契约属于 plot。判断时看它是否能用 plot 的数据身份、locator、provenance、selection 状态映射表达，而不是看某个 adapter 能否临时绑事件。

不满足这些条件时，优先放到 chart、table、geo、domain 包、adapter 层，或下沉补 core / math。

### 3.2 是否需要新语法能力

如果现有 plot 能力可以组合表达，应优先组合，不新增底层语法。

只有出现以下情况，才考虑新增 plot 语法能力：

- 现有 Data / Transform / Encoding / Scale / Coordinate / Mark / Guide 无法自然表达。
- 多个 preset、adapter 或文档示例重复手写同一类可视化语义。
- 自定义能力无法通过现有 definition / registry 接入。
- 缺少该能力会迫使 chart、adapter 或 demo 私造平行 Plot IR。
- 该能力能明确下沉到 core IR，而不要求 plot 拥有 renderer。

### 3.3 是否形成闭环

进入 plot 的能力必须能形成闭环：

```text
schema 可表达
contract 可扩展
provider / feature 可实现
pipeline 可消费
core IR 可承载
interaction 可追踪 / 可定位
adapter 可等价暴露
tests 可锁定
docs / notes 可解释
```

只完成其中一段，不能称为 plot 完备能力。

---

## 4. 设计检查模板

涉及 plot 新能力的 ADR 或架构 notes，应加入以下小节：

```md
## 可视化完备检查

- 能力面：
- 是否属于 plot：
- 是否需要下沉到 core / math：
- 是否需要新 Plot IR / schema：
- 是否需要新 contract / definition：
- 是否需要新 provider / registry：
- 是否需要改 pipeline / lowering：
- 是否需要 interaction provenance / locator / state mapping：
- React / Vanilla adapter 如何等价暴露：
- 不支持边界与诊断：
- 本轮不做的能力及原因：
```

评审时优先看两类问题：

1. **能力放错层**：chart / adapter / demo 能力被塞进 plot，或 plot 通用能力被上层私造。
2. **闭环缺失**：只加 schema、只加内置实现、只能手写 IR、或 React / Vanilla 表面不等价。
3. **交互脱轨**：tooltip / hover / selection 只在某个 renderer 或 adapter 私有实现里成立，无法通过 plot locator、provenance 或 selection state 反查 datum / series / scope。

---

## 5. 与现有设计的关系

本文不替代现有 plot 架构规则：

- `architecture/plot-design.md` 仍是 plot grammar-of-graphics、Plot IR 与 lowering 管线的主设计。
- `packages/viz/plot/AGENTS.md` 仍是包内硬约束。
- `standard-structure` / `standard-schema` / `standard-contract` / `standard-providers` / `standard-pipeline-compile` 仍决定代码落层。
- plot ADR 仍记录具体版本的设计决策。

本文只补一个判断框架：当 plot 要接收新可视化能力时，用可视化完备检测确认它放对层、能闭环、不会破坏 Plot IR -> core IR 的统一表达管线。
