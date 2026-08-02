# table v0.1-alpha.3 Roadmap：呈现语法

> 本 milestone 扩展 formatter、presentation、selector/rule、条件视觉 scale、style tokens 与 Legend。具体公开契约与行为由同目录 ADR 冻结，执行细节由对应 ignored mirror plan 维护。
>
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md)

- 状态：设计与实施中
- 启动日期：2026-07-31

## 目标

- 在现有 canonical Cell 与 value→`IRChild` 主链上增加 formatter、appearance、selector/rule 与 conditional color encoding
- 用闭合、扁平、命名空间化的 style token vocabulary 支持 neutral、academic、vibrant、clean 四种 preset 及用户 overlay
- 由同一 visual scale resolution 产生 Cell appearance 与可选 Legend descriptor
- 通过 Standard Legend 与 Box Layout 完成通用 Legend 呈现和外围 composition，不在 Table 复制通用布局
- 让 framework-neutral、React、Vanilla、SSR、manifest 与 zh/en docs 表达同一契约

## ADR 与依赖

| ADR                                                        | 主题                                                   | 依赖                                   | 状态     |
| ---------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- | -------- |
| [01](./01-cell-formatter-and-formatted-value.md)           | Formatter Definition 与 formatted value                | alpha.2 canonical model                | Proposed |
| [02](./02-presentation-context-and-cell-appearance.md)     | Presentation context 与 Cell appearance                | ADR-01、Core Scope style               | Proposed |
| [03](./03-cell-selector-and-rule-cascade.md)               | Cell selector、predicate 与 ordered rule cascade       | ADR-01～02                             | Proposed |
| [04](./04-conditional-visual-encoding-and-scale.md)        | Conditional color scale、encoding 与 Legend descriptor | ADR-02～03；与 ADR-05 原子实施         | Proposed |
| [05](./05-style-preset-and-token-resolution.md)            | Style preset、公开 tokens 与 precedence                | ADR-02～03；与 ADR-04 原子实施         | Proposed |
| [06](./06-standard-legend-consumption-and-traceability.md) | Standard Legend、外围 Box Layout 与 artifact lineage   | ADR-04～05；Standard alpha.3 hard gate | Proposed |
| [07](./07-react-vanilla-authoring-and-documentation.md)    | React/Vanilla/SSR 与文档闭环                           | ADR-01～06                             | Proposed |

依赖主链：

```text
01 formatter
  → 02 presentation context + appearance
    → 03 selector + rule cascade
      → 04 conditional visual encoding + 05 style tokens（原子单元）
        → Standard alpha.3 Legend gate
          → 06 Legend consumption + lineage
            → 07 adapters + SSR + docs
```

ADR-04/05 必须作为同一产品单元实施、验证与交付，避免临时 palette、无 consumer token 或 only-explicit-range 中间态。

ADR-06 只有在当前分支能从 Standard package root 消费 Accepted FlexLayout 与 Legend schema/Definition/module/artifact/capability-loading 后才能实现。Gate 未满足时不建立 Table-local Legend、外围 Box Layout、placeholder API 或 renderer 特判。

## Milestone 边界

- Table 继续拥有复杂的 body layout、Cell geometry、Border Graph 与领域 lineage
- Standard 拥有 Legend visual structure、内部 layout、外围 Box Layout、lowering 与 typed artifacts
- Data parsing/transform、Plot scale/guide、Core measurement/renderer 与 adapter lifecycle 保持各自所有权
- manual Table 的矩形 rows authoring 已在 alpha.2 完成，本 milestone 不重复定义

## 完成标准

- [ ] ADR-01～07 均保持长期形态，并通过 Architecture Gate 与人工确认
- [ ] 七份 mirror plan/test-contract 与长期 ADR 保持完整追溯，ADR-04/05 以单一原子单元执行
- [ ] formatter、presentation、selector/rule、encoding 与 style tokens 沿同一 canonical pipeline 闭环
- [ ] neutral 为默认 preset；academic/vibrant/clean、light/dark 与 custom overlay 可观察且可诊断
- [ ] 显式 clean 提供 alpha.2 无装饰输出迁移路径
- [ ] Cell appearance 与 Legend descriptor 同源，Table 不依赖或特判 Plot
- [ ] Standard hard gate 满足，Legend/外围 layout/typed artifacts 由 Standard 提供
- [ ] direct、React、Vanilla、SSR 的 IR、Scene、artifacts、manifest 与错误语义等价
- [ ] zh/en docs、真实 demo、API/manifest reference、README 与 changelog 完成

## 不在 alpha.3 范围

- group、hierarchy、subtotal、pivot、matrix 与多层 header
- 选择、编辑、虚拟滚动和异步数据状态
- size/symbol/data bar/sparkline encoding 与跨 Plot Cell guide 协调
- 自动 dark mode、CSS theme sync 或任意 token/selector registry
