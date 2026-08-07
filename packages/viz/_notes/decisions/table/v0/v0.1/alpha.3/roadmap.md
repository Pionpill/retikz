# table v0.1-alpha.3 Roadmap：呈现语法

> 本 milestone 扩展 formatter、presentation、selector / rule、条件视觉 scale、style tokens 与 Legend descriptor seed。具体公开契约与行为由同目录 ADR 冻结。
>
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md) · [`alpha.6 Legend composition`](../alpha.6/roadmap.md)

- 状态：实现已完成、治理收口中；ADR-05 已 Accepted，其余 ADR 状态不变
- 启动日期：2026-07-31

## 目标

- 在现有 canonical Cell 与 value→`IRChild` 主链上增加 formatter、appearance、selector/rule 与 conditional color encoding
- 用 Core `theme.tokens.table` 承载闭合、扁平、命名空间化的 `tableThemeTokens` vocabulary，支持 neutral、academic、vibrant、clean 四种 Table preset 及用户 overlay
- 用 declarative mapping 同时驱动 Cell appearance 与 Legend descriptor，并保留 opaque evaluator 的仅实绘扩展路径
- 通过 Standard Legend 与 Box Layout 完成通用 Legend 呈现和外围 composition，不在 Table 复制通用布局
- 让 framework-neutral、React、Vanilla、SSR、manifest 与 zh/en docs 表达同一契约

## Milestone 边界

alpha.3 截止于 JSON-safe Legend descriptor / manifest seed，不自动绘制 Standard Legend，不提供 `legendLayout`，也不承诺最终 Legend artifact join。Standard Legend / Flex 的公共能力已经存在，但 Table body composition boundary 与 occurrence-safe artifact join 属于 alpha.6 的外围组合与追溯收口。

Table 继续拥有 visual encoding、descriptor seed 与领域 lineage；Standard 拥有通用 Legend 视觉结构、内部布局与外围 Box Layout；Core 拥有 measurement / replay 与 compile-local occurrence。alpha.3 不建立 Table-local Legend、外围 solver、placeholder API 或 adapter sidecar join。

## ADR 与依赖

| ADR                                                        | 主题                                                                                | 依赖                                                              | 状态     |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| [01](./01-cell-formatter-and-formatted-value.md)           | Formatter Definition 与 formatted value                                             | alpha.2 canonical model                                           | Proposed |
| [02](./02-presentation-context-and-cell-appearance.md)     | Presentation context 与 Cell appearance                                             | ADR-01、Core Scope style                                          | Proposed |
| [03](./03-cell-selector-and-rule-cascade.md)               | Cell selector、predicate 与 ordered rule cascade                                    | ADR-01～02                                                        | Proposed |
| [04](./04-conditional-visual-encoding-and-scale.md)        | Conditional color scale、encoding 与 Legend descriptor                              | ADR-02～03；Core gradient-stop gate；与 ADR-05 的主题消费同批验证 | Proposed |
| [05](./05-style-preset-and-token-resolution.md)            | Table style preset、`tableThemeTokens`、shared categorical projection 与 precedence | Core ADR-13、ADR-02～04；与 ADR-04 的主题消费同批验证             | Accepted |
| [06](./06-standard-legend-consumption-and-traceability.md) | Standard Legend、外围 Box Layout 与 artifact lineage                                | ADR-04～05；Standard ADR-09；Core artifact-link hard gate         | Proposed |
| [07](./07-react-vanilla-authoring-and-documentation.md)    | React/Vanilla/SSR 与文档闭环                                                        | ADR-01～06                                                        | Proposed |

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

ADR-04/05 的共享主题消费部分必须作为同一产品单元实施、验证与交付，避免临时 palette、无 consumer token、双映射真源或 only-explicit-range 中间态；两篇 ADR 仍按各自完整契约独立收口。

## 当前进度

- ADR-05 已完成 Table owner definition、preset、resolver、shared categorical projection、正式 appearance / border / encoding / manifest / Legend descriptor 消费，以及跨入口和旧字段失败语义闭环，现已 Accepted。
- 本次收口不改变 ADR-01～04、06～07 的 Proposed 状态，也不代表 alpha.3 milestone 已完成；其余能力仍按各自 gate 独立收口。

ADR-04 的 ordinal/threshold mapping 属于 Table；continuous mapping 必须消费 Core 冻结的 context-free canonical RGBA 与 gradient-stop 求值语义。ADR-05 还依赖 Core ADR-13 的 inherited namespace、owner validation 与 shared categorical projection；ADR-06 只有在当前分支能从 Standard package root 消费 Accepted Legend/Flex schema、Definition、artifact 与 direct Definition contract，Table body 已能通过 lowering-only composite boundary 表达为 JSON-safe `IRChild`，且 Core/Standard 能把 Flex authored item key 穿过 nested replay 关联到最终 child occurrence 后才能实现。Gate 未满足时不建立 Table-local Legend、外围 solver、placeholder API，也不预测 child occurrence path。
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
