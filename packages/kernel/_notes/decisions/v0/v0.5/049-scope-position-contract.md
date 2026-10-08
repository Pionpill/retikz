---
description: 统一 Scope 与复合组件的作者定位入口，用 position 表达原点位置或锚点对齐，保留 transforms 的局部变换职责
keywords: Scope、position、placement、transform、Composite、Chart、Plot
---

# ADR-049：Scope 与复合组件的统一定位契约

- 状态：Accepted
- 决策日期：2026-10-08
- 关联：[版本目标](./roadmap.md)、[Node 锚点定位](./001-node-anchor-position.md)、[Scope 锚点与 pivot](./002-scope-anchor-and-transform-pivot.md)、[完整 Scope 输出](./020-layout-aware-scope-output.md)、[Source 字段分组](./036-source-ir-semantic-grouping.md)
- 生效关系：获批并实施后替代 ADR-002 中 `placement` 的公开字段形态；保留其锚点、包络、pivot、引用生命周期与失败语义。ADR-020 的完整 authored Scope 与数值 replay 分工继续有效

## 背景与目标

组合图形需要声明自身在父坐标系中的位置。把这项事实写成 `transforms` 中的一段平移，会把作者定位与局部变换混在同一列表里；上层 adapter 若再将独立 `x/y` 拼入该列表，就形成不同入口的平行表达。已有 Scope 锚点对齐能够完成精确定位，但不能直接表达与 Node 一样简洁的 `position={[x, y]}`。

目标是让作者能够独立声明组合位置、局部变换和锚点对齐。Core 统一解释这一语义，普通 Scope、继承其 surface 的 composite 以及 layout-aware authored Scope 使用同一契约；Scene 的数值变换继续由 renderer 执行。

## 决策：position 是唯一的 Scope 作者定位入口

Scope 使用 `position` 替代 `placement`。它有两种明确形式：点形式指定局部原点的基础位置；anchor 形式将变换后包络的指定锚点对齐目标。`transforms` 保留旋转、缩放、平移等附加局部变换，不能由 adapter 私自承接或消去 `position`。

这不是将所有图形坐标改名为 position。Node 的既有定位、Coordinate 的坐标、Path 的目标序列、Shape 的中心与端点、Plot 数据通道、Layout 的槽位及领域布局结果仍由各自契约拥有。

## 基础数据结构与公开契约

```ts
type IRScopePositionTarget = IRPosition | IRNodeTarget;

type IRScopeAnchorPosition = {
  kind: 'anchor';
  target: IRScopePositionTarget;
  selfAnchor?: IRScopeSelfPoint;
};

type IRScopePosition = IRPosition | IRScopeAnchorPosition;

type IRScopeProps = {
  position?: IRScopePosition;
  transforms?: Array<IRTransform>;
  // 其余既有 Scope 属性保持原契约
};
```

Core 拥有 `ScopePositionTargetSchema`、`ScopeAnchorPositionSchema`、`ScopePositionSchema` 与对应 schema-derived IR 类型。Target 和 self point 复用既有 Core 原子；不复制 Node 的测量或引用解析。Node 的 anchor 分支保持自身较窄的 target 与 selfAnchor 约束，不强行合并为一个宽 union。

`ScopePropsSchema` 是组合属性的权威来源，`context.scope()` 继承其完整 surface。`CompositeReplayWrapper` 继续只接受已经确定的数值 transforms 与 allocation-coordinate clip，不增加 position、身份或引用求解入口。

React 与 Vanilla 表达同一 Source 结构，并保留作者省略状态。普通定位例如：

```tsx
<Map position={[375, 0]} entries={entries} />
<Scope position={[180, 170]} transforms={[{ kind: 'rotate', degrees: 15 }]}>
  {children}
</Scope>
<Map
  position={{ kind: 'anchor', target: { id: 'previous', anchor: 'right', offset: [24, 0] }, selfAnchor: 'left' }}
  entries={entries}
/>
```

## 位置、变换与坐标系

### 原点定位

省略 position 表示父坐标系中的 `[0, 0]`，不做内容包络居中。显式 `[0, 0]` 与省略在可观察几何上等价。Source 可省略；直接 schema parse 物化这个静态默认值。

设作者位置为 p，局部变换为 M，祖先变换为 A，子项局部点为 q，最终坐标为：

```text
world(q) = A · T(p) · M · q
```

position 位于自身 transforms 外侧、祖先变换内侧，因此自身缩放或旋转不会再次缩放或旋转 p。附加 translate 仍可产生视觉偏移：`position=[100, 50]` 配合局部 `translate(10, 0)`，局部原点最终位于父坐标系 `[110, 50]`。position 不承诺变换后的内容左上角或中心等于 p。

### 锚点定位

`kind: 'anchor'` 沿用原 placement 的最终对齐语义。Target 点在父坐标系解释；命名目标必须在当前 traversal 之前已经完成，引用的 offset 保持世界 user-units，只应用一次。`selfAnchor` 省略时为变换后包络 center，允许既有方向、角度、边上比例、局部点和 origin。

先得到 M 作用后的包络锚点 s，再求平移量 d = target − s，最终输出 `A · T(d) · M`。这是精确对齐约束，因此纯局部平移可能被 d 抵消；需要给精确对齐增加位移时，应移动 target 或使用 target.offset。点形式与 `{ kind: 'anchor', target: p, selfAnchor: 'origin' }` 在有附加变换时不保证等价。

旋转和缩放 pivot 仍由固有包络解析；position 不成为 pivot，也不参与固有内容测量。空 Scope 的 center 退化到 origin，零尺寸边上比例、不可逆坐标反投影和非有限结果沿用既有失败行为。

### 嵌套布局与最终发布

父布局决定子项 slot 的数值放置。子项先按自身普通语义完成测量，父布局再按 allocation bounds 对齐、归一化或裁剪；子项 position 不覆盖父 solver 的槽位，也不自动成为槽位后的额外偏移。需要父布局绝对放置时使用该布局的显式 positioned item 契约。

Scope 位置必须与 transforms 一起且只应用一次到最终图形、namespace target、observer、空间句柄、边界与 auto viewBox。clip 继续属于声明它的局部坐标系。领域 artifact 中声明为局部坐标的事实保持局部，不重复存储世界投影。

## 组件与 adapter 表面

- Collection 的 Array、Map、Matrix、Stack、Queue、Chain、Tree，Presentation 的 Axes、Grid、Frame、Legend、Surface，Graph 的 Scope-backed 组件及 Diagram 根容器，从 Core Scope surface 继承 position
- Graph Entity 继续使用 Node.position；Path、Relation、Standard Shape 等按几何描述定位，不增加竞争性的第二个主位置
- Chart 与 Plot 的现有 panel 表示外层 Core Scope。其定位统一为 `panel.position`，删除该 panel 的 `x/y` 和 `placement`；transforms、clip、theme、zIndex 保持同一外层 Scope 的职责。React Plot 原先平铺的面板属性以 `position` 替代 `x/y`，并由 Vanilla 保留为外层 Scope.position，不在 adapter 中转成 translate。React Chart 继续显式使用 panel
- 原始 Chart/Plot Source 仍描述领域图形，放置整个领域图形可使用普通 Scope。Flex/Grid/Overlay Layout 与 Table 也继续由外层 Scope 定位，不在本决策中扩张它们的根 Source 为完整 Scope surface
- Flow 算法拥有的内部实体、分组和布局槽位继续禁止作者提供与自动放置竞争的容器 position；完整 FlowDiagram 与 BranchDiagram 根容器允许 position
- 所有官方和自定义 composite 复用同一个 Core Scope 路径；不建立组件名单驱动的特殊定位逻辑

## 行为、失败语义与兼容性

- 这是 breaking 的作者 API / Source 变更：移除 Scope `placement` 及对应公开旧类型、schema；不保留旧名别名、兼容解析或双轨字段
- 旧 Scope placement 的行为由 `position={ kind: 'anchor', target, selfAnchor }` 表达；旧作者根平移由点 position 表达。该转换是调用方和仓库示例的一次性更新，不进入运行时
- 若 transform chain 第一项是作者位置平移，可将该项移至 position 并保持其余顺序；列表中间的平移、pivot 补偿、几何 lowering 和 replay 平移不能机械搬移
- anchor 对象 strict，未知字段、非法 target 或坐标在 schema 边界拒绝；target 的未定义、前向、自身、后代或未完成引用，以及非法 anchor / boundary 在 Core 编译边界诊断。错误不会退回 transform 路径或原点
- 不新增 forward-reference solver、通用约束求解或自定义定位 registry。定位形式是封闭的数据契约；扩展 composite 仍通过既有 Definition 和 Core 编译契约组合
- Scene、SVG 与 Canvas 不增加 position 字段，也不把出现 translate 视作违规；它们消费 Core 产生的最终数值变换
