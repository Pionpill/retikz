# ADR-06：Flow Entity 复用 Core 富文本

- 状态：Proposed
- 决策日期：2026-09-02
- 关联：[Diagram v0.1 roadmap](../roadmap.md) · [Flow Source 模型与 LLM-first Authoring](./03-flow-source-model.md) · [Flow Orchestration、Result 与 Artifact](./05-flow-orchestration-result-artifact.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

## 背景与目标

Flow 的基础排布示例需要在 Entity 中同时呈现主文本和较低强调的说明文本，并让作者独立调整说明行的字号与颜色，以及整个文本块的基本对齐和排版。当前 Entity 的 `text` 只接受非空白字符串，不能持久化第二行的视觉差异；把说明仅保留在 Docs 控件或直接写入 Graph 都会使同一 Flow Source 在不同入口或再次编译时丢失事实

Core 已有 JSON-safe `TextBlock`：它能表达单行、多个文本行、逐行 `fill` / `opacity` / `font`，以及既有 mixed text / math line。Graph Entity 已消费该文本并由 Core 完成其自然尺寸测量。本文冻结 Flow 对该通用文本契约的投影与保留的非空语义

## 决策

Flow Entity 的 `text` 直接采用完整 Core `TextBlock`，不创建 `subtitle`、`subtitleStyle` 或 Flow 专属文本样式语义。副标题只是其中一条由作者样式化的文本行；其含义、顺序、颜色和字号均由 TextBlock 表达，Flow 不推断“哪一行是副标题”

Flow resolve 必须不变换 Entity 文本内容地投影给 Graph Entity。Graph 与 Core 继续拥有文字解析、行样式、测量与绘制；Flow 的现有 Graph probe 因而以实际多行尺寸参与 layout，不创建字符估算、固定高度、Flow renderer 分支或文本尺寸缓存

副标题与主文本共用 Entity 已有的块级 `style.align`。它只取 Core 的 `start`、`middle`、`end`，缺省时沿用 Core 的 `middle`；对齐作用于整个多行文本块，不为任一行创建独立对齐字段。已有的 `style.lineHeight` 与 `style.maxTextWidth` 继续控制行距和自动换行；后者必须在同一 Graph / Core 真实测量之前生效

这是 Flow Source 的唯一文本入口。Direct IR、Vanilla 和 React 都接受同一 `text` 值；React `FlowEntity` 保持 marker 组件，以 prop 传入 TextBlock，不接受 Core `Text` children 或任意 ReactNode。这样 JSX 不会产生一条不同于 JSON / Vanilla 的 Flow authoring grammar

## 基础数据结构与公开契约

`IRFlowEntity.text` 的公开类型是 Core `IRTextBlock`。它保留简单字符串写法，也接受非空行数组；每一行可以是默认文本、带 `fill` / `opacity` / `font` 覆盖的文本，或 Core 已有的 mixed text / math line。例如：

```ts
text: [
  '前端表单',
  { text: '填写用户信息', fill: 'gray', font: { size: 'sm' } },
]

style: { align: 'start', lineHeight: 18, maxTextWidth: 160 }
```

Flow 的 Entity 文本仍是必填且语义非空：字符串、每个 styled line 的文本，以及 mixed line 的文本 / TeX run 全部为空白时必须被 Source schema 拒绝。空数组继续不合法；非空数组不能以空行或空白 run 规避该约束。该判断不改变 Core TextBlock 在其它 owner 中允许的表达范围

TextBlock 的逐行样式遵循 Core 既有继承：未指定字段继承 Entity / Graph 的有效文本外观。Flow 不提供独立的副标题默认值或颜色 / 字号枚举；因此 theme、custom Graph Entity role 与已有 Core text capability 继续以相同方式生效。`align`、`lineHeight` 与 `maxTextWidth` 保持 Entity 级 `style` 字段，不可在单行中覆盖

## 行为、失败语义与兼容性

单字符串 Flow Entity 继续按原有写法运行，并保持“至少一个非空白字符”的验证结果。结构化 TextBlock 是新增的合法输入；它会原样到达 Graph Entity，并影响测量、自动布局和最终 Scene 的行数与逐行外观。`style.align` 只改变多行块内的水平对齐；`lineHeight` 与 `maxTextWidth` 依既有 Core 语义改变文本排版及其测量尺寸

Direct IR、Vanilla 与 React 对同一值必须产生等价 Source、Graph 投影和 Scene。任一入口的空白 TextBlock 都必须在 Flow Source schema 边界 fail-loud，且不由 adapter 补写主文本、副标题、颜色或字号

这是一项向宽的 0.x Source 扩展：以前有效的 Entity 文本保持有效；不保留第二套旧 schema、解析 fallback 或 Flow 专属别名。文本里使用 Core 已有 math run 时，仍遵守其 lowerTex capability 的既有失败语义
