# ADR-01：将 Grid 迁移为 Standard Tier 2 composite

- 状态：Accepted
- 决策日期：2026-07-21
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

现有 `<Grid>` 位于 `@retikz/react` 的 Sugar。它以一组扁平 React props 在 JSX 构建期生成多个 `<Path>`，因此 Grid 本身不会进入 IR：无法被 JSON 持久化、无法被 Vanilla 以同一语义构造，也不能通过 Standard 的按需 capability module 加载。

Grid 表达的是“在指定二维范围内，以给定间距和对齐基准生成规则参考线”的独立绘图语义，不是把一段固定 Path 片段缩短的 Sugar。其结果仍完全可由 Core `IRPath` 表达，且 Core 已有 `CompositeDefinition`、`CompileOptions.composites` 和通用 composite lowering；缺口在于官方、宿主无关的 Tier 2 输入与其 definition。

旧组件把范围、间距、可见方向、主线、边框和三份视觉属性混在同一层。这既增加持久化配置的噪音，也使 LLM 需要依赖 props 前缀推断归属。迁移不能照搬这套扁平 API。

## 决策：Grid 作为 `standard.grid` 的 JSON-safe composite，在 Standard 中定义并 lower 为 Core Path

`@retikz/standard` 在 `composites/grid/` 拥有 `GridSchema`、`IRGrid`、`GridDefinition` 和纯 `lowerGrid`。Grid composite 节点固定使用 `namespace: 'standard'`、`type: 'grid'`；使用方从 Standard 显式导入 `GridDefinition`，再传给既有 Core `CompileOptions.composites` 或对应 adapter 的同名接线。导入本身不注册全局状态。

Grid 的持久化形态只保存生成规则和三组路径样式。它不保存展开后的 Path，也不接受 ReactNode、函数、DOM、renderer 资源、Target 引用或 adapter 状态。

```ts
type IRStandardPathStrokeStyle = {
  color?: string;
  stroke?: string | PaintSpec;
  strokeWidth?: number;
  dashPattern?: Array<number>;
  dashOffset?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  opacity?: number;
  strokeOpacity?: number;
  zIndex?: number;
};

type IRStandardPathBorderStyle = IRStandardPathStrokeStyle & {
  fill?: string | PaintSpec;
  fillOpacity?: number;
  fillRule?: 'nonzero' | 'evenodd';
};

type IRGrid = {
  namespace: 'standard';
  type: 'grid';
  bounds: { min: [number, number]; max: [number, number] };
  spacing: number | { x: number; y: number };
  origin?: [number, number];
  lines?: {
    vertical?: boolean;
    horizontal?: boolean;
    includeBoundary?: boolean;
    style?: IRStandardPathStrokeStyle;
  };
  major?: { every: number; offset?: number; style?: IRStandardPathStrokeStyle };
  border?: {
    padding?: number;
    order?: 'behind' | 'front';
    extendLines?: boolean;
    style?: IRStandardPathBorderStyle;
  };
};
```

`bounds.min` / `bounds.max` 必须分别满足 `min.x < max.x` 与 `min.y < max.y`；新持久化 IR 不接受旧组件的反向 corner 自动归一化，也不提供 `center + width + height` 变体。`spacing` 的 number 表示等距，object 表示分轴间距，所有间距必须为有限正数。`origin` 缺省时采用 `bounds.min`，所以最常见的配置只需范围和间距。

`lines.vertical`、`lines.horizontal` 默认均为 `true`，二者不能同时为 `false`；`includeBoundary` 默认 `false`。主线的 `every` 是正整数，`offset` 默认为 `0`，并按相对于 origin 的格点整数索引判定，而非按最终输出数组下标判定；因此补边界线不会改变既有格点的主线身份。`border.padding` 默认为 `0`，`order` 默认为 `'front'`，`extendLines` 默认为 `false`。边框存在时，`extendLines: true` 才会使网格线延伸至 padding 后的边框范围。

`lowerGrid` 按固定顺序生成已有 `IRPath`：若 `border.order === 'behind'` 先生成边框；再依次生成竖线和横线；其后在 `order === 'front'` 时生成边框。普通线使用 `lines.style`，主线以 `major.style` 覆盖普通线中的同名字段，边框使用 `border.style`。lowering 不新建 Core IR 字段、Scene primitive、renderer 分支或 Standard Scene。

React `<Grid>` 与 Vanilla `grid()` 均以同一份 `GridInput` 构造上述 `IRGrid`。它们不得重复 schema、格点枚举、样式合并或 lowering。两个 adapter 分别复用既有 `EmbeddableTier2Adapter` 与 `VanillaTier2Adapter`：在本次 `<Layout>` / `normalizeFigureSpec()` 内局部贡献 `IRGrid` 和同一 `GridDefinition`，不写入 module-level 全局 registry，也不修改其它图的 compile options。

adapter contribution 的 `namespace` 是聚合键，不等同于 composite IR namespace，Grid 固定为 `'standard.grid'`。`makeGridComposites` 是模块级稳定函数引用，忽略 merged datasets 并固定返回 `[GridDefinition]`；因此同一图的多个 Grid 可以合并，而 Grid 与其它 `standard.*` composite 不会触发现有 adapter 对“同 group 不同 maker”的 fail-loud 诊断。

手写持久化 `IRGrid` 或直接调用 `createGrid(input)` 时，调用者仍须显式传入 `GridDefinition`；否则 Core 保持既有 `COMPOSITE_NOT_REGISTERED` warning 并跳过该节点。后续 capability module / bundle / preset ADR 只能把同一 `GridDefinition` 组合进 options，不能改变其 schema、registry 或 lowering。

理由：

1. Grid 的规则可被少量 JSON 字段完整描述，并在不同宿主和持久化场景中保持同一语义
2. 复用既有 composite registry 与 Core Path，避免把可选能力变成 Core 默认图元或 renderer 特判
3. 以语义对象收纳线、主线和边框样式，消除旧 `major*` / `border*` 前缀产生的扁平配置噪音

## DSL 表面

```ts
import { createGrid, GridDefinition } from '@retikz/standard';

const paper = createGrid({
  bounds: { min: [0, 0], max: [120, 80] },
  spacing: 10,
  major: { every: 5, style: { strokeWidth: 1.5 } },
  border: { padding: 4, style: { stroke: '#64748b' } },
});

compileToScene({ version: 1, type: 'scene', children: [paper] }, { composites: [GridDefinition] });
```

```tsx
import { Layout } from '@retikz/react';
import { Grid } from '@retikz/standard-react';

<Layout>
  <Grid
    bounds={{ min: [0, 0], max: [120, 80] }}
    spacing={{ x: 10, y: 20 }}
    lines={{ style: { stroke: '#cbd5e1', strokeWidth: 0.5 } }}
    major={{ every: 5, style: { stroke: '#94a3b8' } }}
  />
</Layout>;
```

```ts
import { GridVanillaAdapter, grid } from '@retikz/standard-vanilla';

const paper = grid('paper', {
  bounds: { min: [0, 0], max: [120, 80] },
  spacing: 10,
});

normalizeFigureSpec({ type: 'figure', version: 1, children: [paper] }, { adapters: [GridVanillaAdapter] });
```

两个入口分别产出相同的 `IRGrid`；adapter 的 props / builder 可以省略固定 discriminator，但输出必须补为 `namespace: 'standard'` 与 `type: 'grid'`。`standard-vanilla` 的 `grid(id, input)` 中 `id` 仅是 Vanilla `embed` 的运行时身份，不进入 `IRGrid`；React `<Grid>` 不接收 children、id、meta、animations、箭头、path kind、rotate 或 scale：这些语义无法作为一个由多条 Path 组成的 Grid 的单一稳定 owner。

## 测试设计

`standard` 覆盖 Grid schema、纯 lowering、definition 注册和直接使用；`standard-react` / `standard-vanilla` 覆盖同一输入的 IR、局部 definition contribution 与 lowering 等价；Kernel 保留未注册 composite 的诊断回归。具体矩阵见实现契约的测试象限及本任务的 ignored 测试契约矩阵。

## 影响

- `@retikz/standard` 新增首个 `composites/grid/` owner；它消费公开 Core composite contract 和 Path IR，不修改 Core
- 初始化 `@retikz/standard`、`@retikz/standard-react`、`@retikz/standard-vanilla` 的 package manifest、根公开入口和本 ADR 所需的最小接线；不在本 ADR 设计通用 capability / bundle API
- `@retikz/standard-react` 新增标记为 `isTier2Embeddable` 的 `<Grid>`；`@retikz/standard-vanilla` 新增 `grid(id, input)` 与对应 `VanillaTier2Adapter`。两者均通过既有宿主协议在当前图内局部接线 `GridDefinition`
- ⚠️ BREAKING：删除 `@retikz/react` 的 `Grid` export 和旧扁平 `GridProps`。迁移到 `@retikz/standard-react`，将 `corner1/corner2` 改为 `bounds.min/max`，将 `step/xStep/yStep` 改为 `spacing`，将前缀样式改写为 `lines.style`、`major.style` 和 `border.style`
- 双语文档、AI JSX parser / system prompt、Kernel helpers 导航和示例中对旧 Grid Sugar 的引用全部迁到 Standard；其余 Kernel shapes 维持现状

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Composition / Tier 2 lowering；解决可持久化的通用规则网格表达
- 主责包与协作包：`@retikz/standard` 拥有 schema、definition 和 lowering；`standard-react` / `standard-vanilla` 仅 authoring 与 bundle 接线；Core 继续拥有 composite contract、registry、compile、Scene 和 Path
- 是否可由现有能力组合：最终图形可由 Core `IRPath` 组合，但“范围 + 间距 + 对齐 + 主次线 + 边框”的持久语义不可由现有单一 IR 节点表达；应扩展 Standard 的 Tier 2 能力而非继续保留 adapter Sugar
- 是否需要下沉到依赖能力域：否。Core `CompositeDefinition`、`defineComposite`、`CompileOptions.composites`、provider registry 和 `IRPath` 已构成完整底座
- 内部表达链路：`IRGrid` → `GridDefinition` → Core composite registry → `lowerGrid` → `IRPath[]` → Core compile → 既有 Scene path primitive
- 外部扩展链路：Grid 是固定 key 的官方 composite，不开放 `GridDefinition` 的参数作者协议；第三方若需新 composite，直接使用同一 Core `defineComposite` / `CompileOptions.composites` 机制。Standard 不建立 Grid 私有 registry 或“内置优先”分支；后续 bundle 也只聚合该公开 definition
- 下游执行 / adapter 等价性：React 与 Vanilla 都从同一 `GridInput` 输出同一 `IRGrid`，并通过既有 Tier 2 adapter 协议局部贡献同一 `GridDefinition`；lower 后只含既有 Path，现有 renderer 无新增工作。仅手写 / 直接构造但未注册的 `IRGrid` 由 Core 报 `COMPOSITE_NOT_REGISTERED` 并跳过，不由 Standard 改写诊断
- Interaction Readiness：不适用。Grid v0.1 不声明可引用 target、可水合实例或交互 intent；lower 的 Path 也不生成 id / meta / animations
- 不支持边界与本轮结论：扩展当前 Standard Tier 2 composite 能力；不下沉 Core、不保留 React Sugar、不新增 renderer 行为。数据 scale、无限网格、极坐标 / 对数坐标、节点对齐、交互、动态 viewport 和其它 Kernel 能力均延期

## 不在本 ADR 范围

- 通用 capability module、部分 bundle、all preset、冲突模型及其发布体验；它们由后续 ADR 设计，且只能组合本 ADR 的公开 `GridDefinition`
- 迁移 Circle、Ellipse、Draw、EdgeLabel、Arrow、Pattern、Node shape、Ribbon、`parabola` 或其它 Kernel 内容
- 新增 Core IR、Scene primitive、renderer 分支、Core 到 Standard 的反向依赖或自动全局注册
- Grid 的数据 / scale、非笛卡尔坐标、无限 viewport、target 引用、动画、事件、编辑器状态或 renderer 私有优化

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。它新增 `packages/*/*/src/index.ts` 公开入口并移除 `@retikz/react` 的公开 export；不修改 Core schema 或 compile。

### Schema 改动

| 文件                                                            | 操作 | 字段名                      | 类型                                                                                                                                  | 默认值                                                      | describe 中文摘要                  |
| --------------------------------------------------------------- | ---- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| `packages/library/standard/src/composites/grid/schema.ts`       | 新增 | `namespace`                 | literal `'standard'`                                                                                                                  | —                                                           | 固定 composite namespace           |
| 同上                                                            | 新增 | `type`                      | literal `'grid'`                                                                                                                      | —                                                           | 固定 composite type                |
| 同上                                                            | 新增 | `bounds`                    | `{ min: Position; max: Position }`                                                                                                    | —                                                           | 规范化的严格二维范围，min 小于 max |
| 同上                                                            | 新增 | `spacing`                   | `positive number \| { x: positive number; y: positive number }`                                                                       | —                                                           | 统一或分轴网格间距                 |
| 同上                                                            | 新增 | `origin`                    | `Position`                                                                                                                            | `bounds.min`                                                | 格点对齐基准                       |
| `packages/library/standard/src/composites/shared/path-style.ts` | 新增 | `IRStandardPathStrokeStyle` | `color`、`stroke`、`strokeWidth`、`dashPattern`、`dashOffset`、`lineCap`、`lineJoin`、`opacity`、`strokeOpacity`、`zIndex` 的闭合子集 | 各字段缺省                                                  | 跨 composite 的 Path stroke 样式   |
| 同上                                                            | 新增 | `IRStandardPathBorderStyle` | `IRStandardPathStrokeStyle` 加 `fill`、`fillOpacity`、`fillRule`                                                                      | 各字段缺省                                                  | 跨 composite 的闭合 Path 样式      |
| `packages/library/standard/src/composites/grid/schema.ts`       | 新增 | `lines`                     | `{ vertical?: boolean; horizontal?: boolean; includeBoundary?: boolean; style?: IRStandardPathStrokeStyle }`                          | `vertical=true`、`horizontal=true`、`includeBoundary=false` | 控制普通线及其样式                 |
| 同上                                                            | 新增 | `major`                     | `{ every: positive int; offset?: int; style?: IRStandardPathStrokeStyle }`                                                            | `offset=0`                                                  | 按格点索引覆盖主线样式             |
| 同上                                                            | 新增 | `border`                    | `{ padding?: nonnegative number; order?: 'behind' \| 'front'; extendLines?: boolean; style?: IRStandardPathBorderStyle }`             | `padding=0`、`order='front'`、`extendLines=false`           | 控制可选外边框及延长范围           |

`GridSchema` 使用 `CompositeBaseSchema.extend(...)`，最终对象为 strict object，并以 `superRefine` 拒绝非法 bounds、`lines` 双方向关闭和任何不符合上述嵌套规则的组合。`IRStandardPathStrokeStyle` / `IRStandardPathBorderStyle` 位于 `composites/shared/`，复用公开 Core 字段 schema，不复制其基础约束，也不依赖任一具体 composite owner。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/library/standard/package.json`、`packages/library/standard-react/package.json`、`packages/library/standard-vanilla/package.json`（新增）
- `packages/library/standard/src/composites/grid/**`（新增）
- `packages/library/standard/src/composites/shared/path-style.ts`、`packages/library/standard/src/composites/shared/index.ts`（新增，跨 composite 样式 schema 的 stable owner）
- `packages/library/standard/src/shared/grid/**`、`packages/library/standard/src/shared/index.ts`（新增 / 修改，公开共用格点枚举 helper）
- `packages/library/standard/src/composites/index.ts`、`packages/library/standard/src/index.ts`（修改，公开 Grid stable API）
- `packages/library/standard/tests/composites/grid/**`（新增）
- `packages/library/standard-react/src/grid/**`、`packages/library/standard-react/src/index.ts`、`packages/library/standard-react/tests/grid/**`（新增 / 修改）
- `packages/library/standard-vanilla/src/grid/**`、`packages/library/standard-vanilla/src/index.ts`、`packages/library/standard-vanilla/tests/grid/**`（新增 / 修改）
- `scripts/release-groups.config.mjs`（修改，新增独立 `standard` release group）
- `packages/kernel/react/src/sugar/shapes/Grid.tsx`、`packages/kernel/react/src/sugar/shapes/index.ts`、`packages/kernel/react/tests/sugar/shapes/shapes-equivalence.test.tsx`（删除或移除 Grid 相关内容）
- `apps/docs/src/**` 中所有 Grid import、Kernel helper 路由、双语正文、demo、AI JSX parser 与 system prompt 的迁移项（修改）

不得修改 `packages/kernel/core/src/**`、`packages/kernel/render/src/**` 或无关 Kernel shape。不得在本 ADR 中临时定义 capability module、bundle 或 preset 的第二套 API。

### 测试象限

**Happy path（≥ 3）**：

- `uniform-grid-lowers-to-paths`：`bounds + spacing: number` → 以 `bounds.min` 对齐的竖线、横线和手写 `IRPath[]` 等价
- `anisotropic-grid-respects-origin`：分轴 spacing 与显式 origin → 两轴各自按格点正确枚举
- `major-and-border-style-compose`：普通线、主线和前景边框 → 主线仅覆盖同名字段、输出顺序稳定

**边界（≥ 2）**：

- `include-boundary-adds-only-missing-edges`：范围不整除且 includeBoundary 为真 → 只补未命中的 min / max 边界，不重复格点
- `border-extension-and-order`：`padding=0` / 正 padding、behind / front、extendLines 开关 → 坐标与 Path 顺序分别符合契约
- `major-index-survives-boundary-insertion`：补边界前后相同格点 → 主线身份由 origin-relative index 决定，不受输出序号影响

**错误路径（≥ 2）**：

- `invalid-grid-schema-rejects-precisely`：倒置 / 零面积 bounds、非正 spacing、双方向关闭、非整数或非正 major.every、负 padding → schema error 指向具体字段
- `direct-grid-without-definition-keeps-core-diagnostic`：手写 `IRGrid` / `createGrid(input)` 未传 `GridDefinition` → `COMPOSITE_NOT_REGISTERED` warning 且节点跳过，其他 Core child 继续编译
- `unknown-grid-field-rejects`：顶层或样式对象包含未声明字段 → strict schema 拒绝，不能悄然形成平行配置

**交互（≥ 2）**：

- `react-and-vanilla-produce-the-same-grid-ir`：同一输入经 `<Grid>` 与 `grid(id, input)` → discriminator、默认填充与 payload 完全相等
- `both-adapters-lower-like-direct-standard-input`：两宿主的 IR 与直接 `IRGrid` 在同一 `GridDefinition` 下 → lowered Core IR / Scene 等价
- `adapter-local-registration-and-direct-diagnostic`：两 adapter 在本图内可 lower；直接 `IRGrid` 不传 definition 保留 Core warning。导入 definition 本身不改变全局 compile 行为
- `grid-and-another-standard-composite-coexist`：同一 Layout / figure 含 Grid 与另一 `standard.*` composite → 两个 definition 均进入 compile options，既不冲突也不泄露到后续直接 IR

### 依赖的现有元素

- `CompositeBaseSchema`（`packages/kernel/core/src/schemas/composite/schema.ts`）——扩展为精确 Grid schema
- `CompositeDefinition`、`defineComposite`（`packages/kernel/core/src/contract/composite/`）——定义并校验 `standard.grid` definition
- `CompileOptions.composites`、`resolveCompositeRegistry`、`lowerComposites`（`packages/kernel/core/src/compile/`、`packages/kernel/core/src/providers/composite/`）——通过既有 registry / lowering 消费 Grid definition
- `EmbeddableTier2Adapter`（`packages/kernel/react/src/kernel/protocol/embeddable.ts`）——React `<Grid>` 局部贡献 IR 与 Grid definition
- `VanillaTier2Adapter`（`packages/kernel/vanilla/src/spec/types.ts`）——Vanilla `grid(id, input)` 局部贡献 IR 与 Grid definition
- `IRPath`、`PositionSchema`、Path / drawable / style 字段 schema（`packages/kernel/core/src/schemas/`）——作为 lowering 输出与 Grid 子样式的单一约束来源
- `COMPOSITE_NOT_REGISTERED`（`packages/kernel/core/src/compile/constants.ts`）——未加载 capability 的既有诊断
- `Grid` React Sugar（`packages/kernel/react/src/sugar/shapes/Grid.tsx`）——迁移语义参考，完成后删除
