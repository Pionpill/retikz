# ADR-01：Node 锚点对齐定位

- 状态：Accepted
- 决策日期：2026-07-22
- 关联：[ADR-02](./02-scope-anchor-and-transform-pivot.md)

## 背景

上层 Composite 若按 Node 的真实文本、shape、padding、margin、scale 与 rotate 结果排列节点，不能自行预估尺寸，否则会复制 Core 布局语义。Scope placeholder 与合法的已解析空 Scope 都可能是 `0×0`，不能只凭尺寸判断 target 生命周期

## 决策

新增只属于 `Node.position` 的结构化 anchor 分支：

```ts
type IRAnchorPosition = {
  kind: 'anchor';
  target: IRNodeTarget;
  selfAnchor?: IRAnchorRef;
};
```

语义为：

```text
currentNode.anchor(selfAnchor ?? 'center', currentNode.boundary)
  = target.anchor(target.anchor ?? 'center', target.boundary ?? targetLayout.boundary)
  + target.offset
```

`target.offset` 保持世界坐标语义；self anchor 使用当前 Node 的有效 boundary。标准方向和数字角度 anchor 计入 margin，center、shape-specific anchor 与 `{ side, fraction }` 保持既有 shape 语义

`AnchorPositionSchema` 是 strict 单一真源，只进入 `NodeSchema.position`，不进入 Coordinate、Scope transform 或 Path target。带 `kind` 的原始对象不得落入旧 position 分支并静默剥离 discriminator；React、builder、unbuilder 和 Vanilla 直接复用该 IR，不物化默认值

### 布局与生命周期

Node 先完成内容测量、shape circumscribe、padding、minimum size、margin、scale、rotate 和 label，建立 provisional layout；再解析已完成 target 的 anchor 与 offset，计算全局 delta，反投影到当前 Scope 局部坐标，最后平移 rect 与 content center。只有最终 layout 才注册、触发 observer、emit、bbox 和 viewBox

Namespace entry 显式区分 `resolved` 与 `scope-placeholder`。Scope 收尾只能原子替换仍为预期 placeholder 的 entry；已解析空 Scope 仍可作为 center target，后写 resolved entry 不被覆盖。现有 namespace 可见性、shadowing、last-wins 与 duplicate warning 保持

### 引用、变换与失败

Anchor position 只接受 traversal 当前点以前已经完成且可见的 Node、Coordinate 或 Scope；未定义、后置、self、placeholder、未知 anchor / boundary、零尺寸 `{ side, fraction }` 和不可反投影的 zero scale 都同步 fail-loud，不 warning、不 fallback。Path 的 delayed target 与 unresolved warning 不变

target anchor 先解析，再叠加世界 offset；当前与 target 的 rotate / scale 不二次变换 offset。非零 translate、rotate、uniform / non-uniform / negative scale 合法；沿用 projected Rect 语义，不引入 matrix / polygon layout

## 兼容性与最终结果

`IRNode.position` 与 React Node props 增加 additive anchor 分支；Coordinate、Scope、Scene、renderer、math、render 和 composite contract 无字段变化。anchor position 与手写最终 IR 保持结构等价

## 遗留边界

不支持 Coordinate self anchor、Scope 自身 anchor / pivot、forward reference、循环约束、拓扑排序、碰撞避让或增量布局。新增带 `kind` 的 Node position 变体必须在原始 discriminator 路由中显式加入
