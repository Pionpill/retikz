# ADR-01：Node 锚点对齐定位

- 状态：Accepted
- 决策日期：2026-07-22
- 关联：[v0.5-alpha.1 roadmap](./roadmap.md) · [v0.5 路线总计划](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [v0.2-alpha.6 结构化 Target / Anchor](../../v0.2/alpha.6/01-structured-target-anchor.md) · [v0.4-alpha.2 Scope 多态包围盒](../../v0.4/alpha.2/02-scope-polymorphic-bbox.md)

## 背景

既有 Node position 都能在 Node 尺寸未知时先解析出内容盒中心。上层 composite 若要按普通 Node 的真实文本、shape、padding、margin、scale 与 rotate 结果排列节点，只能自行预估几何；这会复制 core 布局语义，并在自定义 shape、boundary 或文本测量变化时漂移。

Scope 还存在一个不能由尺寸表达的生命周期差异：编译子树时登记的 Scope placeholder 与合法的已解析空 Scope 都是 `0×0 NodeLayout`。若新定位只检查尺寸，就会把尚未完成布局的祖先 Scope 当成合法目标，或错误拒绝已闭合空 Scope。

## 决策

新增只属于 `Node.position` 的 `IRAnchorPosition`：

```ts
type IRAnchorPosition = {
  kind: 'anchor';
  target: IRNodeTarget;
  selfAnchor?: IRAnchorRef;
};
```

语义固定为：

```text
currentNode.anchor(selfAnchor ?? 'center', currentNode.boundary)
  = target.anchor(target.anchor ?? 'center', target.boundary ?? targetLayout.boundary)
  + target.offset
```

`target.offset` 沿用 `IRNodeTarget` 的世界坐标偏移语义。`selfAnchor` 不增加独立 boundary，使用当前 Node 的有效 `boundary`。标准方向与数字角度 anchor 计入 margin；`center`、shape-specific anchor 与 `{ side, fraction }` 保持视觉 shape 语义。

### Schema 与 authoring

- `AnchorPositionSchema` 是闭合对象，`IRAnchorPosition` 由 `z.infer` 派生。
- 该分支只进入 `NodeSchema.position`，不进入 Coordinate、`IRResolvablePosition`、Path target 或 Scope transform。
- Node position 原始对象一旦带 `kind`，就只按 `AnchorPositionSchema` 解析。它不能落入宽松的旧 position 分支并被静默剥离 discriminator。
- `target` 复用 `NodeTargetSchema`。省略 target anchor 在本语境表示 `center`；Path 消费同一结构时仍表示自动 boundary clip。
- React `NodeProps.position` 显式加入同一派生类型；builder / unbuilder 不物化默认值。Vanilla `node()` 直接透传 `IRNode`，不增加平行 helper。

### 两阶段 Node 布局

每个 Node 仍只测量和构造一次：

1. 完成文本测量、shape circumscribe、padding、minimum size、margin、scale、rotate 与 label 描述。
2. 普通 position 沿用 `resolvePosition`；anchor position 以当前 Scope 局部原点构造 provisional layout。
3. 从 namespace 读取已完成布局的全局 target，解析 target anchor 并叠加世界坐标 offset。
4. 把 provisional layout 通过既有 `projectLayoutToGlobal` 投影为新快照，以未缓存 resolver 计算 self anchor。
5. 在全局坐标系求位移；通过反投影两个点之差把位移映射回当前 Scope 局部坐标。
6. 不可变地平移 `rect.{x,y}` 与 `contentCenter`，得到最终 layout。
7. `onNodeLayout`、id 注册、Scene emit、Scope bbox 与自动 viewBox 只消费最终 layout。

provisional 快照不注册、不 emit，也不进入 anchor `WeakMap` cache。后续 Node 作为 target 时只会基于最终注册对象建立缓存，因此 A → B → C 链式定位不会读取 B 平移前的坐标。

### Anchor、boundary 与 owner 边界

完整 `IRAnchorRef` 分派由 `compile/reference` 的两条路径共享：

- `resolveAnchorRefUncached` 供仍会整体平移的 provisional layout 使用。
- `resolveAnchorRef`、`resolveAnchor` 与 `resolveEdgePoint` 保留现有 `WeakMap` 缓存，供已经稳定的 target / path 读取。

两条路径都复用 `compile/node/anchors` 的 `anchorOf`、`angleBoundaryOf`、boundary registry 与 shape `edgePoint`。未缓存组合逻辑不从 `compile/node` barrel 新增导出，保持该内部兼容面不扩张。零尺寸目标的 `{ side, fraction }` 继续 fail-loud，诊断改为通用 zero-size target；center 与标准方向 anchor 在 Coordinate / 空 Scope 上退化为中心。

该能力不新增 registry。自定义 shape 与 boundary 继续通过既有 definitions、registries 与 compile options 接入。

### Namespace 生命周期

`NamespaceStack` 的 frame 保存内部 entry：

```ts
type NamespaceEntry = {
  layout: NodeLayout;
  state: 'resolved' | 'scope-placeholder';
};
```

- Node、Coordinate 与已闭合 Scope 登记为 `resolved`；Scope 子树编译前显式登记 `scope-placeholder`。
- `replaceLayout(..., expectedCurrent)` 只有在当前 layout 仍是预期 placeholder 时，才原子替换 layout 并把状态改为 `resolved`。
- 子树内后写同名 resolved entry 时，Scope 收尾替换返回 `false`，不得覆盖其 layout 或 state。
- 已解析空 Scope 即使仍为 `0×0`，状态也是 `resolved`，可以作为 center target。
- 既有 `lookup()`、inside-out、local namespace、last-wins、shadowing 与 duplicate warning 行为不变；新增 `lookupEntry()` 只供需要生命周期判断的 compile 逻辑使用。

状态不进入 IR、NodeLayout、Scene、manifest 或公开 observer DTO。

### 引用顺序与错误

anchor position 只接受 traversal 当前点之前已经完成布局并且按 namespace 规则可见的 Node、Coordinate 或 Scope。以下情况同步抛错，不 warning、不 fallback：

- target 未定义或在 IR 中后置。
- 当前 Node 的 id 与 target id 相同；检查先于 lookup，外层同名实体不能绕过自引用。
- target entry 是仍在布局的 Scope placeholder。
- anchor 未知、boundary provider 未注册、shape 不支持 edge anchor，或零尺寸 target 使用 `{ side, fraction }`。
- 当前 Scope transform chain 任一有效 scale 轴为 `0`，无法精确反投影位移。

Path 的延迟解析、自动 boundary clip 与 unresolved warning 不变。

### Transform 契约

- namespace target 继续使用现有 projected `NodeLayout` 全局几何。
- target anchor 先解析，再叠加世界坐标 offset；offset 不随目标或当前 Scope 的 rotate / scale 二次变换。
- self provisional layout 先按现有投影语义变到全局，再求 anchor 与 delta。
- 非零 translate、rotate、uniform / non-uniform / negative scale 均允许；局部位移只反投影一次。
- 本决策沿用现有 projected Rect 语义，不承诺 anchor 位于非均匀 scale 与 rotate 组合产生的完整 shear-like Scene 轮廓，也不引入 matrix / polygon layout。

## DSL

默认 center 对 center：

```tsx
<Node id="target" position={[120, 60]}>
  Target
</Node>
<Node position={{ kind: 'anchor', target: { id: 'target' } }}>Current</Node>
```

显式两端 anchor 与 offset：

```tsx
<Node id="target" position={[120, 60]} padding={{ x: 16, y: 10 }}>
  Target
</Node>
<Node
  position={{
    kind: 'anchor',
    target: { id: 'target', anchor: 'bottom-left', offset: [0, 12] },
    selfAnchor: 'top-left',
  }}
  rotate={8}
>
  Current
</Node>
```

Vanilla 使用同一 IR：

```ts
node('current', {
  position: {
    kind: 'anchor',
    target: { id: 'panel', anchor: 'right' },
    selfAnchor: 'left',
  },
  text: 'Current',
});
```

## 被否决的方案

- 上层 composite 预估 Node 尺寸：会复制 core 的文本、shape、padding、boundary 与 transform 语义。
- 把 anchor position 加入通用 `IRResolvablePosition`：Coordinate 没有 self shape / padding / margin 边界，也会让 point resolver 依赖当前实体布局。
- 允许 forward reference 或做约束拓扑排序：会把本能力扩大为通用约束求解，并改变现有 IR children 顺序语义。
- 用 `0×0` 判断 Scope 是否完成：无法区分 placeholder 与合法空 Scope。
- 在 emit 或 Scene 阶段二次修补位置：会产生 namespace、observer、bbox 与 renderer 之间的多份几何真源。
- 为 anchor position 新建 registry：anchor / shape / boundary 已有开放 definition 链，无需平行扩展面。

## 公开影响与兼容性

- `IRNode.position`、React `NodeProps.position` additive 增加一个结构化分支；既有五种共享 position 语义不变。
- `NodeTargetSchema` 结构不变，只把说明扩展到 resolved Scope，并明确省略 anchor 由消费上下文解释。
- Coordinate schema、Scope schema、Scene、renderer、math、render 与 composite contract 无新字段。
- 混合 `kind` 与旧 position 字段的对象现在 fail-loud，避免此前新增分支可能造成的 silent semantic rewrite；合法旧 position 不受影响。

## 最终实现与验证摘要

- Core 新增 schema、Node 两阶段布局、namespace entry 生命周期、transform 可逆性检查与共享 cached / uncached anchor resolver。
- React builder / unbuilder 与 Vanilla plain spec 对同一 IR 保持等价。
- Node overview、Coordinate、定位概念、schema reference、core philosophy、controls playground 与 changelog 中英文同步。
- Core 全量验证：177 个测试文件、2463 个测试通过。
- React builder / unbuilder：144 个测试通过；Vanilla plain spec：15 个测试通过。
- docs 类型检查与 kernel 80 页完整性检查通过。
- Bug Hunter 最终 BLOCKING / WARNING 均为 0；JSON round-trip + Unicode id、negative non-uniform scale + rotate + global offset、Unicode self / shadowing、resolved zero-size Scope 等临时 adversarial case 通过并已自动删除。

## 遗留边界

- 不支持 Coordinate self anchor、Scope 自身 anchor / pivot、forward reference、循环约束、拓扑排序、碰撞避让或增量布局。
- Scope 非均匀 scale 与 rotate 组合继续受现有 projected Rect 表达能力限制。
- 未来若引入其它带 `kind` 的 Node position 变体，必须在原始 discriminator 路由中显式加入，不能依赖宽松 union 的字段剥离行为。
