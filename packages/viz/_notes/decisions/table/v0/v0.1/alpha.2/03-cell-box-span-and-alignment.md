# ADR-03：Cell box、矩形 span 与 bounds-aware alignment

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[alpha.2 roadmap](./roadmap.md) · [轨道尺寸与 solver](./02-track-sizing-schema-and-solver.md) · [Core constrained layout gate](./01-core-constrained-layout-gate.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

alpha.1 把每个 Cell 固定映射到单个 row × column，并把内容原点移动到 Cell 中心。该模型既不能表达跨行跨列，也没有 Cell padding；更重要的是，它假设内容的局部原点就是视觉中心，无法正确放置原点偏移、带 transform 或嵌套 composite 的任意 `IRChild`。

ADR-02 已冻结轨道 schema 与只消费数值 contribution 的 solver。Cell 必须在进入 solver 前把内容 allocation bounds、padding 与 span 归一为数值需求，并在轨道完成后形成确定的矩形 Cell box。visual overflow bounds 不参与轨道尺寸和对齐，避免 stroke、shadow 等装饰反向改变表格拓扑。

span、占位冲突、Cell box 与 alignment 是 Table 的封闭布局不变量，不是开放 provider。manual、detail 与 custom Structure 都通过同一个 `TableStructureOutput` 和 `SemanticTableModel` 参与，不按 structure kind 建立布局分支。

## 决策：Cell 持有 span/layout，span 传播 contribution，内容按 allocation bounds 对齐

### Cell schema

新增 JSON-safe Cell span 与布局对象：

```ts
type IRTableCellSpan = {
  rows?: number;
  columns?: number;
};

type IRTableCellLayout = {
  padding?: number | IRBoxSpacing;
  horizontalAlign?: 'start' | 'center' | 'end';
  verticalAlign?: 'start' | 'center' | 'end';
};

type IRTableCell = {
  // alpha.1 fields
  span?: IRTableCellSpan;
  layout?: IRTableCellLayout;
};
```

字段语义：

- `span.rows` / `span.columns` 是有限正整数，省略时均为 `1`
- Cell address 始终表示覆盖矩形的左上角 canonical row / column
- `padding` 复用 Core `BoxSpacingSchema`：number 同时作用四边；对象按 side > axis > default > `0` 解析
- padding 每个值必须有限非负；省略时四边均为 `0`
- `horizontalAlign` / `verticalAlign` 省略时均为 `center`，保持 alpha.1 的可见行为
- alpha.2 的 `start` / `end` 分别表示 Table 局部坐标轴的较小 / 较大坐标，不引入 writing-mode 或 RTL 映射
- alignment 不包含 `stretch`；改变内容尺寸属于 ADR-04 的 fit

`TableStructureOutputSchema.cells` 与 `SemanticTableCell` 同步持有 resolved `span` 和 `layout`。Structure provider 可以省略二者，normalize 统一物化默认值；后续布局不读取 provider identity。

detail Structure 在列定义上增加：

```ts
type IRTableDetailColumn = {
  // alpha.1 fields
  headerLayout?: IRTableCellLayout;
  bodyLayout?: IRTableCellLayout;
};
```

内置 detail provider 把 `headerLayout` 写入该列生成的 header Cell，把 `bodyLayout` 写入所有 body Cell。detail 本身仍生成 1 × 1 Cell；多层表头和跨列 spanner 属于 alpha.5。manual Cell 与 custom Structure output 可以直接声明 span。

### 矩形占位合同

normalize 在 canonical rows / columns 已知后验证：

1. span 起点必须是合法 address
2. `row + rows <= rowCount` 且 `column + columns <= columnCount`
3. Cell 覆盖连续的矩形 canonical tracks
4. span 覆盖的全部 rows 必须与起始 row 具有相同 `TableRowKind`；alpha.2 禁止单个 Cell 跨越 columnHeader / body 等语义区域
5. 任意两个 Cell 的覆盖矩形不得共享同一 row × column 槽位
6. Cell id 仍唯一；未被任何 Cell 占据的槽位合法

占位检查取代 alpha.1 只检查起点 address 重复的规则。错误必须指出冲突 Cell id 与首个重叠槽位，不能依赖数组顺序静默覆盖。

React `<ManualTable>` 的 marker children 使用同一占位合同：builder 按 Row 声明顺序维护 canonical occupancy matrix；每个 `<Cell>` 从当前 row 的最小未占 column 开始放置，span 立即预占当前及后续 rows 的矩形槽位，后续 Cell 跳过已占槽位。span 越界、当前 Row 无可放置槽位或覆盖冲突均 fail-loud。需要显式保留任意空洞时使用 `cells` prop 的 address，而不是让 marker 推测空槽。builder 最终输出与 Vanilla/plain manual spec 等价的显式 address + span。

### 外部 contribution 与 span 传播

Core 返回内容的 canonical allocation bounds。对每个 Cell，先把 allocation width / height 加上对应轴两侧 padding，得到有限非负的外部 contribution：

```text
outerWidth  = allocation.width  + padding.left + padding.right
outerHeight = allocation.height + padding.top  + padding.bottom
```

visual overflow bounds 不进入 contribution。非 spanning Cell 直接把外部 contribution 交给对应单轨。spanning Cell 的 contribution 由独立纯函数传播为 per-track contributions，ADR-02 solver API 不增加 Cell 或 span 参数。

每个轴独立执行：

1. 从非 spanning Cell 得到每轨初始 contribution `c`；同轨取最大值
2. 按 ADR-02 的 unconstrained size 表，从轨道定义与 `c` 计算 provisional natural size；fixed value 和 minmax base 因而计入已有覆盖量
3. spanning constraints 按 `(span length, start index, cell id)` 升序处理，结果不依赖 Structure output 的 Cell 数组顺序
4. 当前覆盖量是 span 内各轨 provisional natural size 之和加内部 gaps；只处理正 deficit
5. fixed 轨道不接收 deficit
6. 第一阶段在 auto 与非 flex minmax 轨道间，**以 provisional natural-size 增量**执行等额 water-fill；达到 span growth limit 的轨道封顶退出
7. 每次 water-fill 先得到严格大于当前 natural size 的目标 `n'`，再把该轨 contribution 单调更新为 `c' = n'`；这会一次跨过 `minmax(fixed(m), ...)` 在 `c < m` 时的平台，不能把 natural-size 份额直接加到 raw `c`
8. 仍有 deficit 时，在 fraction 与 `minmax(..., fraction)` 间按正 weight 分配 natural-size 增量，并同样以 `c' = n'` 反写 contribution
9. 每轮必须让至少一个 active track 产生正 natural-size 增长、达到 limit 退出，或耗尽 deficit；否则视为内部算法错误并 fail-loud，不能无进展循环
10. 没有可增长轨道或全部达到上限时保留未满足 deficit；最终内容按 ADR-04 形成 overflow，不修改 fixed 轨道

传播结果只是 ADR-02 的数值 contribution 输入。constrained solver 仍可因 available size 不足得到小于 Cell 自然需求的轨道；这属于正常 Table overflow。span 传播不反向调用 Core、不取得 adapter 环境，也不修改输入。

各变体的 span contribution 更新规则固定为：

| 轨道                          | provisional natural size | 接收 span deficit | span growth limit                |
| ----------------------------- | ------------------------ | ----------------- | -------------------------------- |
| fixed(v)                      | `v`                      | 否                | `v`                              |
| auto                          | `c`                      | 第一阶段等额      | `∞`                              |
| fraction(w)                   | `c`                      | 第二阶段按 weight | `∞`                              |
| minmax(fixed(m), fixed(x))    | `clamp(c, m, max(m, x))` | 第一阶段等额      | `max(m, x)`                      |
| minmax(fixed(m), auto)        | `max(m, c)`              | 第一阶段等额      | `∞`                              |
| minmax(fixed(m), fraction(w)) | `max(m, c)`              | 第二阶段按 weight | `∞`                              |
| minmax(auto, fixed(x))        | `c`                      | 第一阶段等额      | `∞`；auto min 高于 x 时 min 胜出 |
| minmax(auto, auto)            | `c`                      | 第一阶段等额      | `∞`                              |
| minmax(auto, fraction(w))     | `c`                      | 第二阶段按 weight | `∞`                              |

数值例：

- `fixed(100) + auto(c=0)` 承载 required `120`、gap `0` 的 span：当前覆盖量为 `100`，只把 deficit `20` 加给 auto，最终 natural sizes 为 `100/20`
- `auto(c=0) + minmax(fixed(20), fixed(60), c=0)` 承载 required `100`：初始 natural sizes 为 `0/20`；natural-size water-fill 各增长 `40`，目标为 `40/60`，反写 contributions 为 `40/60`，未满足 deficit 为 `0`。不能把 `40` 加到第二轨 raw `c=0` 后停在 natural `40` 以外的任意平台结果
- 单轨 `minmax(auto, fixed(50))` 的 `c=20` 承载 required `80`：auto min 接收 `60`，更新为 `c=80`；fixed max 不反向压缩 auto min
- 单轨 `minmax(fixed(20), fixed(60))` 的 `c=0` 承载 required `80`：初始 natural size 为 `20`，目标最多增长到 `60` 并反写 `c=60`，剩余 `20` 保留为内容 overflow

列优先事务中，先用 intrinsic allocation width 生成 column contributions 与 column spans；列轨道确定后，以 Cell content box 宽度约束 Core，取得 constrained allocation height，再生成 row contributions 与 row spans。最终 row 结果不反向重开 column solver。

### Cell box 与 content box

轨道完成后，spanning Cell box 从起始轨道左上角延伸到最后覆盖轨道右下角：

```text
cell width  = sum(covered column sizes) + internal column gaps
cell height = sum(covered row sizes)    + internal row gaps
```

Cell box 包含 span 内部 gaps；这些 gap 不再作为 Cell 内部断口。content box 是 Cell box 按 resolved padding 向内收缩的矩形。若横向或纵向 padding 总和大于 Cell box 尺寸，该轴 content box 尺寸为 `0`，多出的内容进入 overflow，不产生负尺寸。

`TableCellLayout` 用以下稳定几何替代 alpha.1 的单一 `contentCenter`：

```ts
type TableCellLayout = Readonly<{
  cellId: string;
  box: BoundsRect;
  contentBox: BoundsRect;
  placementTransforms: ReadonlyArray<IRTransform>;
  allocationBounds: BoundsRect;
  visualOverflowBounds: BoundsRect;
}>;
```

`visualOverflowBounds` 的取得与 fit/clip 后语义由 ADR-04 冻结；ADR-03 只要求 alignment 使用 `allocationBounds`，不得改用 visual overflow。

Core constrained-layout result 与 Table placement 是两个职责：

- Core result 持有同一 transaction 中可 replay 的 laid-out child/result，以及处于 **replay root 未放置局部坐标系** 的 allocation / visual overflow bounds
- `TableCellLayout` 只持有 Table 几何和外层 `placementTransforms`，不把 replay token 冒充 transform，也不改写 child 原有 transforms
- final lowering 必须消费同一 Core result，并在其 replay root 外层依次应用 fit 与 Table-local alignment/placement；不能重新 layout child 后只复用旧 bounds
- ADR-06 可按上游正式 API 命名内部 transaction 类型，但必须保持 Core result 与 Table geometry 分离

### Bounds-aware alignment

对每个轴，从 content box 与 Core allocation bounds 分别选择 alignment anchor：

| alignment | content box target | allocation bounds source |
| --------- | ------------------ | ------------------------ |
| start     | min                | min                      |
| center    | center             | center                   |
| end       | max                | max                      |

平移量为 `target - source`。bounds source 与 Core replay root 位于同一未放置局部坐标系；平移作为 replay root 外层的 Table-local placement，与 child 原有 transform 组合而不覆盖。因此即使 allocation bounds 原点不在中心、bounds 起点为负数或 composite 自带 transform，放置结果仍与真实 bounds 对齐。

理由：

1. span 与 padding 进入 canonical Cell 模型后，manual、detail 与 custom Structure 可以共享同一占位和布局合同
2. span 先归一为 per-track 数值 contribution，保持 ADR-02 solver 的封闭纯函数边界
3. alignment 基于 allocation bounds 而不是内容原点或 visual decoration，才能对任意 `IRChild` 保持稳定
4. 将 stretch、clip 与 overflow 留给 ADR-04，可避免对齐规则隐式改变内容尺寸

## 待决策点 🔻

以下命名由 ADR-06 在 Core 公共 constrained-layout 合同落地后冻结：

- `allocationBounds`、`visualOverflowBounds` 与 replay token / result 的具体 Core 类型名
- manifest 是否公开 resolved span、Cell box、content box 与两类 bounds 的全部或稳定子集

无论具体 API 如何命名，都必须保持 Core replay result 与 Table placement 分离，以及本 ADR 的坐标口径、span 占位、padding 与 alignment 可观察行为。

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  structure: {
    kind: 'manual',
    rows: 2,
    columns: 3,
    cells: [
      {
        id: 'title',
        address: { row: 0, column: 0 },
        span: { columns: 3 },
        layout: {
          padding: { x: 12, y: 8 },
          horizontalAlign: 'start',
          verticalAlign: 'center',
        },
        payload: { kind: 'value', value: 'Quarterly score' },
      },
    ],
  },
};
```

```tsx
<DetailTable dataRef="scores" data={rows}>
  <DetailColumn
    id="name"
    field="name"
    headerLayout={{ padding: { x: 12, y: 8 }, horizontalAlign: 'start' }}
    bodyLayout={{ padding: { x: 12 }, horizontalAlign: 'start' }}
  />
</DetailTable>
```

## 测试设计

`packages/viz/table/tests/ir/cell-layout.test.ts`、`packages/viz/table/tests/structure/normalize.test.ts` 与 `packages/viz/table/tests/layout/cell-layout.test.ts` 覆盖：

- span/layout JSON round-trip、默认值、detail header/body 映射与精确 reject
- 越界 span、覆盖冲突、稀疏槽位和 custom Structure 同路
- padding contribution、内部 gaps、fixed + auto、各 minmax 组合、flex span deficit 与 deterministic order
- 1 × 1 与多轨 Cell box、padding 过大时零尺寸 content box
- 非零/负原点 allocation bounds 在 start/center/end 组合下的平移结果
- visual overflow 变化不改变轨道 contribution 或 alignment
- React marker occupancy matrix 与等价 plain manual spec

详细行为矩阵见 ignored `notes/plans/table-alpha2-cell-box-span/TEST_CONTRACT.md`。

## 影响

- ⚠️ BREAKING：Structure output 的 Cell 从单地址占位扩展为矩形占位；自定义 Structure 若输出重叠 span 将 fail-loud
- `IRTableCell`、detail column、Structure output 与 Semantic model 增加 span/layout
- layout pipeline 增加 padding 解析、span contribution、占位验证、Cell/content box 与 bounds-aware transform
- alpha.1 `contentCenter` 在 ADR-06 原子迁移时删除，不保留兼容字段
- 本 ADR 的公开 schema、Semantic model、providers、normalize、layout、Core replay lowering、manifest、React/Vanilla 与双语 docs 必须由 ADR-06/07 作为同一可观察迁移激活，不允许先接受后忽略 span/layout
- 不新增 Cell layout Definition / registry，不修改 Data、renderer 或 Plot
- React `Cell` / `DetailColumn` 与 Vanilla plain input 共享相同 schema-derived 字段；完整 parity 与文档由 ADR-07 验收

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Cell Semantics + Layout
- 解决的问题：把任意 Core 内容的真实 allocation bounds 放入带 padding、alignment 与矩形 span 的 canonical Cell
- 主责包与协作包：`@retikz/table` 主责 Cell schema、占位和几何；Core 提供通用 bounds / replay；adapters 只映射作者输入
- 是否可由现有能力组合：alpha.1 单轨中心点不足；需要扩展 Table Cell 与 Layout，但不需要新 renderer primitive
- 是否需要下沉到 data / core / math：通用内容 layout 继续下沉 Core；BoundsRect / spacing vocabulary 复用 Core / Math
- 内部表达链路：Cell schema / Structure output → Semantic model → Core allocation → outer contribution → span propagation → tracks → Cell/content box → alignment transform
- 外部扩展链路：不采用 layout registry；custom Structure 通过同一 guarded output 声明 span/layout并进入同一 pipeline
- pipeline / lowering 与下游消费：ADR-06 将同一 Core transaction 的 bounds、transform、lowered child 与 manifest 原子接线
- React / Vanilla adapter 等价性：两入口表达相同 span/layout JSON；ADR-07 提供 adapter parity 证据
- provenance / lineage / locator 是否适用：Cell id/source 保持不变；span 只增加其单一语义 Cell 的覆盖区域，不复制 identity
- 不支持边界与本轮结论：扩展 Table Cell/Layout；fit/overflow、border、manifest 接线分别由 ADR-04/05/06 组合

## 不在本 ADR 范围

- stretch / contain / cover、clip、wrap 与自动行高的完整事务
- border conflict、collapsed/separate border
- baseline alignment、writing-mode、RTL
- 多层 header、spanner/stub/corner 语义与跨 fragment span
- Core constrained-layout API 的具体命名

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。修改公开 Cell / detail schema、Structure runtime guard、Semantic model 与 layout/lowering 核心。

### Schema 改动

| 文件                                                  | 操作 | 字段名                                      | 类型                            | 默认值             | describe 中文摘要               |
| ----------------------------------------------------- | ---- | ------------------------------------------- | ------------------------------- | ------------------ | ------------------------------- |
| `packages/viz/table/src/schemas/cell/constants.ts`    | 新增 | `TableHorizontalAlignment`                  | const object enum               | —                  | start / center / end 横向对齐值 |
| 同上                                                  | 新增 | `TableVerticalAlignment`                    | const object enum               | —                  | start / center / end 纵向对齐值 |
| `packages/viz/table/src/schemas/cell/schema.ts`       | 新增 | `TableCellSpanSchema.rows`                  | positive integer optional       | runtime `1`        | 覆盖的连续行数                  |
| 同上                                                  | 新增 | `TableCellSpanSchema.columns`               | positive integer optional       | runtime `1`        | 覆盖的连续列数                  |
| 同上                                                  | 新增 | `TableCellLayoutSchema.padding`             | nonnegative number / BoxSpacing | runtime `0`        | Cell 四边内边距                 |
| 同上                                                  | 新增 | `TableCellLayoutSchema.horizontalAlign`     | horizontal alignment optional   | runtime `center`   | content box 内横向对齐          |
| 同上                                                  | 新增 | `TableCellLayoutSchema.verticalAlign`       | vertical alignment optional     | runtime `center`   | content box 内纵向对齐          |
| 同上                                                  | 新增 | `TableCellSchema.span`                      | `IRTableCellSpan` optional      | runtime `1 × 1`    | manual Cell 矩形跨度            |
| 同上                                                  | 新增 | `TableCellSchema.layout`                    | `IRTableCellLayout` optional    | runtime defaults   | manual Cell 布局属性            |
| `packages/viz/table/src/schemas/structure/schema.ts`  | 新增 | `TableDetailColumnSchema.headerLayout`      | `IRTableCellLayout` optional    | runtime defaults   | 该列 header Cell 布局           |
| 同上                                                  | 新增 | `TableDetailColumnSchema.bodyLayout`        | `IRTableCellLayout` optional    | runtime defaults   | 该列 body Cells 布局            |
| `packages/viz/table/src/contract/structure/output.ts` | 新增 | `TableStructureOutputSchema.cells[].span`   | `IRTableCellSpan` optional      | normalize `1 × 1`  | provider 输出的矩形跨度         |
| 同上                                                  | 新增 | `TableStructureOutputSchema.cells[].layout` | `IRTableCellLayout` optional    | normalize defaults | provider 输出的 Cell 布局       |

所有 `.describe(...)` 使用简短英文契约描述；schema-derived 类型由 `z.infer` 生成。`IRBoxSpacing` / `BoxSpacingSchema` 直接复用 Core 公开契约，不在 Table 复制 shape。

### 文件 scope

本 ADR preparatory 实现只允许新增不进入根 schema、public barrel 或公开 lowering 的内部纯 helper：

- `packages/viz/table/src/shared/layout.ts`
- `packages/viz/table/src/pipeline/layout/{span,cell}.ts`（私有纯函数，不从 package root 导出）
- `packages/viz/table/tests/layout/{span,cell-layout}.test.ts`（只测纯数值/几何 helper）

ADR-06/07 原子激活必须在同一可观察迁移中额外触碰：

- `packages/viz/table/src/schemas/cell/{constants,schema,types,index}.ts`
- `packages/viz/table/src/schemas/structure/{schema,types}.ts`
- `packages/viz/table/src/contract/{structure/output,model/types,authoring/types,authoring/create}.ts`
- `packages/viz/table/src/providers/structure/{manual,detail}.ts`
- `packages/viz/table/src/pipeline/normalize/{normalize,validate}.ts`
- `packages/viz/table/src/pipeline/layout/{types,layout,index}.ts`
- `packages/viz/table/src/pipeline/{resolve,lower/**,manifest/**}`
- `packages/viz/table-react/src/components/build-manual-structure.ts`
- `packages/viz/table-react/src/components/{cell,detail-column}.tsx`
- `packages/viz/table-react/tests/authoring.test.tsx`
- `packages/viz/table-vanilla/tests/spec.test.ts`
- `packages/viz/table/tests/{ir/cell-layout,structure/normalize,layout/cell-layout,lower,manifest}.test.ts`
- alpha.2 对应双语 docs / demo / reference 文件

不能提交“公开 schema 已接受 span/layout，但 lowering 或任一 adapter 忽略它”的中间状态。Core 产品文件仍由独立 Kernel ADR 所有。

### 测试象限

**Happy path（≥ 3）**：

- `manual 矩形 span`：2 × 3 Cell 覆盖连续轨道并形成含内部 gap 的 box
- `detail layout 映射`：headerLayout/bodyLayout 进入对应生成 Cell
- `bounds-aware alignment`：非中心原点 allocation bounds 在 start/center/end 下得到精确 transform
- `padding 进入 contribution`：内容 allocation size 加四边 padding 后驱动 auto track

**边界（≥ 2）**：

- `默认 1 × 1 与居中`：省略 span/layout 保持 alpha.1 几何
- `稀疏槽位合法`：未被 Cell 占据的 row × column 不生成 synthetic Cell
- `padding 超过 box`：content box 轴尺寸 clamp 为 `0`
- `span 只有 fixed 轨道`：未满足 deficit 保留为 overflow，不增长 fixed

**错误路径（≥ 2）**：

- `非法 span 拒绝`：零、负、小数与越界 span fail-loud
- `覆盖冲突拒绝`：不同起点 Cell 的矩形覆盖重叠并报告 Cell 与槽位
- `跨区域 span 拒绝`：Cell 覆盖 columnHeader 与 body rows 时 fail-loud
- `非法 padding 拒绝`：负数、NaN、Infinity 或未知 spacing 字段被 schema 拒绝

**交互（≥ 2）**：

- `fixed + auto 精确 deficit`：fixed(100) + auto 承载 120 → auto 只接收 20
- `minmax 组合精确增长`：auto/fixed 的 min 胜出与 fixed/fixed cap 按数值例执行
- `fixed min 平台一次跨过`：auto(c0) + minmax(fixed20,fixed60,c0) 承载 100 → contributions/natural sizes 均为 40/60，unmet 为 0
- `span deficit 跨轨道类型`：auto + capped minmax + fraction 按两阶段规则传播
- `Cell 数组乱序确定`：相同 topology 的不同 output 顺序得到相同 contributions / boxes
- `custom structure 同路`：自定义 definition 输出 span/layout，无专用 layout callback
- `visual overflow 不反向影响`：改变 shadow/stroke overflow 不改变 tracks 或 alignment
- `React marker occupancy`：row/column span 跳过预占槽位并产出与 explicit cells 相同地址

### 依赖的现有元素

- `IRTableCell` / `TableCellSchema`（`packages/viz/table/src/schemas/cell`）—— 增加 span/layout
- `IRTableDetailColumn`（`packages/viz/table/src/schemas/structure`）—— 增加 header/body Cell layout
- `TableStructureOutputSchema`（`packages/viz/table/src/contract/structure/output.ts`）—— 扩展 runtime guard
- `SemanticTableCell`（`packages/viz/table/src/contract/model/types.ts`）—— 持有 resolved span/layout
- ADR-02 `TableTrackContribution` / `solveTableTracks`—— 接收传播后的 per-track numeric contribution
- Core `BoxSpacingSchema` / `IRBoxSpacing`—— 复用 JSON-safe spacing 契约
- ADR-01 Core allocation / visual overflow bounds 与 replay 合同—— alignment 只消费公开结果；具体接线归 ADR-06
