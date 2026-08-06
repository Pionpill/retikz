# table v0.1-alpha.3 Roadmap：呈现语法

> 本 milestone 扩展 formatter、presentation、selector / rule、条件视觉 scale、style tokens 与 Legend descriptor seed。具体公开契约与行为由同目录 ADR 冻结。
>
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md)

- 状态：实现对账与治理收口中
- 启动日期：2026-07-31

## 目标

- 在现有 canonical Cell 与 value → `IRChild` 主链上增加 formatter、appearance、selector / rule 与 conditional color encoding
- 用闭合、扁平、命名空间化的 style token vocabulary 支持 neutral、academic、vibrant、clean 四种 preset 及用户 overlay
- 让一次 visual scale resolution 同时提供 Cell evaluator 与可选 Legend descriptor seed
- 让 framework-neutral、React、Vanilla、SSR、manifest 与 zh / en docs 表达同一已实现契约
- 为后续 Standard Legend / Flex 组合保留清晰边界，不在 Table 复制通用组件或外围布局

## ADR 与依赖

| ADR                                                        | 主题                                                   | 依赖                                                  | 状态     |
| ---------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- | -------- |
| [01](./01-cell-formatter-and-formatted-value.md)           | Formatter Definition 与 formatted value                | alpha.2 canonical model                               | Proposed |
| [02](./02-presentation-context-and-cell-appearance.md)     | Presentation context 与 Cell appearance                | ADR-01、Core Scope style                              | Proposed |
| [03](./03-cell-selector-and-rule-cascade.md)               | Cell selector、predicate 与 ordered rule cascade       | ADR-01～02                                            | Proposed |
| [04](./04-conditional-visual-encoding-and-scale.md)        | Conditional color scale、encoding 与 Legend descriptor | ADR-02～03；与 ADR-05 共用 resolved palette           | Proposed |
| [05](./05-style-preset-and-token-resolution.md)            | Style preset、公开 tokens 与 precedence                | ADR-02～04                                            | Proposed |
| [06](./06-standard-legend-consumption-and-traceability.md) | Standard Legend、外围 Box Layout 与 artifact lineage   | ADR-04～05；Table body boundary；occurrence-safe join | Proposed |
| [07](./07-react-vanilla-authoring-and-documentation.md)    | React / Vanilla / SSR 与文档闭环                       | ADR-01～06                                            | Proposed |

依赖主链：

```text
01 formatter
  → 02 presentation context + appearance
    → 03 selector + rule cascade
      → 04 conditional visual encoding ↔ 05 style tokens
        ├─ Cell appearance + descriptor seed
        └─ 06 Standard Legend / Flex consumption
             ├─ Standard Legend / Flex public capability（已具备）
             ├─ Table JSON-safe body composition boundary（未完成）
             └─ Core / Standard occurrence-safe artifact join（未完成）
                  → 07 adapters + SSR + docs final closure
```

ADR-04 / 05 共享 resolved palette 与 appearance pipeline，必须保持同一公开数据链。ADR-04 当前 resolution 以 `of`、`legendForm`、`domain`、`range` 与可选 `edges` 表达；Table 守卫结构、JSON、颜色和重复输入确定性，custom Definition 作者负责 evaluator 与 descriptor 数据的语义一致性。

Standard Legend / Flex 的 schema、factory、Definition、layout-aware compile、typed artifact 与 adapter 公共能力已经存在。ADR-06 仍需补齐 Table-owned JSON-safe body composition boundary，以及跨 nested replay 的 authored item key → final child occurrence link。两项未完成前不建立 Table-local Legend、外围 solver、`legendLayout` placeholder 或 joined manifest。

## Milestone 边界

- Table 继续拥有复杂的 body layout、Cell geometry、Border Graph、visual encoding、descriptor seed 与领域 lineage
- Core 拥有 JSON / color、measurement / replay 与 compile-local occurrence 能力
- Standard 拥有 Legend visual structure、内部 layout、外围 Box Layout、lowering 与 typed artifacts
- Data parsing / transform、Plot scale / guide、renderer 与 adapter lifecycle 保持各自所有权
- manual Table 的矩形 rows authoring 已在 alpha.2 完成，本 milestone 不重复定义

## 当前产品基线

- formatter、presentation、selector / rule、encoding 与 style tokens 沿同一 canonical pipeline 闭环
- neutral 为默认 preset；academic / vibrant / clean、light / dark 与 custom overlay 可用
- visual scale resolution 与 manifest 同时保存 Cell encoding lineage 和 opt-in Legend descriptor seed
- direct、React、Vanilla 与 SSR 共用四类 definitions、runtime contribution 与 Table manifest artifact
- Standard Legend / Flex 本体可消费，但 Table composition 与 final artifact join 尚未接入

## 治理完成标准

- [ ] ADR-01～07 均保持长期形态，并通过 Architecture Gate 与人工确认
- [x] formatter、presentation、selector / rule、encoding 与 style tokens 沿同一 canonical pipeline 闭环
- [x] neutral / academic / vibrant / clean、light / dark 与 custom overlay 可观察且可诊断
- [x] current visual scale resolution、appearance、descriptor seed 与 manifest lineage 契约一致
- [x] direct、React、Vanilla、SSR 对当前 Table Scene 与 manifest 语义等价
- [ ] Table body composition boundary 与 occurrence-safe artifact join 完成，ADR-06 不复制 Standard 能力
- [ ] Standard Legend / Flex 组合、最终 adapter / SSR / docs 闭环完成
- [ ] zh / en docs、README、architecture 与七篇 ADR 完成最终对账

## 不在 alpha.3 范围

- group、hierarchy、subtotal、pivot、matrix 与多层 header
- 选择、编辑、虚拟滚动和异步数据状态
- size / symbol / data bar / sparkline encoding 与跨 Plot Cell guide 协调
- 自动 dark mode、CSS theme sync 或任意 token / selector registry
