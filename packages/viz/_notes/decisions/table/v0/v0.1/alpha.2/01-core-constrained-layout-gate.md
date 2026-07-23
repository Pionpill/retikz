# ADR-01：Core 通用 IRChild 受约束布局前置门禁

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[table v0.1 roadmap](../roadmap.md) · [Kernel contextual composite ADR](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/01-contextual-composite-layout.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md) · [Table 总设计](../../../../../architecture/table-design.md) · [Core 绘图完备设计](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md) · [Core Node 布局测量 ADR](../../../../../../../kernel/_notes/decisions/v0/v0.4/beta.1/02-node-layout-measurement.md)

## 背景

alpha.1 通过固定 `columnWidth` / `rowHeight` 建立了 Table 的最薄布局闭环。alpha.2 要支持 auto / minmax 轨道、文本换行、自动行高、span 和基于真实 bounds 的对齐，必须先知道 Cell 中任意合法 `IRChild` 的自然尺寸，以及内容在给定可用盒约束下的最终尺寸。

当前 Core `CompositeDefinition.expand(node)` 只接收 composite 节点，没有通用的测量或布局 context；composite 在 Core traversal 前统一展开，`onNodeLayout` 只观测真实 Node。Table lowering 又发生在 Core compile 之前，因此 Table 无法通过包装 `onNodeLayout` 得到任意内容的约束结果。

通用图形内容的测量、受约束布局和最终 compile 一致性属于 Drawing Complete。若 Table 自建文字测量器、deep import Core compile，或按 Node / Path / Plot namespace 特判，会形成平行底座，并使 React、Vanilla、renderer 与 nested composite 的结果分叉。

## 决策：阻断内容驱动 Table 布局，直到 Core 闭合通用约束合同

Table alpha.2 在 Core 通用能力通过本 ADR 的验收门禁前，不实现内容驱动轨道、换行、自动行高或依赖真实内容 bounds 的布局，也不提供 Table 私有 fallback。alpha.1 的显式固定轨道继续作为已支持能力。

Core 的独立 ADR 可以自由决定公开 API、schema、缓存策略和 compile 时序，但最终能力必须满足以下可观察合同：

1. **输入通用**：接受任意合法 `IRChild`，不要求 Table 按 namespace、composite 类型或 renderer 建立白名单。对于不响应约束的内容，也必须返回明确且确定的结果
2. **双阶段语义**：同时支持 intrinsic measurement 与 constrained layout。前者给出自然布局结果，后者在明确的可用宽高约束下给出最终布局结果；二者都必须使用下述统一边界口径
3. **环境一致**：测量与最终 compile 使用等价的 composite / definition registry、compile options、host capabilities 和引用解析环境
4. **结果可重放**：相同输入、约束和环境必须产生确定、renderer-agnostic 的结果；最终 compile 不得重新选择另一套展开或布局语义，造成“测量尺寸与实际内容不一致”
5. **边界口径明确**：结果必须明确坐标空间，并提供用于父布局分配空间的 canonical allocation bounds，以及用于判断内容是否超出 Cell 的 visual overflow bounds；若二者安全等同，Kernel ADR 必须给出可验证理由。Table 不要求固定 API 字段名
6. **视觉组成明确**：Kernel ADR 必须逐类规定 transform、Node content / shape / label / shadow、Path geometry / stroke / label / shadow、Scope clip 如何参与 allocation bounds 与 visual overflow bounds。intrinsic、constrained 和最终 replay 对同一类边界使用相同口径
7. **组合闭合**：Node（包括含文本 content 的 Node）、Path、Coordinate、Scope 与 nested composite 具有明确行为。约束是否改变某类内容可由 Core 定义，但不能以静默跳过或类型特判泄漏给 Table
8. **溢出归 Table**：可用盒小于内容是合法 constrained layout 输入。Core 按统一口径返回实际 allocation / visual overflow bounds；固定几何等不响应约束的内容可以超出可用盒，后续 fit / overflow / clip 由 Table 决定，不作为 Core 布局失败
9. **失败可诊断**：非局部引用所需 context 必须显式进入合同；非法约束输入、缺失引用、未注册 composite、循环展开或展开 / 布局过程失败必须 fail-loud 或产生可关联的结构化诊断
10. **零面积可区分**：Coordinate 等内容可以合法返回零面积 bounds；诊断必须让合法零面积、合法空 Scope 与“provider 缺失或能力未执行”可观察地区分
11. **入口等价**：React 与 Vanilla 能形成等价的 definitions / registries、compile options、host capabilities 和约束，并观察到等价结果
12. **公共边界**：Table 只能通过 Core 的公共 owner barrel 消费能力，不依赖 `src/compile/**` deep import、DOM API、renderer 私有测量或 Plot 语义

本 ADR 只冻结上述验收合同，不替 Core 选择接口。Core gate 只有在以下证据同时成立时才算 PASS：

- Kernel 独立 ADR 已明确 Drawing Complete 归属、公开 contract、compile / replay 语义和诊断边界
- Core 产品代码通过公共入口提供该能力，并有覆盖本 ADR 测试设计的正式测试
- React / Vanilla 形成的 Core definitions、compile options 与 host capabilities 具有等价性证据；datasets 等上游输入只在 adapter / Table integration 中证明可导出等价 Core 环境，不进入 Core constrained-layout contract
- Kernel ADR 已明确 constrained layout 是复用既有 composite registry 的闭合 compile 能力，还是新的开放 Definition 能力；若新增开放能力，必须补齐 `XxxDefinition`、`defineXxx`、内置 + 自定义 registry 合并和统一 dispatch
- Table 可仅依赖 Core 公共契约启动后续 track-sizing ADR，不需要 Table 私有测量补丁

理由：

1. 任意 `IRChild` 的测量和受约束布局是 Core 通用图形能力，不是 Table 的局部算法
2. Table 的二维 solver 只有消费与最终 compile 一致的 bounds，才能保持布局确定性
3. 先冻结可观察合同、后由 Kernel 决定 API，避免 Table ADR 反向规定上游实现

## 待决策点 🔻

以下决策属于后续 Kernel ADR，而不是 Table 实现自由度；全部拍板并取得实现证据前，本 gate 保持未通过：

- **公开合同形态**：Core API、输入 / 输出类型与约束表示
- **compile / replay 时序**：测量、composite expansion、约束布局和最终 compile 如何共享环境并保证结果可重放
- **边界口径与坐标空间**：canonical allocation bounds 和 visual overflow bounds 的坐标空间，以及 transform、shape、stroke、label、shadow、clip 的参与规则；若合并为同一边界，必须证明不会丢失 Table 所需语义
- **开放能力模型**：复用既有 composite registry 的闭合 compile 能力，或新增完整 Definition / define / registry / unified dispatch 链路
- **诊断载体**：缺失引用、未注册 composite、循环、非法约束和内部布局失败如何关联到原始 `IRChild`
- **缓存与失效**：若实现缓存，哪些 definitions、compile options、host capabilities 和约束参与 cache identity

## DSL 表面

本 ADR 不新增或修改 Table DSL。下例只描述 alpha.2 后续能力必须可成立的行为，不是 Core API 草案：

```ts
const table = {
  namespace: 'table',
  type: 'table',
  structure: {
    kind: 'manual',
    rows: [{ id: 'row-1' }],
    columns: [{ id: 'content' }],
    cells: [
      {
        row: 'row-1',
        column: 'content',
        content: nestedComposite,
      },
    ],
  },
  layout: {
    columns: [{ size: 'auto' }],
  },
};

// 预期：auto 轨道消费 nestedComposite 在同一 Core compile 环境中的
// intrinsic / constrained bounds；Table 不识别其 namespace 或内部图元
```

## 测试设计

上游 Core 正式测试与后续 Table integration tests 共同覆盖：

- Node（含文本 content）、Path、Coordinate、Scope 与 nested composite 都能产生确定的 intrinsic 结果
- 宽度约束触发 Node 文本换行，并让 constrained 高度与最终 compile bounds 一致
- allocation bounds 与 visual overflow bounds 的坐标空间和组成可观察；transform、Node shape / label / shadow、Path stroke / label、Scope clip 的参与符合 Kernel ADR
- 不响应约束的内容返回稳定结果，不被伪装为缺失能力
- Coordinate 的合法零面积、空 Scope 与未执行能力 / provider 缺失可观察地区分
- 相同内容在相同 definitions、compile options、host capabilities 与约束下重复执行结果一致
- composite 展开后的测量与最终 compile 使用同一语义
- 缺失非局部引用、未注册 composite、循环 composite、非法约束与展开 / 布局失败可诊断
- React / Vanilla 注入同一环境时结果等价
- Table 侧只通过 Core 公共契约消费结果，且没有 namespace / renderer 特判

具体行为、反例与最低测试层见 ignored `notes/plans/table-alpha2-core-layout-gate/TEST_CONTRACT.md`。

## 影响

- Table alpha.2 的内容驱动布局在 gate PASS 前保持阻断；alpha.1 固定轨道行为不变
- 需要 Core 另开 ADR 并实现公开 Drawing contract；本 ADR不修改 Core schema、compile 或公共 API
- 后续 Table track-sizing ADR 只能消费 Core 结果，不能拥有通用 `IRChild` 测量与展开
- 本 ADR 不产生用户可见 API，因此当前不需要同步 docs 页面；后续布局能力落地时再同步双语文档
- Core 合同落地可能影响 Kernel React / Vanilla 形成 compile 环境的方式，但具体兼容性由 Kernel ADR 评估

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Layout；依赖 Drawing Complete / 通用图形测量与受约束布局
- 解决的问题：判断 alpha.2 内容驱动 Table 布局能否建立在统一、确定且可复用的 Core bounds 合同上
- 主责包与协作包：`@retikz/core` 主责通用 `IRChild` constrained layout；`@retikz/table` 主责二维轨道与 Cell box；React / Vanilla 负责等价注入
- 是否可由现有能力组合：不能；现有 composite expansion 与 `onNodeLayout` 没有形成任意 `IRChild` 的公共约束合同
- 是否需要下沉到 data / core / math：需要先下沉到 Core；Table 不下沉具体 API，也不修改 Data / Math
- 内部表达链路：Core 公共合同 → Table track solver → Cell box / alignment → Table lowering
- 外部扩展链路：内置与自定义 composite 必须经过同一 Core definition registry 和 layout / compile 路径；Table 不新增测量 registry
- pipeline / lowering 与下游消费：Table 在 lowering 前消费 Core 能力；最终 Core compile 重放同一布局语义，renderer 只消费 Scene
- React / Vanilla adapter 等价性：两入口必须能从各自上游输入形成等价 definitions、compile options、host capabilities 与约束，不复制布局算法；datasets 不进入 Core contract
- provenance / lineage / locator 是否适用：本 gate 不新增追溯产物；后续 Table manifest 必须使用最终 Cell allocation / visual overflow bounds 和 stable identity
- 不支持边界与本轮结论：先下沉补 Core 能力并阻断 Table 私有实现；gate PASS 后扩展 Table Layout

## 不在本 ADR 范围

- Core 公开 API 名称、参数结构、schema、缓存和 compile 调度时序
- allocation / visual overflow bounds 的具体 API 字段名；本 ADR只冻结其可观察语义
- Table track schema、solver、span、border、fit / overflow / clip 的具体字段与算法
- presentation / theme、group / summary、pivot、多层 header、fragmentation 与 virtual scroll
- 任何 Core 或 Table 产品代码实现

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`green`。当前只新增设计文档与 ignored 测试契约矩阵，不修改产品代码、公开 API、schema 或 compile。

### Schema 改动

无。

### 文件 scope

本 ADR 当前阶段只允许触碰：

- `packages/viz/_notes/decisions/table/v0/v0.1/alpha.2/roadmap.md`（新建）
- `packages/viz/_notes/decisions/table/v0/v0.1/alpha.2/01-core-constrained-layout-gate.md`（新建）
- `packages/viz/_notes/decisions/table/v0/v0.1/roadmap.md`（修改 alpha.2 导航与状态）
- `notes/plans/table-alpha2-core-layout-gate/TEST_CONTRACT.md`（新建，ignored）

Core 产品实现、Table 产品实现和正式测试均不在本 ADR scope。Core gate 的实现文件白名单由后续 Kernel ADR 决定；Table 实现文件白名单由 gate PASS 后的 alpha.2 ADR 决定。

### 测试象限

**Happy path（≥ 3）**：

- `任意基础 IRChild 可测量`：Node（含文本 content）、Path、Coordinate、Scope 分别进入通用合同 → 返回确定的 intrinsic bounds
- `嵌套 composite 可测量`：自定义 composite 嵌套内置 composite → 使用同一 registry 展开并返回完整 bounds
- `约束换行可重放`：含文本 content 的 Node 在有限宽度下换行 → constrained 高度与最终 compile bounds 一致
- `分配边界与视觉溢出边界可观察`：带 shape、stroke、label、shadow、transform 或 clip 的内容 → allocation / visual overflow bounds 使用明确坐标空间和组成规则

**边界（≥ 2）**：

- `内容超出可用盒是正常结果`：给固定几何 Path 施加更小可用盒 → 返回实际 bounds，由 Table 后续处理 overflow
- `零面积与空内容有明确语义`：Coordinate、空 Scope、零宽或零高约束 → 合法零面积 / 空结果与能力缺失可观察地区分

**错误路径（≥ 2）**：

- `缺失非局部引用可诊断`：内容引用未进入 context 的目标 → fail-loud 或返回结构化诊断
- `provider 缺失可诊断`：输入未注册 composite → 不得与合法空 Scope 或零面积 Coordinate 混淆
- `循环与非法约束可诊断`：循环 composite、非法约束输入或展开 / 布局失败 → 有限终止且不返回伪造成功结果

**交互（≥ 2）**：

- `自定义 definition 与 compile 环境一致`：相同自定义 definition、compile options、host capabilities 和约束经测量与 compile → 展开和 bounds 一致
- `React 与 Vanilla 等价`：两入口从相同 Table spec / datasets 形成等价 definitions、compile options、host capabilities 与约束 → 观察到等价结果
- `Table 不识别内容类型`：多个 namespace 的合法 `IRChild` 放入 auto Cell → Table 只消费 Core 公共结果

### 依赖的现有元素

- `CompositeDefinition`（`packages/kernel/core/src/contract/composite/types.ts`）—— 当前只提供 `expand(node)`，是上游 ADR 需要评估的现有扩展合同
- Core composite lowering（`packages/kernel/core/src/compile/orchestration/composite.ts`）—— 当前在 traversal 前展开 composite，是测量与最终 compile 一致性必须覆盖的时序
- `onNodeLayout`（Core compile options）—— 当前只观测真实 Node，不能直接作为任意 `IRChild` gate 的既有解法
- `CompiledNodeLayout`（`packages/kernel/core/src/compile/types.ts`）—— 当前区分正文 `content.size`、变换后 `content.bounds` 与视觉 `rect`，但不是任意 `IRChild` 的 allocation / visual overflow 合同
- Core traversal bounds（`packages/kernel/core/src/compile/orchestration/traversal.ts`）—— 当前 Scene 布局会合并 Node 外框、shadow、label 与 Path 输出，是 Kernel ADR 必须对齐的 visual bounds 现状
- Table resolve pipeline（`packages/viz/table/src/pipeline/resolve.ts`）—— 后续只消费已通过 gate 的 Core 公共能力
- Table layout pipeline（`packages/viz/table/src/pipeline/layout/layout.ts`）—— alpha.1 固定轨道现状，gate PASS 前不加入私有内容测量
