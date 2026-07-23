# ADR-04：重构 Frame 为带 Node-like header 的语义分组框

- 状态：Proposed
- 决策日期：2026-07-23
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [ADR-03](./03-frame-composite.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

ADR-03 将 Frame 定义为“Scope 自动 bounds + 外框 Path + 可选 label carrier Path”。该设计可以绘制简单分组框，但公开契约把 `border`、`label` 和 `gap` 收进一个配置对象：标题只是 Path label 字符串，不具备 Core Node 的文本、shape、style、label、meta、animation 等统一行为，也无法表达标题下方的辅助说明。

Frame 的长期语义应当是一个有默认外观的可组合分组框，而不是第二个无样式 Scope，也不是通用 Stack。它负责围合内容、提供 padding、绘制默认边框，并只对自己的语义 header 做布局；任意 body children 仍保留调用方给出的 Node position，Frame 不重新排列 body。

React DSL 采用独立的 `FrameTitle` / `FrameDescription` 命名，而不是 `Frame.Title` / `Frame.Description`。两个组件都必须对应真实 Core 元素，不能只是由父组件读取的 React 配置节点。宿主无关 IR 同样保存两项 Node-like 输入，Vanilla builder 与 React 入口构造同一份数据。

Core v0.5 alpha.1 已提供 `IRAnchorPosition`：Node 可在完成自身文本、shape、padding、margin、scale 与 rotate 布局后，把自身 anchor 对齐到一个已完成布局的 Node、Coordinate 或 Scope anchor。Frame 直接消费该公开能力，不在 Standard 复制文本测量或 Node layout。

## 决策：Frame 拥有边框与 padding，Title / Description 复用 Node 契约并由 Frame 排布

`@retikz/standard` 保留 `standard.frame` Tier 2 composite。Frame root 始终 lower 为一个带 id 的 Core Scope；该 Scope 内包含默认边框 Path、承载原始 body children 的 body Scope，以及可选的 Title / Description Core Node。Frame 不再提供独立 `FrameBorder` 组件。

```ts
type IRFrameTitle = Omit<IRNode, 'type' | 'position' | 'text'> & {
  text: NonNullable<IRNode['text']>;
};

type IRFrameDescription = Omit<IRNode, 'type' | 'position' | 'text'> & {
  text: NonNullable<IRNode['text']>;
};

const FrameHeaderDirection = {
  Horizontal: 'horizontal',
  Vertical: 'vertical',
} as const;

type IRFrame = {
  namespace: 'standard';
  type: 'frame';
  id: string;
  padding?: number | IRBoxSpacing;
  gap?: number;
  headerDirection?: FrameHeaderDirectionValue;
  stroke?: IRPath['stroke'];
  strokeWidth?: number;
  strokeOpacity?: number;
  dashPattern?: Array<number>;
  dashOffset?: number;
  lineCap?: IRPath['lineCap'];
  lineJoin?: IRPath['lineJoin'];
  fill?: IRPath['fill'];
  fillOpacity?: number;
  fillRule?: IRPath['fillRule'];
  zIndex?: number;
  title?: IRFrameTitle;
  description?: IRFrameDescription;
  children: Array<IRNode>;
};
```

Frame 样式字段直接描述自身边框，不再嵌套 `border` 对象。`padding` 使用与 Core Node 相同的 box spacing 结构，按 `side > axis > default > 8` 解析，只扩张最终边框，不移动 header 或 body。`headerDirection` 是封闭的 header 排列策略，默认 `horizontal`；它不是开放扩展能力，不新增 definition / registry。`horizontal` 让 Title 位于 body 上方、Description 接在 Title 右侧并保持 bottom anchor 对齐；`vertical` 保持 Title、Description、body 的纵向顺序。只有一个 header part 时，两种方向都把该 part 放在 body 上方。

`gap` 默认 `4`，表示相邻 header part 以及 header 与 body 的间距：横向模式同时用于 Title / Description 的水平间距和 header row / body 的垂直间距；纵向模式用于 Title / Description / body 的垂直间距。

Frame 默认边框是矩形，`stroke: 'currentColor'`、`strokeWidth: 1`、无填充，内部层级为 `-1`。Frame 的 `zIndex` 作用于整个外层 Scope；body Scope 固定使用 `0`，Title / Description 默认使用 `1`。Title / Description 显式传入的 `zIndex` 与普通 Node 一样覆盖默认值；Frame 只保证边框位于内部 `-1` 层，不把 header 的显式层级重写为固定值。Frame 不提供整体 `opacity`，避免边框视觉字段意外改变 body children；调用方使用 `strokeOpacity` / `fillOpacity` 控制边框，并在 child 上独立控制内容透明度。

`FrameTitleSchema` 与 `FrameDescriptionSchema` 从公开 `NodeSchema` 精确 omit `type` / `position` 后复用全部 Node 字段，并把 `text` 收窄为必填。它们不复制 TextBlock、font、shape、style、label、meta 或 animation schema。`text` 字段必须存在，但不额外拒绝空字符串：空字符串继续沿用普通 Node 的合法文本语义。lowering 只补回 `type: 'node'` 和由 Frame 计算的 anchor position，因此两者在 Core compile、Scene 与 renderer 中继续走普通 Node 路径。

默认 Node-like 样式：

| 部件               | 默认值                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `FrameTitle`       | `shape: 'rectangle'`、`stroke: 'none'`、`fill: 'none'`、`padding: 0`、`font: { size: 'sm', weight: 600 }`、`zIndex: 1`    |
| `FrameDescription` | `shape: 'rectangle'`、`stroke: 'none'`、`fill: 'none'`、`padding: 0`、`font: { size: 'xs' }`、`opacity: 0.7`、`zIndex: 1` |

显式 Node 字段覆盖对应默认字段，包括 `zIndex`。对 `font` 采用逐字段默认：例如 `FrameTitle font={{ family: 'serif' }}` 仍保留默认 `size: 'sm'` 与 `weight: 600`。Title / Description 可拥有显式 `id`；缺省时分别派生为 `${frame.id}/title` 与 `${frame.id}/description`。body Scope 固定派生 `${frame.id}/content`。Frame schema 对 direct body Node、Title 与 Description 的显式 id 统一保留以下四项，并在任一显式 id 命中时 fail-loud：`${frame.id}`、`${frame.id}/content`、`${frame.id}/title`、`${frame.id}/description`。其他跨树重复仍沿用 Core duplicate-id 诊断。

Frame lowering 使用以下结构：

```text
Scope id=<frame.id> zIndex=<frame.zIndex>
├─ Path zIndex=-1                              # 默认矩形边框，延迟引用外层 Scope bounds
├─ Scope id=<frame.id>/content zIndex=0
│  └─ body Node children                       # 原 position 与 Node 行为不变
├─ Title Node zIndex=<explicit ?? 1>          # 可选，bottom-left 对齐 content.top-left - [0, gap]
└─ Description Node zIndex=<explicit ?? 1>    # 横向：接 Title 右侧；纵向：位于 Title 与 body 之间
```

默认横向 lowering 按 `body Scope → Title → Description` 输出：Title 的 `bottom-left` 对齐 `content.top-left + [0, -gap]`，Description 的 `bottom-left` 对齐 `title.bottom-right + [gap, 0]`。纵向 lowering 按 `body Scope → Description → Title` 输出，延续现有 anchor 链，使视觉顺序保持 Title、Description、body。只有单个 part 时直接锚到 content。父 Scope 在全部 child layout 完成后用 body Scope、Title 和 Description 的 NodeLayout 计算最终 bounds；边框 Path 随后解析父 Scope anchors，并按 padding 向四边扩张。

理由：

1. Frame 的“框”语义天然拥有一个边框；拆出 `FrameBorder` 只会制造缺失、重复和冲突状态，不能形成独立能力
2. Title / Description 是独立语义内容，复用 Node schema 与 compile 路径可以保留文本、形状、样式、label、meta 和动画的一致行为
3. Frame 只拥有 header 的横向 / 纵向局部布局，不改变 body Node position，因此不会扩张为通用容器布局或替代 Scope / Stack
4. anchor-to-anchor placement 是跨 Standard、Scope 和普通 Node 都成立的 Drawing Complete 能力，应先进入 Core，不能由 Standard 私有测量实现

## 已满足的 Core 依赖

Frame header 使用 Core 已公开的 `IRAnchorPosition`：

```ts
type IRAnchorPosition = {
  kind: 'anchor';
  target: IRNodeTarget;
  selfAnchor?: IRAnchorRef;
};
```

`target.anchor` 与 `selfAnchor` 都缺省为 `center`；target offset 使用 world-space offset。Core 会拒绝 undefined、later、self 与尚未完成布局的 Scope target，并允许已完成布局的零尺寸 Scope。Frame lowering 根据方向选择 `content → title → description` 或 `content → description → title`，保证每个 target 在被引用前已经完成布局。

Frame 的 `padding` 复用公开 `BoxSpacingSchema` 输入形态，并在 Frame lowering 内用一个无状态 helper 按 `side > axis > default > 8` 归一化。该 helper 只服务 Frame 边框四边 offset，不进入 Core 公共 API，也不改变 Node spacing 语义。

React hydration 事件不属于本 ADR 的 Node-like header 契约。`FrameTitle` / `FrameDescription` 复用 Node 的 JSON-safe 文本、shape、style、label、meta 与 animation authoring 字段，但不接收 hydration event props；本 ADR不修改 `@retikz/react` runtime 或 embeddable protocol。

## DSL 表面

React：

```tsx
import { Node } from '@retikz/react';
import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';

<Frame id="definition-contract/frame" padding={12} headerDirection="horizontal" stroke="#64748b" dashPattern={[4, 3]}>
  <FrameTitle>Definition contract</FrameTitle>
  <FrameDescription maxTextWidth={220}>Builtin and custom definitions share one registry contract.</FrameDescription>

  <Node position={[0, 0]} text="BUILTIN_*" />
  <Node position={[120, 0]} text="defineXxx(custom)" />
</Frame>;
```

`FrameTitle` / `FrameDescription` 接受 `Omit<NodeProps, 'position' | keyof HydrationEventProps>`；`children` 与 `text` 的优先级、Text children 转换和 JSON-safe Node props 行为保持与 `Node` 相同。`FrameProps` 使用 `Omit<FrameInput, 'children' | 'title' | 'description'>`，React 入口只允许通过直接 child part 声明 header，避免对象 prop 与 JSX part 两条表面产生优先级冲突；宿主无关 Standard IR 与 Vanilla builder 仍使用 `title` / `description` 字段。React adapter 通过公开 Node JSX → IR 转换路径把两个组件转换为 canonical Standard title / description 输入，不能复制 Kernel Node builder 或自行测量文本。二者是仅供 `<Frame>` 直接消费的语义 part；脱离 `<Frame>` 单独使用必须 fail-loud，不能渲染为空、静默忽略或退化为普通 Node。

Vanilla：

```ts
import { frame, frameDescription, frameTitle } from '@retikz/standard-vanilla';

frame('definition-contract', {
  padding: 12,
  headerDirection: 'horizontal',
  stroke: '#64748b',
  dashPattern: [4, 3],
  title: frameTitle({ text: 'Definition contract' }),
  description: frameDescription({
    text: 'Builtin and custom definitions share one registry contract.',
    maxTextWidth: 220,
  }),
  children: [
    { type: 'node', position: [0, 0], text: 'BUILTIN_*' },
    { type: 'node', position: [120, 0], text: 'defineXxx(custom)' },
  ],
});
```

`frameTitle()` / `frameDescription()` 是 JSON-safe builder，不独立注册 composite definition；它们进入 `IRFrame.title` / `IRFrame.description`，并在 `FrameDefinition` lowering 中各自产生一个 Core Node。React 与 Vanilla 仍贡献同一个 `FrameDefinition`。Vanilla identity 保持现有映射：`frame('definition-contract', ...)` 与 `<Frame id="definition-contract/frame">` 产生同一个 `IRFrame.id`。

## 测试设计

Standard 覆盖 Frame 默认边框 / padding、box spacing、Title / Description Node 字段复用、默认横向与显式纵向 header anchor layout、派生 id、保留 id 冲突诊断、只有 Title / 只有 Description，以及 body position 不变。Core anchor placement 与 box spacing helper 由其独立变更证明；Standard 只保留依赖契约和集成回归。

adapter 覆盖 React JSX parts 与 Vanilla builders 产生同一 `IRFrame`，包括 `headerDirection` 默认值与显式值，以及 Node `children` / `text`、style、shape、label、meta、animation 字段不在 adapter 中丢失；React 另外覆盖 part 脱离 Frame 的 fail-loud 行为。docs 页面需要同时展示默认横向、纵向变体和样式 / padding 覆盖；Controls 允许修改两个 body Node 的文本，并用 Frame 外层的 sibling Draw 开关演示 Node id 连接，不放宽 Frame body 契约。

详细行为到测试证据见 `packages/library/_notes/plans/frame-header-composition/TEST_CONTRACT.md`。

## 影响

- ⚠️ BREAKING：删除 `IRFrame.label` 与 React `label` prop，迁移为 `<FrameTitle>` / `IRFrame.title`
- ⚠️ BREAKING：`gap` 不再表示边框外扩，原含义改名为 `padding`；新的 `gap` 表示相邻 header part 以及 header / body 的间距，横向模式同时消费水平与垂直间距，纵向模式消费相邻项的垂直间距
- ⚠️ BREAKING：删除嵌套 `border` 对象，边框视觉字段提升到 Frame 顶层；`border.zIndex` 不再公开，Frame `zIndex` 作用于整个外层 Scope
- `IRFrame` 新增可选 `title` / `description` Node-like 输入和 box spacing `padding`
- `IRFrame` 新增 `headerDirection`，默认 `horizontal`，并支持显式 `vertical`
- `standard-react` 新增 `FrameTitle` / `FrameDescription`，并必须复用公开 Node authoring 转换路径
- `standard-vanilla` 新增 `frameTitle()` / `frameDescription()` builder
- Frame lowering 从“border + content Scope + label carrier”改为一个拥有 border、body Scope 与 header Nodes 的外层 Scope
- 双语 Frame docs、demo、API 表、AI prompt/source parser 中的公开 DSL 与迁移说明同步更新
- ADR-03 保留为首版历史决策；本 ADR Accepted 后替代其 Frame 公开契约，不回写旧 API alias

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Composition、Constraint / Layout 与 Target / Coordinate
- 解决的问题：用宿主无关、JSON-safe 的 Node-like header 表达带默认样式、padding 与封闭 header 排列策略的可组合分组框
- 主责包与协作包：Standard 拥有 Frame schema / definition / lowering；Core 拥有 Node / Scope / target / anchor position 与 compile；React / Vanilla 只 author；Render 继续执行普通 Scene primitives
- 是否可由现有能力组合：可以。嵌套 Scope bounds、Node layout、Path target 与 Node 自身 anchor 到目标 anchor 的 placement 均已满足；横向 / 纵向只是 Frame lowering 选择的固定 anchor 链
- 是否需要下沉到依赖能力域：Core `IRAnchorPosition` 依赖已由 Kernel v0.5 alpha.1 满足；Frame 不新增 Core / React 契约，不实现文本测量、私有 position 或私有 handler collector
- 内部表达链路：`IRFrame` → `FrameDefinition` → body Scope + Node-like Title / Description + border Path → Core layout / target resolve → 普通 group / path / text Scene primitives
- 外部扩展链路：Frame 是固定官方 composite，`headerDirection` 是两个值的封闭排列策略，不新增 Frame layout registry；Title / Description 的 shape、boundary 等开放能力继续走 Core 现有 definition / registry
- 下游执行 / adapter 等价性：React components 与 Vanilla builders 产生相同 Standard IR；SVG / Canvas 只接收普通 Core Scene，不新增 renderer 行为
- 不支持边界与诊断：不排列 body、不接受 Path / Coordinate / foreign composite 参与 body bounds、不提供多 Title / 多 Description、不提供任意 React slot、不在 Standard 兜底未接受的 Core anchor contract
- 本轮结论：直接消费已 Accepted 的 Core anchor placement，在 Standard 内完成 Frame schema、lowering 与 adapters

## 不在本 ADR 范围

- 通用 Stack / Flex / Grid、Align / Distribute 或 body 自动布局
- 多 Title、多 Description、Header / Content / Footer section 组件
- 独立 `FrameBorder`、`FrameBackground`、多层装饰或 renderer 专有 frame
- Path、Coordinate、foreign composite 直接作为 Frame body，或让 Path bounds 参与 Frame
- selection、collapse、hit area、事件状态与 editor runtime
- 为 ADR-03 的 `label`、`gap`、`border` 旧写法保留 alias 或兼容桥

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为修改 Standard 公开 IR schema、lowering，以及 React / Vanilla adapters 的公开入口。

### Schema 改动

| 文件                                                              | 操作 | 字段名                                        | 类型                                          | 默认值       | describe 中文摘要                            |
| ----------------------------------------------------------------- | ---- | --------------------------------------------- | --------------------------------------------- | ------------ | -------------------------------------------- |
| `packages/library/standard/src/composites/frame/constants.ts`     | 新增 | `FrameHeaderDirection`                        | const object enum                             | —            | 横向 / 纵向 header 排列的闭合集合            |
| `packages/library/standard/src/composites/frame/schema.ts`        | 改   | `padding`                                     | `number \| IRBoxSpacing`                      | `8`          | 最终边框相对 header + body bounds 的四边间距 |
| 同上                                                              | 改   | `gap`                                         | nonnegative number                            | `4`          | 相邻 header part 与 header / body 的间距     |
| 同上                                                              | 加   | `headerDirection`                             | `'horizontal' \| 'vertical'`                  | `horizontal` | header 的排列方向                            |
| 同上                                                              | 删   | `border`                                      | —                                             | —            | 删除嵌套边框样式对象                         |
| 同上                                                              | 加   | border style fields                           | 复用 Standard Path border style 的选定字段    | 见决策       | Frame 自身边框样式                           |
| 同上                                                              | 删   | `label`                                       | —                                             | —            | 删除 Path label 字符串                       |
| 同上                                                              | 加   | `title`                                       | `FrameTitleSchema?`                           | —            | 可选 Node-like 主标题                        |
| 同上                                                              | 加   | `description`                                 | `FrameDescriptionSchema?`                     | —            | 可选 Node-like 辅助说明                      |
| 同上                                                              | 保留 | `children`                                    | non-empty `Array<IRNode>`                     | —            | body Node children                           |
| 同上                                                              | 加   | reserved id refinement                        | direct body / title / description explicit id | —            | 拒绝 frame id 与三个派生 id                  |
| `packages/library/standard/src/composites/frame/header-schema.ts` | 新增 | `FrameTitleSchema` / `FrameDescriptionSchema` | `NodeSchema` omit position/type，text 必填    | 见决策       | 与 Core Node 同行为的 header 输入            |

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/library/standard/src/composites/frame/**`
- `packages/library/standard/src/composites/index.ts`、`packages/library/standard/src/index.ts`
- `packages/library/standard/tests/composites/frame/**`
- `packages/library/standard-react/src/frame/**`、`packages/library/standard-react/src/index.ts`
- `packages/library/standard-react/tests/frame/**`
- `packages/library/standard-vanilla/src/frame.ts`、`packages/library/standard-vanilla/src/index.ts`
- `packages/library/standard-vanilla/tests/frame.test.ts`
- `apps/docs/src/modules/docs/contents/standard/composite/frame/**`
- `apps/docs/src/modules/docs/contents/standard/composite/index.{zh,en}.mdx`
- `apps/docs/src/modules/docs/data/standard.ts`
- `apps/docs/src/i18n/locales/{zh,en}.json`
- `apps/docs/src/lib/jsx-to-ir/parser.ts`
- `apps/docs/src/modules/docs/ai-chat/composeSystemPrompt.ts`
- `apps/docs/tests/component-preview/build-preview-source.test.tsx`
- `apps/docs/tests/component-preview/preview-controls-registry.test.ts`
- `apps/docs/tests/component-preview/component-preview-source.test.tsx`（仅当 Frame source preview 路径受影响）
- 本 ADR、同 milestone roadmap 与 ignored 测试契约矩阵

不得修改 Core、React runtime、renderer、Plot 或其它 Standard composite。Core anchor placement 已由 Kernel v0.5 alpha.1 的 schema / compile tests 证明；本 ADR 只保留 Standard 集成回归。

### 测试象限

**Happy path（≥ 3）**：

- `frame-defaults-to-bordered-padded-scope`：仅 body Nodes → 外层 Scope、默认矩形 Path、body Scope，边框相对整体 bounds 四边外扩 8
- `frame-defaults-header-to-horizontal`：Title + Description + body → Title 位于 body 上方，Description 自动接在 Title 右侧，两个 header 的 bottom anchor 对齐
- `frame-reuses-node-visual-contract`：Title / Description 的 text、shape、font、padding、label、meta、animations 与 style → lower 后逐字段保持并走普通 Node Scene 输出
- `react-and-vanilla-produce-equivalent-header-ir`：同一 JSX / builders 输入 → 相同 canonical `IRFrame` 与 Core contribution

**边界（≥ 2）**：

- `frame-supports-title-only-or-description-only`：任一单项 → 与 body 保持一个 gap，另一项不产生占位或空 Node
- `frame-supports-vertical-header-direction`：显式 `vertical` → Title、Description、body 按 gap=4 纵向排列
- `frame-resolves-box-padding-by-side-axis-default`：number 与 object spacing → side > axis > default > 8，且只改变边框不移动 header / body
- `frame-derived-header-ids-are-stable`：省略 part id → 稳定派生 `/title`、`/description`、`/content`
- `frame-body-node-positions-remain-unchanged`：不同 header 文本尺寸 → body Node position 与无 header 时一致

**错误路径（≥ 2）**：

- `frame-rejects-empty-body-missing-header-text-and-invalid-spacing`：空 body、缺失 Title / Description text、负 padding / gap、未知 header direction → schema issue 指向具体字段；显式空字符串 text 仍合法
- `frame-rejects-reserved-id-collisions`：direct body Node、Title 或 Description 的显式 id 命中 frame id、`/content`、`/title`、`/description` 任一保留项 → schema fail-loud
- `frame-header-anchor-dependency-fails-loud`：Core 无法解析 anchor dependency → 保留 Core position diagnostic，不回退固定坐标
- `frame-react-rejects-invalid-part-composition`：JSX 中重复 Title / Description、不支持的 Frame child，或 part 脱离 Frame 使用 → adapter fail-loud

**交互（≥ 2）**：

- `frame-header-layout-respects-node-scale-rotate-and-margin`：Title / Description scale、rotate、margin → anchor 对齐使用实际 Node layout，最终 Frame bounds 覆盖可见 Node
- `frame-header-node-labels-remain-node-labels`：Title / Description 自带 Node label → label 按 Core 规则输出，Frame 不复制 label geometry
- `frame-nests-with-scope-and-standard-composites-without-registry-leak`：Frame 与 Grid / Axes、外层 Scope 同图 → definition contribution 和 namespace 稳定
- `frame-z-index-preserves-node-overrides`：Frame zIndex 改变整个 group 层级；border/body 固定为 -1/0，header 缺省为 1，显式 header zIndex 原样保留
- `frame-consumes-node-anchor-position`：Title / Description 产出的普通 Core Node 使用 `IRAnchorPosition`，并在完整 Node layout 后与 content / sibling anchor 对齐
- `frame-docs-playground-edits-body-and-connection`：Controls 可修改 A / B 文本并切换 sibling Draw；Frame children 始终仍是直接 Node

### 依赖的现有元素

- `NodeSchema`、`IRNode`、`NodeProps` 与 Node compile layout（Core / React）——Title / Description 行为真源，只 omit position/type 并添加 Frame 布局
- `BoxSpacingSchema`——Frame padding 复用同义 JSON 输入；Frame 内部 helper 只负责边框四边 offset
- `IRScope`、nested Scope layout sink、`boundingShape: 'rectangle'`——body 与最终 Frame bounds
- `IRPath`、NodeTarget / anchor 与 deferred Path emission——默认矩形边框引用最终 Frame Scope
- `CompositeDefinition`、`defineComposite`、React / Vanilla Tier 2 adapter——Frame 注册、lowering 与双入口接线
- `IRAnchorPosition` / `AnchorPositionSchema`——把 header Nodes 的自身 anchor 对齐到 body / sibling anchors
- const object enum + `ValueOf`——公开 `FrameHeaderDirection` 与 `FrameHeaderDirectionValue` 的闭合取值真源
