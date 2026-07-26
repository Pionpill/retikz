# ADR-05：Border Graph 与确定性冲突规则

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[alpha.2 roadmap](./roadmap.md) · [Cell box、span 与 alignment](./03-cell-box-span-and-alignment.md) · [内容 fit/overflow/wrap](./04-content-fit-overflow-and-wrap.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md)

## 背景

表线不是为每个 Cell 随手画四个矩形。相邻 Cell 会在共享边上提供两个候选，span 会消除覆盖矩形内部的边界，粗细、显式隐藏和默认 grid 还会产生冲突；若直接逐 Cell emit，会出现重复描边、顺序依赖和无法追溯的接缝。

Table 需要先从 canonical tracks、Cell occupancy 与 border declarations 构造后端中立的 Border Graph，再把已解析的原子线段 lowering 为 Core Path。renderer 不认识 Cell、span 或 collapsed border。

Border Graph 与冲突顺序是 Table 的封闭拓扑不变量。边线样式可以来自 Table 默认和 Cell 声明，alpha.3 的 rule/theme 以后也只生成同一种候选，不能替换 graph solver。

## 决策：统一边框 schema，先建原子 Border Graph，再确定性 resolve/merge

### Border schema

新增闭合边框候选：

```ts
type IRTableBorder =
  | {
      kind: 'none';
      priority?: number;
    }
  | {
      kind: 'line';
      stroke?: IRPaintValue;
      width?: number;
      strokeOpacity?: number;
      dashPattern?: Array<number>;
      dashOffset?: number;
      priority?: number;
    };

type IRTableCellBorders = {
  top?: IRTableBorder;
  right?: IRTableBorder;
  bottom?: IRTableBorder;
  left?: IRTableBorder;
};

type IRTableBorders = {
  mode?: 'collapse' | 'separate';
  outer?: IRTableBorder;
  horizontal?: IRTableBorder;
  vertical?: IRTableBorder;
};
```

挂载位置：

```ts
type IRTableCellLayout = {
  // ADR-03/04 fields
  borders?: IRTableCellBorders;
};

type IRTableLayout = {
  // ADR-02 fields
  borders?: IRTableBorders;
};
```

语义与默认值：

- 根 `layout.borders` 省略时不生成任何默认边线
- `mode` 在 borders 对象存在时省略为 `collapse`
- `outer` 作用 Table 外轮廓；`horizontal` 作用相邻 rows 之间；`vertical` 作用相邻 columns 之间
- Cell side 声明只作用该 Cell 对应物理边，不改变 span 或 track
- `none` 是显式抑制候选；字段省略表示“不提供候选”
- `priority` 是有限整数，省略为 `0`；数值越大越优先
- line 的 `stroke` 省略为 `currentColor`，`width` 省略为 `1`，`strokeOpacity` 省略为 `1`
- `width` 是有限非负数；`0` 合法并产生零可见线
- `stroke:'none'` 精确拒绝；显式抑制必须写 `kind:'none'`
- `strokeOpacity:0` 与 `width:0` 都是合法 line 候选：照常参与 conflict，成为 winner 后不 emit Path，但保留 resolved provenance 与零 visual contribution
- paint 与 opacity 精确复用 Core 公开 schema；`dashPattern` 是 Core dash 的 Table 严格子集，只接受非空的有限正数数组，不接受空数组、零或负数，省略表示 solid
- `dashOffset` 是有限数，省略为 `0`

边框不是 Definition / registry：它只声明 Core 可表达的线样式和 Table 固定的共享边拓扑。未来 alpha.3 Theme / Rule 可以计算 `IRTableBorder`，内置与自定义 style source 最终都进入同一 graph。

### Border Graph

Border Graph 使用 Table 局部坐标：

```ts
type TableBorderVertex = Readonly<{
  x: number;
  y: number;
}>;

type TableBorderSource =
  | Readonly<{
      kind: 'cell';
      cellId: string;
      row: number;
      column: number;
      side: 'top' | 'right' | 'bottom' | 'left';
    }>
  | Readonly<{
      kind: 'default';
      scope: 'outer';
      side: 'top' | 'right' | 'bottom' | 'left';
    }>
  | Readonly<{
      kind: 'default';
      scope: 'horizontal' | 'vertical';
      boundaryIndex: number;
    }>;

type TableBorderContributionBase = Readonly<{
  key: string;
  source: TableBorderSource;
  priority: number;
  specificity: 0 | 1;
  ownerSideRank: number;
  sourceOrderKey: string;
}>;

type TableBorderContribution =
  | Readonly<
      TableBorderContributionBase & {
        kind: 'none';
      }
    >
  | Readonly<
      TableBorderContributionBase & {
        kind: 'line';
        line: ResolvedTableBorderLine;
      }
    >;

type ResolvedTableBorderLine = Readonly<{
  stroke: IRPaintValue;
  width: number;
  strokeOpacity: number;
  dashPattern?: ReadonlyArray<number>;
  dashOffset: number;
  lineCap: 'butt';
  lineJoin: 'miter';
}>;

type ResolvedTableBorderAtom = Readonly<{
  key: string;
  orientation: 'horizontal' | 'vertical';
  start: TableBorderVertex;
  end: TableBorderVertex;
  winner: TableBorderContribution;
  contributors: ReadonlyArray<TableBorderContribution>;
  visible: boolean;
}>;

type TableBorderEdge = Readonly<{
  key: string;
  orientation: 'horizontal' | 'vertical';
  start: TableBorderVertex;
  end: TableBorderVertex;
  style: ResolvedTableBorderLine;
  atoms: ReadonlyArray<
    Readonly<{
      key: string;
      winner: TableBorderContribution;
      contributors: ReadonlyArray<TableBorderContribution>;
    }>
  >;
}>;
```

所有类型都是 JSON-safe、detached、递归只读的 plain data；不保存 schema、Definition、Map、函数或 Core provider 实例。`ResolvedTableBorderLine` 固定 `lineCap:'butt'`、`lineJoin:'miter'`，不依赖 renderer 默认值。

`none` contribution 不保存 width 或 line；`line` contribution 必须保存完整 resolved line。冲突 tuple 的 width 对 none 固定取 `0`，对 line 取 `contribution.line.width`。任何 `kind:'none'` 携带 line/width、或 `kind:'line'` 缺失 line 的 resolved state 都是内部合同错误，必须在进入 graph artifact / manifest 前 fail-loud。

#### Collapse topology 与非零 gap

collapse 使用“逻辑 tile boundary”，而不是任一 Cell 物理 box 的单侧坐标：

- Table 外边界使用 Table allocation bounds 的四边
- 内部 column boundary 位于左 track 右边与右 track 左边的中点
- 内部 row boundary 位于上 track 下边与下 track 上边的中点
- gap 为 `0` 时中点退化为两个物理边的共同坐标；gap 为正时 line 位于 gap 中心，gap allocation 保持不变
- horizontal atom 统一从左到右，vertical atom 统一从上到下

collapse atomic key 固定为：

```text
c:h:<rowBoundaryIndex>:<columnLogicalIntervalIndex>
c:v:<columnBoundaryIndex>:<rowLogicalIntervalIndex>
```

boundary index 包含 `0` 与末端 outer boundary；logical interval 由相交方向的 outer / gap-midpoint boundaries 切分。vertices 直接来自 track edge 与 gap midpoint 的数值计算，不按 epsilon 重新聚类。

每个 atom 根据 canonical occupancy matrix 读取两侧状态：

| boundary | 两侧 occupancy                 | 默认候选               | Cell side 候选     | 结果               |
| -------- | ------------------------------ | ---------------------- | ------------------ | ------------------ |
| outer    | outside / Cell                 | outer                  | 该 Cell 物理侧声明 | collapse conflict  |
| outer    | outside / void                 | outer                  | 无                 | 只有 outer default |
| internal | 同一 spanning Cell / 同一 Cell | 无                     | 无                 | atom 被抑制        |
| internal | 不同 Cell / Cell               | horizontal 或 vertical | 两侧声明           | collapse conflict  |
| internal | Cell / void                    | horizontal 或 vertical | 真实 Cell 一侧声明 | collapse conflict  |
| internal | void / void                    | horizontal 或 vertical | 无                 | 只有 grid default  |

默认字段省略、且没有 Cell side 声明时，该 topology atom不进入resolved artifact。root horizontal/vertical default 可以穿过稀疏 void，但不会创建 synthetic Cell。任一维度为 `0` 时 Border Graph、manifest borders 与 Core Paths 均为空，不输出退化 outer line。

#### Resolve 与确定 merge

collapse 每个有候选 atom 只解析一个 winner。winner 为 `none`、line width `0` 或 line opacity `0` 时，atom 保留在 resolved artifact但`visible:false`，不 emit Path也不进入 visual bounds。

visible atoms 按 key 排序后执行唯一 merge：

1. 只处理 orientation、line coordinate 与完整 resolved style 深等的连续 atoms
2. 只允许 `stroke` 为非 `none` 的 CSS string、且 `dashPattern` 省略的 solid line 合并
3. gradient、pattern、image paint 与任意 dashed line 永不合并，避免 object-bounding-box paint 或 dash phase 改变
4. 中间 vertex 只要有 perpendicular visible atom 接入，即为 T/cross junction barrier，不跨越合并
5. separate mode 永不 merge

collapsed merged key 固定为：

```text
m:<orientation>:<firstAtomicKey>:<lastAtomicKey>
```

单 atom edge 也使用相同公式，first/last 相等。edge 的 `atoms` 按 canonical key 保留每个 atom 自己的 winner 与 contributors；不做简单 contribution 并集。

collapsed 可见 edge 的绘制顺序固定为 horizontal 后 vertical，各自再按 first atomic key 升序；因此 T/cross junction 的覆盖顺序不依赖 Cell 输入或 merge 分组。graph 构造、resolve 与 merge 不修改输入，重复执行结果深等。

### Collapse 冲突顺序

每个候选先物化：

- resolved priority
- specificity：Cell side = `1`，Table outer/horizontal/vertical default = `0`
- kind rank：none = `1`，line = `0`
- resolved width
- canonical owner side

winner 按以下 tuple 降序比较：

```text
(priority, specificity, kindRank, width, ownerSideRank, sourceOrderKey)
```

其中：

- priority 首先允许作者显式推翻其它规则
- 同 priority 时 Cell side 胜过 Table default
- 同 priority/specificity 时 none 胜 line，让显式 none 稳定抑制相邻同级线；line 可用更高 priority 推翻
- 两个 line 再比较 width，较粗者胜
- vertical 共享边的 ownerSideRank：左侧 Cell 的 right > 右侧 Cell 的 left
- horizontal 共享边的 ownerSideRank：上方 Cell 的 bottom > 下方 Cell 的 top
- 仍相同时按 canonical `sourceOrderKey` 词法升序取 winner；实现可把它规范化为降序 tuple 的反向 key，但结果必须一致

Cell sourceOrderKey 固定为 `cell:<row>:<column>:<side>`，使用 canonical origin address，不使用可重命名的 Cell id。Table default sourceOrderKey 由 `default:outer:<side>`、`default:horizontal:<rowBoundaryIndex>`、`default:vertical:<columnBoundaryIndex>` 稳定生成。alpha.3 Theme/Rule 若在同一 source 产生多条声明，必须在进入 graph 前按其自己的 cascade 解析为一个候选；graph 不接收同一 source slot 的多候选。

每个 atom 上的 contribution key 固定为：

```text
<sourceOrderKey>@<atomicKey>
```

sourceOrderKey 与 atomicKey 都只含 canonical index/side token，不含用户 id，因此不需要转义。该 key 在整个 Border Graph transaction 内唯一；同一 source declaration 贡献多个 atom 时，每个 atom拥有不同key，重复key或key与source/atom不一致必须fail-loud。contributors 按 sourceOrderKey 升序保存，winner 必须引用 contributors 中同 key 的一项。

Cell id 只进入 provenance，不影响视觉 winner。冲突只选择整份候选，不逐字段混合两条 style。

### Separate mode

separate mode 不在相邻 Cell 之间做 winner 竞争：

- 每个真实 Cell side 是独立 slot，沿该 Cell 物理 box side 绘制，不移动到 gap midpoint
- side 显式 line 时使用该 line；显式 none 时保留隐藏 resolved atom且不 fallback；字段 absent 时才使用对应 outer/horizontal/vertical default
- internal 两侧都 absent 且存在 grid default 时，default 对两个真实 Cell side 各 fallback 一次；gap 为正时得到位于两个物理边的两条线，gap 为 `0` 时几何重合但仍保留两份 atom/provenance
- Cell/void 只为真实 Cell side 生成一次显式或 fallback contribution；void/void 与 outside/void 不生成 separate edge
- outer default 在 separate mode 是外围 Cell side 的 fallback，不是独立 Table frame；需要不依赖 occupancy 的 frame 时继续使用 collapse outer，或由后续独立字段设计
- separate atomic key 固定为 `s:<row>:<column>:<side>`，span Cell 每个外侧仍各是一条 atom
- 绘制顺序按 `(rowIndex, columnIndex, top/right/bottom/left)` 升序；重合时后绘制 atom覆盖先绘制 atom
- separate atom 永不 merge，每条 Path 的 edge key 为 `m:<orientation>:<atomicKey>:<atomicKey>`
- span 内部边界仍不产生 side；separate 不恢复 spanning Cell 内部 grid

separate mode 不新增 `borderSpacing`；rowGap/columnGap 仍由 ADR-02 所有。若需要 CSS table 式独立 border spacing，后续以明确布局字段设计。

### 几何、绘制与 bounds

collapsed edge 位于上述 logical boundary；outer stroke 可以向 Table allocation bounds 外扩 `width / 2`。separate edge 沿各 Cell 物理 side centerline 绘制，不改变 Cell box、content box、track contribution 或 gap。

Border Graph 在 Cell 内容之后 emit 为一个稳定 Core Scope/Path group，使表线不会被 visible Cell 内容遮住。ADR-04 的 content clip 只裁 Cell 内容，不裁 border group。

Table allocation bounds 保持轨道矩形；border visual bounds 按 resolved visible stroke 几何外扩 `width / 2`，单独计入 Table visual overflow。clip Cell、fit 或内容 shadow 不参与 border conflict。

ADR-01 第 6 条已要求 Kernel 明确 Path geometry / stroke 如何进入 visual overflow。alpha.2 原子激活前，独立 Kernel ADR与正式测试必须证明 Core replay/最终 Scene auto bounds 对 `lineCap:'butt'`、`lineJoin:'miter'` 的 Border Path 至少包含 half-stroke 外扩，并与 Table manifest、SVG、Canvas 同源；当前只按 Path centerline 聚合 Scene bounds 的实现不满足 gate。Table 不用 sentinel、manifest 手工扩宽或 renderer patch伪造Core Scene bounds。

Table 有显式 id 时，每条 emitted Core Path 使用稳定 id `<tableId>/border/<edgeKey>`；匿名 standalone Table 不伪造全局计数 id，Path id 保持省略并以 meta.edgeKey 关联。其 JSON meta 精确为：

```ts
type TableBorderPathMeta = Readonly<{
  kind: 'tableBorder';
  tableId?: string;
  edgeKey: string;
  atomicKeys: ReadonlyArray<string>;
}>;
```

Path meta 不保存单数 winner，因为 merged edge 可包含不同 winner。`TableLayoutManifest.borders` 对每个 edgeKey 保存可选 pathId、geometry、resolved style 与按 atomicKeys 同序的 `{ key, winner, contributors }`；transaction 内部 border locator 只为 visible atomic key 映射 `{ edgeKey, pathId? }`。三者使用同一 Border Graph artifact直接生成：

```text
Core Path id/meta.edgeKey
  ↔ manifest border.edgeKey + atoms[*]
  ↔ locator[atomicKey] = { edgeKey, pathId? }
```

不得从 emitted Path 重算 manifest，不得把 contributors 压成无 atom 归属的有序并集。隐藏 resolved atoms不产生edgeKey/pathId，也不进入manifest/locator；它们只在transaction resolved artifact与diagnostics中按atomic key观察。alpha.2 manifest与border locator覆盖集合都精确等于emitted visible atoms。border locator只是alpha.2 lowering的确定映射，不提前公开完整Cell/fragment locator；完整locator仍归alpha.6。

理由：

1. 先建共享边 graph 才能同时正确处理 span、collapsed conflict、去重与追溯
2. 明确 tuple 让结果不依赖 provider、Cell 数组或 emit 顺序
3. border lowering 为普通 Core Path，renderer 保持 Table-agnostic
4. Theme/Rule 只产生相同候选，未来呈现扩展不会复制一套边线求解

## 待决策点 🔻

只有 alpha.3 Theme / Rule 生成候选的级联顺序留待后续 ADR；它们进入 graph 前必须按 source slot 收敛为一个 `IRTableBorder`。本 ADR 已冻结 contribution/source/resolved style、atomic/merged key、Path meta、manifest atoms 与 locator 映射，ADR-06 只能原样接入同一 transaction，不得重新设计公共字段。

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
    ],
  },
  layout: {
    borders: {
      mode: 'collapse',
      outer: { kind: 'line', stroke: '#111827', width: 2 },
      horizontal: { kind: 'line', stroke: '#d1d5db', width: 1 },
      vertical: { kind: 'line', stroke: '#e5e7eb', width: 1 },
    },
  },
};
```

```tsx
<Cell
  value="Total"
  span={{ columns: 2 }}
  layout={{
    borders: {
      top: { kind: 'line', stroke: '#111827', width: 2, priority: 10 },
      right: { kind: 'none' },
    },
  }}
/>
```

## 测试设计

`packages/viz/table/tests/ir/border.test.ts`、`packages/viz/table/tests/layout/border-graph.test.ts` 与 ADR-06 lowering/manifest tests 覆盖：

- border JSON、默认值、Core paint/opacity 复用、严格 positive dash 子集与 none/zero visibility
- collapse gap midpoint、outer/horizontal/vertical、四个 Cell sides与完整 occupancy状态表
- span 内边界抑制、T/cross junction barrier、稀疏 Cell、void/void 和零行/零列
- conflict tuple 每一级、canonical address sourceOrderKey、相同 topology 输入乱序
- solid CSS-only deterministic merge；dash/gradient/pattern/image 不 merge 且保持各自 paint bbox/phase
- separate 双侧 fallback、显式 none、cell/void、void/void、gap=0/正 gap 与 canonical draw order
- allocation bounds 不变、outer half-stroke visual overflow、Core clip/stroke-aware Scene bounds与双 renderer
- Core Path id/meta、manifest逐 atom winner/contributors、locator 一一对应与 React/Vanilla parity

详细行为矩阵见 ignored `notes/plans/table-alpha2-border-graph/TEST_CONTRACT.md`。

## 影响

- `IRTableCellLayout` 增加 per-side borders，`IRTableLayout` 增加 Table border defaults/mode
- layout pipeline 增加 Border Graph build/resolve/merge 阶段
- lowering 增加普通 Core Path border group，renderer 不增加 Table 分支
- manifest / locator 增加 border segment 与 Cell/default contribution 映射
- border 不改变 track/Cell allocation；只增加可见 overflow
- Core 必须先补齐 Path stroke-aware replay/Scene bounds；Table 不使用 visual sentinel fallback
- 公开 schema、graph、lowering、manifest、adapters 与双语 docs 必须随 ADR-06/07 原子激活

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Border Layout
- 解决的问题：把共享 Cell 边、span 与多来源样式解析为确定、去重、可追溯的 Core lines
- 主责包与协作包：Table 主责 graph/conflict/provenance；Core 提供 paint/path/meta和stroke-aware visual bounds；renderer 只执行 Path
- 是否可由现有能力组合：Core Path 可画线但不理解 Table adjacency/span，需要扩展 Table Layout
- 是否需要下沉到 data / core / math：不下沉 Data；线段/Bounds 可复用 Math；Path stroke-aware replay/Scene bounds 必须按 ADR-01 第 6 条下沉 Core
- 内部表达链路：border schema → candidates → occupancy boundaries → atomic graph → conflict → merge → Core Path + artifact
- 外部扩展链路：不开放 graph registry；custom Structure 和未来 custom Theme/Rule 生成相同候选并进入统一 resolve
- pipeline / lowering 与下游消费：ADR-06 原子接入 layout/lowering/manifest/locator，renderer 无 Table 语义
- React / Vanilla adapter 等价性：两入口只声明相同 border JSON，ADR-07 提供 parity
- provenance / lineage / locator 是否适用：Path meta、manifest atoms 与 locator 按 edgeKey/atomicKey 一一对应，逐 atom 保留 winner/contributors
- 不支持边界与本轮结论：扩展 Table Layout；复杂 border image、圆角接缝和主题级联延期

## 不在本 ADR 范围

- Cell background、conditional style、theme/rule cascade；进入 alpha.3
- rounded table/cell corners、border image、双线/3D groove 等复杂 stroke style
- border spacing、fragment 边界重复与分页断线
- hit testing 或交互选择
- renderer 私有 CSS border

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。修改公开 layout schema、核心布局 graph、lowering 与 manifest。

### Schema 改动

| 文件                                                 | 操作 | 字段名                                         | 类型                                     | 默认值             | describe 中文摘要   |
| ---------------------------------------------------- | ---- | ---------------------------------------------- | ---------------------------------------- | ------------------ | ------------------- |
| `packages/viz/table/src/schemas/border/constants.ts` | 新增 | `TableBorderKind`                              | const object enum                        | —                  | none / line 判别值  |
| 同上                                                 | 新增 | `TableBorderMode`                              | const object enum                        | —                  | collapse / separate |
| `packages/viz/table/src/schemas/border/schema.ts`    | 新增 | `TableNoBorderSchema.priority`                 | finite integer optional                  | runtime `0`        | 显式无边线优先级    |
| 同上                                                 | 新增 | `TableLineBorderSchema.stroke`                 | Core PaintValue excluding `'none'`       | `currentColor`     | 边线 paint          |
| 同上                                                 | 新增 | `TableLineBorderSchema.width`                  | finite nonnegative number optional       | runtime `1`        | 边线宽度            |
| 同上                                                 | 新增 | `TableLineBorderSchema.strokeOpacity`          | Core opacity optional                    | runtime `1`        | 边线透明度          |
| 同上                                                 | 新增 | `TableLineBorderSchema.dashPattern`            | non-empty positive number array optional | solid              | 边线 dash pattern   |
| 同上                                                 | 新增 | `TableLineBorderSchema.dashOffset`             | finite number optional                   | runtime `0`        | 边线 dash offset    |
| 同上                                                 | 新增 | `TableLineBorderSchema.priority`               | finite integer optional                  | runtime `0`        | 冲突优先级          |
| 同上                                                 | 新增 | `TableCellBordersSchema.top/right/bottom/left` | `IRTableBorder` optional                 | no candidate       | Cell 四边候选       |
| `packages/viz/table/src/schemas/cell/schema.ts`      | 新增 | `TableCellLayoutSchema.borders`                | `IRTableCellBorders` optional            | no Cell candidates | Cell 边框声明       |
| `packages/viz/table/src/schemas/layout/schema.ts`    | 新增 | `TableBordersSchema.mode`                      | border mode optional                     | `collapse`         | 边线合并模式        |
| 同上                                                 | 新增 | `TableBordersSchema.outer`                     | `IRTableBorder` optional                 | none               | Table 外轮廓默认    |
| 同上                                                 | 新增 | `TableBordersSchema.horizontal`                | `IRTableBorder` optional                 | none               | 行间边线默认        |
| 同上                                                 | 新增 | `TableBordersSchema.vertical`                  | `IRTableBorder` optional                 | none               | 列间边线默认        |
| 同上                                                 | 新增 | `TableLayoutSchema.borders`                    | `IRTableBorders` optional                | no borders         | Table 边框配置      |

所有 `.describe(...)` 使用简短英文契约描述。Core paint/opacity schema 从公开 schema 复用，并在最终 Table line schema refinement 精确拒绝 `stroke:'none'`；dash 使用非空 positive number array 的 Table 严格子集。

### 文件 scope

本 ADR preparatory 实现只允许新增不进入根 schema、public barrel 或公开 lowering 的内部纯 graph helper：

- `packages/viz/table/src/pipeline/layout/border/{types,build,resolve,merge,index}.ts`
- `packages/viz/table/tests/layout/border-graph.test.ts`

ADR-06/07 原子激活必须在同一可观察迁移中额外触碰：

- `packages/viz/table/src/schemas/border/{constants,schema,types,index}.ts`
- `packages/viz/table/src/schemas/{cell,layout,index}.ts`
- `packages/viz/table/src/contract/{model/types,manifest}.ts`
- `packages/viz/table/src/pipeline/layout/{types,layout,index}.ts`
- `packages/viz/table/src/pipeline/{resolve,lower/**,manifest/**}`
- `packages/viz/table/tests/{ir/border,layout/border-graph,lower,manifest}.test.ts`
- `packages/viz/table-react/**`、`packages/viz/table-vanilla/**` parity 文件
- alpha.2 对应双语 docs / demo / reference 文件

不能提交“公开 border schema 已接受，但 graph/lowering/manifest 或任一 adapter 忽略它”的中间状态。Core 产品文件不在本 ADR scope。

### 测试象限

**Happy path（≥ 3）**：

- `默认 grid + outer`：Table defaults 在含 gap/void 的逻辑 boundaries 形成完整原子 graph 和 Core lines
- `collapsed Cell winner`：相邻 Cell sides 按 tuple 只输出一条共享边
- `span 抑制内部边`：跨列/跨行 Cell 内部轨道分界不生成边
- `相同 solid style 合并`：连续共线、无 junction 的 CSS solid atoms 合并且逐 atom 保留 provenance

**边界（≥ 2）**：

- `无 borders`：不生成 graph 可见 edges
- `none/width=0/opacity=0`：照常参与 winner，无可见 Path但保留 resolved 诊断
- `稀疏 Cell`：collapse 按状态表处理 default/Cell/void，separate 不补 synthetic Cell
- `gap=0/正 gap`：collapse 位于逻辑 midpoint，separate 位于两侧物理边
- `outer 粗线 overflow`：allocation 不变，manifest 与 Core Scene visual bounds 外扩 width/2

**错误路径（≥ 2）**：

- `非法 line 拒绝`：`stroke:'none'`、负/NaN/Infinity width、空/零/负 dash、非法 opacity fail-loud
- `非法 mode/kind 拒绝`：未知判别值在精确字段失败
- `非有限 graph 几何失败`：非法 track offsets 不进入 Core Path

**交互（≥ 2）**：

- `priority × specificity × none × width × sourceOrderKey`：逐级构造 tie 并断言 winner，Cell id rename 不改变视觉
- `merge × dash/resource paint × junction`：只有 CSS solid、无垂直接入时合并
- `separate × default × none × gap`：双侧 fallback、显式抑制与 canonical order 确定
- `content clip × border`：Cell clip 不裁 border group
- `custom structure × span × border`：统一 occupancy/graph，无 provider 特判

### 依赖的现有元素

- ADR-03 Cell span/occupancy/box—— 定义真实共享边与被 span 消除的内部边
- ADR-04 content box clip/visual overflow—— border 位于 clip 外且独立计 visual bounds
- ADR-01 Path stroke 视觉组成要求—— Kernel 必须提供stroke-aware replay/Scene bounds正式证据
- Core `PaintValueSchema`、opacity、Path dash/stroke、lineCap/lineJoin 与 meta—— 复用公开契约和 lowering 目标
- `TableLayout` / `TableLayoutManifest`—— ADR-06 原样接入 edge + per-atom provenance
- `SemanticTableCell.id` / source—— border contribution provenance
