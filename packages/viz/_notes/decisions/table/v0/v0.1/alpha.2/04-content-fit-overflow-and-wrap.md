# ADR-04：内容 fit、overflow、wrap 与自动行高

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[alpha.2 roadmap](./roadmap.md) · [Cell box、span 与 alignment](./03-cell-box-span-and-alignment.md) · [轨道尺寸与 solver](./02-track-sizing-schema-and-solver.md) · [Core constrained layout gate](./01-core-constrained-layout-gate.md) · [Table 完备设计](../../../../../architecture/table-visualization-complete.md)

## 背景

ADR-03 让 Cell 具有 content box，并使用 Core allocation bounds 做对齐，但仍需要冻结“内容尺寸超过或小于 content box 时怎么办”。若 wrap、缩放、裁剪和轨道 contribution 没有固定顺序，auto row 可能依赖 fit 后高度、fit 又依赖最终 row height，形成循环；不同 adapter 也可能用 DOM 与 headless Core 得到不同结果。

Table 不解析 Node 文本、Plot mark 或其它 composite 的内部语义。它只通过 ADR-01 的通用 Core constrained-layout 合同请求 intrinsic / width-constrained 结果，再对返回的 allocation / visual overflow bounds 应用统一 box policy。

fit、overflow 和 wrap 是每个 Cell 的闭合布局策略，不是 provider。custom Structure 与 direct `IRChild` 自动进入同一路径；不为文字或 Plot 建专用分支。

## 决策：wrap 影响 row contribution，fit/overflow 只影响最终放置

### Cell layout schema

扩展 ADR-03 的 `IRTableCellLayout`：

```ts
type IRTableCellLayout = {
  // ADR-03 fields
  wrap?: boolean;
  fit?: 'none' | 'contain' | 'cover' | 'stretch';
  overflow?: 'visible' | 'clip';
};
```

默认值：

- `wrap` 省略为 `false`，保持 alpha.1 内容不因列宽自动重排
- `fit` 省略为 `none`，保持内容原始尺寸
- `overflow` 省略为 `visible`，保持 alpha.1 不裁剪

`wrap:true` 表示 Table 向 Core 提供 content box width 约束，请求内容在该宽度下重新布局。是否可重排、如何断行以及长不可断 token 的语义由 Core 的 `IRChild` constrained-layout contract 决定；Table 不检查 child type。对不支持 reflow 的合法内容，Core 返回稳定的未重排 allocation bounds，超出部分走同一 overflow 策略。

`fit` 只改变最终内容 transform：

- `none`：不缩放
- `contain`：保持宽高比，使用让 allocation bounds 完整落入 content box 的统一 scale
- `cover`：保持宽高比，使用让 allocation bounds 完全覆盖 content box 的统一 scale
- `stretch`：分别按 x / y 缩放 allocation bounds 到 content box

contain / cover 允许放大和缩小。只有 source 与 content box 两轴都为正时，contain 承诺完整包含、cover 承诺完整覆盖；零尺寸输入按下述规则确定性退化，不把“包含/覆盖”保证外推到退化矩形。需要只缩小不放大的策略时，后续新增独立判别值，不把它隐含进 contain。

`overflow:'clip'` 把最终可见内容裁切到 content box；`visible` 不裁切。正宽高 content box 的 clip region 使用 Table 局部坐标中的 Core rectangle clip，并随 Cell 一起 lowering，不由 renderer 或 adapter 临时补 DOM/CSS overflow。

Core rectangle clip 只接受正宽高。content box 任一轴为 `0` 时，Table 不生成非法 rectangle clip，也不要求 Core 放宽 clip schema；它把该 Cell lower 为保留稳定 Cell Scope identity 的合法空可见子树：

- 外层 Cell Scope 保留稳定 id，children 为空且不挂 rectangle clip
- Table transaction 仍产出该 Cell 的 address、span、roles、source、零面积 visual bounds 与诊断关联信息
- 该结果表示“合法空可见内容”，不能与缺失 composite definition、无效引用或 Core layout 未执行混淆

### 单向布局事务

每个 Table 在同一个 Core layout environment 中按以下顺序执行：

1. intrinsic layout：对全部 Presented Cell 取得自然 allocation / visual overflow bounds
2. column contribution：使用 intrinsic allocation width + horizontal padding，并按 ADR-03 传播 column span
3. column solve：ADR-02 求出 columns 和每个 Cell 的最终 content box width
4. constrained layout：
   - `wrap:true` 以 content box width 请求 Core reflow
   - `wrap:false` 复用 intrinsic layout，不传 width constraint
5. row contribution：使用 constrained allocation height + vertical padding，并按 ADR-03 传播 row span
6. row solve：ADR-02 求出 rows 和最终 Cell/content boxes
7. final fit：只根据 constrained allocation bounds 与最终 content box 计算 replay-root local scale
8. bounds-aware alignment：先在 replay-root 局部坐标系变换 source allocation bounds，再计算 Table-local start/center/end translation
9. overflow：计算变换后的 visual overflow；`clip` 时与 content box 求交，正宽高 box 生成外层 Core rectangle clip，零尺寸 box 生成合法空可见子树
10. replay / lowering：复用上述 Core layout result 与同一个公共 environment 输出内容，不重新 expand、layout 或选择 definitions/options/capabilities

该顺序不反向重开 column solver。fit 和 overflow 不进入 column / row contribution；它们不能让 auto track 因 cover 放大、shadow 或 clip 而改变尺寸。auto row height只由 intrinsic 或 width-constrained allocation height决定：

- `rowSize:auto + wrap:true`：列宽确定后，文本等可 reflow 内容的 constrained height 驱动行高
- fixed / capped row 空间不足：保留轨道合同，内容 visible overflow 或 clip
- `rowSize:auto + fit:stretch`：先按自然/换行高度求行，再在最终 content box 内 stretch，不形成循环

### Fit 数学与退化输入

设 constrained allocation bounds 尺寸为 `w × h`，content box 为 `W × H`。

对 `w > 0`、`h > 0`、`W > 0`、`H > 0`：

```text
contain: s = min(W / w, H / h)
cover:   s = max(W / w, H / h)
stretch: sx = W / w, sy = H / h
```

所有结果必须有限非负。退化规则：

- `none` 始终 identity
- content box 某轴为 `0` 且 source 该轴为正时，该轴 stretch scale 为 `0`
- source 某轴为 `0` 时，该轴 stretch scale 为 `1`，零尺寸不会伪造为有面积
- contain / cover 只用 source 为正的轴计算候选 ratio；target 对应轴为 `0` 时 ratio 合法为 `0`
- 两个 source 轴都为 `0` 时 contain / cover 为 identity
- 只有一个 source 轴为正时，contain / cover 使用该轴 ratio，另一轴仍保持零尺寸；此退化结果不承诺填充另一 target 轴
- content box 任一轴为 `0` 时仍计算有限 scale 与 Table-local bounds，但 `overflow:'clip'` 走空可见子树，不生成零宽或零高 Core rectangle clip

fit scale 作用于 Core replay root 的未放置局部坐标系，不改写 replay result 或 child 自有 transforms。Table 随后把同坐标系的 source allocation bounds 同步变换，按 fit 后 bounds 计算 Table-local alignment translation；不得假设缩放中心或 child 原点位于 bounds 中心。

lowering 使用两层 Scope 固定坐标语义：

1. 外层未变换 Cell Scope 位于 Table-local 坐标系，持有正宽高 content-box rectangle clip
2. 内层 replay Scope 持有 fit scale 与 alignment/placement transform
3. 点变换的数学顺序固定为先 replay-root local scale，再 Table-local translate，即 `p_table = T_table(S_replay(p_local))`
4. clip 始终在上述变换完成后的 Table-local content box 上求交，不随内层 scale/translation 再变换

零尺寸 clip 分支仍保留外层 Cell Scope，但不生成内层 replay children。实现不得把 clip 放进 replay Scope，也不得先 Table-local translate 再绕错误原点缩放。

### Allocation 与 visual overflow

布局消费态必须在类型和中文 JSDoc 中区分以下坐标空间：

- `sourceAllocationBounds`：Core constrained layout 返回、fit 前的 canonical allocation bounds，位于 replay-root local 坐标系；用于 track contribution 与 fit 输入
- `sourceVisualOverflowBounds`：同一 Core result 的 fit 前视觉边界，位于 replay-root local 坐标系
- `contentAllocationBounds`：source allocation 经 fit + alignment/placement 后映射到 Table-local 的结果
- `visualOverflowBounds`：source visual overflow 经同一 transform 后映射到 Table-local；`clip` 时再与 content box 求交

replay-root local bounds 与 Table-local bounds 不可互换，字段名、JSDoc、manifest 拷贝和测试都必须显式体现该差异。

Cell box、content box 与 Table allocation bounds 不因 `overflow:'visible'` 扩张。最终 Scene / renderer 的可见 view bounds 可以包含 visible overflow；manifest 必须区分 Table allocation bounds 与 Cell visual overflow，不能把二者合并成一个含义不明的 `bounds`。

clip 对空 content box 是合法空可见结果，不等同 Core layout 失败。缺失 composite definition、无效引用或 constrained-layout capability 缺失仍按 ADR-01 fail-loud / diagnostic，不能用空 clip 掩盖。

最终 Scene 自动 bounds 必须使用 clip-aware 的可见结果：正宽高 clip 的内容贡献不得超出 Table-local content box，零尺寸 clip 分支不得贡献内容 bounds。当前 Core traversal 只聚合子 primitive bounds、不会用父 Scope clip 收窄 Scene bounds，因此 ADR-01 第 6 条的 Kernel Scope clip 视觉组成合同必须明确补齐并以 Core 测试证明；Table manifest 的求交结果不能代替最终 Scene bounds 证据，也不能由 renderer 或 adapter 二次修正。

### 与 ADR-06 的同源 transaction 硬合同

本 ADR 的 intrinsic、constrained、replay、clip 后 Scene 与 manifest 只在 ADR-06 的单次 transaction 中成立。一次 Table transaction 必须接受 Kernel 公共 constrained-layout/replay environment，并在同一 definitions、compile options、host capabilities 与 reference context 下产出 replay contribution 和 typed manifest artifact。

- React、Vanilla、SSR 与 embedded Table 禁止为渲染和 manifest 分别 lowering
- observer、`artifacts:true`、border 或 manifest 构建不得增加 presentation、layout 或 replay 次数
- custom composite、custom measurer/capability 与 compile options 必须在 intrinsic、constrained、replay、Scene 和 manifest 中同源
- direct API 缺失或无法共享公共 environment 时 fail-loud，不退回 alpha.1 估算、DOM 测量或 Table 私有 service

理由：

1. column-first 的单向事务让文本换行和自动行高可确定，避免宽高互相递归求解
2. wrap 只通过 Core 通用 constrained-layout 合同表达，Table 不解析内容内部类型
3. fit/overflow 不参与轨道 contribution，保持表格拓扑与视觉装饰正交
4. 两层 Scope 固定 replay transform 与 Table-local clip 的坐标顺序，避免非中心 bounds 和非零 content-box 原点下漂移
5. 零尺寸 content box 使用合法空可见子树，保持 Core clip schema 与 Cell identity/manifest 同时成立
6. Core rectangle clip 进入 lowering 后，SVG、Canvas、SSR 与 adapters 共享同一语义

## 待决策点 🔻

以下具体接线由 ADR-06 与上游 Kernel ADR 冻结：

- Core constrained-layout request 如何表达“无宽约束”与“width=0”
- replay result 如何携带可复用的 lowered child、allocation bounds 和 visual overflow bounds
- Core 公共 environment、typed artifact 与 compile-with-artifacts 的正式类型名

这些 API 选择不得改变 wrap / fit / overflow 的默认值、阶段顺序、两层 Scope、零尺寸空可见子树、同源 transaction 和 contribution 边界。manifest 中合法空 visual bounds 固定为零面积矩形，不再留作实现决策。

## DSL 表面

```ts
const spec = {
  namespace: 'table',
  type: 'table',
  structure: {
    kind: 'detail',
    columns: [
      {
        id: 'description',
        field: 'description',
        bodyLayout: {
          padding: { x: 12, y: 8 },
          wrap: true,
          fit: 'none',
          overflow: 'clip',
          horizontalAlign: 'start',
          verticalAlign: 'start',
        },
      },
    ],
  },
  layout: {
    columns: [{ index: 0, size: { kind: 'fixed', value: 180 } }],
    rowSize: { kind: 'auto' },
  },
};
```

```tsx
<ManualTable rows={1} columns={1} layout={{ columnSize: { kind: 'fixed', value: 160 } }}>
  <Row>
    <Cell content={plotSpec} layout={{ padding: 8, fit: 'contain', overflow: 'clip', horizontalAlign: 'center' }} />
  </Row>
</ManualTable>
```

## 测试设计

`packages/viz/table/tests/ir/cell-layout.test.ts`、`packages/viz/table/tests/layout/content-policy.test.ts` 与 ADR-06 integration tests 覆盖：

- wrap / fit / overflow 的 JSON、默认值与非法值
- column-first reflow 驱动 auto row，fixed row 不被内容反向改写
- none / contain / cover / stretch 的精确 scale、非中心 bounds、非零 content-box 原点与零尺寸退化
- 外层 Table-local clip + 内层 replay transform 的 Core IR 顺序，以及 scale + end align + clip 的 renderer 结果
- visible / clip 对 allocation、visual overflow、clip-aware Scene bounds 与 manifest 的不同影响
- 零尺寸 clip 不生成非法 rect、保留 Cell identity/manifest 并产生空可见 Scene
- Node 文本、Path、Scope、内置与自定义 nested composite 走同一 Core contract
- React / Vanilla、SSR / embedded 在同一个 Core environment 中得到等价几何，custom composite/measurer/options 不因 observer 双执行

详细行为矩阵见 ignored `notes/plans/table-alpha2-content-policy/TEST_CONTRACT.md`。

## 影响

- `IRTableCellLayout` 增加 wrap / fit / overflow，manual、detail 与 custom Structure 同时获得能力
- layout transaction 增加 width-constrained Core layout、final fit、visual overflow 与 clip 阶段
- auto row height从固定 alpha.1 公式扩展为 constrained allocation contribution
- lowering 为正宽高 clip Cell 生成外层 Core rectangle clip，为零尺寸 clip Cell 生成保留 identity 的空可见 Scope，不新增 renderer 私有语义
- Core 需要补齐父 Scope clip 参与最终 Scene bounds 的通用合同；Table 不以 manifest 或 renderer patch 代替
- 公开 Cell policy、layout transaction、lowering、manifest、React/Vanilla 与双语 docs 必须随 ADR-06/07 原子激活，不允许先接受后忽略字段
- 不修改 Presentation Definition；presentation 仍只负责生成 `IRChild`
- Core API、manifest 与 adapter runtime 的原子接线归 ADR-06/07

## 能力完备性检查

- 所属能力域与能力面：Tabular Visualization Complete / Content Layout
- 解决的问题：在确定 Cell box 内对任意 `IRChild` 统一 reflow、fit、对齐、overflow 与 clip
- 主责包与协作包：Table 主责 box policy 和两轴编排；Core 主责通用 constrained layout / replay / clip；renderer 只执行 Scene
- 是否可由现有能力组合：Core 提供通用原语，但 column-first 事务、Cell policy 与 auto row 属于 Table Layout，需要扩展当前域
- 是否需要下沉到 data / core / math：reflow 与任意 child layout 下沉 Core；fit 数学可用纯 bounds/transform，不进入 Data
- 内部表达链路：Cell layout schema → intrinsic columns → optional width constraint → row contribution → final box → fit/alignment → overflow/clip → replay
- 外部扩展链路：不采用 registry；自定义 Structure / Presentation / composite 经既有 Definition 生成相同 Cell/IRChild 并自动参与
- pipeline / lowering 与下游消费：ADR-06 保证 measurement、replay、Core IR、manifest 同一 transaction；renderer 不认识 Table fit
- React / Vanilla adapter 等价性：adapter 只表达相同 JSON policy 与 Core environment，ADR-07 提供 parity 证据
- provenance / lineage / locator 是否适用：fit/clip 不改变 Cell identity；manifest 保留 allocation 与可见 overflow 的不同口径
- 不支持边界与本轮结论：扩展 Table Layout；不实现 text-specific ellipsis、hyphenation 或 renderer/DOM overflow

## 不在本 ADR 范围

- ellipsis、line clamp、hyphenation、语言断行与 Table 私有文本排版
- baseline alignment、writing-mode、RTL
- 内容依赖 height 后重新计算 width 的双向迭代
- border、fragmentation、virtual scroll
- Core constrained-layout / replay API 的具体类型

---

## 实现契约（必填）🔻

### Level

本 ADR 自评 level：`red`。修改公开 Cell layout schema、核心 layout transaction 与 lowering 可见 clip/transform 行为。

### Schema 改动

| 文件                                               | 操作 | 字段名                           | 类型                                        | 默认值            | describe 中文摘要     |
| -------------------------------------------------- | ---- | -------------------------------- | ------------------------------------------- | ----------------- | --------------------- |
| `packages/viz/table/src/schemas/cell/constants.ts` | 新增 | `TableCellFit`                   | const object enum                           | —                 | 内容 fit 判别值       |
| 同上                                               | 新增 | `TableCellOverflow`              | const object enum                           | —                 | visible / clip 判别值 |
| `packages/viz/table/src/schemas/cell/schema.ts`    | 新增 | `TableCellLayoutSchema.wrap`     | boolean optional                            | runtime `false`   | 是否请求宽度约束重排  |
| 同上                                               | 新增 | `TableCellLayoutSchema.fit`      | `none / contain / cover / stretch` optional | runtime `none`    | 最终内容缩放策略      |
| 同上                                               | 新增 | `TableCellLayoutSchema.overflow` | `visible / clip` optional                   | runtime `visible` | content box 溢出策略  |

所有 `.describe(...)` 使用简短英文契约描述；`TableCellFitValue` / `TableCellOverflowValue` 从 const object enum 派生。

### 文件 scope

本 ADR preparatory 实现只允许新增不进入根 schema、public barrel 或公开 lowering 的内部纯 policy helper：

- `packages/viz/table/src/shared/layout.ts`
- `packages/viz/table/src/pipeline/layout/{content,fit}.ts`（私有纯函数，不从 package root 导出）
- `packages/viz/table/tests/layout/content-policy.test.ts`（只测纯 fit/bounds policy）

ADR-06/07 原子激活必须在同一可观察迁移中额外触碰：

- `packages/viz/table/src/schemas/cell/{constants,schema,types,index}.ts`
- `packages/viz/table/src/contract/model/types.ts`
- `packages/viz/table/src/pipeline/layout/{types,layout,index}.ts`
- `packages/viz/table/src/pipeline/{resolve,lower/**,manifest/**}`
- `packages/viz/table/tests/{ir/cell-layout,layout/content-policy,lower,manifest}.test.ts`
- `packages/viz/table-react/**`、`packages/viz/table-vanilla/**` 的 authoring/runtime parity 文件
- alpha.2 对应双语 docs / demo / reference 文件

不能提交“公开 schema 已接受 wrap/fit/overflow，但 layout、lowering、manifest 或任一 adapter 忽略它”的中间状态。Core 产品文件仍由独立 Kernel ADR 所有。

### 测试象限

**Happy path（≥ 3）**：

- `wrap 驱动自动行高`：fixed column + wrap text + auto row → constrained height 成为 row contribution
- `contain 保持比例`：非方形 bounds 放入非方形 box → 统一 scale 且完整可见
- `cover 填满并裁切`：cover + clip → content box 被覆盖且 visual bounds 被裁切
- `stretch 独立两轴`：source/target 比例不同 → 精确 x/y scale

**边界（≥ 2）**：

- `默认保持 alpha.1`：省略策略 → no wrap / none / visible
- `零尺寸 source/target`：各退化组合只产生有限非负 scale 与 bounds，完整包含/覆盖保证只适用于四轴正尺寸
- `长不可断内容`：Core 返回超宽 allocation → row 高可用，横向走 overflow
- `空 clip`：零 content box 不生成非法 Core rect，保留 Cell identity/manifest 并产生合法空可见结果

**错误路径（≥ 2）**：

- `非法策略拒绝`：未知 fit/overflow 字符串在 schema 精确字段失败
- `Core layout 失败透传`：缺失 composite definition / reference 不得被 visible/clip 吞掉
- `非有限 bounds 失败`：Core 或 fit 中间量出现 NaN/Infinity 时 fail-loud，不进入 lowering

**交互（≥ 2）**：

- `wrap × span × auto row`：跨列 Cell 先取得最终 content width，再传播 constrained row contribution
- `fit × bounds-aware alignment`：非中心 source bounds、非零 content-box 原点先 scale 后 start/end 对齐
- `scale × end align × clip`：外层未变换 clip 与内层 replay transform 的 Core IR/Scene/renderer 几何一致
- `visible × Table bounds`：视觉溢出进入 Scene view bounds但不改变 Table allocation tracks
- `custom composite × clip`：自定义 definition/measurer/options 与内置 child 使用同一 Core environment/replay/clip

### 依赖的现有元素

- ADR-03 `IRTableCellLayout` / `TableCellLayout`—— 增加 policy 并复用 content box/alignment
- ADR-02 column-first solver 与 auto rows—— 消费 intrinsic/constrained allocation contribution
- ADR-01 Core intrinsic / constrained layout、allocation / visual overflow bounds、Scope clip 视觉组成与 replay—— 本 ADR不定义 Table 私有 fallback
- ADR-06 单次 layout transaction、typed artifact 与 adapter 单次 compile—— 本 ADR的 environment 同源硬合同
- Core `IRScope.clip` / rectangle clip—— 仅用于正宽高 content box；零尺寸使用合法空可见 Scope
- `PresentedTableCell.content`—— 任意 `IRChild` 输入，不按 namespace 或 payload kind 分支
