# ADR-02：将 Axes 加入 Standard Tier 2 composite

- 状态：Accepted
- 决策日期：2026-07-21
- 修订日期：2026-07-23
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [ADR-01 Grid](./01-grid-composite.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

数轴、四象限坐标轴、仅显示正半轴的教学图，以及带特殊刻度的公式插图，都需要重复组合轴线、箭头、刻度、静态文字和可选网格。手写 Core Path / Node 能画出结果，但会丢失“这是一组坐标轴”的整体语义，并迫使调用者反复处理 y-down 画布中的视觉向上方向。

Axes 解决的是静态数学插图中的坐标参考轴，不是数据坐标系。它不拥有数据 domain、scale、自动 tick、formatter、标签避让或 chart layout，也不把其它子图元从数学 y-up 坐标投影到 Core y-down 坐标。若未来需要让函数、点和任意 children 直接使用数学坐标，应另行设计通用 Cartesian space / projection 能力，不能由 Axes 的局部 lowering 隐式承担。

## 决策：Axes 使用轴向 extent 描述绘图范围

`@retikz/standard` 在 `composites/axes/` 拥有 `AxesSchema`、`IRAxes`、`AxesDefinition` 和纯 `lowerAxes`。Axes 以原点和每条轴向正负方向的长度描述绘图几何，再确定性 lower 为 Core `IRPath` 与 `IRNode`。

```ts
type IRAxesStrokeStyle = IRStandardPathStrokeStyle;
type IRAxesTextStyle = Pick<IRNode, 'textColor' | 'font' | 'opacity'>;

type IRAxesExtent = number | { negative: number; positive: number };

type IRAxesLabel =
  | false
  | IRTextBlock
  | {
      text: IRTextBlock;
      end?: 'positive' | 'negative';
      offset?: number;
      style?: IRAxesTextStyle;
    };

type IRAxesTicks =
  | false
  | {
      source:
        | {
            kind: 'spacing';
            spacing: number;
            extent?: 'positive' | 'negative' | 'both';
          }
        | {
            kind: 'values';
            values: number[];
          };
      side?: 'positive' | 'negative' | 'both';
      endpointGap?: number;
      length?: number;
      style?: IRAxesStrokeStyle;
      labels?:
        | false
        | {
            entries: Array<{ value: number; text: IRTextBlock }>;
            offset?: number;
            style?: IRAxesTextStyle;
          };
    };

type IRAxesAxis = {
  line?:
    | false
    | {
        arrows?: 'none' | 'positive' | 'negative' | 'both';
        arrowDetail?: IRArrowDetail;
        style?: IRAxesStrokeStyle;
      };
  ticks?: IRAxesTicks;
  label?: IRAxesLabel;
};

type IRAxes = {
  namespace: 'standard';
  type: 'axes';
  origin?: [number, number];
  extent: { x: IRAxesExtent; y: IRAxesExtent };
  grid?: {
    spacing: number | { x: number; y: number };
    offset?: [number, number];
    style?: IRAxesStrokeStyle;
    vertical?: IRAxesStrokeStyle;
    horizontal?: IRAxesStrokeStyle;
  };
  x?: false | IRAxesAxis;
  y?: false | IRAxesAxis;
  originLabel?:
    | false
    | IRTextBlock
    | {
        text: IRTextBlock;
        offset?: number;
        style?: IRAxesTextStyle;
      };
};
```

### extent 与方向

`origin` 默认为 `[0, 0]`。`extent.x` / `extent.y` 的 number shorthand 表示正负方向长度相同；对象分别给出非负的 `negative` 与 `positive` 长度，且同一轴至少一端大于零。

extent 是轴局部的绘图距离，不是数据 domain：

- x 正方向映射到 Core 屏幕向右，负方向向左
- y 正方向映射到 Core 屏幕向上，即 lowering 使用 `originY - value`
- y 负方向映射到 Core 屏幕向下，即 lowering 使用 `originY - value`

因此有符号轴向值在 x/y 上保持同一数学直觉，但 Axes 不改变 Core 全局 Position 仍为 y-down 的事实。

### 分轴配置

`x` / `y` 缺省时均启用；分别使用正向箭头和默认轴名 `x` / `y`。`false` 关闭该轴的线、刻度、刻度文字和轴名；二者不能同时为 `false`。轴内 `line: false` 只隐藏轴线，仍可保留刻度和文字。

每条轴独立配置线型和箭头。`arrows` 支持 `'none'`、`'positive'`、`'negative'` 与 `'both'`；默认 `'positive'`。`arrowDetail` 直接复用 Core `IRArrowDetail`，可为两端提供共同的 shape、scale、length、width、color、fill、opacity 与 lineWidth，并通过 `start` / `end` 覆盖负端 / 正端。x/y 轴路径都从负端走向正端，使 Core Path 的 `pos: 0` / `pos: 1` 稳定对应负 / 正方向。

### 刻度与静态文字

刻度按轴独立配置，缺省不生成。`source.kind: 'spacing'` 使用正间距枚举规则格点，`extent` 默认为 `'both'`，也可限制为 `'positive'` 或 `'negative'`；原点始终排除。`source.kind: 'values'` 接受严格递增、互不重复、非零且落在轴 extent 内的显式有符号值，用于 `π/2`、分数或稀疏特殊位置。

刻度 `side` 决定线段相对本轴向垂直方向的伸出侧，支持 `'positive'`、`'negative'` 与 `'both'`，默认 `'both'`：x 轴正侧向上、负侧向下，y 轴正侧向右、负侧向左。`endpointGap` 默认为 `6`，spacing 与 values 来源中距任一轴端点严格小于该值的刻度都不生成；距离恰好等于阈值时保留，设为 `0` 可关闭过滤。`length` 默认为 `6` 个 Core user units，表示分配在所选侧上的线段总长；双侧各占一半，单侧则从轴线向该侧伸出完整长度。

`labels.entries` 只为已存在的 tick value 生成静态文字；它不接受函数 formatter，也不自动从数值推导字符串。x tick 文字默认位于轴下方，y tick 文字默认位于轴左侧；`offset` 是文字中心相对该侧 tick 端点的额外距离，默认 `4`。文字 style 复用 Core Node 的 `textColor`、`font` 与 `opacity`。

`originLabel` 独立于两轴 tick label，避免 x/y 在交点重复生成 `0`。缺省为 `false`；字符串 / TextBlock shorthand 使用默认 offset `10`，对象可覆盖 offset 和文字 style，位置固定在原点左下方。

### 轴名与网格

轴名默认位于正向端外 `8` 个 user units；`false` 关闭，字符串 / TextBlock 替换文字，对象可选择 `'positive'` / `'negative'` 端、offset 和文字 style。

`grid` 是 Axes 自带的轻量快捷网格：只负责按共同 origin、extent 和 spacing 生成贯穿绘图区的普通格线，并保留共同 style 与 vertical / horizontal 覆盖。`offset` 默认为 `[0, 0]`，使用轴局部数学方向控制格线起算位置：x 正值向右平移竖线，y 正值向上平移横线；格线仍裁切在同一 extent 内。主线、边框、方向关闭等高级网格能力继续通过独立 `Grid` 组合，不把完整 Grid schema 复制进 Axes。

### lowering 顺序

lowering 固定依次生成：

1. 可选网格 Path
2. x / y 轴 Path
3. x / y 刻度 Path
4. x / y 刻度文字 Node
5. x / y 轴名 Node
6. 可选原点文字 Node

Path 只使用已有 `move` / `line` step 与 arrow mark；文字使用无可见边框、无 padding 的 Core Node。Axes 不新增 Core IR、Scene primitive、renderer 分支或私有 registry。

## DSL 表面

```tsx
import { Axes } from '@retikz/standard-react';

<Axes
  origin={[140, 90]}
  extent={{
    x: { negative: 110, positive: 110 },
    y: { negative: 50, positive: 60 },
  }}
  grid={{ spacing: 20 }}
  x={{
    ticks: {
      source: { kind: 'spacing', spacing: 20, extent: 'both' },
      side: 'positive',
      labels: {
        entries: [
          { value: -40, text: '−2' },
          { value: 40, text: '2' },
        ],
      },
    },
  }}
  y={{
    ticks: {
      source: { kind: 'values', values: [-40, -20, 20, 40] },
      labels: { entries: [{ value: 40, text: '2' }] },
    },
  }}
  originLabel="0"
/>;
```

```ts
import { AxesDefinition, createAxes } from '@retikz/standard';

const axes = createAxes({
  origin: [140, 90],
  extent: { x: 110, y: 60 },
  y: false,
  x: {
    line: { arrows: 'both' },
    ticks: { source: { kind: 'spacing', spacing: 20 } },
    label: 't',
  },
});

compileToScene({ version: 1, type: 'scene', children: [axes] }, { composites: [AxesDefinition] });
```

`standard-vanilla` 继续采用 `axes(id, input)` 与 `AxesVanillaAdapter`。React / Vanilla 使用同一 `AxesInput` 生成相同 IR，并只在当前 Layout / figure 局部贡献同一 `AxesDefinition`。

## 测试设计

Standard 覆盖 schema 默认值、extent 归一语义、单轴配置、四种箭头、两类 tick source、tick extent、tick side、endpointGap、静态文字、轻量 grid 与 lowering 顺序；React / Vanilla 覆盖同 input 的 IR 等价和局部 definition contribution。详细行为矩阵见 ignored `notes/plans/standard-v0.1-axes-capabilities/TEST_CONTRACT.md`。

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Composition / Tier 2 lowering；解决静态数学插图中的坐标参考轴
- 主责包与协作包：Standard 拥有 schema 与 lowering；Core 拥有 Path、Node、arrow、text、composite registry、compile 与 Scene；adapter 只 author
- 内部表达链路：`IRAxes` → `AxesDefinition` → Core composite registry → `lowerAxes` → Core IR → Scene
- 外部扩展链路：Axes 是封闭官方 composite，不新增 Axes 私有 definition / registry；第三方 composite 继续走 Core `defineComposite`
- adapter 等价性：React / Vanilla 接收同一输入并贡献同一 definition
- Interaction Readiness：不适用。Axes 不生成交互状态、viewport 状态或可引用逻辑坐标
- 本轮结论：扩展 Standard Axes 的封闭 schema 与 lowering，不改 Core / renderer / Plot

## 不在本 ADR 范围

- Plot axis / scale / guide、数据 domain、自动 tick、formatter、密度采样、标签避让或 chart layout
- 把任意 children 从数学 y-up 坐标投影到 Core y-down 坐标
- 时间、对数、分类、极坐标、三维坐标或地理投影
- axis break、minor tick / minor grid、viewport 自适应或交互状态
- capability module / bundle / preset 的通用 API

---

## 实现契约（必填）🔻

### Level

本修订为 `red`：破坏性修改 Standard Axes 的公开 IR schema、React props、Vanilla input、lowering 与文档行为。

### Schema 改动

| 文件                                                      | 字段                    | 契约摘要                                                                    |
| --------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `packages/library/standard/src/composites/axes/schema.ts` | `origin`                | Core Position，默认 `[0, 0]`                                                |
| 同上                                                      | `extent.x` / `extent.y` | 正数 shorthand 或 `{ negative; positive }`，每轴至少一端大于零              |
| 同上                                                      | `x` / `y`               | `false` 或分轴 line / ticks / label；缺省启用，二者不能同时关闭             |
| 同上                                                      | `line`                  | `false` 或四态 arrows + Core arrowDetail + path style；默认正向箭头         |
| 同上                                                      | `ticks.source`          | spacing + 正负范围，或严格递增的显式 signed values                          |
| 同上                                                      | `ticks.side`            | 刻度线段沿轴线垂直方向的正侧、负侧或双侧伸出，默认双侧                      |
| 同上                                                      | `ticks.endpointGap`     | 两类 tick source 统一避让两端，默认 6，设为 0 关闭过滤                      |
| 同上                                                      | `ticks.labels`          | 仅引用已存在 tick value 的静态 TextBlock entries + offset + Core text style |
| 同上                                                      | `label`                 | `false`、TextBlock shorthand 或带 end / offset / style 的对象               |
| 同上                                                      | `originLabel`           | 独立原点文字，默认关闭                                                      |
| 同上                                                      | `grid`                  | 基于 origin + extent 的轻量规则网格，可用 axis-local offset 调整起算位置    |

最终 schema strict，拒绝零长度轴、双轴关闭、非法 tick source、越界 / 重复 / 零显式 tick、被端点过滤或孤立的 tick label、负数 endpointGap、非正 spacing / length 和未知字段。

### 文件 scope

- `packages/library/standard/src/composites/axes/**` 与对应 tests
- `packages/library/standard-react` / `standard-vanilla` 的 Axes adapter tests
- `apps/docs/src/modules/docs/contents/standard/composite/axes/**` 双语页面与 demo
- 本 ADR、alpha.1 roadmap 状态与 ignored 测试契约矩阵

不得修改 Core schema / compile / renderer、Plot 或独立 Grid 的公开契约。

### 测试象限

**Happy path**：

- 对称 / 非对称 extent 产生视觉 y-up 的固定端点
- x/y 独立 line、四态 arrows、共同与分端 arrowDetail、单轴关闭
- spacing ticks 覆盖 positive / negative / both，explicit values 保留有符号位置，两类来源统一应用 endpointGap
- tick label、轴名与 origin label 使用约定位置和文字 style
- 轻量 grid 与 extent 共用绘图边界，offset 只改变格线起算位置

**边界**：

- 单侧 extent 为零但另一侧为正
- `line: false` 保留 ticks / labels
- endpointGap 默认 6，距离恰等于阈值的 tick 保留，设为 0 时端点 tick 保留；原点始终排除
- tick label 可只标注 tick 子集

**错误路径**：

- 两侧 extent 均为零、x/y 同时关闭
- explicit values 越界、含零、重复或非递增
- tick label value 不属于过滤后的 tick 集合
- 非正 spacing / length、未知字段与格点规模超限

**跨层**：

- React / Vanilla 对同一 input 生成相同 canonical IR
- Axes 与 Grid 在同图贡献不同 namespace 的稳定 definition maker
- 注册 AxesDefinition 后正常 compile；未注册保持 Core `COMPOSITE_NOT_REGISTERED`

### 依赖的现有元素

- Core `CompositeBaseSchema`、`PositionSchema`、`TextBlockSchema`、`LabelVisualStyleSchema`、`ArrowDetailSchema`、Path / Node / arrow mark
- Standard `IRStandardPathStrokeStyle` 与共享 lattice helper
- React `EmbeddableTier2Adapter`、Vanilla `VanillaTier2Adapter`
