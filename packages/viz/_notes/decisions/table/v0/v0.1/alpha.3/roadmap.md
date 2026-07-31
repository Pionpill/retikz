# table v0.1-alpha.3 Roadmap：呈现语法

> 本 milestone 扩展 formatter、presentation、selector / rule、条件视觉 scale 与 theme / legend。具体公开字段和行为由同目录 ADR 冻结。
> 关联：[`table v0.1 roadmap`](../roadmap.md) · [`table-design.md`](../../../../../architecture/table-design.md) · [`table completeness`](../../../../../architecture/table-visualization-complete.md) · [`_template.md`](../../../../_template.md)

- 状态：设计中
- 启动日期：2026-07-31

## 目标

沿现有 Definition / registry 与 value → `IRChild` 链路扩展 formatter、presentation、selector / rule、conditional scale、theme 与 Legend descriptor，并把通用 Legend 呈现交给 Standard 消费。manual Table 的矩形 `rows` 持久化 authoring 已归入 alpha.2，不在本 milestone 重复定义。

## ADR 顺序

| ADR                                                        | 主题                                                   | Level  | 依赖                                   | 状态     |
| ---------------------------------------------------------- | ------------------------------------------------------ | ------ | -------------------------------------- | -------- |
| [01](./01-cell-formatter-and-formatted-value.md)           | Formatter Definition 与 formatted value                | red    | alpha.2 canonical model                | Proposed |
| [02](./02-presentation-context-and-cell-appearance.md)     | Presentation context 与 Cell appearance                | red    | ADR-01、Core Scope style               | Proposed |
| [03](./03-cell-selector-and-rule-cascade.md)               | Cell selector、value predicate 与 rule cascade         | red    | ADR-01～02                             | Proposed |
| [04](./04-conditional-visual-encoding-and-scale.md)        | 条件 color scale、visual encoding 与 Legend descriptor | red    | ADR-02～03                             | Proposed |
| [05](./05-theme-definition-and-style-resolution.md)        | Theme Definition、palette 与最终 style precedence      | red    | ADR-02～04                             | Proposed |
| [06](./06-standard-legend-consumption-and-traceability.md) | Standard Legend 消费、停靠布局与 artifact lineage      | red    | ADR-04～05；Standard alpha.3 hard gate | Proposed |
| [07](./07-react-vanilla-authoring-and-documentation.md)    | React / Vanilla authoring、runtime、SSR 与双语文档闭环 | yellow | ADR-01～06                             | Proposed |

## 执行顺序

```text
01 formatter
  └─▶ 02 presentation context + appearance
        └─▶ 03 selector + rule cascade
              ├─▶ 04 conditional visual encoding
              └──────────────┐
                             ▼
                       05 theme resolution
                             │
                             ▼
               Standard alpha.3 Legend gate
                             │
                             ▼
                 06 Legend consumption + lineage
                             │
                             ▼
                  07 adapters + SSR + docs
```

ADR-01～05 可以在 Table 内独立形成 presentation pipeline。ADR-06 只有在 Standard Legend schema、definition、layout、artifact 与 capability loading 已 Accepted 且当前分支可消费后才能进入实现；gate 未满足时不建立 Table-local 临时 Legend。ADR-07 等 ADR-06 闭环后统一完成三包 authoring 与文档。

## 测试策略

- formatter / presentation / theme definitions 通过同一 JSON options、registry、runtime contribution 与 output guard
- selector / rule 使用 canonical Cell identity 与 raw scalar，覆盖声明顺序、显式清除、类型不 coercion 和 structure-independent
- visual scale 单次 resolution 同时驱动 Cell appearance 与 Legend descriptor，不二次训练 domain
- theme、encoding、root rules 与 explicit border 使用固定 precedence，plain theme 保持 alpha.2 Scene 兼容
- Standard Legend 作为 opaque `IRChild` probe / replay；Table manifest 与 Standard nested artifact 来自同一次 compile
- React / Vanilla / direct / SSR 对同一 spec、definitions、datasets 与 Core measurer 得到等价 Scene 与 artifacts

详细测试契约保留在 ignored `notes/plans/table-alpha3-design/TEST_CONTRACT-*.md`，长期 ADR 只保留稳定摘要。

## 完成标准

- [ ] ADR-01～07 均完成测试契约、Architecture Gate 与人工确认
- [ ] formatter、presentation、selector/rule、encoding 与 theme 沿同一 canonical / registry / pipeline 主链闭环
- [ ] plain theme 不改变未使用 alpha.3 能力的 alpha.2 Table；grid/custom theme 可验证
- [ ] visual appearance 与 Legend descriptor 同源，Table 不依赖或特判 Plot
- [ ] Standard Legend hard gate 满足；Table 不复制 Legend schema、layout、lowering 或 artifact
- [ ] React / Vanilla / SSR / direct compile 等价，custom definitions 的 contribution 冲突可诊断
- [ ] 双语 docs、真实 demo、API reference、manifest inspector 与 changelog 草稿完成

## 不在 alpha.3 范围

- group、hierarchy、subtotal、pivot、matrix 与多层 header
- 选择、编辑、虚拟滚动和异步数据状态
