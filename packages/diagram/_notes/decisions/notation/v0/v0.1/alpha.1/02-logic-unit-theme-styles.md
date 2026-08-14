# ADR-02：基础逻辑单元使用 LogicUnitVariant

- 状态：Proposed
- 决策日期：2026-08-14
- 关联：[alpha.1 roadmap](./roadmap.md) · [Notation v0.1 roadmap](../roadmap.md) · [Diagram Notation 完备设计](../../../../../architecture/diagram-notation-complete.md) · [Diagram 制图能力域设计](../../../../../../../../notes/architecture/diagram-design.md) · [alpha.2 ADR-01](../alpha.2/01-semantic-ir-lightweight-lowering.md)

> 本 ADR 废弃原“基础逻辑单元接入四种 Theme Style”的方案。原有 `NotationThemeStyle`、四种旧 style definition 及其 style registry 不再是逻辑单元的公开契约；`vibrant` 在本 ADR 中仅表示 `LogicUnitVariant` 的一个值。

## 背景与目标

Core 的全局 Theme 主要服务 Viz 等需要全局调色板和主题风格的能力。流程图逻辑单元的需求不同：作者需要表达节点的视觉层级和强调程度，而不是让流程图节点消费 Viz 的主题人格。把两者绑定在同一组 Theme Style 上，会使流程图样式难以设计，也无法自然表达 Frame 内部的默认样式继承。

本 ADR 为 Terminal、Stage、Decision 与 Junction 建立 Notation 自有的 `LogicUnitVariant` 契约，目标是：

- 用少量稳定的内置 variant 表达流程图节点的主要视觉层级
- 允许单个逻辑单元覆盖当前作用域的默认 variant
- 允许 `LogicFrame` 为自己的后代逻辑单元提供默认 variant，且允许派生 Frame 声明自己的默认值
- 保持直接 JSON、React 与 Vanilla 的语义一致
- 让 variant 在 Notation lowering 中消耗，最终仍只输出普通 Core Node，不把流程图语义泄漏到 Core Theme、Scene 或 renderer

## 决策

### Notation 拥有封闭的 LogicUnitVariant 词汇

`LogicUnitVariant` 由 Notation 定义，第一阶段只支持以下五个值：

```ts
type LogicUnitVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'vibrant';
```

variant 是流程图逻辑单元的语义外观，不是 Core 的通用 Theme token，也不从 Core `theme.style` 推导。Core 继续拥有通用的 Theme Mode、静态颜色解析和颜色预合成能力；Notation 只使用这些基础能力解析逻辑单元的颜色。

第一阶段不开放自定义 variant registry。新增 variant 需要扩展 Notation 的公开词汇和对应 recipe，不通过未消费的配置层或 renderer 分支实现。

### Authoring 与语义 IR 契约

四个基础逻辑单元接受可选的 `variant`：

```tsx
<Stage variant="primary" />
```

`LogicFrame` 接受可选的 `logicUnitVariant`，用于设置其内容区域内逻辑单元的默认值：

```tsx
<LogicFrame logicUnitVariant="secondary">
  <Stage />
</LogicFrame>
```

使用 `logicUnitVariant` 而不是 `variant`，以保留 `variant` 将来表示 Frame 自身外观的空间。该字段进入 Notation semantic IR；最终 Core Node 不保留 variant discriminator。

React 与 Vanilla 必须表达同一套字段和同一套继承语义。直接 JSON、React 与 Vanilla 不得各自维护 variant 默认值或颜色 recipe。

派生 Frame 可以声明自己的 `logicUnitVariant` 默认值。派生 Frame 的调用方显式传入值优先；当派生 Frame 没有自己的值时，才从外层 Frame 作用域继承。派生 Frame 不需要新的全局 registry、运行时 class hierarchy 或 Core 扩展机制。

### LogicFrame 是 variant 的继承边界

variant 只影响逻辑单元，不影响 `LogicFrame` 的外壳、分隔线、Connector 或其它非逻辑单元元素。继承规则为：

```text
逻辑单元显式 variant
> 最近 LogicFrame 的 logicUnitVariant
> 外层 LogicFrame 的 logicUnitVariant
> default
```

具体行为如下：

- 逻辑单元显式提供 `variant` 时，始终覆盖所有 Frame 默认值
- `LogicFrame` 的 `logicUnitVariant` 影响自己的 header、sections 及嵌套 Frame 的后代逻辑单元
- 嵌套 Frame 声明自己的 `logicUnitVariant` 后建立新的作用域，只影响该 Frame 的后代
- 嵌套 Frame 不声明值时，继续继承外层作用域
- 兄弟节点之间不共享显式 variant 或 Frame 作用域
- 显式写出 `variant="default"` 可以把单个逻辑单元恢复为默认样式

### 五种内置 variant 的视觉 recipe

Notation 将 `currentColor`、`contrastColor` 与 `tintedColor` 作为 recipe 中的语义颜色角色：

- `currentColor` 是逻辑单元的主要色：优先使用 authored `color`，省略时 Light 为 `#000000`、Dark 为 `#ffffff`
- `contrastColor` 在 `#000000` 与 `#ffffff` 中选择相对于 `currentColor` 对比度更高的颜色
- `tintedColor(weight)` 将 `currentColor` 以给定权重预合成到固定的模式底色上；Light 底色为 `#ffffff`，Dark 底色为 `#000000`
- 所有 recipe 结果都是确定的不透明颜色，不向 renderer 传递 opacity

| Variant | `textColor` | `stroke` | `fill` |
| --- | --- | --- | --- |
| `default` | `currentColor` | `currentColor` | `none` |
| `primary` | `contrastColor` | `currentColor` | `currentColor` |
| `secondary` | `currentColor` | `none` | `tintedColor(0.10)` |
| `outline` | `currentColor` | `tintedColor(0.60)` | `none` |
| `vibrant` | `currentColor` | `currentColor` | `tintedColor(0.15)` |

其中 `none` 表示不绘制对应的 paint。`secondary` 明确不带边框；`outline` 只降低边框视觉强度，不增加填充；`vibrant` 保留明显的主色边框并使用有色填充。

### Variant 只提供基线，显式叶级外观仍然优先

variant recipe 只为作者省略的字段提供视觉基线。逻辑单元显式提供的 `textColor`、`stroke` 或 `fill` 逐字段高于 variant；显式字段可以是 `none`、`transparent`、`currentColor` 或 Core 已接受的其它 paint，并按作者输入透传。

例如，显式设置 `fill` 不会改变同一节点的 `textColor` 或 `stroke`；显式设置 `textColor` 也不会触发 variant 的自动对比度重算。Core 已有的 `opacity`、`fillOpacity` 与 `strokeOpacity` 继续遵循 Core 自身级联，Notation 不为 variant 生成这些字段。

### 在 Notation lowering 消耗继承结果

authoring 的 `variant` 与 `logicUnitVariant` 保留在 Notation semantic IR 中，以保持作者输入和持久化数据的语义。Notation lowering 在消费逻辑单元前解析有效作用域和 recipe，再把结果写入既有 Core Node 的 `color`、`textColor`、`stroke` 与 `fill` 字段。

variant 不进入 Core 通用 Theme token，不进入 Core Scene，不进入 renderer，也不要求 renderer 理解 Frame 继承。颜色预合成使用 Core 提供的 renderer-neutral 静态颜色能力；动态或无法静态解析的主要色不能被猜测或延迟为 renderer opacity。

## 基础数据结构与公开契约

- `LogicUnitVariant` 是 Notation 拥有的五值闭合词汇：`default`、`primary`、`secondary`、`outline`、`vibrant`
- Terminal、Stage、Decision 与 Junction 的 authored 输入和语义 IR 接受可选 `variant`
- LogicFrame 的 authored 输入和语义 IR 接受可选 `logicUnitVariant`
- `variant` 的默认值由最近的 LogicFrame 作用域或 `default` 决定；schema 不把继承后的颜色结果写入持久化 IR
- `logicUnitVariant` 只表示后代逻辑单元的默认 variant，不改变 LogicFrame 外壳和分隔线外观
- authored `color` 是逻辑单元主要色的唯一显式输入；Notation 不读取 Core categorical palette，也不按元素类型、id 或出现顺序分配颜色
- lowering 后的 Core Node 不包含 `variant`、Frame 继承信息或 Notation theme discriminator

## 行为、失败语义与兼容性

- 省略逻辑单元 `variant` 且不存在 Frame 作用域时，使用 `default`
- 省略嵌套 Frame 的 `logicUnitVariant` 时，继承外层作用域；显式声明时建立新的最近作用域
- 未知 variant、非法持久化值或不满足闭合词汇的输入 fail-loud，不静默回退到 `default`
- variant 需要派生颜色而 authored `color` 无法静态解析时 fail-loud，不输出带 alpha 的 paint，不交给 renderer 或宿主 CSS 猜测
- 直接 JSON、React 与 Vanilla 对同一 authored 语义必须产生相同的有效 variant、Core paint 和可观察结果
- 原有 `NotationThemeStyle` 及其 `neutral`、`academic`、`vibrant`、`clean` 逻辑单元样式语义废弃，不提供旧名 alias、migration、fallback 或新旧双轨
- `vibrant` 作为旧 Theme Style 的名称不保留其旧 recipe；它只按本 ADR 的 `LogicUnitVariant` recipe 解释
- Core 的全局 Theme 仍可被 Viz 等其它能力使用，但 Notation 逻辑单元不再根据 Core `theme.style` 选择 variant
- 这是 `0.x` 阶段的 breaking contract change：旧逻辑单元 Theme Style 配置和相关持久化字段不再是有效的 Notation 逻辑单元契约
- 本 ADR 不改变逻辑单元的 shape、geometry、layout、连接关系、Frame 外壳 appearance 或交互态
