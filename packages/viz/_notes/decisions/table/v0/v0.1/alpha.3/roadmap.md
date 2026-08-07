# table v0.1-alpha.3 Roadmap：呈现语法

> 本 milestone 扩展 formatter、presentation、selector / rule、条件视觉 scale、style tokens 与 Legend descriptor seed。具体公开契约与行为由同目录 ADR 冻结。
>
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md) · [`alpha.6 Legend composition`](../alpha.6/roadmap.md)

- 状态：实现已完成，治理收口中
- 启动日期：2026-07-31

## 目标

- 在现有 canonical Cell 与 value → `IRChild` 主链上增加 formatter、appearance、selector / rule 与 conditional color encoding
- 用闭合、扁平、命名空间化的 style token vocabulary 支持 neutral、academic、vibrant、clean 四种 preset 及用户 overlay
- 让一次 visual scale resolution 同时提供 Cell evaluator 与可选 Legend descriptor seed
- 让 framework-neutral、React、Vanilla、SSR、manifest 与 zh / en docs 表达同一已实现契约

## Milestone 边界

alpha.3 截止于 JSON-safe Legend descriptor / manifest seed，不自动绘制 Standard Legend，不提供 `legendLayout`，也不承诺最终 Legend artifact join。Standard Legend / Flex 的公共能力已经存在，但 Table body composition boundary 与 occurrence-safe artifact join 属于 alpha.6 的外围组合与追溯收口。

Table 继续拥有 visual encoding、descriptor seed 与领域 lineage；Standard 拥有通用 Legend 视觉结构、内部布局与外围 Box Layout；Core 拥有 measurement / replay 与 compile-local occurrence。alpha.3 不建立 Table-local Legend、外围 solver、placeholder API 或 adapter sidecar join。

## ADR 与依赖

| ADR                                                     | 主题                                                   | 依赖                     | 状态     |
| ------------------------------------------------------- | ------------------------------------------------------ | ------------------------ | -------- |
| [01](./01-cell-formatter-and-formatted-value.md)        | Formatter Definition 与 formatted value                | alpha.2 canonical model  | Proposed |
| [02](./02-presentation-context-and-cell-appearance.md)  | Presentation context 与 Cell appearance                | ADR-01、Core Scope style | Proposed |
| [03](./03-cell-selector-and-rule-cascade.md)            | Cell selector、predicate 与 ordered rule cascade       | ADR-01～02               | Proposed |
| [04](./04-conditional-visual-encoding-and-scale.md)     | Conditional color scale、encoding 与 Legend descriptor | ADR-02～03               | Proposed |
| [05](./05-style-preset-and-token-resolution.md)         | Style preset、公开 tokens 与 precedence                | ADR-02～04               | Proposed |
| [06](./06-react-vanilla-authoring-and-documentation.md) | React / Vanilla / SSR 与文档闭环                       | ADR-01～05               | Proposed |

依赖主链：

```text
01 formatter
  → 02 presentation context + appearance
    → 03 selector + rule cascade
      → 04 conditional visual encoding ↔ 05 style tokens
        ├─ Cell appearance + descriptor seed
        └─ 06 adapters + SSR + docs

descriptor seed
  → alpha.6 Standard Legend / Flex composition + occurrence-safe artifact join
```

ADR-04 / 05 共享 resolved palette 与 appearance pipeline，保持同一公开数据链。ADR-04 resolution 以 `of`、`legendForm`、`domain`、`range` 与可选 `edges` 表达；Table 守卫结构、JSON、颜色和重复输入确定性，custom Definition 作者负责 evaluator 与 descriptor 数据的语义一致性。

## 已实现产品基线

- formatter、presentation、selector / rule、encoding 与 style tokens 沿同一 canonical pipeline 闭环
- neutral 为默认 preset；academic / vibrant / clean、light / dark 与 custom overlay 可用
- visual scale resolution 与 manifest 同时保存 Cell encoding lineage 和 opt-in Legend descriptor seed
- direct、React、Vanilla 与 SSR 共用四类 definitions、runtime contribution 与 Table manifest artifact
- zh / en Reference、三包 README 与 changelog 明确当前 descriptor seed 边界

## 治理完成标准

- [ ] ADR-01～06 均保持长期形态，并通过 Architecture Gate 与人工确认
- [x] formatter、presentation、selector / rule、encoding 与 style tokens 沿同一 canonical pipeline 闭环
- [x] neutral / academic / vibrant / clean、light / dark 与 custom overlay 可观察且可诊断
- [x] visual scale resolution、appearance、descriptor seed 与 manifest lineage 契约一致
- [x] direct、React、Vanilla、SSR 对当前 Table Scene 与 manifest 语义等价
- [x] zh / en docs、README、architecture 与 changelog 对当前公开边界完成对账

## 不在 alpha.3 范围

- Standard Legend / Flex composition、`legendLayout` 与最终 Legend artifact join
- group、hierarchy、subtotal、pivot、matrix 与多层 header
- 选择、编辑、虚拟滚动和异步数据状态
- size / symbol / data bar / sparkline encoding 与跨 Plot Cell guide 协调
- 自动 dark mode、CSS theme sync 或任意 token / selector registry
