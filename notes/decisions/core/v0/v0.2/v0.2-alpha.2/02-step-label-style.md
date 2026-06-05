# ADR-02：StepLabel 样式扩展（textColor / opacity / font + label 继承顺序）

- 状态：Accepted（已实现）
- 决策日期：2026-05-21
- 关联：[v0 roadmap §Step label 自定义样式提案](../../roadmap.md#step-label-自定义样式提案) · [core-design.md §1.2 AI 一等公民](../../../../../architecture/core-design.md) · [本 milestone ADR-01 Scope 样式继承](./01-scope-style-inheritance.md)

## 背景

`StepLabelSchema`（`core/src/ir/path/step.ts`）原只有 `text` / `position` / `side` 三字段；渲染时 `compile/path/label.ts` 把 `fill: 'currentColor'` **硬编码** —— 所有边标注一律跟主题色（黑/白），**无法与所标注的线段同色**。给彩色函数线配标注时尤其违和：标签全是 currentColor 一片黑，读者得对照线色反推归属。

对照 `NodeLabelSchema`（node 边挂标签）已有 `textColor` / `opacity` / `font`，StepLabel（path 段标注）缺这套、两类 label 样式能力不对称。

本质是"label 级样式继承"：只有 ADR-01 的继承 plumbing（labelDefault）就位后，StepLabel 的继承顺序链才有挂点；schema 扩展本身机械、难点在继承顺序，与 ADR-01 同源同窗口出。

## 决策：StepLabel 加 `textColor` / `opacity` / `font`，对齐 NodeLabel

三字段加在 `StepLabelSchema` 末尾、全 optional（`text`/`position`/`side` 不动）；`compile/path/label.ts` 把硬编码 fill / fontSize 改为回退链。schema 见 `core/src/ir/path/step.ts`，回退链见 `core/src/compile/path/label.ts`。

理由：

1. **对称**：与 NodeLabel 样式能力对齐（同名同义），心智统一、reference 文档结构一致。
2. **零破坏**：三字段加在末尾、全 optional；不给时回退 `currentColor`，v0.1 既有标注行为不变。
3. **同窗口**：与 ADR-01 的 labelDefault 继承同源，一次出 ADR、一次改 schema reference，避免分次回填。

### 决策细节（拍板的 WHY）

- **`textColor` 继承顺序**：`label.textColor > scope.labelDefault.(textColor|color) > 宿主 path 已解析主色 color > 'currentColor'`。跟随的是宿主 path 的**主色 `color`**（= TikZ current color），不是 stroke —— `<Path color="red">` 标签红、`<Path stroke="red">`（只染线）标签不变色，与 TikZ 一致（修正早稿"跟 stroke"的偏离）。labelDefault 压宿主主色。
- **`font` 回退链**：逐字段 `label.font?.X > scope.labelDefault.font?.X > renderer 默认`（family / size / weight / style 各自独立回退，非整个 font 对象替换）。
- **`opacity` 语义**：label-only opacity，与**所属 path** 的 opacity **相乘**（step label 只挂 path、无 node 宿主）—— 这是元素内一轴；**跨 scope 不复合**（scope 间 opacity 走覆盖，随 ADR-01）。注：NodeLabel 现有 opacity 是回退非相乘，两类 label 此点不对称；本 ADR 不动 NodeLabel，如需统一另开。
- **labelDefault 通道**：由 [ADR-01](./01-scope-style-inheritance.md) 定义（node label 与 step label 共享）；本 ADR 只定义 StepLabel 如何消费它。
- **`resetStyle=['label']` 不切宿主跟随**：屏障只忽略外层 `labelDefault`（scope 继承轴），StepLabel 仍跟宿主 path 已解析主色（实例-host 轴非 scope 继承），label 不成孤岛（详 ADR-01）。

### 被否决的选项

- **B：只加 `textColor`，不加 `opacity` / `font`** —— 最小改动解决"标签同色"主诉求，但与 NodeLabel 三字段不对称；`font`（小一号字）、`opacity`（淡化次要标注）是真实需求，分两次开窗反复回填 reference + 文档。三字段同源、一次性补成本最低。
- **C：不加字段，让用户用 `<Node>` 当标注** —— 丢失 StepLabel 的 `position`（沿段归一化定位）/ `side`（法向偏移 / sloped），用户得手算位置，与"边标注"语义背离。

## 不在本 ADR 范围

- **scope `labelDefault` 字段定义** → [ADR-01](./01-scope-style-inheritance.md)（本 ADR 只消费）。
- **NodeLabel 样式字段**：已有，不动。
- **per-field `'initial'` 取消继承哨兵** → 未来扩展。
- **label 背景框 / 描边**（TikZ `label` 的 `fill` / `draw`）→ v0.2 不做。

---

> **实现指针**：level `red`（动 `ir/**` step schema + `compile/**` label 回退链）、additive 零破坏（三字段加在末尾、全 optional，不给时回退 currentColor）。真源以代码为准 —— `StepLabelSchema` 加 `textColor`/`opacity`/`font`（`core/src/ir/path/step.ts`，8 个含 label 的 step variant 自动获得）、fill/font 回退链 + 消费 scope labelDefault（`core/src/compile/path/label.ts`）；测试在 `core/tests/ir/step-label.schema.test.ts` 与 `core/tests/compile/path-label-style.test.ts`。完整原文（Schema 改动表 / 文件 scope / 测试象限 / DSL 表面）见本文件 git 历史。
