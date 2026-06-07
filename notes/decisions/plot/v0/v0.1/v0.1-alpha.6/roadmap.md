# plot v0.1-alpha.6 实施待办：数据模型类型层 + type-driven scale 选型（阶段二 R1 · Data + Scales）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`plot v0.1 roadmap`](../roadmap.md) · [`plot v0 roadmap`](../../roadmap.md)（阶段二 alpha.6）· [`plot-design §3.1 Data / §3.2 Dimension / §3.4 Scale`](../../../../architecture/plot-design.md) · [`_template.md`](../../_template.md) · 上个 milestone：[`v0.1-alpha.5`](../v0.1-alpha.5/roadmap.md)

## 目标

**阶段二第一轮**（GoG「**Data**」+「**Scales 选型**」组件）：把 alpha.1 起就埋好、却只半消费的 `data.model`（[alpha.1 ADR-02](../v0.1-alpha.1/02-plot-data.md)）升级成**承重的字段语义类型层**——让 scale 选型、guide 格式化、以及后续通道（alpha.7+）都从**字段类型**派生，而非逐处硬编码或强迫用户显式声明每个 scale。

现状（alpha.1~5）：`data.model` 有 4 类型（quantitative / nominal / ordinal / temporal）但 lowering 几乎只用 quantitative；scale 类型**靠用户显式声明 + coordinate 按名绑定**（`requireScaleDef`），没有从字段类型派生；无字段引用 / 类型校验；无缺省推断。

三块（对齐 [v0 roadmap](../roadmap.md) 阶段二排序「Data 先行」）：

- **数据模型类型层（ADR-01，真叶子）**：字段类型集补全（加 `proportion`；`interval` 是否作 field type 待决）+ **缺省推断**（无 `model` 时从绑定数据推字段类型）+ **encoding 字段引用 / 自洽校验**（fail-loud）。这是阶段二的结构性地基，撑住 ADR-02/03 与后续所有 scale / 通道 / guide。
- **数据模型可移植契约（ADR-02，dep 01）**：把 model 升级成**跨数据源契约**——spec 绑定逻辑字段（名 + PlotFieldType），数据源经适配层插入。解决三条换源需求：① 同名同类型直接换源（恒等绑定）；② 不同名经**绑定期 `fieldMaps`**（逻辑名→物理路径）映射；③ 不同 JS 类型但同 PlotFieldType 经**按类型值强制（coercion）**。前提是声明了 model（model = 可移植性开关）。
- **type-driven scale 默认选型 + guide 格式化（ADR-03，dep 01）**：channel 未显式声明 scale 时，按字段类型派生默认 scale（quantitative→linear、temporal→time、nominal/ordinal→band/point、proportion→linear[0,1]）；guide 按类型格式化（时间轴日期 / ordinal 分类 tick）。让最小 spec 可省 scale 声明。

## 不在 alpha.6（顺延）

- **非位置通道**（size / opacity / shape）+ legend → alpha.7-8
- **scale 家族新类型**（log / pow / sqrt / quantize / threshold / color gradient）→ alpha.7-8（本轮只做「按类型**选**现有 scale」，不新增 scale 类型）
- **series 一等化 / color 真通道** → alpha.7
- 更多 mark / 坐标系 / transform → alpha.9+

## core 依赖

**无新 core 依赖**——纯 plot 内（`ir` + `lower`）。不触 core IR 契约。

## 执行模式

**单条串行**：每 ADR 走 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾），人工 review 后开下一条。三 ADR 01/02/03 均已起草为 `Proposed`；多 LLM 评审已合入；逐条进实现（沿用 alpha.5）。

**设计阶段多 LLM 评估（已完成）**：三条 ADR 均 red，按 [`develop-design`](../../../../../.agents/skills/develop-design/SKILL.md) 跑「挑刺 / 替代方案」。**两轮评审结论已全部合入**——第一轮（P1 contract 收口：model strict、fieldMaps 需 model、统一 ingest 归一化、字段分类、React API、toTimestamp）+ 第二轮（决策建议：字段集含 transform 输入、temporal guard、抽样双阈值、quantitative 严格数字串、proportion 越界原样、validateData、类型↔scale fail-loud、默认映射）。见各 ADR「决策」/「头号设计决策」段。

## 实现顺序（编号 ≠ 依赖，叶子优先）

```
01 数据模型类型层 (真叶子：定字段类型集 + 推断 + 校验)
 ├─ 02 数据模型可移植契约 (dep 01：逻辑字段 + fieldMaps + 值强制)
 └─ 03 type-driven scale 选型 + guide 格式化 (dep 01：从字段类型派生 scale)
```

> 02 与 03 都只依赖 01 的类型层，彼此独立、可并行；02 偏数据绑定侧、03 偏 scale 侧。

> **测试 case 规则**（沿用 alpha milestone 放宽）：按复杂度适量，覆盖真实有意义的 accept/reject 与行为断言（类型推断结果、校验报错、scale 派生正确），不硬凑每 ADR ≥ 9。

## 前置 setup

无新包。alpha.6 主要在 `plot/src/ir/data.ts`（字段类型集）、新建 `plot/src/lower/{infer,validate}.ts`（推断 + 校验，ADR-01）、`plot/src/lower/coerce.ts`（按类型值强制，ADR-02）、改 `plot/src/lower/expand.ts`（接推断/校验/映射/强制）、扩 `LowerPlotsOptions`（`fieldMaps`，ADR-02）；ADR-03 再改 scale 选型链。

## ADR 清单

| ADR | 主题 | Level | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-data-model.md) | 数据模型类型层（字段类型集补全 + 缺省推断 + encoding 字段引用 / 自洽校验） | red | — | Proposed |
| [02](./02-data-portability.md) | 数据模型可移植契约（逻辑字段 + 绑定期 `fieldMaps` 映射 + 按 PlotFieldType 值强制；解决换源三需求） | red | ADR-01 | Proposed |
| [03](./03-type-driven-scale.md) | type-driven scale 默认选型 + guide 格式化（按字段类型派生 scale，channel 可省 scale 声明；类型↔scale fail-loud） | red | ADR-01 | Proposed |

## 头号设计决策（待多 LLM 评审 / 人工拍板）

> 多 LLM 评审（含第二轮决策建议）已于 2026-06-07 **全部拍板，并入各 ADR「决策」段**，无悬置项：

- **`interval` 不作 FieldType**：区间是双字段/双通道语义，本轮只加 `proportion`，区间留 alpha.9+（xStart/xEnd）。（ADR-01）
- **model strict / infer 二选一**：声明 model = strict（用户源字段必须列出）；无 model = 全推断；无混合。（ADR-01）
- **用户源字段集**：encoding `field` + mark `order`/`series` + transform 输入（`Sort.field`/`Stack.x/y/groupBy`）；排除派生输出（`startField`/`endField`、`y0Field`/`y1Field`）。（ADR-01）
- **temporal 推断**：`Date` 实例 + 严格 ISO（`YYYY-MM-DD` / 带 Z·offset datetime），拒 `YYYY/MM/DD`·`'5'`·模糊 datetime；抽样双阈值（≤1000 行/≤100 标量）；nominal vs ordinal 一律 nominal。（ADR-01）
- **fieldMaps**：放 `LowerPlotsOptions.fieldMaps`（不进 datasets）；**需 model**；值只允许路径串（无函数/展开/计算）；逻辑名∈model、ref∈datasets，否则 fail-loud。（ADR-02）
- **coercion**：ingest 一次性归一化成 canonical rows（transform 前）；quantitative 收严格数字串（拒空串/Infinity/NaN/hex/带单位）；proportion 越界原样；扩展 `toTimestamp` 收 Date + 严格 ISO。（ADR-02）
- **数据一致性校验**：`validateData?: boolean | { sampleRows?: number }`，默认关、开启抽样 fail-loud、**不 warn**。（ADR-02）
- **type-driven scale**：显式 scale 永远优先，缺省按 FieldType 派生（quantitative→linear、temporal→time、nominal/ordinal→band(位置)/ordinal(色)、proportion→linear[0,1]）；类型↔scale 不兼容 **fail-loud 不强转**；guide 按类型选 tick formatter。（ADR-03）

## 贯穿原则落点

- **alpha.1 埋点 → 承重**：alpha.1 ADR-02 埋的 `data.model` / `PlotFieldType`（当时「先放全集、零成本」），alpha.6 附上「驱动 scale 选型 + guide 格式化 + 校验」的语义，正是「零成本埋点 → 可用能力」的兑现。
- **AI 友好**：字段类型是 LLM 生成 spec 的核心入口（plot-design §3.6），类型驱动让 LLM 不必逐通道指定 scale；`.describe` 契约完整。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede。模板见 [`../../_template.md`](../../_template.md)。
