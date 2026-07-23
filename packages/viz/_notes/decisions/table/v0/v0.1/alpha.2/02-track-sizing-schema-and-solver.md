# ADR-02：轨道尺寸 schema 与确定性两轴求解

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[alpha.2 roadmap](./roadmap.md) · [Core constrained layout gate](./01-core-constrained-layout-gate.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md) · [alpha.1 固定轨道](../alpha.1/04-table-layout.md)

## 背景

alpha.1 的 `columnWidth`、`rowHeight` 与 `headerHeight` 只能为全部同类轨道提供统一固定尺寸。它无法表达列级差异、内容驱动的自然尺寸、剩余空间分配或上下界，也无法在列宽确定后重新约束含文本内容并得到自动行高。

Table 需要拥有轨道求解，但不拥有任意 `IRChild` 的测量。ADR-01 已把 intrinsic / constrained layout、统一边界口径和 replay 一致性下沉到 Core。本 ADR只定义 Table 如何表达轨道，以及纯 solver 如何从已经归一化的数值 contribution 与 available size 求解单轴尺寸。Core layout transaction、两轴测量编排、replay 与 artifact 同源性统一由 ADR-06 接线。

轨道求解是 Table 正确性不变量，不是开放 provider。若允许用户替换 solver，span、border、manifest 与 adapter 将无法共享同一几何语义，因此本 ADR 不建立 Definition / registry。

## 决策：显式轨道变体、稀疏索引覆盖与列优先两轴求解

### 轨道 schema

新增四种 JSON-safe 轨道尺寸：

```ts
type IRTableTrackSize =
  | { kind: 'fixed'; value: number }
  | { kind: 'auto' }
  | { kind: 'fraction'; weight?: number }
  | {
      kind: 'minmax';
      min: { kind: 'fixed'; value: number } | { kind: 'auto' };
      max: { kind: 'fixed'; value: number } | { kind: 'auto' } | { kind: 'fraction'; weight?: number };
    };

type IRTableTrackOverride = {
  index: number;
  size: IRTableTrackSize;
};

type IRTableLayout = {
  columnSize?: IRTableTrackSize;
  rowSize?: IRTableTrackSize;
  headerRowSize?: IRTableTrackSize;
  columns?: Array<IRTableTrackOverride>;
  rows?: Array<IRTableTrackOverride>;
  columnGap?: number;
  rowGap?: number;
};
```

字段语义：

- `fixed.value` 是有限非负尺寸；允许 `0` 表达显式折叠轨道
- `auto` 使用该轨道内非 spanning Cell 的 canonical allocation bounds 最大值
- `fraction.weight` 是有限正数，省略时运行时物化为 `1`
- `minmax.min` 只接受 fixed / auto；`max` 接受 fixed / auto / fraction
- min 与 max 都为 fixed 且 `min.value > max.value` 时 schema 拒绝
- runtime auto min 大于 fixed max 时，min 胜出；固定 max 不反向压缩内容下界
- `columns` / `rows` 是按 canonical index 的稀疏覆盖，不要求复制未覆盖轨道
- 同一数组内 index 必须唯一；负数、非整数与重复 index 在 schema 拒绝
- 越界 index 依赖 SemanticTableModel 轨道数量，在 layout resolve 阶段 fail-loud

默认值保持 alpha.1 的可见尺寸：

- `columnSize` 省略为 `{ kind: 'fixed', value: 120 }`
- `rowSize` 省略为 `{ kind: 'fixed', value: 32 }`
- `headerRowSize` 省略时使用 resolved `rowSize`
- gaps 省略为 `0`
- 轨道优先级为显式 `columns[index]` / `rows[index]` > header row 默认 > axis 默认

alpha.1 的 `columnWidth`、`rowHeight`、`headerHeight` 在 alpha.2 最终删除，不保留 alias。该 breaking switch 不允许由 ADR-02 单独落地：ADR-02 可以先新增独立 track schema / resolver / numeric solver，但 `TableLayoutSchema` 新字段激活、旧字段删除、`layoutTable()` 切换与公开 lowering 更新必须和 ADR-06 的 Core transaction 在同一次原子迁移中完成。

### Solver 输入边界

轨道 schema 不保存宿主 viewport。纯 solver 接收：

```ts
type TableTrackContribution = Readonly<{
  trackIndex: number;
  size: number;
}>;

type SolveTableTracksInput = Readonly<{
  tracks: ReadonlyArray<ResolvedTableTrackSize>;
  contributions: ReadonlyArray<TableTrackContribution>;
  gap: number;
  availableSize?: number;
}>;

const solveTableTracks = (input: SolveTableTracksInput): ReadonlyArray<number>;
```

`availableSize` 是调用方已经从公共上游合同取得的单轴有限非负约束；省略表示 unconstrained。solver 不接收 `IRChild`、definitions、host capabilities、renderer 或 adapter props，也不负责取得 Core 环境。

返回数组与 `tracks` 等长、同序，每项是对应 canonical track 的最终 size。offset、id 与 axis bounds 由后续布局编排从该数组和 gap 物化；`solveTableTracks` 是 pipeline 内部纯函数，不进入 package root public surface。

`TableTrackContribution.size` 是 Cell 在该轴要求的外部 allocation size。solver 不知道它来自内容、padding 或 span：

- ADR-03 负责把 content allocation、padding 与 span 归一为 contribution
- ADR-06 负责在同一次 Core layout transaction 中取得 content allocation 并调用两轴 solver
- visual overflow bounds 不进入轨道 contribution
- 所有 contribution 必须有限且非负；重复的单轨 contribution 取最大值
- 空轨道的 auto contribution 为 `0`

numeric solver 在入口统一 fail-loud：

- `trackIndex` 必须是 `0 <= index < tracks.length` 的整数；负数、小数与越界均拒绝
- `gap` 必须是有限非负数
- `availableSize` 存在时必须是有限非负数
- resolved fixed value、fraction weight 与 contribution size 必须保持 schema / resolver 已冻结的有限性和正负约束
- 不静默丢弃非法 contribution，不把 NaN / Infinity / negative clamp 为 `0`

### 单轴求解

对每个轴执行同一纯 solver。先从 available size 扣除 gap 总和，得到可分配 track space，最小为 `0`。

每种轨道先解析 contribution `c`，再得到 base、growth limit 与 flex factor：

| 轨道                          | constrained base | growth limit | flex factor | unconstrained size       |
| ----------------------------- | ---------------- | ------------ | ----------- | ------------------------ |
| fixed(v)                      | `v`              | `v`          | `0`         | `v`                      |
| auto                          | `c`              | `c`          | `0`         | `c`                      |
| fraction(w)                   | `0`              | `∞`          | `w`         | `c`                      |
| minmax(fixed(m), fixed(x))    | `m`              | `max(m, x)`  | `0`         | `clamp(c, m, max(m, x))` |
| minmax(fixed(m), auto)        | `m`              | `max(m, c)`  | `0`         | `max(m, c)`              |
| minmax(fixed(m), fraction(w)) | `m`              | `∞`          | `w`         | `max(m, c)`              |
| minmax(auto, fixed(x))        | `c`              | `max(c, x)`  | `0`         | `c`                      |
| minmax(auto, auto)            | `c`              | `c`          | `0`         | `c`                      |
| minmax(auto, fraction(w))     | `c`              | `∞`          | `w`         | `c`                      |

constrained 轴上的剩余空间为 `trackSpace - sum(base)`：

- 剩余空间 `<= 0` 时保留全部 base；轨道总和可超过 available size，形成 Table overflow，不报 Core constraint failure
- **bounded growth 阶段**：所有 `growth limit > base` 且 `flex factor = 0` 的 minmax 轨道参加等额 water-fill。每轮按 active track 数均分剩余，达到 limit 的轨道封顶退出；释放的剩余继续在未封顶 bounded tracks 中均分，直到耗尽或全部封顶
- **flex growth 阶段**：bounded growth 后仍有剩余时，普通 fraction 与 `minmax(..., fraction)` 按 normalized weight 一次分配；这两类 flex growth limit 均为 `∞`，不存在“带 fixed cap 的 flex track”
- fixed 与 auto 不参加 growth；minmax auto / fixed max 只参加 bounded growth
- 没有 flex 轨道时，Table allocation size 等于轨道和而不是强行铺满 available size

water-fill 每轮至少让一个 bounded track 封顶或耗尽 remaining，因此有限终止；active track 以 canonical index 集合处理，结果不依赖 contribution 或 override 输入顺序。

数值例：

- available track space `140`，两个 `minmax(fixed(20), fixed(100))` / `minmax(fixed(20), fixed(60))`：base 为 `20/20`，等额增长后第二轨先在 `60` 封顶，释放量继续给第一轨，结果 `80/60`
- available track space `300`，`minmax(fixed(20), fixed(60)) + 1fr + 2fr`：bounded 轨先增至 `60`，剩余 `240` 按权重分为 `80/160`，结果 `60/80/160`
- contribution `80` 的 `minmax(fixed(20), auto)`：growth limit 为 `80`；available 足够时结果 `80`，不足时在 `20...80` 之间参与 bounded water-fill

unconstrained 轴不执行 bounded / flex growth；直接使用表中 unconstrained size，保证自然尺寸可确定。

### 两轴组合边界

ADR-02 冻结 column-first 的调用顺序，但不取得或包装 Core service：

1. 调用方准备 column contributions，求解 columns
2. 调用方依据 columns 准备 row contributions，求解 rows
3. 调用方用最终行列盒完成 replay

padding 和 span 不要求反向修改 solver：ADR-03 只改变 contribution 的生成方式。最终 replay 不反向重开 column solver；若内容在 height constraint 下改变 width，超出的部分进入 visual overflow，由 ADR-04 处理。

`TableTrackLayout` 在本 ADR 仍只保留 `id`、`index`、`offset`、`size`；resolved sizing 只存在于 layout pipeline 内部，不通过 spread 泄漏到公开 manifest。ADR-06 决定 manifest 是否需要稳定的 sizing 摘要。

理由：

1. 判别 union 比数字 / 字符串混合 shorthand 更适合 JSON 持久化、LLM 生成和 schema 文档
2. 稀疏 index 覆盖同时适用于 detail、manual 与 custom canonical model，不泄漏内部生成 id
3. column-first contribution 顺序为后续文本换行与自动行高提供单向数据流，避免 solver 自己持有 Core service
4. solver 保持封闭纯函数，span、border、lowering 才能共享同一几何不变量

## 待决策点 🔻

以下接线由 ADR-06 在 Kernel ADR 落地后冻结；在此之前 ADR-02 只允许实现纯 schema / numeric solver，不得增加 Table 私有 option：

- Core available width / height 如何进入同一次 Table layout transaction
- Core `IRChild` layout service、definitions 与 host environment 如何供 contribution 生成和最终 replay 复用
- emitted Core IR 与 manifest 如何消费同一次 transaction 结果
- React / Vanilla runtime contribution 与 artifact API 如何避免二次 lowering 漂移

原子迁移关卡：

- ADR-02 的 standalone 子步骤只能新增不改变 `TableLayoutSchema` 解析结果的 track variants、resolver、numeric solver 与直接单元测试
- `columnSize` / `rowSize` / `headerRowSize` / `columns` / `rows` 接入 `TableLayoutSchema`，以及旧三个字段删除，必须延后到 ADR-06
- ADR-06 同一改动必须切换 `resolveTableLayoutSpec()`、`layoutTable()`、`resolveTable()`、lowering / manifest 与 adapters，不能提交只接受新 schema 但仍读取旧 resolved fields 的中间状态
- 若仓库工作流要求 ADR 粒度 commit，ADR-02 只提交无行为变化的 preparatory primitives；breaking activation 归 ADR-06 commit

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  structure: {
    kind: 'detail',
    columns: [
      { id: 'name', field: 'name' },
      { id: 'score', field: 'score' },
      { id: 'note', field: 'note' },
    ],
  },
  layout: {
    columnSize: { kind: 'auto' },
    columns: [
      { index: 1, size: { kind: 'fixed', value: 72 } },
      {
        index: 2,
        size: {
          kind: 'minmax',
          min: { kind: 'fixed', value: 120 },
          max: { kind: 'fraction', weight: 2 },
        },
      },
    ],
    rowSize: { kind: 'auto' },
    columnGap: 8,
    rowGap: 4,
  },
};
```

## 测试设计

`packages/viz/table/tests/ir/layout.test.ts` 与 `packages/viz/table/tests/layout/track-sizing.test.ts` 覆盖：

- 四种轨道变体、默认值、稀疏覆盖和精确 reject
- fixed / auto / fraction / minmax 的 constrained 与 unconstrained 结果
- fraction 权重、fixed max、min 胜出和 available size 不足时的 overflow
- 纯 solver 的 column-first contribution 调用顺序；Core 文本换行与同事务 replay 由 ADR-06 integration tests 覆盖
- detail、manual、custom 只消费 canonical 顺序，不按 structure kind 分支
- 重复求解、输入顺序与 detached output 的确定性

详细行为矩阵见 ignored `notes/plans/table-alpha2-track-sizing/TEST_CONTRACT.md`。

## 影响

- ⚠️ BREAKING：alpha.2 原子激活时删除 `columnWidth`、`rowHeight`、`headerHeight`，改为判别式轨道 schema；激活由 ADR-06 执行
- ADR-02 standalone 子步骤只新增 track variants / resolver / solver，不改变当前 `IRTableLayout` 可观察解析结果
- layout schema 从固定数字扩展为显式轨道变体，pipeline 新增纯 numeric solver
- `TableTrackLayout` 公共形态不变；resolved sizing 只在 pipeline 内部消费，manifest 由 ADR-06 决定
- 不修改 structure / presentation Definition，不新增 solver registry
- Core transaction、artifact 与 adapter 接线由 ADR-06/07 完成；本 ADR不增加 Table 私有 constraint / measurement options
- 双语 docs、demo、API 参考和迁移说明由 ADR-07 与本 ADR作为同一 alpha.2 改动集闭环

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Track Sizing
- 解决的问题：把 canonical rows / columns、内容 allocation contribution 与可用约束求解为确定轨道
- 主责包与协作包：`@retikz/table` 主责 schema 与 solver；Core 提供通用内容 layout；adapters 只形成等价环境
- 是否可由现有能力组合：alpha.1 固定公式不足；Core Grid 不拥有 Table semantics，需要扩展 Table Layout
- 是否需要下沉到 data / core / math：内容测量先下沉 Core；轨道算法留在 Table，可复用 Math 的 bounds 纯类型
- 内部表达链路：layout schema → resolve axis tracks → normalized numeric contribution → pure solver → TableTrackLayout
- 外部扩展链路：不采用 registry；轨道和 solver 是封闭布局不变量，custom structure 通过同一 SemanticTableModel 自动参与
- pipeline / lowering 与下游消费：ADR-03 生成含 padding / span 的 contribution 并形成 Cell box；ADR-06 负责 Core transaction、lowering 与 manifest
- React / Vanilla adapter 等价性：本 ADR只要求相同 resolved tracks、numeric contributions 与 available size 得到相同结果；Core environment parity 由 ADR-06/07 证明
- provenance / lineage / locator 是否适用：track 保留 semantic id / index；是否公开 sizing 摘要由 ADR-06 决定
- 不支持边界与本轮结论：扩展 Table Layout；span、Cell box、fit、border 分别由后续 ADR 组合，不进入 Data / renderer

## 不在本 ADR 范围

- span contribution 与 Cell box padding / alignment
- fit / overflow / clip 和 visual overflow bounds 放置
- Border Graph、fragmentation、virtual scroll
- baseline alignment、writing-mode、RTL 与内容依赖 height 后反向重开 column solver
- Core constrained-layout API 的具体类型与实现

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。最终原子激活会修改公开 Table IR schema 与布局核心 pipeline；standalone preparatory 子步骤不改变当前公开行为。

### Schema 改动

| 文件                                                 | 操作 | 字段名                                | 类型                          | 默认值             | describe 中文摘要                       |
| ---------------------------------------------------- | ---- | ------------------------------------- | ----------------------------- | ------------------ | --------------------------------------- |
| `packages/viz/table/src/schemas/layout/constants.ts` | 新增 | `TableTrackSizeKind`                  | const object enum             | —                  | fixed / auto / fraction / minmax 判别值 |
| `packages/viz/table/src/schemas/layout/schema.ts`    | 新增 | `TableFixedTrackSizeSchema.value`     | nonnegative number            | —                  | 固定轨道尺寸                            |
| 同上                                                 | 新增 | `TableFractionTrackSizeSchema.weight` | positive number optional      | runtime `1`        | 弹性轨道权重                            |
| 同上                                                 | 新增 | `TableMinmaxTrackSizeSchema.min`      | fixed 或 auto                 | —                  | 轨道最小尺寸                            |
| 同上                                                 | 新增 | `TableMinmaxTrackSizeSchema.max`      | fixed / auto / fraction       | —                  | 轨道最大尺寸或弹性上限                  |
| 同上                                                 | 新增 | `TableTrackOverrideSchema.index`      | nonnegative integer           | —                  | canonical 轨道索引                      |
| 同上                                                 | 新增 | `TableTrackOverrideSchema.size`       | `IRTableTrackSize`            | —                  | 该索引的轨道尺寸覆盖                    |
| 同上（ADR-06 原子激活）                              | 删除 | `TableLayoutSchema.columnWidth`       | positive number optional      | `120`              | 旧统一列宽                              |
| 同上（ADR-06 原子激活）                              | 删除 | `TableLayoutSchema.rowHeight`         | positive number optional      | `32`               | 旧统一行高                              |
| 同上（ADR-06 原子激活）                              | 删除 | `TableLayoutSchema.headerHeight`      | positive number optional      | resolved rowHeight | 旧统一表头行高                          |
| 同上（ADR-06 原子激活）                              | 新增 | `TableLayoutSchema.columnSize`        | `IRTableTrackSize` optional   | fixed `120`        | 默认列轨道尺寸                          |
| 同上（ADR-06 原子激活）                              | 新增 | `TableLayoutSchema.rowSize`           | `IRTableTrackSize` optional   | fixed `32`         | 默认 body 行轨道尺寸                    |
| 同上（ADR-06 原子激活）                              | 新增 | `TableLayoutSchema.headerRowSize`     | `IRTableTrackSize` optional   | resolved rowSize   | 默认列表头行轨道尺寸                    |
| 同上（ADR-06 原子激活）                              | 新增 | `TableLayoutSchema.columns`           | track override array optional | `[]`               | 稀疏列轨道覆盖                          |
| 同上（ADR-06 原子激活）                              | 新增 | `TableLayoutSchema.rows`              | track override array optional | `[]`               | 稀疏行轨道覆盖                          |

`columnGap` / `rowGap` 保持有限非负数和默认 `0`。

### 文件 scope

ADR-02 standalone preparatory 实现允许触碰：

- `packages/viz/table/src/schemas/layout/{constants,schema,types,index}.ts`
- `packages/viz/table/src/shared/layout.ts`
- `packages/viz/table/src/pipeline/layout/{types,resolve,track,index}.ts`
- `packages/viz/table/tests/ir/layout.test.ts`（只测独立 track schemas，不切换根 layout）
- `packages/viz/table/tests/layout/track-sizing.test.ts`
- alpha.2 对应双语 docs / demo / reference 文件（与 ADR-07 同一改动集）

ADR-06 原子激活时额外触碰 `schemas/layout/schema.ts` 的根字段、`pipeline/layout/{layout,types}.ts`、`pipeline/resolve.ts`、lowering / manifest / adapters；准确白名单由 ADR-06 冻结。Core 产品文件、`LowerTablesOptions`、runtime contribution、artifact API、adapters 与 public manifest 不在 ADR-02 standalone scope。

### 测试象限

**Happy path（≥ 3）**：

- `auto 取最大外部 contribution`：同轨道多个贡献 → 轨道取最大 allocation requirement
- `fraction 按权重分配`：有限 available width + 1fr / 2fr → 正剩余空间按 1:2 分配
- `bounded water-fill 可重分配`：两个不同 fixed max 的 minmax → 较小上限封顶后剩余继续分配
- `稀疏覆盖优先`：默认 auto + 指定 index fixed → 仅该轨道使用 fixed

**边界（≥ 2）**：

- `无约束 fraction 退化为 intrinsic`：没有 available size → fraction 轨道使用内容自然贡献
- `空间不足保留下界`：available size 小于 fixed / min 总和 → 轨道不压缩并形成 overflow
- `空 auto 轨道为零`：轨道没有 Cell contribution → size 为 `0`

**错误路径（≥ 2）**：

- `重复或越界覆盖拒绝`：重复 index 在 schema 拒绝，超出 canonical count 在 resolve fail-loud
- `非法尺寸拒绝`：负 fixed、零 fraction weight、fixed min 大于 fixed max → 精确字段错误
- `非法 contribution index 失败`：negative / fractional / out-of-range trackIndex → solver fail-loud
- `非法 solver 边界失败`：NaN / Infinity / negative contribution、gap 或 availableSize → 不进入求解

**交互（≥ 2）**：

- `header 默认与覆盖组合`：headerRowSize + rows[index] → index 覆盖优先
- `max auto 参与 bounded growth`：`minmax(fixed(20), auto)` + contribution 80 → available 足够时增长到 80
- `custom structure 同路`：自定义 definition 输出 canonical tracks → 不需要 layout provider 补丁
- `重复执行确定`：相同 resolved tracks、contributions 与 available size → sizes 深等且不修改输入

### 依赖的现有元素

- `IRTableLayout`（`packages/viz/table/src/schemas/layout`）—— breaking 扩展为判别式轨道语法
- `SemanticTableModel`（`packages/viz/table/src/contract/model`）—— 后续调用方提供 canonical 轨道顺序，本 solver 不读取 structure kind
- `TableTrackLayout`（`packages/viz/table/src/pipeline/layout/types.ts`）—— 保留 id / index / offset / size 公共几何
- `TableLayoutManifest`（`packages/viz/table/src/contract/manifest.ts`）—— 本 ADR明确不修改，避免内部 resolved sizing 泄漏
- Core constrained-layout public contract（由 ADR-01 gate 的 Kernel ADR 提供）—— 不在本 ADR直接消费，由 ADR-06 接入
