# ADR-03：带文本 Node 输出始终包 `<g>`（emit 以 Node 为 stacking / DOM 单位）

- 状态：Proposed
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.4 plan §B-2](../../../plans/v0/v0.2-alpha.4.md) · [v0 roadmap §带文本 Node 输出始终包 g 提案](../../../plans/v0/roadmap.md#带文本-node-输出始终包-g-提案) · [本 milestone ADR-02 显式 zIndex](./02-explicit-zindex.md)（"以 Node 为 stacking 单位"同源）· [v0.1-alpha.5 ADR-01 Scene 结构化](../v0.1-alpha.5/01-scene-primitive-structured.md)（GroupPrim.transforms 结构化来源）

## 背景

`compile/node.ts` 的 `emitNodePrimitives` 当前**仅在 `rotateDeg !== 0`** 时把 shape + text + label 包进 `GroupPrim`；不旋转的 Node 直接平铺一组兄弟 primitive（shape、text、各 label TextPrim）。这套"看旋转角决定包不包"的分支从首版 compile 模块就在。

问题：

- **DOM 看不出"哪段属于同一个 Node"**——devtools inspect 时一个文本节点的 rect 和 text 是散开的兄弟节点，得对照 IR 才能配对。
- **与 [ADR-02](./02-explicit-zindex.md) zIndex 的"以 Node 为 stacking 单位"对不齐**——zIndex 希望"整个 Node 作为一个 stacking 单位"，但当前平铺时同一 Node 的 rect / text 与相邻 Node 的 primitive 在同层混排，没有结构边界。
- **包装策略"看旋转角"导致 DOM 结构突变**——同一段 DSL 改个 `rotate` 值，DOM 一会儿一层 `<g>`、一会儿没有，不利于稳定 snapshot 与下游样式 / 交互工具（hover 整节点高亮、点击 Node、给 Node 整体加 CSS class）。

TikZ 无对应概念（它输出 PDF / 无 DOM）；这是浏览器原生渲染 + 面向交互的需求。

## 选项

### A. `layout.lines` 非空（即 Node 有文本）就包 `<g>`，纯几何 Node 维持平铺（**推荐**）

```ts
// emitNodePrimitives 末段
const needsGroup = layout.rotateDeg !== 0 || layout.lines !== undefined;
if (!needsGroup) return inner;                       // 纯几何 Node：平铺，零额外 DOM
const group: GroupPrim = { type: 'group', children: inner };
if (layout.rotateDeg !== 0) {                        // 无旋转 → group 不带 transforms
  group.transforms = [{ kind: 'rotate', degrees: round(layout.rotateDeg),
                        cx: round(layout.rect.x), cy: round(layout.rect.y) }];
}
return [group];
```

- 带文本通常意味着"语义化节点"（流程图节点 / UML 类目）→ 给它一个稳定 DOM 边界 + stacking 单位；纯几何 Node 多半是装饰背景 → 保留极简平铺、零额外 DOM 层。
- 无旋转的文本 Node 输出 `<g>` 无 `transform` 属性（`buildTransform(undefined)` 回 undefined，renderer 不写 transform 属性）。
- 与 ADR-02 协同：带文本 Node emit 成**单个** GroupPrim → zIndex 打标只 tag 一个 group，整节点天然成一个 stacking 单位（干净）。

### B. 所有 Node 无条件包 `<g>`（含无文本纯几何）

- 优：DOM 结构完全一致（无"带文本与否"的条件分支），心智最简。
- 缺：装饰性纯几何 Node（背景矩形、网格点）也多一层 `<g>`，SVG 体积 / DOM 深度无谓增加；这类节点没有"语义节点"诉求，包了也用不上。两难取舍：一致性 vs 极简性。

### C. 维持现状（仅旋转才包）

- 缺：上述三个问题全留着；尤其与 ADR-02 的 stacking 单位语义冲突，"改 rotate 值 DOM 突变"对快照 / 样式工具不友好。本 ADR 的动机就是消除它。

## 决策：A

理由：

1. **判据贴语义**：`layout.lines` 非空 ≈ "语义化节点"，正是需要 DOM 边界 / stacking 单位 / 整体交互的那类；纯几何装饰节点保留零开销平铺。
2. **与 ADR-02 同源**：带文本 Node 成单个 GroupPrim，让 zIndex 的"Node 整体作 stacking 单位"自然成立——两件事同段、同一片 emit 改动。
3. **DOM 可预测**：带文本 Node 永远一层 `<g>`，不再随 `rotate` 值突变；稳定 snapshot + 下游样式 / 交互工具有稳定锚点。
4. **极简留口**：纯几何 Node 不强行加层，SVG 体积不无谓膨胀。

## 待决策点

> 选项 A 已选，以下细节拍板。

- **判据 = `layout.lines !== undefined`**（不含"仅有 label 无 text"的 Node）：仅 label 的 Node 仍平铺。理由：label 是节点的角标装饰，"有文本"才是语义节点的标志。若将来有强需求再扩成 `lines !== undefined || labels !== undefined`（见 §不在本 ADR 范围）。
- **无旋转 group 不带 `transforms` 字段**（而非空数组）：`GroupPrim.transforms` 已是 optional；renderer 对 undefined / 空数组都回无 transform，省一个空数组分配。
- **不加 `data-node-id` / `GroupPrim.meta`**：本 ADR 只立"包不包"的结构边界，不引入 DOM 钩子字段（那要扩 `GroupPrim` schema，单独取舍，见 §不在本 ADR 范围）。
- **label / text emit 顺序不变**：本 ADR 只追加外层包装，shape → text → label 的 emit 顺序与单 Node 内部栈叠固定。

## DSL 表面

```tsx
{/* 带文本 Node：输出 <g><rect/><text/></g>（无旋转时 g 无 transform），整节点是一个 DOM / stacking 单位 */}
<Node id="proc" position={[0, 0]} text="Process" />

{/* 纯几何 Node（无文本）：平铺输出 <rect/>，无额外 <g> */}
<Node position={[0, 0]} shape="rectangle" fill="#eee" minimumSize={2} />
```

输出结构对比：

```html
<!-- 带文本 -->
<g><rect .../><text>Process</text></g>
<!-- 纯几何 -->
<rect .../>
```

## 测试设计

`packages/core/tests/compile/node-group-wrap.test.ts` 覆盖：

- 带文本 Node → 单个 GroupPrim（无旋转时无 transforms），children = shape + text
- 纯几何 Node（无文本）→ 平铺，不包 group
- 带文本 + 旋转 → group 带 rotate transform
- 带文本 + label → label TextPrim 在同一 group 内
- 既有 `node-label.test.ts`（`findLabel` 递归进 group）零改动通过

具体 case 见"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/compile/node.ts`**：`emitNodePrimitives` 末段改 `needsGroup = rotateDeg !== 0 || lines !== undefined`；顶部 import 补 `GroupPrim`。
- **不动**：schema / IR / 公开 API（纯 emit 层改动）；renderer（已支持无 transform 的 `<g>`）；label / text 计算。
- **快照**：所有**带文本** Node 的 Scene / SVG 快照多一层 `<g>`——`shape-baseline-snapshot` / `path-e2e-snapshot` / react render snapshot `-u` 刷新，diff 只应是"文本节点外多一层 `<g>`"。alpha.4-A 的 `z-order.test.ts` 用无文本 node（emit 1 个 flat RectPrim）→ **不受影响**（关键守卫）。
- **文档站**：Node component page 注明"带文本节点输出 `<g>` 包裹"（DOM 结构说明）；更新日志加条目。
- **零破坏 schema**：无字段变化，仅输出结构调整。

## 不在本 ADR 范围

- **`GroupPrim.meta` / `data-node-id` / `data-node-shape` DOM 钩子**：需扩 `GroupPrim` schema，单独 ADR / 未来段。本 ADR 只立结构边界，不挂元数据。
- **仅有 label、无 text 的 Node 是否也包**：当前不包；将来按需扩 `needsGroup` 判据。
- **无条件全包（选项 B）**：评估后否决（装饰节点无谓加层），保留记录避免重复立项。
- **显式 zIndex** → [ADR-02](./02-explicit-zindex.md)；**Node label rotate** → [ADR-04](./04-node-label-rotate.md)。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/compile/**`（node.ts emit）。
- 不动 schema / 公开 API / IR。跨级取最高 = red（compile 改动）。

### Schema 改动

无 IR / schema / 公开类型改动。纯 `emitNodePrimitives` 输出结构调整（带文本 Node 多包一层 `GroupPrim`）。

### 文件 scope

- `packages/core/src/compile/node.ts`（修改：`emitNodePrimitives` 末段 `needsGroup` + import `GroupPrim`）
- `packages/core/tests/compile/node-group-wrap.test.ts`（新建）
- `packages/core/tests/compile/__snapshots__/shape-baseline-snapshot.test.ts.snap`（更新：带文本节点快照）
- `packages/react/tests/render/**`（更新：带文本 `<Node>` SVG 快照）
- `apps/docs/src/contents/**`（修改：Node 文档 DOM 结构说明 + 更新日志）

偏离白名单需加条目自注解或开新 ADR。

> 快照更新逐条核对：变化只应是"带文本节点外多一层 `<g>`"。任何坐标 / 内容变化都说明实现走偏，需排查。

### 测试象限

`packages/core/tests/compile/node-group-wrap.test.ts`，≥ 9 case：

**Happy path（≥ 3）**：

- `text_node_single_group_no_transform`：`{node, text:'A'}` → `primitives` 长度 1、`[0].type==='group'`、`transforms===undefined`、`children` 类型 = `['rect','text']`
- `geometry_node_flat_no_group`：`{node}`（无 text）→ `['rect']`（平铺）
- `text_node_with_rotate_has_rotate_transform`：`{node, text:'A', rotate:45}` → group 的 `transforms[0]` = `{kind:'rotate', degrees:45}`

**边界（≥ 2）**：

- `multiline_text_node_single_group`：`{node, text:['A','B']}` → 单个 group，children = `['rect','text']`（多行仍一个 TextPrim）
- `circle_text_node_group_children`：`{node, shape:'circle', text:'A'}` → group children = `['ellipse','text']`（非 rect shape 也走包装）

**错误路径（≥ 2）**：

> 本 ADR 无 schema 改动、无新拒绝路径；用"结构不变量"替代错误断言：

- `geometry_node_never_wrapped_even_with_fill`：`{node, fill:'#eee', minimumSize:2}`（纯几何带样式）→ 仍平铺 `['rect']`（样式不触发包装，仅 lines 触发）
- `empty_string_text_still_wraps`：`{node, text:''}` → **仍包 group**。`TextBlockSchema = z.union([z.string(), array.min(1)])` 接受空串，`layoutNode` 对 `node.text !== undefined` 一律生成 `lines`（`text:''` → `lines = [{text:''}]` 非 undefined）→ `needsGroup` 真。锁定"判据严格是 `layout.lines !== undefined`，**不**对空串做'视为无文本'特判"（若要特判属另一处行为改动，本 ADR 不做，见 §不在本 ADR 范围）

**交互（≥ 2）**：

- `text_node_label_in_same_group`：`{node, text:'A', label:{text:'L'}}` → label TextPrim 在该 node 的 group 内（`findLabel` 递归命中）
- `existing_node_label_tests_pass`：`node-label.test.ts` 既有用例（`findLabel` 递归进 group）零改动通过——label 改造不破坏定位
- `text_node_as_zindex_unit`（与 ADR-02 交互）：带文本 Node 设 `zIndex` → 整个 group 作为单位排序（一次 tag），验证"Node 整体作 stacking 单位"

### 依赖的现有元素

- `packages/core/src/compile/node.ts` 的 `emitNodePrimitives` —— **修改**：末段包装判据。
- `packages/core/src/compile/node.ts` 的 `NodeLayout.lines` —— **仅引用**：作判据（非空 = 有文本）。
- `packages/core/src/primitive` 的 `GroupPrim` —— **引用**：构造无 transform 的包装 group（`transforms` optional，已支持）。
- `packages/react/src/render/transform-builder.ts` 的 `buildTransform` —— **仅引用（已支持）**：对 undefined / 空数组回 undefined，无 transform 的 `<g>` 渲染正常。
- [本 milestone ADR-02](./02-explicit-zindex.md) —— **协同**：带文本 Node 成单个 GroupPrim 让 zIndex 的 Node-stacking-单位语义成立。
