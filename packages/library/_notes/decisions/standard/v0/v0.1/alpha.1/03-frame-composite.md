# ADR-03：将 Frame 加入 Standard Tier 2 composite

- 状态：Accepted
- 决策日期：2026-07-21
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

图中的虚线外框、左上角标题和内部两个定义节点表达的是可视分组：它把一组内容的自动 bounds 加上内间距后画成边框，并可附加标签。它不同于 Core `Scope`：Scope 负责逻辑分组、局部 transform、样式级联和命名空间，本身不画外框或标题。

若由使用方手写，必须先重复各子节点的包围计算，或人为维护外框坐标；内容移动、文字改变、节点尺寸变化都会使外框失效。Core 已为带 id 的 Scope 计算其子节点的 synthetic rectangle bounds，并允许后续 Path / Node 通过 scope id 和 anchor 引用该边界，因此不需要新布局引擎或 renderer 语义。

## 决策：Frame 作为 `standard.frame` 的可视分组，lower 为 Scope、边框 Path 和可选标签 carrier Path

`@retikz/standard` 在 `composites/frame/` 拥有 `FrameSchema`、`IRFrame`、`FrameDefinition` 和 `lowerFrame`。`Frame` 固定使用 `namespace: 'standard'`、`type: 'frame'`，并强制 `id` 作为 Scope 的稳定身份和 frame 边界引用。

```ts
type IRFrame = {
  namespace: 'standard';
  type: 'frame';
  id: string;
  gap?: number;
  border?: IRStandardPathBorderStyle;
  label?: string;
  children: Array<IRNode>;
};
```

`gap` 是所有边相同的非负内间距，默认 `8`；它只扩展 Frame 边框，不修改子节点位置、大小或 Scope 样式。`border` 复用 `composites/shared/` 的 `IRStandardPathBorderStyle`，默认 `{ stroke: 'currentColor', strokeWidth: 1 }`；因此可设置 color、stroke、strokeWidth、dashPattern、dashOffset、lineCap、lineJoin、opacity、strokeOpacity、zIndex、fill、fillOpacity 与 fillRule。Frame 固定以 `border.zIndex ?? -1` 作为 border Path 的 sibling 层级，Scope group 固定为 `0`，可选 label carrier Path 固定为 `1`；这使用户可明确覆盖默认后层，但不能改变 scope / label 的层级。`label` 缺省时不生成标签；有值时生成一条无可见 stroke 的固定两 step Path：先 move 到 `{ id, anchor: 'top-left', offset: [gap, -8] }`，再 line 到同一 anchor 的 `{ id, anchor: 'top-left', offset: [gap + 1, -8] }`。该 line 的 label 为 `{ text: label, position: 'at-start', side: 'right', distance: 0, textColor: 'currentColor' }`，所以标题左缘落在首点，切线固定向右。这复用 Core geometry label 的左对齐锚点；carrier 的 `stroke: 'transparent'`、`strokeWidth: 0`，不占用或反向影响 Frame 的包围计算。标签是 Frame 的装饰，不为窄于文本高度的 gap 自动扩张可用空间；此类排版留给后续标签样式 / 版式能力。

Frame children 接受任意 Core `IRNode`，包括任意 Core / 自定义 shape 的 Node；它们在 Frame scope 内保留原本的 text、shape、style、transform 和相对定位语义。`id` 是现有 Core Scope identity，调用者必须保证它与 direct child Node id 及同一 Core namespace 中其他 id 不重复。重复 id 是无效图输入，继续沿用 Core 的 duplicate-id diagnostic；Standard 不增加专门 schema 校验，也不承诺该无效输入的边框、标题或 bounds 结果。v0.1 不接受 Scope、Path、Coordinate 或任意 Tier 2 composite 作为 direct child：Core 的 Scope synthetic bounds 目前只来自 NodeLayout，不能把无 NodeLayout 或嵌套容器的边界可靠并入首版 Frame。调用者可以把路径放在 frame 外，或等待后续“任意 IR child bounds”能力 ADR。

`lowerFrame` 生成两项，且有 `label` 时追加第三项：

1. `zIndex=-1` 的 rectangle Path，其两角通过 `{ id, anchor: 'top-left' | 'bottom-right', offset }` 引用后续 Scope 的 resolved bounds，并以 `gap` 外扩
2. 带同一 `id`、`boundingShape: 'rectangle'`、`localNamespace: false` 的 Scope，承载原始 children
3. 有 `label` 时，一个 `zIndex=1` 的透明 carrier Path：move 到 scope `top-left + [gap, -8]`，line 到 scope `top-left + [gap + 1, -8]`；该固定向右的首个 line step 以 `at-start + right + distance: 0` 复用 Core step label 输出标题

Core traversal 会先解析 Scope 并回填其 layout，再 flush 先前排队的 Path，因此边框和 label carrier 都可安全引用同一 composite 展开的 Scope；zIndex 确保 border 在内容后方、label 在前方。Frame 不新增 Core IR、Scene primitive、renderer 分支、Scope 字段或专有 layout registry。

理由：

1. 以一个 JSON-safe 容器表达“内容自动包围 + gap + 边框 + 标题”，无需让调用者维护重复坐标
2. 严格复用 Core Scope 已有的 node-boundary 和 target anchor 闭环，不造 Standard 布局 / Scene 平行机制
3. 先把 child 范围限定在有可验证 bounds 的 Node，避免把 Path、foreign composite 的不完整边界伪装为通用分组

## DSL 表面

```tsx
import { Node } from '@retikz/react';
import { Frame } from '@retikz/standard-react';

<Frame id="definition-contract" label="XxxDefinition contract" gap={10} border={{ dashPattern: [4, 3] }}>
  <Node position={[0, 0]} text="BUILTIN_*" />
  <Node position={[0, 44]} text="defineXxx(custom)" />
</Frame>;
```

```ts
import { createFrame, FrameDefinition } from '@retikz/standard';

const frame = createFrame({
  id: 'definition-contract',
  label: 'XxxDefinition contract',
  gap: 10,
  border: { dashPattern: [4, 3] },
  children: [
    { type: 'node', position: [0, 0], text: 'BUILTIN_*' },
    { type: 'node', position: [0, 44], text: 'defineXxx(custom)' },
  ],
});

compileToScene({ version: 1, type: 'scene', children: [frame] }, { composites: [FrameDefinition] });
```

`standard-vanilla` 使用 `frame(embedId, input)` 与 `FrameVanillaAdapter`；`embedId` 是 Vanilla patch identity，`input` 不含 id。adapter 固定以 `embedId + '/frame'` 生成 `IRFrame.id`，以满足 Vanilla Tier 2 输出 id 必须受 embed id 前缀约束的既有协议；同一 figure 中从外部引用该 Frame scope 时也使用这个派生 id。React 的 `Frame` 使用同一派生 id 时，与 `frame(embedId, input)` 输出相同 `IRFrame`，因此 adapter parity 以这个明确 identity 映射比较。两入口都只在当前 Layout / figure 局部贡献 `FrameDefinition`。adapter contribution namespace 固定为 `'standard.frame'`，`makeFrameComposites` 是模块级稳定函数引用并固定返回 `[FrameDefinition]`，所以与 `'standard.grid'`、`'standard.axes'` 可同图共存。

`standard-react` 的 Frame adapter 必须通过 `@retikz/react` 公开的 `convertReactNodeToIR(children)` 构造 child IR，再验证所得顶层 children 全为 `IRNode`；出现 Scope、Path、Coordinate 或 composite 必须在 adapter 处 fail-loud，不得复制 Kernel 私有 builder 或静默丢弃。Vanilla `frame(embedId, input)` 只接受相同的 `Array<IRNode>` input。

## 测试设计

Standard 覆盖 schema、边框 target、gap、标签、嵌套 Scope 与 child 限制；adapter 覆盖同一 input 的 IR / Scene 等价；Core 回归 Scope bounds 与未注册 composite 的既有诊断。具体 case 见实现契约和 ignored 测试契约矩阵。

## 影响

- `@retikz/standard` 新增 `composites/frame/`，复用 Core Scope、Path、Node 和 target anchor
- `standard-react` 新增 `<Frame>` embeddable；`standard-vanilla` 新增 builder 与 Vanilla adapter
- 双语 docs 添加 Standard Frame 页面、图中 definition contract 示例，以及 React / Vanilla 使用说明

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Composition / Tier 2 lowering；解决带自动 bounds 的可视分组
- 主责包与协作包：Standard 拥有 Frame schema / definition / lowering；adapter 只 author；Core 拥有 Scope node-boundary、Target、Path、Node、registry 和 compile
- 是否可由现有能力组合：Scope + 手写 rectangle / label 可以表达结果，但调用者无法在 JSON 中可靠复用 scope 自动 bounds 与 gap 语义；应扩展 Standard composite
- 是否需要下沉到依赖能力域：否。Core Scope placeholder / resolved layout、Path target anchors、NodeLayout 已满足 Node child 的完整闭环
- 内部表达链路：`IRFrame` → `FrameDefinition` → Core registry → Scope + border / label carrier Path → Core scope layout / target resolve / step label emit → 既有 Scene group / path / text primitive
- 外部扩展链路：固定官方 composite；不新建 Frame provider / registry。第三方新 composite 走 Core `defineComposite`，Standard 不提供“自定义 Frame layout”旁路
- 下游执行 / adapter 等价性：React 使用由 Vanilla embed id 映射出的同一 Frame scope id 时，两入口输出相同 IR、局部贡献同一 definition；直接 Frame IR 未注册继续由 Core warning + skip
- Interaction Readiness：Frame 的 `id` 是现有 Scope target identity，不声明 hit area、事件或 selection 语义；标签是非交互的 Path geometry label
- 不支持边界与本轮结论：扩展 Standard。Scope / Path / Coordinate / Tier 2 direct child、路径 bounds、异步测量、自动避让、分边 gap、标签样式模型和交互容器延期

## 不在本 ADR 范围

- 修改 Core Scope bounds 以涵盖 Path / Coordinate / foreign composite，或新增 universal child-bounds contract
- Stack、Align、Distribute、Table / Graph group、数据布局和领域 hierarchy
- 交互 / selection / collapse、clip、动画、DOM / editor runtime 状态
- capability module / bundle / preset 的通用 API

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`，因为新增三个 package 的公开入口，并依赖 Core React / Vanilla 的公开 Tier 2 authoring protocol。

### Schema 改动

| 文件                                                            | 操作 | 字段名                      | 类型                                     | 默认值                                       | describe 中文摘要              |
| --------------------------------------------------------------- | ---- | --------------------------- | ---------------------------------------- | -------------------------------------------- | ------------------------------ |
| `packages/library/standard/src/composites/frame/schema.ts`      | 新增 | `namespace` / `type`        | literals `'standard'` / `'frame'`        | —                                            | 固定 composite key             |
| 同上                                                            | 新增 | `id`                        | non-empty string                         | —                                            | Scope identity 和边框引用键    |
| 同上                                                            | 新增 | `gap`                       | nonnegative finite number                | `8`                                          | 边框对 child bounds 的均匀外扩 |
| `packages/library/standard/src/composites/shared/path-style.ts` | 新增 | `IRStandardPathBorderStyle` | `IRStandardPathStrokeStyle` 加 fill 字段 | 各字段缺省                                   | 跨 composite 的闭合 Path 样式  |
| `packages/library/standard/src/composites/frame/schema.ts`      | 新增 | `border`                    | `IRStandardPathBorderStyle`              | `{ stroke: 'currentColor', strokeWidth: 1 }` | 外边框 Path 样式               |
| 同上                                                            | 新增 | `label`                     | non-empty string                         | 缺省无标签                                   | 左上角文本标签                 |
| 同上                                                            | 新增 | `children`                  | non-empty `Array<IRNode>`                | —                                            | 参与 Scope 自动 bounds 的内容  |

最终 Frame schema strict；它拒绝空 children、未知字段、空 id / label、负 gap 和任何非 Node direct child。`IRStandardPathBorderStyle` 由 `composites/shared/` 统一定义，不从 Grid owner 导入。

### 文件 scope

- `packages/library/standard/src/composites/shared/**`（由 ADR-01 新增；本 ADR 通过 stable barrel 消费）
- `packages/library/standard/src/composites/frame/**`、`packages/library/standard/src/composites/index.ts`、`packages/library/standard/src/index.ts`（新增 / 修改）
- `packages/library/standard/tests/composites/frame/**`（新增）
- `packages/library/standard-react/src/frame/**`、`packages/library/standard-react/src/index.ts`、对应 tests（新增 / 修改）
- `packages/library/standard-vanilla/src/frame/**`、`packages/library/standard-vanilla/src/index.ts`、对应 tests（新增 / 修改）
- `apps/docs/src/**` 中 Standard Frame 双语内容、demo、导航、i18n、source preview（新增 / 修改）

不得修改 `packages/kernel/core/src/**`、renderer、Plot 或任一其它 composite owner。若实现发现 Core Scope bounds 不能覆盖一个声明为允许的 `IRNode`，停止实施并开新的 Core ADR，不得在 Standard 增加手工 bbox 或 renderer patch。

### 测试象限

**Happy path（≥ 3）**：

- `frame-lowers-to-border-scope-and-label`：两个 Node + label → border Path、Scope 和 label carrier Path；carrier 的 `zIndex=1`、透明 stroke、move `top-left + [gap, -8]`、line `top-left + [gap + 1, -8]` 与首个 line 的 `at-start/right/distance: 0` label 正确
- `frame-gap-expands-scope-bounds`：不同 gap → rectangle target offset 只改变外框，不改变 child Node position
- `different-node-shapes-contribute-to-frame-bounds`：Frame 内含 rectangle、circle 与自定义 shape Node → 外框覆盖全部 NodeLayout

**边界（≥ 2）**：

- `frame-without-label-emits-no-label-carrier`：缺省 label → 只有 border / scope 两项，bounds 不变
- `zero-gap-and-filled-dashed-border`：gap=0、fill / dash style → anchors 不偏移、样式仅作用于 border Path
- `frame-label-does-not-inflate-frame`：长 label → Scope bounds 与无 label 相同，且 carrier label 的左边缘落在 `scope.top-left + [gap, -8]`，其采样切线固定向右
- `deferred-border-path-resolves-scope-bounds`：border Path 位于 Scope 前 → Core Scene rectangle 四角等于 resolved Scope bounds 加 gap，且没有 `UNRESOLVED_NODE_REFERENCE`

**错误路径（≥ 2）**：

- `invalid-frame-schema-rejects-precisely`：空 id / label、空 children、负 gap、Scope / Path / Coordinate / composite direct child → schema issue 指向具体来源
- `frame-id-conflict-keeps-core-diagnostic`：Frame id 与 child id 相同 → 保留 Core duplicate-id diagnostic；这是无效图输入，测试不对 border、caption 或 Scope bounds 作任何断言
- `direct-frame-without-definition-keeps-core-diagnostic`：直接 IR 未注册 → `COMPOSITE_NOT_REGISTERED` warning + skip，其他 child 正常

**交互（≥ 2）**：

- `frame-vanilla-derives-scope-id-from-embed-id`：`frame('definition-contract', input)` → `IRFrame.id === 'definition-contract/frame'`，满足 Vanilla adapter output identity protocol
- `react-and-vanilla-produce-the-same-frame-ir-under-mapped-id`：同一 input 经 `<Frame id="definition-contract/frame">` / `frame('definition-contract', input)` → payload 和生成 child IR 相等
- `frame-adapter-local-definition-does-not-leak`：当前 Layout / figure lower 成功；无 definition 的直接 Frame 仍 warning
- `frame-and-other-standard-composites-coexist`：同一 Layout / figure 含 Frame 与 Grid / Axes → 各自稳定 maker 的 definition 全部加入当前 compile options
- `react-frame-children-are-converted-and-restricted`：`<Frame id="definition-contract/frame"><Node /></Frame>` 与 `frame('definition-contract', nodeArray)` → IR parity；Path / Scope JSX child 在 adapter fail-loud
- `frame-preserves-child-targets-and-styles`：child Node 的 id、relative position、shape / style 保持原样，Frame 不改写 child 语义

### 依赖的现有元素

- `CompositeBaseSchema`、`CompositeDefinition`、`defineComposite`、`CompileOptions.composites`（Core）——Frame schema、注册与 lowering
- `IRScope`、`ScopeSchema`、`boundingShape`、resolved scope layout（Core scope / traversal）——自动 node-boundary 与可引用 Scope identity
- `IRPath`、line step label、`NodeTargetSchema`、Anchor、`IRNode`（Core）——外框 target、透明 label carrier 和标题 text primitive 输出
- `IRStandardPathBorderStyle`（`packages/library/standard/src/composites/shared/`）——边框 Path 样式的唯一 Standard 词汇来源
- `EmbeddableTier2Adapter` 与 `VanillaTier2Adapter`（Kernel React / Vanilla）——宿主本地 definition contribution
