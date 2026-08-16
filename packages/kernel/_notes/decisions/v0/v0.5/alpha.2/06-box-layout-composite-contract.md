# ADR-06：Box Layout Composite 双轴约束与回放合同

- 状态：Accepted
- 决策日期：2026-07-26
- 接受日期：2026-07-28
- 关联：[alpha.2 roadmap](./roadmap.md) · [alpha.1 ADR-07](../alpha.1/07-layout-aware-composite.md) · [Standard Box Layout roadmap](../../../../../../library/_notes/decisions/standard/v0/v0.1/alpha.2/roadmap.md)

## 背景

alpha.1 的 layout-aware composite 已能在一次完整 compile 中通过 `layoutChild()` 测量任意 `IRChild`，再用 compile-local replay 原子提交选中结果。原合同只有 intrinsic 与 `maxWidth` 单轴约束，结果只区分 allocation / visual bounds，replay 也只能直接接收 transform 数组。

这足以支持 Table 的定宽换行，却不能表达 Flex、Grid、Overlay 共同需要的双轴 available space、stretch slot、空容器尺寸与 item clip。若由 Standard 或其它 Tier 2 包自行估算 Node / Text / TeX，或另建私有 compile 管线，自定义 provider、nested composite 与不同 adapter 会得到不一致结果。

本 ADR 独立补全 Core 的通用 child-layout 合同，不依赖 ADR-05，也不扩大其它 alpha.2 ADR 的能力范围。Flex line breaking、Grid track sizing、free-space distribution、alignment 与领域 artifact 仍由各 Tier 2 owner 负责。

## 决策

### 双轴约束与 slot feedback

`ChildLayoutConstraint` 保留 `intrinsic`，并把 `constrained.maxWidth` 改为可独立省略的 `width` / `height` 轴。每条轴支持：

- `bounded { min?, max }`：用真实 allocation size 在有限非负区间内 clamp 出 slot size，`min` 默认 `0`
- `exact { size }`：父布局已经分配固定 slot
- 省略轴：该轴 indefinite，slot size 等于真实 allocation size

`constrained` 至少提供一条轴。显式 `0` 合法且与省略不同；`-0` 规范化为 `0`。所有轴数值必须有限且非负，`min` 不得大于 `max`。传给 provider 的 constraint 会 detached 并递归冻结，nested provider 不能反向修改父级 slot。

公开结果拆成四个互不替代的值：

```ts
type LayoutChildResult = Readonly<{
  allocationBounds: Readonly<BoundsRect>;
  slotSize: ChildLayoutSize;
  visualBounds: Readonly<BoundsRect>;
  replay: CompositeReplay;
}>;
```

- `allocationBounds` 是约束后 child 的真实局部占用，不伪造成 target slot
- `slotSize` 只有父级分配的 `width` / `height`，不包含 x / y、alignment 或 baseline
- `visualBounds` 是该次 child layout 最终静态 primitive tree 的保守视觉包络
- `replay` 是一次性、compile-local、callback-local opaque token

Core 只把 width constraint 接入已有文本换行路径。height constraint 不缩放 glyph、shape 或 primitive，只影响 slot。父 solver 根据 `slotSize` 决定 target slot、对齐、overflow 与 replay transform。

### 显式 composite allocation

`LayoutCompositeCompileResult` 新增可选 `allocationBounds`：

```ts
type LayoutCompositeCompileResult<TArtifact extends JsonValue = never> = Readonly<{
  children: ReadonlyArray<IRChild | CompositeCompileChild>;
  allocationBounds?: Readonly<BoundsRect>;
}> &
  ([TArtifact] extends [never] ? { artifact?: never } : { artifact?: TArtifact });
```

- 省略时，从最终普通 child / replay 的 allocation contribution 做 union
- 提供时，作为 composite 对父级声明的唯一 container allocation；空容器因此可有尺寸，后代 overflow 不再反向撑大父容器
- allocation boundary 只截断后代对更外层的 allocation contribution；Scene primitive、visual bounds、namespace、resource、artifact、warning 与 occurrence 仍正常发布
- x / y / width / height 必须有限，width / height 非负，且派生的 `x + width` / `y + height` 也必须有限

Nested layout-aware composite 原样收到父级双轴 constraint，并可用显式 allocation 声明自身 container box。Core 不按 provider key 或 child kind 猜测传播规则。

### Replay wrapper

`context.replay(result, transforms?)` 改为：

```ts
type CompositeReplayWrapper = Readonly<{
  transforms?: ReadonlyArray<Transform>;
  clip?: IRClip;
}>;

context.replay(result, wrapper?);
```

Wrapper 是不带 identity、namespace、style 或 animation 的 replay 外壳：

- `clip` 在 replay local space 生效，再按 `transforms` 顺序投影
- transform 同步投影 primitive、published layout、allocation、namespace layout 与 observation
- clip 不改变 allocation；它只收紧最终提交后的 Scene compile visual bounds，不回写先前取得的 `LayoutChildResult.visualBounds`
- 有非空 transforms 或 clip 时，每个 replay root 分别包装为等价 `GroupPrim`；没有有效 wrapper 字段时保留原 primitive
- 逐 root 包装保留原有 z-index 排序，不把整个 replay 压成新的单一 stacking unit
- wrapper 不重新 expand、compile、measure 或 lower，也不增加 composite depth

Builder 先验证真实 `LayoutChildResult` identity、owner、字段与 transform / clip 形状，并 detached / 冻结 wrapper。Commit 再解析 clip provider、确认 token 未使用，然后一次性发布 primitive、resource、layout、namespace、warning 与 artifact。复制 result 后保留真实 token、伪造 token、跨 callback / compile、重复 replay 或非法 wrapper 都 fail-loud，错误包含 composite key 与 occurrence；preflight 失败不消费 token、不导入资源、不写任何 sink。

空 replay 或被 clip 完全裁空的 replay 不产生伪造的原点 visual contribution。

## 包边界

- `@retikz/core` 拥有双轴 constraint、slot feedback、显式 composite allocation、compile-local replay 与 canonical visual bounds
- `@retikz/math` 只提供既有 bounds 几何，不新增布局算法
- renderer 继续只消费既有 Scene primitive、Group transform 与 ClipResource，不增加特判
- React / Vanilla adapter 只传递相同 Composite Definition / compile options，不暴露平行能力
- Standard、Table、Plot 等 Tier 2 owner 拥有 solver、alignment、overflow policy 与领域 artifact

Core 不新增持久化 IR、Scene schema、registry、baseline guide、overflow enum 或 layout registry。

## 兼容性

本决策包含三项 breaking contract 变更：

1. `ChildLayoutConstraint` 的 `constrained.maxWidth` 迁移为 `constrained.width: { kind:'bounded', max }`
2. `LayoutChildResult` 新增必需的 `slotSize`
3. replay transform 数组迁移到 `context.replay(result, { transforms })`

仓内 Table consumer 已同步迁移；solver 行为仍是定宽后读取真实高度。`LayoutCompositeCompileResult.allocationBounds` 与 replay `clip` 是新增可选能力。

本 ADR 不改变增量编译安全子集。任意 Composite 输入、definition、constraint、显式 allocation 或 wrapper 变化继续走 full fallback，并与 fresh `compileToScene()` 等价；opaque token 与 output handle 不进入跨 revision cache。

## 被否决的方案

- **由 Standard 私有测量 child**：会复制 Core 的文字、provider、reference 与 nested composite 语义
- **用 Scene scale 模拟 exact / stretch**：会改变真实几何和文字，不等价于父级分配 slot
- **把 target slot x / y、alignment 或 overflow policy 放进 Core**：这些是 solver / domain 语义，不能由通用 child contract决定
- **让 definition 直接输出 replay token 或构造 placement**：无法维护 callback ownership、一次性提交与原子副作用边界
- **新增不可见 primitive 表示空 container**：污染 Scene / renderer 合同，显式 allocation 已能表达同一事实
- **为 layout-aware subtree 扩大增量复用**：当前没有 stable identity 与失效证明，先保持 full fallback

## 最终实现

- Core contract 新增 `ChildLayoutAxisConstraint`、`ChildLayoutSize`、`CompositeReplayWrapper` 与结果级 `allocationBounds`
- compile orchestration 实现 constraint 校验 / 冻结、slot 计算、allocation boundary、result identity、wrapper preflight、clip-before-transform visual bounds 与逐 root replay
- canonical visual-bounds 内部增加可选空结果，避免 empty / fully-clipped replay 把 `(0, 0)` 注入 Scene layout
- Table transaction 迁移到 width axis；incremental fixture 只迁移 breaking replay 调用语法，没有改变断言或安全子集
- Kernel Composite 概念页、compile Reference、Scene Primitive、双语 demo 与 v0.5 changelog 已同步

## 验证

覆盖双轴 bounded / exact / indefinite / zero、给定宽度后的换行高度、nested constraint、显式与空 allocation、overflow、constraint mutation、result forgery、duplicate / cross-session replay、wrapper clip / transform / resource / z-index、empty / fully-clipped bounds、非法极值与 full-fallback 等价。

验证同时对账 Core、Table consumer、增量 fallback、公开类型和双语文档，确保 replay wrapper 与 allocation / visual bounds 的可观察结果保持一致。

## 遗留边界

- 不承诺 CSS min-content / max-content、百分比、writing mode、aspect-ratio transfer、baseline、subgrid、masonry 或 DOM reflow
- 不提供 primitive 几何缩放、renderer 测量 / 回读、异步测量或跨 compile replay / cache
- Flex、Grid、Overlay、LayoutItem、track sizing、line breaking、free-space distribution 与领域 artifact 由 Standard 独立 ADR 承接
- layout-aware subtree 的局部失效与复用需要单独的 stable identity、constraint propagation 与 allocation-boundary 证明
