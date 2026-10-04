---
description: Flow 同级容器按自然最大宽度对齐，并由内部横向布局将新增宽度均分给可伸展 Entity
keywords: Flow、FlowLayout、FlowGroup、containerWidth、itemWidth、fill、等宽、伸展
---

# ADR-020：Flow 容器等宽与内部节点伸展

- 状态：Accepted
- 决策日期：2026-10-04
- 关联：[roadmap](./roadmap.md) · [包含结构](./007-flow-catalog-source-layout-groups.md) · [布局接入](./004-flow-layout-definition-registry.md) · [布局边界](./012-flow-layout-bounds.md) · [子项宽度](./013-flow-item-width.md) · [能力边界](../../../../architecture/schematic-graph-complete.md)

## 背景与目标

多行流程通常以纵向容器组织若干横向步骤行。每行内容和节点数量不同，自然总宽度也不同；居中排列会留下不齐的左右边缘。可见 Group 同样存在这个问题，仅扩大外框却不让内部内容适配，无法得到协调的布局。

作者应能声明同级容器取最大自然宽度，再由内部行把新增空间分给节点。自然较宽的行不收缩，文字和图形不整体缩放，间距不被拿来吸收差额。等宽不承诺跨行逐列对齐；逐列对应属于 Grid 的共享轨道语义。

## 决策

Flow 拥有同级容器宽度约束与 Graph 测量、关系标签空间和路由之间的协调；通用可用空间分配与线性排列复用 Layout，Entity 固定可见宽度及文本重排继续使用 Graph/Core 的公开契约。

将规则分为两个显式意图：父 FlowLayout 使用 `containerWidth: 'match-largest'` 确定直接子容器的共同宽度；内部横向 FlowLayout 使用 `itemWidth: 'fill'`，让可伸展 Entity 在自然宽度基础上均分新增空间。未声明填充的内部行只保持自然内容，不隐式伸展后代。

`itemWidth: 'match-largest'` 仍表示直接 Entity 的最终宽度相等；`'fill'` 表示分配相同的宽度增量，允许节点最终宽度不同。数值和 match-largest 的既有行为不变，不将旧值重新解释为容器等宽。

## 基础数据结构与公开契约

```ts
// FlowLayout 的局部 Source 字段；不是全图默认或 Theme 字段
containerWidth?: 'match-largest';
itemWidth?: number | 'match-largest' | 'fill';
```

- `containerWidth` 仅用于 `kind: 'linear'` 且 direction 为 up/down 的 FlowLayout。其直接 children 必须全部为受支持的 FlowLayout 或 FlowGroup；不混入 Entity，不跨层搜索同名、同 role 或同 group 的节点。
- 直接子 FlowLayout 必须是 left/right 的 linear 行，且直接 children 为 Entity。它可以保持自然内容，或用 `itemWidth: 'fill'` 消费父容器分配的宽度。
- 直接子 FlowGroup 以其可见外壳宽度参与比较；本能力要求它只有一个直接子 FlowLayout，作为明确的内容根，该 Layout 必须满足上述横向行条件。Group 用既有 Graph 外壳测量扣除左右内容 inset，把剩余宽度交给内容根。不猜测多子项自动分层 Group 中哪些节点应共同伸展。
- `'fill'` 只用于上述接收宽度的横向行；没有父级分配宽度时明确报错。它不用于 Grid，不隐式创建换行、伸缩权重、固定高度或任意跨层约束。
- Direct JSON、Vanilla 与 React 表达完全相同的契约。下例省略内部 Entity 声明，只展示组合关系；真实 Source 仍使用既有平级 catalog 与 children 引用。

```tsx
<FlowLayout kind="linear" direction="down" containerWidth="match-largest">
  <FlowLayout kind="linear" direction="right" itemWidth="fill">
    {/* 第一行 Entity */}
  </FlowLayout>
  <FlowLayout kind="linear" direction="right" itemWidth="fill">
    {/* 第二行 Entity */}
  </FlowLayout>
</FlowLayout>
```

字段描述须说明：containerWidth 对齐的是直接子容器总宽度；fill 保留自然宽度差异并均分剩余空间；节点最终等宽应使用 match-largest。作者或 LLM 不需要估算最长文案的像素宽度。

## 宽度分配与可观察结果

各行的自然宽度包含节点实际可见宽度、margin、既有 gap 与关系标签要求的占位。Group 还包含外壳内容 inset、标题及既有外壳最小尺寸要求。描边外扩、阴影、外部连线及装饰不用于扩大共同布局宽度；视觉边界与 allocation 的换算遵循既有 Graph 测量契约。

共同宽度为所有直接子容器的自然宽度最大值。确定共同宽度后不再把伸展结果作为新的自然宽度反复求最大值。所有参与节点须计入边界：参与的父容器、行布局不得配置非空 excludeFromBounds，避免被排除内容同时消费宽度。

对填充行，设可用宽度为 W、自然总宽度为 N、可伸展节点数为 k。保留 gap、margin、标签占位和固定节点宽度，每个可伸展节点增加 `(W - N) / k`。例如自然宽度相差 90 且有三个可伸展节点，较短行的节点各增加 30；不把每个节点强制改成 W/3。

在 Flow/Graph 默认、Theme 和 Entity-local 配置合并后具有有效 `layout.width` 的 Entity 视为固定宽度，不参加增量分配；minimumSize 和 maxTextWidth 不是固定宽度。剩余节点通过同一 Graph/Core 固定宽度测量能力取得最终宽高；形状不做几何缩放。形状不能满足目标宽度时明确失败，不按 role 建立可伸展形状白名单，也不静默排除失败节点。

无正剩余空间时保持已有尺寸；有正剩余空间却没有可伸展节点时失败。宽度变化引起的高度变化进入最终排列，随后确定连接端点、路由及标签结果。左右反向只改变排列方向，不改变物理宽度和增量公式。

Group 外壳与内容使用同一分配结果。较长标题可以决定共同宽度；内容按扣除 inset 后的空间伸展，不把标题本身拉伸。内部行未配置 fill 时保持原有内容对齐方式，允许只对齐外壳而保留内部留白。

## 布局接入与结果一致性

该能力属于作者指定 placement 的硬约束，不由布局算法选择是否执行。共享 Flow 测量和 placement 协调在进入布局 Definition 前确定受影响节点的最终测量尺寸以及容器的分配宽度；自定义与内置布局通过同一输入和输出校验消费它。

布局输入的容器元素增加可选 `allocatedWidth: number`，表示本次确定的物理宽度约束；无约束时省略。它是编译期分配事实，不进入 authored Source，不同时保存另一套 naturalWidth、growthDelta 或最终节点宽度缓存到公开契约。叶节点继续使用已有 size，布局输出继续使用已有 bounds，不新增平行结果模型。

Definition 必须保持分配宽度、已测量节点尺寸和作者指定的线性排列；违约由统一输出校验拒绝。无需新增可声明不支持该 placement 约束的 capability，也不允许第三方布局用重新测量或缩放改变它。Graph 物化、端点查询、routing 与 artifact 必须消费同一最终几何。

## 失败语义与兼容性

- 结构或方向不符合字段适用范围时，在调用布局器前失败，给出所属 Layout/Group 和字段路径，不忽略配置。
- 无可伸展项、不可满足的形状宽度或最终 Group 内容不能落入分配范围时，使用 Diagram 领域错误，携带相关容器与 Entity identity；底层测量失败保留 cause。
- 容器或节点在容差之外偏离已分配尺寸时属于 layout-output-invalid，不能只修 artifact、改外框或继续绘制不一致结果。
- 不做收缩、裁切、缩小字号、改写文本、扩大 gap 或静默扩大共同宽度来恢复失败；使用既有数值容差，不将浮点误差当作剩余空间。
- 未使用新字段和值的 Source 保持现有行为。本文获批后扩展 ADR-013 的宽度策略取值，并以独立 containerWidth 规则补充其容器宽度同步边界；旧数值和 match-largest 仍只作用于直接 Entity。
