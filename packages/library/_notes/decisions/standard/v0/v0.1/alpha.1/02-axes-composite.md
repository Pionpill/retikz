# ADR-02：将 Axes 加入 Standard Tier 2 composite

- 状态：Accepted
- 决策日期：2026-07-21
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [ADR-01 Grid](./01-grid-composite.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

成对的直角坐标轴在教学插图、算法示意、几何图和公式解释中反复出现。现有实现只能由调用者拼接网格、两条轴、箭头、刻度和 `x` / `y` 文字；这些元素的范围、原点、层级和默认方向彼此相关，手写 Path 会使 JSON 配置冗长且难以让 LLM 识别其整体语义。

它不是新的 renderer primitive 或数据坐标系：所有结果都可由 Core `IRPath` 与 `IRNode` 表达。它也不属于 Plot 的 scale / axis guide，因为输入是直接的笛卡尔用户坐标，没有数据域、scale、formatter、legend 或 chart 布局。

## 决策：Axes 作为 `standard.axes` composite lower 为网格、Path 和 Node

`@retikz/standard` 在 `composites/axes/` 拥有 `AxesSchema`、`IRAxes`、`AxesDefinition` 和纯 `lowerAxes`。节点固定使用 `namespace: 'standard'` 与 `type: 'axes'`；使用方式与 ADR-01 Grid 相同：直接 IR 通过 `AxesDefinition` 注入 Core `composites`，React / Vanilla 通过既有本地图 Tier 2 adapter 协议贡献同一 definition。

```ts
type IRAxesStrokeStyle = IRStandardPathStrokeStyle;

type IRAxes = {
  namespace: 'standard';
  type: 'axes';
  bounds: { x: { min: number; max: number }; y: { min: number; max: number } };
  origin?: [number, number];
  grid?: {
    spacing: number | { x: number; y: number };
    style?: IRAxesStrokeStyle;
    vertical?: IRAxesStrokeStyle;
    horizontal?: IRAxesStrokeStyle;
  };
  axes?: { arrows?: 'none' | 'positive' | 'both'; style?: IRAxesStrokeStyle };
  ticks?: { x?: number; y?: number; size?: number; style?: IRAxesStrokeStyle };
  labels?: { x?: string | null; y?: string | null };
};
```

`bounds.x.min < bounds.x.max`、`bounds.y.min < bounds.y.max`，且 `origin` 必须落在闭区间内；默认原点为 `[0, 0]`，因此省略 `origin` 时 bounds 必须包含零。`grid` 缺省时不生成网格；其 `spacing` 复用 Grid 的统一 / 分轴紧凑写法，格线按 origin 对齐。`style` 是两组格线的共同默认样式，`vertical` 只覆盖竖线，`horizontal` 只覆盖横线；每组最终样式按 `{ ...style, ...directionalOverride }` 合并。两个方向字段缺省时不关闭任何格线，只是不覆盖共同默认值。样式不用 `x` / `y` 命名，避免与沿轴方向或格点坐标的理解混淆。不嵌入 Grid composite，避免 Axes 的注册行为依赖 Grid capability 是否另行加载。

`axes` 缺省时生成两条轴，箭头默认 `'positive'`；`'both'` 为双向箭头，`'none'` 仅画轴线。`ticks` 缺省时不生成刻度；存在时 `x` / `y` 各为有限正数，省略某轴即不画该轴刻度，`size` 默认为 `6`。x 轴 tick 严格取 `origin.x + k × ticks.x`：`k` 为使 `bounds.x.min ≤ x ≤ bounds.x.max` 的全部整数，排除 `k=0`，线段为 `[x, origin.y - size / 2]` 至 `[x, origin.y + size / 2]`；y 轴对称地取 `origin.y + k × ticks.y`，线段为 `[origin.x - size / 2, y]` 至 `[origin.x + size / 2, y]`。端点恰为格点时保留，范围不整除时不补边界。ticks 不依赖 `grid` 存在，也不生成数值格式化、数值文本或领域 formatter。`labels` 缺省时生成 `x` 和 `y`；`null` 分别禁用其中一个字母，字符串替换显示文字。

轴名固定落在正向端之外 `8` 个用户单位：x label 的 Node 是 `{ position: [bounds.x.max + 8, origin.y], text, strokeWidth: 0, padding: 0, zIndex: 1 }`；y label 是 `{ position: [origin.x, bounds.y.max + 8], text, strokeWidth: 0, padding: 0, zIndex: 1 }`。它们没有 id、fill 或可见 border，无论 arrows 取值如何都采用正向端，因此不引入额外 label positioning schema。

lowering 固定依次生成：网格 Path（底层）、轴 Path、刻度 Path、轴名 Node（顶层）。Path 均只使用已有 `move` / `line` step；轴箭头使用 Core 既有 Path arrow 语义；轴名 Node 使用无可见边框的 Core rectangle node。`Axes` 不新增 Core IR、Scene primitive、renderer 分支、scale 或 formatter。

理由：

1. 将一组强关联的轴、箭头、刻度和标记收敛为少量 JSON 字段，保留人和 LLM 都能理解的坐标系语义
2. 与 Grid 共用格点枚举和路径样式词汇，却不引入 Grid capability 的隐式注册依赖
3. 明确留在 Standard 的通用绘图层，与 Plot 的数据语义和 Kernel 的基础图元边界清晰

## DSL 表面

```tsx
import { Axes } from '@retikz/standard-react';

<Axes
  bounds={{ x: { min: -6, max: 6 }, y: { min: -4, max: 4 } }}
  grid={{
    spacing: 1,
    style: { stroke: '#e2e8f0', strokeWidth: 0.5 },
    vertical: { stroke: '#cbd5e1' },
    horizontal: { dashPattern: [4, 2] },
  }}
  ticks={{ x: 1, y: 1, size: 5 }}
  labels={{ x: 'x', y: 'y' }}
/>;
```

```ts
import { AxesDefinition, createAxes } from '@retikz/standard';

const axes = createAxes({
  bounds: { x: { min: -6, max: 6 }, y: { min: -4, max: 4 } },
  axes: { arrows: 'both' },
  ticks: { x: 1, y: 1 },
});

compileToScene({ version: 1, type: 'scene', children: [axes] }, { composites: [AxesDefinition] });
```

`standard-vanilla` 采用 `axes(id, input)` 与 `AxesVanillaAdapter`；`id` 仅为 Vanilla embed 身份，不进入 `IRAxes`。React / Vanilla 都以相同 input 生成相同 IR，并只在当前 Layout / figure 局部贡献 definition。adapter contribution namespace 固定为 `'standard.axes'`，`makeAxesComposites` 是模块级稳定函数引用并固定返回 `[AxesDefinition]`；它与 `'standard.grid'` 等其它 contribution key 可在同图共存。

## 测试设计

Standard 覆盖 schema、轴 / ticks / labels / optional grid 的 lowering；两个 adapter 覆盖相同 input 的 IR 与 Scene 等价；Core 回归直接 IR 未注册时的既有诊断。具体 case 见实现契约和 ignored 测试契约矩阵。

## 影响

- `@retikz/standard` 新增 `composites/axes/`；复用 `composites/shared/` 的 `IRStandardPathStrokeStyle` 及 `shared/grid/` 的纯格点枚举 helper
- `@retikz/standard-react` 新增 `<Axes>` embeddable；`@retikz/standard-vanilla` 新增 builder 与 Vanilla adapter
- 双语 docs 新增 Standard Axes 页面和 React / Vanilla 示例；不改变 Kernel 或 Plot 的坐标系页面语义

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Composition / Tier 2 lowering；解决静态用户坐标下的通用笛卡尔参考平面
- 主责包与协作包：`@retikz/standard` 拥有 schema、definition、格点纯 helper 和 lowering；Standard adapter 包只 author；Core 继续拥有 Path、Node、arrow、composite registry、compile 与 Scene
- 是否可由现有能力组合：手写 Path / Node 可以得到图形，但不能以单一 JSON 语义声明轴、tick、label 与可选网格；应扩展 Standard composite
- 是否需要下沉到依赖能力域：否。Core Path arrow、Path / Node、CompositeDefinition、`composites/shared/` 路径样式和 `shared/grid/` 格点 helper 已足够
- 内部表达链路：`IRAxes` → `AxesDefinition` → Core registry → `lowerAxes` → `IRPath[] + IRNode[]` → Core compile → 既有 Scene primitive
- 外部扩展链路：这是固定官方 composite，不新增 Axes 私有 definition / registry；第三方新 composite 直接走 Core `defineComposite` / `CompileOptions.composites`
- 下游执行 / adapter 等价性：React / Vanilla 输出相同 IR，并在当前图局部贡献相同 definition；直接 IR 未注册继续由 Core `COMPOSITE_NOT_REGISTERED` warning 处理
- Interaction Readiness：不适用。v0.1 不生成可引用坐标、事件、动画或 viewport 状态；axis label 也不输出 id
- 不支持边界与本轮结论：扩展 Standard。数据 scale、数值 formatter、tick text、极坐标 / 对数坐标、自动避让和 viewport 自适应都延期，归属 Plot 或后续 Standard ADR

## 不在本 ADR 范围

- Plot axis / scale / guide、数据 tick、formatter、legend 或 chart layout
- 无穷网格、极坐标、对数坐标、时间坐标和地理投影
- 把 Axes 作为可引用 Coordinate / Node、可交互容器或 renderer 专有图元
- capability module / bundle / preset 的通用 API

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增三个 package 的公开入口并消费 `composites/shared/` 与 `shared/grid/` 的稳定 owner barrel。

### Schema 改动

| 文件                                                      | 操作 | 字段名               | 类型                                                                           | 默认值              | describe 中文摘要                 |
| --------------------------------------------------------- | ---- | -------------------- | ------------------------------------------------------------------------------ | ------------------- | --------------------------------- |
| `packages/library/standard/src/composites/axes/schema.ts` | 新增 | `namespace` / `type` | literals `'standard'` / `'axes'`                                               | —                   | 固定 composite key                |
| 同上                                                      | 新增 | `bounds`             | `{ x: { min; max }; y: { min; max } }`                                         | —                   | 严格二维坐标范围                  |
| 同上                                                      | 新增 | `origin`             | Position                                                                       | `[0, 0]`            | 轴和格点的共同原点                |
| 同上                                                      | 新增 | `grid`               | `{ spacing; style?; vertical?; horizontal? }`                                  | 缺省不画            | 可选格线；共同默认与分方向覆盖    |
| 同上                                                      | 新增 | `axes`               | `{ arrows?: 'none' \| 'positive' \| 'both'; style? }`                          | `arrows='positive'` | 两条坐标轴及箭头样式              |
| 同上                                                      | 新增 | `ticks`              | `{ x?: positive number; y?: positive number; size?: positive number; style? }` | `size=6`            | 各轴可选刻度                      |
| 同上                                                      | 新增 | `labels`             | `{ x?: string \| null; y?: string \| null }`                                   | `x='x'`、`y='y'`    | 两个轴名，null 关闭               |
| `packages/library/standard/src/shared/grid/**`            | 新增 | 格点枚举纯 helper    | 无 schema 字段                                                                 | —                   | Grid 与 Axes 共用的无状态坐标枚举 |

最终 schema strict，使用 `superRefine` 拒绝越界 origin、非法 bounds、非正 spacing / tick、无效轴组合和未知字段。

### 文件 scope

- `packages/library/standard/src/shared/grid/**`、`packages/library/standard/src/shared/index.ts`（由 ADR-01 新增；本 ADR 通过 stable shared barrel 消费）
- `packages/library/standard/src/composites/shared/**`（由 ADR-01 新增；本 ADR 通过 stable composite-shared barrel 消费）
- `packages/library/standard/src/composites/axes/**`、`packages/library/standard/src/composites/index.ts`、`packages/library/standard/src/index.ts`（新增 / 修改）
- `packages/library/standard/tests/composites/axes/**`（新增）
- `packages/library/standard-react/src/axes/**`、`packages/library/standard-react/src/index.ts`、对应 tests（新增 / 修改）
- `packages/library/standard-vanilla/src/axes/**`、`packages/library/standard-vanilla/src/index.ts`、对应 tests（新增 / 修改）
- `apps/docs/src/**` 中 Standard Axes 双语内容、demo、导航、i18n、source preview（新增 / 修改）

不得修改 Core schema / compile / renderer 或 Plot。若 ADR-01 的 Grid style / helper 公开面未按本契约可复用，必须先修订 ADR-01，不得在 Axes 内复制第二套格点逻辑。

### 测试象限

**Happy path（≥ 3）**：

- `axes-lower-grid-axes-ticks-and-labels`：完整 input → grid、两轴、tick、x/y Node 的顺序与手写 Core IR 等价
- `grid-directional-style-overrides`：共同 `grid.style` 加 `vertical` / `horizontal` 覆盖 → 每组 Path 使用对应的合并后样式，且两个方向互不污染
- `positive-and-both-arrows-use-core-path-arrows`：两种 arrows → 轴端箭头方向符合 Path arrow 语义
- `custom-axis-labels-and-styles-apply`：自定义 x/y 和 grid / axis / tick style → label Node 的固定正向端位置、`strokeWidth: 0`、`padding: 0` 与相应输出字段正确

**边界（≥ 2）**：

- `origin-on-boundary-and-one-axis-ticks`：origin 位于边界、仅 x 或 y tick → 闭区间端点格点保留、没有越界 tick，另一个方向无 tick
- `tick-lattice-excludes-origin-without-grid`：grid 缺省、范围不整除且 origin 落在 tick 格点 → 按整数索引生成所有且仅有闭区间内 tick，origin 不重复
- `null-axis-label-suppresses-only-that-label`：`x: null` 或 `y: null` → 仅关闭指定轴名

**错误路径（≥ 2）**：

- `invalid-axes-schema-rejects-precisely`：倒置 bounds、origin 越界、非正 grid spacing / tick / size、`grid.vertical` / `grid.horizontal` 的未知样式字段、其它未知字段 → issue 指向具体字段
- `direct-axes-without-definition-keeps-core-diagnostic`：直接 IR 未注册 → `COMPOSITE_NOT_REGISTERED` warning + skip，其余 child 继续编译

**交互（≥ 2）**：

- `react-and-vanilla-produce-the-same-axes-ir`：同 input 经 `<Axes>` 与 `axes(id, input)` → payload 和默认值相等
- `adapter-local-definition-does-not-leak`：两个 adapter 的当前图可 lower，后续无 definition 的直接 IR 仍 warning
- `grid-and-axes-coexist-in-one-host-graph`：同一 Layout / figure 同时含 Grid 与 Axes → 两份稳定 maker 各自贡献 definition，均可 lower
- `axes-grid-matches-grid-helper-contract`：同一 bounds / origin / spacing → Axes 的 grid Path 与共享格点 helper 结果一致

### 依赖的现有元素

- `IRStandardPathStrokeStyle`（`composites/shared/`）与 `shared/grid/` 格点 helper——分别复用样式和纯枚举逻辑
- `CompositeBaseSchema`、`CompositeDefinition`、`defineComposite`、`CompileOptions.composites`（Core）——精确 schema、注册和 lowering
- Core Path arrow、`IRPath`、`IRNode`、Position、Path / Node style schema——生成轴、刻度、标签的唯一真源
- `EmbeddableTier2Adapter` 与 `VanillaTier2Adapter`（Kernel React / Vanilla）——宿主本地 definition contribution
