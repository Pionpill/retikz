---
description: Array 与 Map 用 dataExpand 统一控制嵌套 JSON 对象和数组的组件展开或文本呈现，替代仅控制对象的 dataObjectDisplay
keywords: Array、Map、dataExpand、dataObjectDisplay、JSON、嵌套数据、展开、文本
---

# ADR-036：嵌套数据结构的选择性展开

- 状态：Accepted
- 决策日期：2026-10-04
- 替代范围：[ADR-030](./030-array-map-presentation.md) 的 `dataObjectDisplay` 契约，其余 Array / Map 契约继续生效
- 关联：[roadmap](./roadmap.md) · [Standard 设计](../../../../architecture/standard-library-design.md)

## 背景与目标

Array 与 Map 的 JSON data 可以递归呈现为嵌套组件，但原有 `dataObjectDisplay` 只允许选择对象的展示形式，数组始终展开。作者需要统一选择对象、数组是否使用对应组件，同时保持显式根结构、JSON 文本语义和跨入口行为一致。

## 决策

Array 与 Map 的 data 入口统一使用 `dataExpand`，默认全部展开，也支持全部转为文本或按组件类别选择展开。对象对应 Map，数组对应 Array；该选择描述静态绘图内容，不引入交互折叠状态。

Standard 拥有数据结构呈现语义，继续组合已有 Array、Map 与文本能力。React 经 Vanilla 表达同一 Source 契约，直接 IR、factory、Vanilla 与 React 的默认值、递归行为和失败语义一致。

## 公开契约

```ts
dataExpand?: boolean | Array<'map' | 'array'>;
```

| 配置               | 非空嵌套对象 | 非空嵌套数组 |
| ------------------ | ------------ | ------------ |
| 省略或 `true`      | Map          | Array        |
| `false`            | JSON 文本    | JSON 文本    |
| `['map']`          | Map          | JSON 文本    |
| `['array']`        | JSON 文本    | Array        |
| `['map', 'array']` | Map          | Array        |
| `[]`               | JSON 文本    | JSON 文本    |

数组按集合解释：顺序不影响展示，重复项合法且不导致重复生成组件。`true` 与同时包含两类的数组等价，`false` 与空数组等价。Source 保留 JSON 数据与作者配置，不同时持久化派生的展开结构。

该属性仅用于 `data` 入口。显式 `items`、`entries` 和 React children 组合不接受该属性；作者可在显式内容中放入独立配置 `dataExpand` 的 data 组件。

## 递归与文本行为

1. 外层显式选择的组件不受展开开关影响。Array 仍按根数组生成直属格子；Map 仍按根对象生成键值行，键显示原始文字。例如 Map 设置 `false` 不会把整个根 Map 变成一个文本节点。
2. 自动生成的嵌套组件递归沿用同一展开选择。每个嵌套值按其实际对象或数组类型判定。
3. 未选择展开的结构在当前格子显示完整紧凑 JSON 文本，该子树不再生成嵌套组件。例如仅展开 Array 时，遇到对象就将整个对象及其中数组序列化为文本。
4. 空对象与空数组始终显示为 `{}` 与 `[]`，即使选择了对应组件也不生成空的嵌套组件。显式根空集合继续遵循零自然尺寸契约。
5. 字符串、有限数字、布尔值与 `null` 保持既有 JSON 字面量呈现，字符串保留引号和必要转义。对象键顺序、数组顺序和重复值不变。
6. 切换展开选择只改变嵌套内容呈现，不改变根直属格子的数量、顺序与身份规则，也不改写输入数据。既有内容宽度传递仅作用于实际生成的嵌套组件；文本按自身内容参与测量。

不增加路径规则、深度限制或函数式 formatter。JSON 输入限制、样式继承、命名、布局、裁切与定义装配继续遵循 ADR-030 和 Core 契约。

## 失败语义与兼容性

`dataExpand` 只接受布尔值或由 `map`、`array` 组成的数组；未知字符串、非法数组成员、`null`、对象配置与入口混用在外部 Source 解析边界失败，诊断定位到相关字段或数组项。类型明确的内部链路不新增重复校验；下层定义缺失、测量和编译失败保留既有原因与位置。

本决策直接移除 `dataObjectDisplay` 及旧词汇，不提供兼容别名、自动迁移或双轨解析。旧字段作为未知配置在 Source 解析边界失败。作者更新已有输入时，原 `map` 行为对应 `dataExpand: true`，原 `text` 行为对应 `dataExpand: ['array']`，不能把原 `text` 误改成 `false`。未显式配置时的默认呈现保持不变。

公开类型、schema、React / Vanilla authoring 与中英文使用文档统一采用新属性；设计 Accepted 不表示实现或发布已完成。
