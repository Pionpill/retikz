# ADR-06：Box Layout Composite 双轴约束与回放合同

- 状态：Proposed
- 决策日期：2026-07-26
- 关联：[alpha.2 roadmap](./roadmap.md) · [alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md) · [Standard Box Layout roadmap](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/roadmap.md) · [ADR-04](./04-incremental-core-compile.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 背景

alpha.1 ADR-07 已让 Tier 2 composite 在一次完整 compile 内以 `layoutChild()` 测量任意 `IRChild`，并通过 compile-local replay 原子提交结果。当前 constraint 只有 intrinsic 与有限 `maxWidth`，结果只返回真实 allocation / visual bounds，replay placement 也只能附加 transform。这足以支持 Table 先定列宽、再取得换行高度的单轴闭环，却不能表达 Flex、Grid、Overlay 共同需要的双轴 available space、stretch slot、空容器尺寸与 item clip。

这些缺口若由 Standard 自行补齐，它只能按 Node / Text / TeX 类型估算尺寸、用 Scene scale 冒充 stretch，或在 replay 后再包一条私有 compile 管线。这样会让自定义 provider、nested layout-aware composite 与 React / Vanilla 得到不同结果，也会破坏 Core 对 reference、resource、artifact 和 diagnostics 的原子性。

Core 不应拥有 Flex line breaking、Grid track sizing、free-space distribution 或 LayoutItem schema。Core 只需把“父级给任意 child 一个二维 slot，child 在同一编译环境中反馈真实占用并可在外层包装后 replay”的通用机制补完整；具体 solver 和领域 artifact 继续由 Standard、Table、Plot 等 Tier 2 owner 决定。

## 决策：用双轴 constraint、slot feedback、显式 composite box 与 replay wrapper 扩展同一条主链

`ChildLayoutConstraint` 保留 `intrinsic` 作为无父级尺寸的自然布局，`constrained` 改为 width / height 两条可独立省略的轴约束。省略轴表示 indefinite；`bounded` 表示有限 min/max slot，`exact` 表示父级已分配的固定 slot。显式 `0` 始终合法且不等于省略。

```ts
type ChildLayoutAxisConstraint =
  | Readonly<{
      kind: 'bounded';
      min?: number;
      max: number;
    }>
  | Readonly<{
      kind: 'exact';
      size: number;
    }>;

type ChildLayoutConstraint =
  | Readonly<{ kind: 'intrinsic' }>
  | Readonly<{
      kind: 'constrained';
      width?: ChildLayoutAxisConstraint;
      height?: ChildLayoutAxisConstraint;
    }>;

type ChildLayoutSize = Readonly<{
  width: number;
  height: number;
}>;

type LayoutChildResult = Readonly<{
  allocationBounds: Readonly<BoundsRect>;
  slotSize: ChildLayoutSize;
  visualBounds: Readonly<BoundsRect>;
  replay: CompositeReplay;
}>;

type CompositeReplayWrapper = Readonly<{
  transforms?: ReadonlyArray<Transform>;
  clip?: IRClipSpec;
}>;

type CompositeReplayPlacement = Readonly<{
  kind: 'replay';
  replay: CompositeReplay;
  wrapper?: CompositeReplayWrapper;
}>;

type LayoutCompositeCompileResult<TArtifact extends JsonValue = never> = Readonly<{
  children: ReadonlyArray<IRChild | CompositeReplayPlacement>;
  allocationBounds?: Readonly<BoundsRect>;
}> &
  ([TArtifact] extends [never] ? { artifact?: never } : { artifact?: TArtifact });
```

理由：

1. constraint、measurement、nested propagation 与 replay 仍由唯一 Composite Definition / registry / compile session 承载，Standard 不获得 Core 内部 measurer 或 traversal state。
2. `allocationBounds`、`slotSize` 与 `visualBounds` 分别表达 child 的真实布局占用、父级分配尺寸和可见溢出；slot 的 x/y 与 start / center / end 对齐由父 solver 在自身坐标系决定，Core 不硬编码 center。
3. wrapper 复用 Scope 已有 transform / clip 语义，在 replay 外完成定位和裁剪，不需要二次 compile 或 renderer 特判。

### 双轴 constraint 与 slot 解析

- `intrinsic` 表示 width / height 都 indefinite，返回 child 的自然 allocation；此时 `slotSize` 等于 allocation 的 width / height。
- `constrained.width` 与 `constrained.height` 独立生效。省略某一轴表示该轴 indefinite；`constrained` 至少声明一条轴，否则 fail-loud。
- `bounded.max`、`bounded.min` 与 `exact.size` 都必须是有限非负数；`min` 省略时为 `0`，且不得大于 `max`。
- Core 先在约束下完成 child 的真实布局，再按每条轴把实际 allocation size clamp 到 `[min, max]` 或固定为 exact size，生成只有 width / height 的 `slotSize`。Core 不为 slot 生成 x/y，也不改变 child local origin。
- `allocationBounds` 始终报告约束后 child 的真实布局占用，不伪造成 slot。内容大于 bounded max / exact size 时 allocation 可溢出父级随后建立的 target slot；内容小于 bounded min / exact size 时 target slot保留空白。父 solver在自身坐标系用 `slotSize` 建立 target slot，并依据 start / center / end 等领域规则计算 replay transform；再以变换后的 allocation / visual bounds 与 target slot之差决定overflow artifact或clip。
- 对 Node，width bounded / exact 继续扣除 margin 与 shape padding后约束文本换行；给定宽度后的真实高度写入 allocation。height constraint 不缩放 glyph 或 shape，只影响 slot。Path、Coordinate 与普通 Scope 不重排自身几何，但仍返回约束解析后的 slot。
- nested layout-aware composite 原样收到父级传入的双轴 constraint。其 definition 可以依据 exact / bounded slot 求解子项，并通过结果级 `allocationBounds` 声明自身 container box；Core 不查看 provider key 或 child kind 猜测传播规则。

`bounded.max: 0` 提供通用的“压到最小可重排宽度并报告真实 overflow”probe，`intrinsic` 提供自然贡献。Standard 可用两者建立本 profile 的 minimum-shrink / natural contribution，但不得把它们宣传为完整 CSS min-content / max-content 算法。Core 本轮不新增 content contribution enum，也不承诺浏览器的断词、百分比或 writing-mode 规则。

### 显式 composite allocation box

`LayoutCompositeCompileResult.allocationBounds` 是 layout-aware composite 对外声明的 container allocation box：

- 省略时，沿用 alpha.1 行为，从最终普通 child / replay 的 allocation contribution 做 union；
- 提供时，它是该 composite 的对外 allocation 真源，允许空 Flex/Grid/Overlay 拥有有限尺寸，也允许 child 溢出 container 而不反向扩大 container；
- 提供时建立 allocation boundary：后代 allocation 仍供 composite 本次内部求解和引用使用，但不再逐项泄漏到外层 allocation union；published layout、visual primitives、namespace、artifact 与 diagnostics 仍完整保留；
- 数值必须有限，width / height 必须非负。它只改变 allocation contribution，不裁剪 visual bounds，也不覆盖 child namespace、resource、artifact 或 diagnostics；
- provider 必须依据收到的 constraint 与自身 JSON-safe 输入确定该值。Core 不校验某个 Flex/Grid solver 是否“算对”，但同一输入与 compile environment 必须确定且不可修改输入。

当 composite 作为另一个 layout-aware composite 的 child 被 probe 时，Core 以其显式 allocation 作为 `LayoutChildResult.allocationBounds`，再解析父级 slot。这样空容器、exact stretch 与 nested layout 可以沿同一 contract 闭环，而无需 Scene 中新增不可见 primitive。

### replay wrapper

`CompositeReplayPlacement.transforms` ⚠️ BREAKING 移入 `wrapper.transforms`；没有 wrapper 时保持 alpha.1 的直接 replay。`wrapper` 的行为与一个不带 id、style、namespace 和 animation 的 Core Scope 外壳一致：

- `transforms` 按现有 `Transform` 数组顺序投影 primitive、published layout、allocation / visual bounds、namespace layout 与 observation；
- `clip` 使用现有 `IRClipSpec`、Clip Definition / registry 与资源去重路径。clip 位于 replay 外层 local space，并与 wrapper transforms 使用 Scope 相同的坐标顺序；
- allocation bounds 不受 clip 影响；visual bounds 先在 wrapper local space执行 `intersect(childVisual, clipAABB)`，再按 `transforms` 顺序投影，精确复用 canonical Scope group 的 clip-before-transform 顺序；
- wrapper 只包装已保存结果，不重新 expand / compile / measure / lower。resource、warning、artifact 与 occurrence 仍在 replay 原子提交，clip resource 只在选中 replay 后注册；
- replay token 仍只能在创建它的同次 compile 中放置一次。未选 probe 及其 wrapper 不发布任何副作用。

Core 可按 replay root primitive 建立等价 wrapper group以保留既有 root z-index 顺序；不得把整个 replay 压成一个会改变 sibling stacking 的单一 z-index。wrapper 不增加 `maxCompositeDepth`，也不建立 namespace / identity boundary。

replay commit 必须先做无副作用 preflight：wrapper只允许 `transforms` / `clip`，每个 transform判别字段与数值都按现有 Transform contract校验且全部数值finite，clip完整解析成canonical `ClipShape`，token的所属compile与未使用状态也必须确认。任一检查失败时，不得标记token used，不得导入paint / clip resource，也不得写primitive、layout、namespace、warning或artifact sink；错误必须包含composite key与occurrence。preflight全部成功后才能一次性标记并进入既有原子commit。

### alignment、overflow 与诊断边界

- Core 不返回 baseline 或具名 alignment guide。Standard alpha.2 只承诺 start / center / end / stretch；baseline、first/last baseline 或领域 guide 需要真实跨域 consumer 后另立 ADR。
- Core 不新增 overflow enum。Tier 2 solver根据 `slotSize` 在自身坐标系建立 target slot，再结合变换后的 allocation与visual bounds形成自身 JSON-safe artifact；需要裁剪时显式选择wrapper clip。
- 非有限 bounds、非法 axis、空 constrained、`min > max`、伪造 / 重复 / 跨 compile replay、不可解析 clip、布局循环与 probe 中未完成的外部引用全部带 composite key 与 occurrence fail-loud。
- `maxCompositeDepth` 同时约束 nested `layoutChild()`；约束传播不得绕过既有深度、reference snapshot、provider 或 namespace 隔离。

### 与增量编译的关系

本 ADR 是 alpha.2 ADR-04 实现的设计前置。完整 compile 先以本合同成为 oracle，增量 Core 才能定义布局 contribution 的失效边界：

- constraint、显式 composite allocation、slot result、wrapper transform / clip 任一变化都属于 owning layout-aware composite 的布局 contribution 变化；
- 父 slot 变化必须使消费该 constraint 的 nested layout-aware subtree 失效，不能只 patch 最终 group transform；
- replay token 与 sandbox resource 仍只在单次 candidate compile 内存在，不进入跨 revision cache；已提交的 canonical contribution才可复用；
- full / incremental / fallback 对 Scene、resources、allocation / visual bounds、artifacts、warnings 和 wrapper clip 的结果必须等价。无法证明局部等价时回退到最近的稳定 identity boundary：当前仅为唯一非空 id 的 Scope，不存在则 root；anonymous Composite 自身不建立跨 revision boundary。

## 待决策点 🔻

无。Standard 公开命名、Flex/Grid/Overlay profile 与 solver 细节由 Standard 自身 ADR 决定，不在 Core ADR 中悬置。

## DSL 表面

Core 没有新增持久化 DSL。第三方 layout-aware definition 只消费公开 contract：

```ts
const measured = context.layoutChild(item.child, {
  kind: 'constrained',
  width: { kind: 'exact', size: itemWidth },
  height: { kind: 'bounded', max: rowHeight },
});

return {
  allocationBounds: { x: 0, y: 0, width: containerWidth, height: containerHeight },
  children: [
    {
      kind: 'replay',
      replay: measured.replay,
      wrapper: {
        transforms: [{ kind: 'translate', x, y }],
        clip: { kind: 'rect', x: 0, y: 0, width: itemWidth, height: rowHeight },
      },
    },
  ],
};
```

## 测试设计

`packages/kernel/core/tests/contract/composite/box-layout-contract.test.ts` 与现有 composite integration tests 覆盖：

- width / height indefinite、bounded、exact、zero 与 invalid constraint；
- intrinsic、minimum-shrink probe、给定宽度后的高度反馈、真实 allocation / slot size / visual overflow；
- 空 composite 显式 allocation、nested constraint propagation 与固定 child 不缩放；
- wrapper transform + clip-before-transform 坐标顺序、preflight零副作用、资源去重、z-index、artifact / warning / occurrence 原子提交；
- replay forgery / reuse、reference cycle、non-finite bounds 与 `maxCompositeDepth`；
- full compile 与 ADR-04 后续 incremental / fallback 等价。

详细行为矩阵见 ignored `notes/plans/kernel-v0.5-box-layout/TEST_CONTRACT_ALPHA2_ADR_06.md`。

## 影响

- ⚠️ BREAKING：`ChildLayoutConstraint` 的 constrained 分支由 `maxWidth` 改为 width / height axis；`LayoutChildResult` 新增 `slotSize`；`CompositeReplayPlacement.transforms` 移入 `wrapper.transforms`。
- `LayoutCompositeCompileResult` 新增可选 `allocationBounds`，不改变 Core IR / Scene schema，也不新增 registry。
- alpha.1 ADR-07 的 Table consumer需迁移到 `width: { kind: 'bounded', max }`；相同行为保持为 natural height feedback。
- `@retikz/core` 文档需同步 layout-aware composite 扩展页、API 表、nested / clip 示例和迁移说明；Standard 文档只在对应版本发布后引用该能力。
- ADR-04 的增量实现必须按本 ADR 的 constraint、slot、显式 allocation 与 wrapper contribution建立失效和等价测试。

## 绘图完备性检查

- 能力面与解决的问题：Composition 与 Constraint/Layout；让任意 Core child 接受二维 parent slot并反馈真实占用。
- 是否属于 Drawing Complete：属于 Core 的通用布局与 Tier 2 extension contract，不属于具体领域 solver。
- 主责包与协作包：Core主责 constraint / layout result / replay；math仅提供有限 bounds几何；Standard/Table等主责 solver；render只消费现有 Scene group / clip；adapter不增加语义。
- 是否可由现有能力组合：alpha.1单轴上限和 transform replay无法表达 exact height、空 container box与外层 clip，需要扩展现有 contract。
- math / core / render / adapter 的责任切分：不新增 math算法和renderer分支；Core在compile期解析；React / Vanilla只传同一 definitions/options。
- 是否需要新 IR / contract / registry：只修改非持久化 Composite contract；无新 IR、Scene、manifest或registry。
- Scene / manifest 如何承载：最终仍为现有 primitives、Group transform与ClipResource；layout artifact仍经 typed composite artifact返回。
- renderer 实现或诊断降级：renderer无降级；非法或无法闭环的layout在compile阶段fail-loud。
- React / Vanilla 如何等价暴露：两者不暴露独有prop，只贡献或消费相同 Composite Definition。
- Interaction Readiness 是否适用：slot / allocation artifact可供未来hit/selection消费，但本轮不定义交互。
- 不支持边界与本轮结论：扩展当前 Core Composition / Constraint contract；Flex/Grid/Overlay上移Standard，baseline与完整CSS延期。

## 不在本 ADR 范围

- Flex、Grid、Overlay、LayoutItem schema、track sizing、line breaking、free-space distribution与领域artifact。
- CSS百分比、writing mode、aspect-ratio transfer、min/max-content规范兼容、baseline、subgrid、masonry或DOM reflow。
- primitive几何缩放、renderer测量/回读、异步测量、跨compile replay/cache。
- 新Scene primitive、layout registry、GraphModel、tree/layered/force layout、edge routing或编辑器状态。

---

## 实现契约（必填）🔻

### Level

`red`：修改 Core 公开 Composite contract、compile orchestration 与包入口。

### Schema 改动

无 Core IR / Scene Zod schema 改动。`ChildLayoutAxisConstraint`、`ChildLayoutConstraint`、`LayoutChildResult`、`CompositeReplayWrapper`、`CompositeReplayPlacement` 与 `LayoutCompositeCompileResult` 是非持久化 TypeScript contract。

### 文件 scope

- `packages/kernel/core/src/contract/composite/types.ts`（修改公开类型与 JSDoc）
- `packages/kernel/core/src/contract/composite/index.ts`、`packages/kernel/core/src/contract/index.ts`、`packages/kernel/core/src/index.ts`（仅按 owner barrel 聚合新增类型；默认 `export *`）
- `packages/kernel/core/src/compile/orchestration/{types,traversal,visual-bounds}.ts`（constraint验证、slot size、显式allocation、wrapper replay与bounds）
- `packages/kernel/core/src/compile/node/layout.ts`（双轴 constraint 接线；禁止primitive scale）
- `packages/kernel/core/tests/contract/composite/**`、`packages/kernel/core/tests/compile/composite/**`、`packages/kernel/core/tests/compile/layout-aware-composite*.test.ts`、`packages/kernel/core/tests/compile/performance-trace.test.ts`（contract、integration、既有consumer迁移与trace回归）
- `packages/kernel/core/tests/compile/incremental/**`（ADR-04实现时补layout contribution等价）
- `apps/docs/src/modules/docs/contents/kernel/concepts/design/composite/{index.zh.mdx,index.en.mdx,layout-aware-compile.zh.demo.tsx,layout-aware-compile.en.demo.tsx}`（双轴layout-aware composite概念、示例与迁移）
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/compile/{index.zh.mdx,index.en.mdx}`（公开constraint / result / replay API表面）
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/scene-primitive/{index.zh.mdx,index.en.mdx}`（wrapper clip / transform canonical visual bounds顺序）

如实际 public barrel 已通过现有 `export *` 自动覆盖，不为“显式列名”修改入口。Table / Standard 等外部 consumer 在各自 package 的实现提交中迁移；本 ADR 的 Core 实现提交不顺带修改领域 solver。若实现需要触碰 Core IR / Scene schema、renderer或Standard solver，必须回到 ADR 重审。

### 测试象限

**Happy path（≥ 3）**：

- 双轴 bounded：给任意 child 有限 width / height max → 返回约束后 allocation、clamp 后slot size与同源replay。
- exact width高度反馈：Node在exact width内换行 → allocation height反映换行，slot width精确等于输入且primitive未缩放。
- nested exact：父composite把exact双轴传给nested layout-aware composite → nested显式container allocation、artifact与最终Scene一致。
- wrapper clip：同一replay附加translate与rect clip → visual bounds按Scope坐标顺序相交，allocation不被裁剪。

**边界（≥ 2）**：

- zero与indefinite：exact `0`、bounded max `0`、省略width / height和intrinsic分别保持可区分结果。
- 空与固定内容：空composite显式非零allocation；Path/Coordinate在大exact slot中不缩放，allocation与slot size可不同。
- 非中心对齐：同一非中心allocation在start / center / end target slot中由父solver产生不同transform，Core只返回相同slot size且不预设x/y。
- 溢出：不可断文本或minimumSize大于exact slot → allocation / visual超出slot且replay保留真实几何。

**错误路径（≥ 2）**：

- 非法axis：NaN、Infinity、负数、`min > max`、空constrained或未知字段 → 带composite key / occurrence fail-loud。
- 非法allocation：provider返回负尺寸或非有限`allocationBounds` → 不提交resource、warning、artifact或namespace。
- replay误用：伪造、重复、跨compile token、未知wrapper字段、非finite transform或不可解析wrapper clip → preflight原子失败且token仍未使用。

**交互（≥ 2）**：

- transform × clip × z-index：多个replay root与sibling交错 → wrapper不压平root stacking，resource顺序确定。
- reference × nested layout：child内部引用可解析，未完成外部reference / parent-child cycle fail-loud，`maxCompositeDepth`仍生效。
- artifact × occurrence：probe被丢弃、选中replay带nested artifact/warning → 只发布选中项且locator追加正确replay segment。
- anonymous × stable boundary：nested anonymous composite的constraint变化无法局部证明 → 回退到最近唯一id Scope；没有时root fallback。
- full × incremental：constraint或wrapper clip变化 → ADR-04重算正确layout boundary并与fresh compile的Scene/resources/bounds/artifacts/warnings等价。

### 依赖的现有元素

- `CompositeDefinition.compile`、`LayoutCompositeCompileContext.layoutChild()`（`contract/composite/types.ts`）——扩展现有唯一layout-aware主链。
- `CompositeReplay`与compile-local replay transaction（`compile/orchestration/**`）——保持opaque、一次性与原子提交。
- `IRClipSpec`、Clip Definition / registry、`ClipResource`（`schemas/clip`、`compile/resource/clip.ts`）——wrapper clip复用现有解析和资源去重。
- `Transform`与Scope group语义（`contract/scene`、`compile/orchestration/traversal.ts`）——wrapper坐标顺序和bounds投影真源。
- `BoundsRect`与canonical visual bounds（`@retikz/math`、`compile/orchestration/visual-bounds.ts`）——allocation / visual与父solver target slot比较的有限数值oracle。
- alpha.2 ADR-04 Core contribution / invalidation——实现时消费本合同，不缓存replay token。
