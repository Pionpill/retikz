# ADR-02：GraphNode 使用 GraphNodeVariant

- 状态：Superseded by ADR-06
- 决策日期：2026-08-15
- 关联：[alpha.1 roadmap](./roadmap.md) · [ADR-01](./01-graph-package-family.md) · [Schematic Graph 完备设计](../../../../../architecture/schematic-graph-complete.md) · [Schematic 制图能力域设计](../../../../../../../../notes/architecture/schematic-design.md)

> 本 ADR 废弃“逻辑节点接入 Viz / Core Theme Style”的方案。GraphNode 的视觉变体由 Graph 自己拥有，最终仍投影为普通 Core Node paint

## 背景与目标

Core 的全局 Theme 主要服务跨领域的模式和颜色基础能力。流程图节点需要的是节点层级和强调程度；它不应消费 Viz 的主题人格，也不应为四种 role 维护四套组件和 schema。GraphNode 因此使用统一组件与统一 IR，通过 `role` 表达语义，通过 `variant` 表达共享视觉层级

目标是：

- 用少量稳定的内置 variant 表达 GraphNode 的视觉层级
- 允许节点覆盖 Frame 作用域的默认 variant
- 允许 GraphFrame 为后代 GraphNode 提供可继承默认值
- 保持直接 JSON、React 与 Vanilla 的字段和 lowering 一致
- 在 Graph lowering 消耗 Graph 语义，不让 Core Scene 或 renderer 感知 role / variant

## 决策

### GraphNodeVariant 是 Graph 的闭合词汇

第一阶段只支持：

```ts
type GraphNodeVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'vibrant';
```

variant 不是 Core Theme token，也不从 `theme.style` 推导。Graph 使用 Core 提供的静态颜色解析与预合成基础能力，但不读取 Core categorical palette，不建立自定义 variant registry

### Authoring 与继承

```tsx
<GraphNode role="stage" variant="primary" />
<GraphFrame graphNodeVariant="secondary">
  <GraphNode role="stage" />
</GraphFrame>
```

继承优先级为：

```text
GraphNode 显式 variant
> 最近 GraphFrame 的 graphNodeVariant
> 外层 GraphFrame 的 graphNodeVariant
> default
```

嵌套 Frame 显式声明自己的值后建立新的作用域；未声明时继续继承。兄弟节点之间不共享作用域，`variant="default"` 可以显式重置继承值。GraphFrame 外壳、divider、GraphConnector 与其它 Core child 不受影响

### 五种 recipe

`color` 省略或显式使用 `currentColor` 时，Light 解析为 `#000000`、Dark 解析为 `#ffffff`。其它 authored color 作为主要色。颜色预合成到 Light `#ffffff` 或 Dark `#000000`，结果保持不透明：

| Variant     | `textColor`    | `stroke`            | `fill`              |
| ----------- | -------------- | ------------------- | ------------------- |
| `default`   | `currentColor` | `currentColor`      | `none`              |
| `primary`   | `contrast`     | `currentColor`      | `currentColor`      |
| `secondary` | `currentColor` | `none`              | `tintedColor(0.10)` |
| `outline`   | `currentColor` | `tintedColor(0.60)` | `none`              |
| `vibrant`   | `currentColor` | `currentColor`      | `tintedColor(0.15)` |

`secondary` 明确不带边框。显式 `textColor`、`stroke` 与 `fill` 逐字段优先于 recipe；显式 `opacity`、`fillOpacity` 与 `strokeOpacity` 继续遵循 Core 输入，不由 variant 生成。需要静态颜色但无法解析 authored `color` 时 fail-loud，不把猜测留给 renderer 或 CSS

### Lowering 边界

GraphNode authored IR 保留 `namespace`、`type: 'graphNode'`、`role` 与 `variant`。Definition 根据 role 补默认 shape，根据最近 Frame 解析有效 variant，再把 `color`、`textColor`、`stroke` 与 `fill` 写入 Core Node。lower 后只保留同 id Core Node，role、variant 与 Frame 继承信息全部丢弃

## 失败语义与兼容性

- 缺少或未知 role、variant fail-loud，不回退到其它 role 或 `default`
- 直接 JSON、React 与 Vanilla 对同一输入必须产生相同的 role、shape、paint 与 lower 结果
- 旧 Theme Style、旧组件名称、旧 namespace、旧导出和旧路由不提供 alias、migration、fallback 或双轨
- 本 ADR 不定义 GraphConnector 的 role recipe；GraphConnector 仅复用自己的闭合 role 与 Core Path lowering
